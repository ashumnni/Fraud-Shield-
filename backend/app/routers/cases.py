"""
Fraud cases router: investigation portal CRUD.
"""
from __future__ import annotations
import json
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..db.database import get_db
from ..schemas.schemas import CaseUpdateRequest

router = APIRouter(prefix="/api/v1/cases", tags=["cases"])


@router.get("")
async def list_cases(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """List fraud investigation cases."""
    offset = (page - 1) * page_size
    where = []
    params: dict = {"limit": page_size, "offset": offset}

    if status:
        where.append("fc.status = :status")
        params["status"] = status.upper()
    if priority:
        where.append("fc.priority = :priority")
        params["priority"] = priority.upper()

    where_sql = f"WHERE {' AND '.join(where)}" if where else ""

    rows = db.execute(text(f"""
        SELECT fc.id, fc.transaction_id, fc.user_id, fc.status, fc.priority,
               fc.assigned_to, fc.notes, fc.created_at, fc.updated_at, fc.resolved_at, fc.resolution,
               t.amount, t.merchant_id, t.risk_score, t.risk_level, t.flags
        FROM fraud_cases fc
        LEFT JOIN transactions t ON fc.transaction_id = t.id
        {where_sql}
        ORDER BY fc.created_at DESC
        LIMIT :limit OFFSET :offset
    """), params).fetchall()

    count = db.execute(text(f"""
        SELECT COUNT(*) FROM fraud_cases fc {where_sql}
    """), params).fetchone()

    cases = []
    for r in rows:
        notes = []
        flags = []
        try:
            notes = json.loads(r[6]) if r[6] else []
        except Exception:
            pass
        try:
            flags = json.loads(r[15]) if r[15] else []
        except Exception:
            pass

        cases.append({
            "id": r[0], "transaction_id": r[1], "user_id": r[2],
            "status": r[3], "priority": r[4], "assigned_to": r[5],
            "notes": notes, "created_at": r[7], "updated_at": r[8],
            "resolved_at": r[9], "resolution": r[10],
            "amount": r[11], "merchant_id": r[12],
            "risk_score": r[13], "risk_level": r[14], "flags": flags,
        })

    return {"cases": cases, "total": count[0] if count else 0, "page": page}


@router.get("/{case_id}")
async def get_case(case_id: str, db: Session = Depends(get_db)):
    """Get full case detail."""
    row = db.execute(text("""
        SELECT fc.id, fc.transaction_id, fc.user_id, fc.status, fc.priority,
               fc.assigned_to, fc.notes, fc.created_at, fc.updated_at, fc.resolved_at, fc.resolution,
               t.amount, t.merchant_id, t.risk_score, t.risk_level, t.flags,
               t.country, t.city, t.vpn_detected, t.fraud_probability
        FROM fraud_cases fc
        LEFT JOIN transactions t ON fc.transaction_id = t.id
        WHERE fc.id = :id
    """), {"id": case_id}).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Case not found")

    notes = []
    flags = []
    try:
        notes = json.loads(row[6]) if row[6] else []
    except Exception:
        pass
    try:
        flags = json.loads(row[15]) if row[15] else []
    except Exception:
        pass

    return {
        "id": row[0], "transaction_id": row[1], "user_id": row[2],
        "status": row[3], "priority": row[4], "assigned_to": row[5],
        "notes": notes, "created_at": row[7], "updated_at": row[8],
        "resolved_at": row[9], "resolution": row[10],
        "amount": row[11], "merchant_id": row[12], "risk_score": row[13],
        "risk_level": row[14], "flags": flags,
        "country": row[16], "city": row[17], "vpn_detected": row[18],
        "fraud_probability": row[19],
    }


@router.patch("/{case_id}")
async def update_case(
    case_id: str,
    update: CaseUpdateRequest,
    db: Session = Depends(get_db),
):
    """Update case status, add notes, assign analyst."""
    row = db.execute(text("SELECT id, notes, status FROM fraud_cases WHERE id = :id"),
                     {"id": case_id}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Case not found")

    notes = []
    try:
        notes = json.loads(row[1]) if row[1] else []
    except Exception:
        pass

    if update.note:
        notes.append({
            "analyst": update.analyst or "System",
            "note": update.note,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    updates = {"notes": json.dumps(notes), "updated_at": datetime.now(timezone.utc).isoformat(), "id": case_id}
    set_clauses = ["notes = :notes", "updated_at = :updated_at"]

    if update.status:
        set_clauses.append("status = :status")
        updates["status"] = update.status.upper()

    if update.assigned_to:
        set_clauses.append("assigned_to = :assigned_to")
        updates["assigned_to"] = update.assigned_to

    if update.resolution:
        set_clauses.append("resolution = :resolution")
        set_clauses.append("resolved_at = :resolved_at")
        updates["resolution"] = update.resolution
        updates["resolved_at"] = datetime.now(timezone.utc).isoformat()

    db.execute(text(f"""
        UPDATE fraud_cases SET {', '.join(set_clauses)} WHERE id = :id
    """), updates)
    db.commit()

    return {"success": True, "case_id": case_id}


@router.post("/{case_id}/freeze")
async def freeze_account(case_id: str, db: Session = Depends(get_db)):
    """Freeze the user account associated with this case."""
    row = db.execute(text("SELECT user_id FROM fraud_cases WHERE id = :id"),
                     {"id": case_id}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Case not found")

    db.execute(text("UPDATE users SET is_frozen = TRUE WHERE id = :id"),
               {"id": row[0]})
    db.commit()
    return {"success": True, "user_id": row[0], "frozen": True}


@router.post("/{case_id}/escalate")
async def escalate_case(case_id: str, db: Session = Depends(get_db)):
    """Escalate case priority to CRITICAL."""
    db.execute(text("""
        UPDATE fraud_cases
        SET priority = 'CRITICAL', status = 'ESCALATED', updated_at = :now
        WHERE id = :id
    """), {"id": case_id, "now": datetime.now(timezone.utc).isoformat()})
    db.commit()
    return {"success": True, "case_id": case_id, "priority": "CRITICAL"}


@router.post("/quarantine/user/{user_id}")
async def quarantine_user(user_id: str, db: Session = Depends(get_db)):
    """Toggle user account quarantine state."""
    row = db.execute(text("SELECT is_frozen, quarantine_status FROM users WHERE id = :id"), {"id": user_id}).fetchone()
    if not row:
        db.execute(text("INSERT INTO users (id, name, email, quarantine_status, is_frozen) VALUES (:id, :name, :email, 'QUARANTINED', 1)"),
                   {"id": user_id, "name": user_id, "email": f"{user_id}@fraud-shield.demo"})
        db.commit()
        return {"success": True, "quarantined": True}

    is_frozen, q_status = row[0], row[1]
    new_frozen = 0 if is_frozen else 1
    new_q_status = 'ACTIVE' if q_status == 'QUARANTINED' else 'QUARANTINED'

    db.execute(text("UPDATE users SET is_frozen = :frozen, quarantine_status = :q_status WHERE id = :id"),
               {"frozen": new_frozen, "q_status": new_q_status, "id": user_id})
    db.commit()
    return {"success": True, "quarantined": new_frozen == 1}


@router.post("/quarantine/device/{device_fp}")
async def quarantine_device(device_fp: str, db: Session = Depends(get_db)):
    """Toggle device fingerprint quarantine state."""
    row = db.execute(text("SELECT quarantine_status FROM devices WHERE fingerprint = :fp"), {"fp": device_fp}).fetchone()
    if not row:
        # Create temporary record if it doesn't exist
        db.execute(text("INSERT INTO devices (id, fingerprint, quarantine_status) VALUES (:id, :fp, 'QUARANTINED')"),
                   {"id": str(uuid.uuid4()), "fp": device_fp})
        db.commit()
        return {"success": True, "quarantined": True}

    q_status = row[0]
    new_q_status = 'ACTIVE' if q_status == 'QUARANTINED' else 'QUARANTINED'

    db.execute(text("UPDATE devices SET quarantine_status = :q_status WHERE fingerprint = :fp"),
               {"q_status": new_q_status, "fp": device_fp})
    db.commit()
    return {"success": True, "quarantined": new_q_status == 'QUARANTINED'}

