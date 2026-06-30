"""
Settings router: update risk thresholds and manage custom rules.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..models.store import get_store
from ..db.database import get_db

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


class SettingsUpdate(BaseModel):
    threshold_medium: float
    threshold_high: float


class RuleCreate(BaseModel):
    name: str
    field: str
    operator: str
    value: str
    action: str


@router.get("")
async def get_settings():
    store = get_store()
    return {
        "threshold_medium": int(store.threshold_medium * 100),
        "threshold_high": int(store.threshold_high * 100),
    }


@router.post("")
async def update_settings(update: SettingsUpdate):
    store = get_store()
    store.threshold_medium = update.threshold_medium / 100.0
    store.threshold_high = update.threshold_high / 100.0
    return {
        "success": True,
        "settings": {
            "threshold_medium": int(store.threshold_medium * 100),
            "threshold_high": int(store.threshold_high * 100),
        }
    }


# ── Rules Management Endpoints ────────────────────────────────────────────────

@router.get("/rules")
async def get_rules(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT id, name, field, operator, value, action, is_active, created_at
        FROM rules
        ORDER BY created_at DESC
    """)).fetchall()
    return [
        {
            "id": r[0],
            "name": r[1],
            "field": r[2],
            "operator": r[3],
            "value": r[4],
            "action": r[5],
            "is_active": bool(r[6]),
            "created_at": r[7],
        }
        for r in rows
    ]


@router.post("/rules")
async def create_rule(rule: RuleCreate, db: Session = Depends(get_db)):
    rule_id = str(uuid.uuid4())
    db.execute(text("""
        INSERT INTO rules (id, name, field, operator, value, action, is_active)
        VALUES (:id, :name, :field, :operator, :value, :action, 1)
    """), {
        "id": rule_id,
        "name": rule.name,
        "field": rule.field,
        "operator": rule.operator,
        "value": rule.value,
        "action": rule.action,
    })
    db.commit()
    return {"success": True, "id": rule_id}


@router.patch("/rules/{rule_id}/toggle")
async def toggle_rule(rule_id: str, db: Session = Depends(get_db)):
    row = db.execute(text("SELECT is_active FROM rules WHERE id = :id"), {"id": rule_id}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Rule not found")
    new_state = 0 if row[0] else 1
    db.execute(text("UPDATE rules SET is_active = :state WHERE id = :id"), {"state": new_state, "id": rule_id})
    db.commit()
    return {"success": True, "is_active": bool(new_state)}


@router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: str, db: Session = Depends(get_db)):
    db.execute(text("DELETE FROM rules WHERE id = :id"), {"id": rule_id})
    db.commit()
    return {"success": True}
