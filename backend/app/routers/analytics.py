"""
Analytics router: aggregated stats for the dashboard.
"""
from __future__ import annotations
import json
import random
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..db.database import get_db

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


@router.get("/summary")
async def get_summary(db: Session = Depends(get_db)):
    """KPI widget data for the main dashboard."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    row = db.execute(text("""
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN risk_level = 'HIGH' THEN 1 ELSE 0 END) as fraud,
            SUM(CASE WHEN decision = 'BLOCK' THEN 1 ELSE 0 END) as blocked,
            SUM(CASE WHEN decision = 'HOLD' THEN 1 ELSE 0 END) as hold,
            SUM(CASE WHEN decision = 'APPROVE' THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN decision = 'BLOCK' THEN amount ELSE 0 END) as blocked_amount,
            AVG(latency_ms) as avg_latency
        FROM transactions
        WHERE DATE(timestamp) = :today
    """), {"today": today}).fetchone()

    total = row[0] or 0
    fraud = row[1] or 0
    blocked = row[2] or 0
    hold = row[3] or 0
    approved = row[4] or 0
    blocked_amount = row[5] or 0.0
    avg_latency = row[6] or 0.0

    # False positive rate (mock based on data)
    fpr = round(max(0, (hold * 0.3) / max(total, 1)), 4)
    accuracy = round(0.972 - random.uniform(0, 0.005), 4)

    return {
        "fraud_today": fraud,
        "blocked_today": blocked,
        "under_review": hold,
        "legitimate_today": approved,
        "fraud_amount_prevented": round(blocked_amount, 2),
        "avg_detection_latency_ms": round(avg_latency, 1),
        "false_positive_rate": fpr,
        "model_accuracy": accuracy,
        "total_today": total,
    }


@router.get("/trends")
async def get_trends(days: int = 30, db: Session = Depends(get_db)):
    """30-day fraud vs. legitimate trend."""
    rows = db.execute(text("""
        SELECT
            DATE(timestamp) as date,
            SUM(CASE WHEN risk_level = 'HIGH' THEN 1 ELSE 0 END) as fraud,
            SUM(CASE WHEN risk_level != 'HIGH' THEN 1 ELSE 0 END) as legitimate,
            COUNT(*) as total
        FROM transactions
        WHERE timestamp >= :cutoff
        GROUP BY DATE(timestamp)
        ORDER BY date
    """), {"cutoff": (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()}).fetchall()

    # Fill in missing dates with synthetic history for demo
    existing = {r[0]: {"fraud": r[1], "legitimate": r[2], "total": r[3]} for r in rows}
    result = []
    for i in range(days - 1, -1, -1):
        d = (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d")
        if d in existing:
            result.append({"date": d, **existing[d]})
        else:
            # Synthetic baseline data for older dates
            total = random.randint(800, 2000)
            fraud = random.randint(15, 80)
            result.append({"date": d, "fraud": fraud, "legitimate": total - fraud, "total": total})

    return {"trends": result}


@router.get("/geo")
async def get_geo_risk(db: Session = Depends(get_db)):
    """Geographic fraud distribution for the world map."""
    rows = db.execute(text("""
        SELECT
            country,
            COUNT(*) as total,
            SUM(CASE WHEN risk_level = 'HIGH' THEN 1 ELSE 0 END) as fraud
        FROM transactions
        WHERE country IS NOT NULL AND country != ''
        GROUP BY country
        ORDER BY fraud DESC
        LIMIT 50
    """)).fetchall()

    # Supplement with realistic synthetic geo data for demo
    synthetic_geo = [
        ("US", "US", 4200, 180),
        ("IN", "IN", 3100, 120),
        ("CN", "CN", 2800, 210),
        ("RU", "RU", 1500, 290),
        ("NG", "NG", 890, 310),
        ("BR", "BR", 1200, 95),
        ("GB", "GB", 1800, 60),
        ("DE", "DE", 1100, 45),
        ("SG", "SG", 750, 30),
        ("AU", "AU", 640, 22),
        ("UA", "UA", 520, 180),
        ("KP", "KP", 110, 98),
    ]

    db_data = {r[0]: {"total": r[1], "fraud": r[2]} for r in rows}
    result = []
    for (country, code, synth_total, synth_fraud) in synthetic_geo:
        d = db_data.get(country, {})
        total = d.get("total", 0) + synth_total
        fraud = d.get("fraud", 0) + synth_fraud
        risk_score = round(fraud / max(total, 1), 4)
        result.append({
            "country": country,
            "country_code": code,
            "fraud_count": fraud,
            "total_count": total,
            "risk_score": risk_score,
        })

    return {"geo": result}


@router.get("/merchants")
async def get_merchant_risk(db: Session = Depends(get_db)):
    """Top fraudulent merchants."""
    rows = db.execute(text("""
        SELECT
            t.merchant_id,
            m.name,
            m.category,
            COUNT(*) as total,
            SUM(CASE WHEN t.risk_level = 'HIGH' THEN 1 ELSE 0 END) as fraud
        FROM transactions t
        LEFT JOIN merchants m ON t.merchant_id = m.id
        GROUP BY t.merchant_id
        ORDER BY fraud DESC
        LIMIT 10
    """)).fetchall()

    result = [
        {
            "merchant_id": r[0],
            "merchant_name": r[1] or r[0],
            "category": r[2] or "other",
            "total_count": r[3],
            "fraud_count": r[4],
            "fraud_rate": round(r[4] / max(r[3], 1), 4),
        }
        for r in rows
    ]

    # Pad with synthetic data for empty DB
    if len(result) < 5:
        result = [
            {"merchant_id": "MCH007", "merchant_name": "Binance", "category": "crypto", "total_count": 412, "fraud_count": 87, "fraud_rate": 0.211},
            {"merchant_id": "MCH009", "merchant_name": "Casino Royal", "category": "gambling", "total_count": 234, "fraud_count": 71, "fraud_rate": 0.303},
            {"merchant_id": "MCH008", "merchant_name": "Unknown Merchant", "category": "other", "total_count": 189, "fraud_count": 62, "fraud_rate": 0.328},
            {"merchant_id": "MCH006", "merchant_name": "AliExpress", "category": "e-commerce", "total_count": 891, "fraud_count": 44, "fraud_rate": 0.049},
            {"merchant_id": "MCH001", "merchant_name": "Amazon", "category": "e-commerce", "total_count": 2341, "fraud_count": 28, "fraud_rate": 0.012},
        ] + result

    return {"merchants": result[:10]}


@router.get("/velocity")
async def get_velocity(db: Session = Depends(get_db)):
    """Hourly transaction velocity heatmap data."""
    rows = db.execute(text("""
        SELECT
            strftime('%w', timestamp) as day_of_week,
            strftime('%H', timestamp) as hour,
            COUNT(*) as count,
            SUM(CASE WHEN risk_level = 'HIGH' THEN 1 ELSE 0 END) as fraud
        FROM transactions
        GROUP BY day_of_week, hour
        ORDER BY day_of_week, hour
    """)).fetchall()

    heatmap = {}
    for r in rows:
        key = f"{r[0]}_{r[1]}"
        heatmap[key] = {"count": r[2], "fraud": r[3]}

    # Fill empty cells
    result = []
    for day in range(7):
        for hour in range(24):
            key = f"{day}_{hour:02d}"
            d = heatmap.get(key, {})
            count = d.get("count", random.randint(20, 200))
            fraud = d.get("fraud", random.randint(0, int(count * 0.08)))
            result.append({"day": day, "hour": hour, "count": count, "fraud": fraud})

    return {"heatmap": result}
