"""
Transactions router: analyze transactions, list, detail.
"""
from __future__ import annotations
import uuid
import json
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..db.database import get_db
from ..schemas.schemas import TransactionRequest, FraudAnalysisResult, TransactionSummary, ShapFeature
from ..models.ml_engine import get_ml_engine
from ..models.risk_scorer import score_to_risk
from ..models.store import get_store

router = APIRouter(prefix="/api/v1/transactions", tags=["transactions"])


async def _analyze_transaction(txn_data: dict, db: Session) -> dict:
    """Core analysis logic, shared between HTTP and SSE paths."""
    engine = get_ml_engine()
    store = get_store()

    user_id = txn_data.get("user_id", "UNKNOWN")
    user_history = store.get_user_history(user_id)

    result = engine.predict(txn_data, user_history)
    fraud_prob = result["fraud_probability"]
    risk_level, decision = score_to_risk(fraud_prob)

    # Evaluate hybrid rules engine overrides
    from ..models.rules_engine import evaluate_rules
    triggered_rule = evaluate_rules(txn_data, db)
    if triggered_rule:
        decision = triggered_rule["action"]
        if decision == "BLOCK":
            risk_level = "HIGH"
            result["risk_score"] = max(result["risk_score"], 85)
        elif decision == "HOLD":
            risk_level = "MEDIUM"
            result["risk_score"] = max(result["risk_score"], 45)
        
        if f"RULE_TRIGGERED: {triggered_rule['rule_name']}" not in result["flags"]:
            result["flags"].append(f"RULE_TRIGGERED: {triggered_rule['rule_name']}")

    txn_id = txn_data.get("transaction_id") or str(uuid.uuid4())
    location = txn_data.get("location", {})
    device = txn_data.get("device", {})

    ts = txn_data.get("timestamp")
    if isinstance(ts, str):
        ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    elif ts is None:
        ts = datetime.now(timezone.utc)

    flags_json = json.dumps(result["flags"])
    explanations_json = json.dumps(result["explanations"])

    # Persist to DB
    try:
        db.execute(text("""
            INSERT OR IGNORE INTO users (id, name, email) VALUES (:id, :name, :email)
        """), {"id": user_id, "name": user_id, "email": f"{user_id}@fraud-shield.demo"})

        db.execute(text("""
            INSERT OR IGNORE INTO merchants (id, name, category, country)
            VALUES (:id, :name, :category, :country)
        """), {
            "id": txn_data.get("merchant_id", "MCH000"),
            "name": txn_data.get("merchant_id", "Unknown"),
            "category": txn_data.get("merchant_category", "other"),
            "country": location.get("country", "US"),
        })

        db.execute(text("""
            INSERT OR IGNORE INTO transactions
            (id, user_id, merchant_id, amount, currency, country, city, latitude, longitude,
             device_fingerprint, vpn_detected, tor_detected, timestamp,
             fraud_probability, risk_score, risk_level, decision, latency_ms, flags, status)
            VALUES
            (:id, :user_id, :merchant_id, :amount, :currency, :country, :city, :lat, :lng,
             :device_fp, :vpn, :tor, :timestamp,
             :fraud_prob, :risk_score, :risk_level, :decision, :latency_ms, :flags, :status)
        """), {
            "id": txn_id,
            "user_id": user_id,
            "merchant_id": txn_data.get("merchant_id", "MCH000"),
            "amount": txn_data.get("amount", 0),
            "currency": txn_data.get("currency", "USD"),
            "country": location.get("country", ""),
            "city": location.get("city", ""),
            "lat": location.get("lat"),
            "lng": location.get("lng"),
            "device_fp": device.get("fingerprint"),
            "vpn": device.get("vpn", False),
            "tor": device.get("tor", False),
            "timestamp": ts.isoformat(),
            "fraud_prob": fraud_prob,
            "risk_score": result["risk_score"],
            "risk_level": risk_level,
            "decision": decision,
            "latency_ms": result["latency_ms"],
            "flags": flags_json,
            "status": "BLOCKED" if decision == "BLOCK" else "APPROVED" if decision == "APPROVE" else "PENDING",
        })

        # Create fraud case for HOLD/BLOCK
        if decision in ("HOLD", "BLOCK"):
            priority = "CRITICAL" if decision == "BLOCK" else "HIGH"
            case_id = str(uuid.uuid4())
            db.execute(text("""
                INSERT OR IGNORE INTO fraud_cases (id, transaction_id, user_id, status, priority)
                VALUES (:id, :txn_id, :user_id, 'NEW', :priority)
            """), {"id": case_id, "txn_id": txn_id, "user_id": user_id, "priority": priority})

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"DB error: {e}")

    # Update in-memory user history
    store.update_user_history(user_id, txn_data)

    return {
        "transaction_id": txn_id,
        "user_id": user_id,
        "amount": txn_data.get("amount", 0),
        "currency": txn_data.get("currency", "USD"),
        "merchant_id": txn_data.get("merchant_id", ""),
        "location": location,
        "fraud_probability": fraud_prob,
        "risk_score": result["risk_score"],
        "risk_level": risk_level,
        "decision": decision,
        "latency_ms": result["latency_ms"],
        "explanations": result["explanations"],
        "flags": result["flags"],
        "timestamp": ts.isoformat(),
    }


