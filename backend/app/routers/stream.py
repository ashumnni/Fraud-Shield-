"""
SSE streaming router: delivers real-time analyzed transactions to the dashboard.
"""
from __future__ import annotations
import json
import asyncio
import uuid
import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..models.store import get_store
from ..models.ml_engine import get_ml_engine
from ..models.risk_scorer import score_to_risk
from ..models.feature_engineering import engineer_features

router = APIRouter(prefix="/api/v1/stream", tags=["stream"])

# Sample pools for SSE-internal simulation
_USERS = [f"USR{i:04d}" for i in range(1, 51)]
_MERCHANTS = ["Amazon", "Binance", "Starbucks", "Walmart", "Unknown Vendor", "Casino Royal", "Steam", "AliExpress"]
_LOCATIONS = [
    ("US", "New York", 40.71, -74.01), ("IN", "Bangalore", 12.97, 77.59),
    ("GB", "London", 51.51, -0.13), ("RU", "Moscow", 55.75, 37.62),
    ("NG", "Lagos", 6.52, 3.38), ("BR", "São Paulo", -23.55, -46.63),
    ("CN", "Shanghai", 31.23, 121.47), ("DE", "Berlin", 52.52, 13.40),
]


@router.get("")
async def stream_transactions():
    """
    Server-Sent Events endpoint.
    Streams analyzed fraud results from the global simulator to the frontend dashboard in real-time.
    """
    store = get_store()
    q = store.subscribe()

    async def event_generator():
        try:
            yield 'data: {"type": "connected"}\n\n'
            while True:
                try:
                    event = await asyncio.wait_for(q.get(), timeout=20.0)
                    payload = json.dumps(event)
                    yield f"data: {payload}\n\n"
                except asyncio.TimeoutError:
                    yield 'data: {"type": "heartbeat"}\n\n'
        except asyncio.CancelledError:
            pass
        finally:
            store.unsubscribe(q)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )

