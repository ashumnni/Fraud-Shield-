"""
Simulator router: start/stop the transaction generator.
"""
from __future__ import annotations
from fastapi import APIRouter
from ..models.simulator import start_simulator, stop_simulator
from ..models.store import get_store

router = APIRouter(prefix="/api/v1/simulator", tags=["simulator"])


@router.post("/start")
async def start():
    await start_simulator()
    return {"status": "started"}


@router.post("/stop")
async def stop():
    await stop_simulator()
    return {"status": "stopped"}


@router.get("/status")
async def status():
    store = get_store()
    return {
        "running": store.sim_running,
        "transactions_generated": store.sim_txn_count,
        "fraud_generated": store.sim_fraud_count,
        "started_at": store.sim_started_at.isoformat() if store.sim_started_at else None,
    }