@router.post("/analyze", response_model=FraudAnalysisResult)
async def analyze_transaction(
    request: TransactionRequest,
    db: Session = Depends(get_db),
):
    """Analyze a transaction for fraud in real-time."""
    txn_data = request.model_dump()
    result = await _analyze_transaction(txn_data, db)

    # Broadcast to SSE
    store = get_store()
    await store.publish({"type": "analyzed_transaction", "data": result})

    return result


@router.get("", response_model=dict)
async def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    risk_level: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """List transactions with pagination and filtering."""
    offset = (page - 1) * page_size
    where_clauses = []
    params: dict = {"limit": page_size, "offset": offset}

    if risk_level:
        where_clauses.append("risk_level = :risk_level")
        params["risk_level"] = risk_level.upper()
    if status:
        where_clauses.append("status = :status")
        params["status"] = status.upper()

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    rows = db.execute(text(f"""
        SELECT id, user_id, amount, currency, merchant_id, country, city,
               fraud_probability, risk_score, risk_level, decision, status, flags, timestamp
        FROM transactions
        {where_sql}
        ORDER BY timestamp DESC
        LIMIT :limit OFFSET :offset
    """), params).fetchall()

    count_row = db.execute(text(f"""
        SELECT COUNT(*) FROM transactions {where_sql}
    """), params).fetchone()

    transactions = []
    for r in rows:
        flags = []
        try:
            flags = json.loads(r[12]) if r[12] else []
        except Exception:
            pass
        transactions.append({
            "id": r[0], "user_id": r[1], "amount": r[2], "currency": r[3],
            "merchant_id": r[4], "country": r[5], "city": r[6],
            "fraud_probability": r[7], "risk_score": r[8], "risk_level": r[9],
            "decision": r[10], "status": r[11], "flags": flags,
            "timestamp": r[13],
        })

    return {"transactions": transactions, "total": count_row[0] if count_row else 0, "page": page, "page_size": page_size}


@router.get("/{transaction_id}")
async def get_transaction(transaction_id: str, db: Session = Depends(get_db)):
    """Get a single transaction with full detail and SHAP explanations."""
    row = db.execute(text("""
        SELECT id, user_id, amount, currency, merchant_id, country, city, latitude, longitude,
               device_fingerprint, vpn_detected, tor_detected, timestamp,
               fraud_probability, risk_score, risk_level, decision, latency_ms, flags, status
        FROM transactions WHERE id = :id
    """), {"id": transaction_id}).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Transaction not found")

    shap_rows = db.execute(text("""
        SELECT feature_name, feature_label, feature_value, shap_value, direction
        FROM shap_explanations WHERE transaction_id = :id
    """), {"id": transaction_id}).fetchall()

    flags = []
    try:
        flags = json.loads(row[18]) if row[18] else []
    except Exception:
        pass

    return {
        "id": row[0], "user_id": row[1], "amount": row[2], "currency": row[3],
        "merchant_id": row[4], "country": row[5], "city": row[6],
        "latitude": row[7], "longitude": row[8],
        "device_fingerprint": row[9], "vpn_detected": row[10], "tor_detected": row[11],
        "timestamp": row[12], "fraud_probability": row[13], "risk_score": row[14],
        "risk_level": row[15], "decision": row[16], "latency_ms": row[17],
        "flags": flags, "status": row[19],
        "explanations": [{"feature": r[0], "label": r[1], "value": r[2], "impact": r[3], "direction": r[4]} for r in shap_rows],
    }
