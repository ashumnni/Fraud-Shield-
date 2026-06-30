"""
Transaction simulator: generates realistic transaction streams for the dashboard demo.
"""
from __future__ import annotations
import asyncio
import uuid
import random
from datetime import datetime, timezone
from typing import Optional

from ..models.store import get_store

# Sample data pools
USERS = [f"USR{i:04d}" for i in range(1, 51)]
MERCHANTS = [
    ("MCH001", "Amazon", "e-commerce"),
    ("MCH002", "Starbucks", "food"),
    ("MCH003", "Shell", "gas"),
    ("MCH004", "Walmart", "retail"),
    ("MCH005", "Netflix", "entertainment"),
    ("MCH006", "AliExpress", "e-commerce"),
    ("MCH007", "Binance", "crypto"),
    ("MCH008", "Unknown Merchant", "other"),
    ("MCH009", "Casino Royal", "gambling"),
    ("MCH010", "Steam", "gaming"),
]
LOCATIONS = [
    ("US", "New York", 40.71, -74.01),
    ("US", "Los Angeles", 34.05, -118.24),
    ("IN", "Bangalore", 12.97, 77.59),
    ("IN", "Mumbai", 19.08, 72.88),
    ("GB", "London", 51.51, -0.13),
    ("DE", "Berlin", 52.52, 13.40),
    ("SG", "Singapore", 1.35, 103.82),
    ("CN", "Shanghai", 31.23, 121.47),
    ("RU", "Moscow", 55.75, 37.62),
    ("NG", "Lagos", 6.52, 3.38),
    ("BR", "São Paulo", -23.55, -46.63),
    ("AU", "Sydney", -33.87, 151.21),
]
DEVICE_TYPES = ["mobile", "desktop", "tablet"]
OS_OPTIONS = ["iOS", "Android", "Windows", "macOS", "Linux"]

_sim_task: Optional[asyncio.Task] = None


async def _simulate_loop():
    store = get_store()
    store.sim_running = True
    store.sim_started_at = datetime.now(timezone.utc)

    while store.sim_running:
        await asyncio.sleep(random.uniform(0.8, 2.5))
        store.sim_txn_count += 1

        # Randomly make it fraudulent
        is_fraud_scenario = random.random() < 0.08  # 8% fraud rate in simulation

        user_id = random.choice(USERS)
        merchant_id, merchant_name, merchant_cat = random.choice(MERCHANTS)
        loc = random.choice(LOCATIONS)
        loc_data = {"country": loc[0], "city": loc[1], "lat": loc[2], "lng": loc[3]}

        if is_fraud_scenario:
            amount = round(random.uniform(500, 9999), 2)
            device = {
                "fingerprint": str(uuid.uuid4())[:8],
                "type": random.choice(DEVICE_TYPES),
                "os": random.choice(OS_OPTIONS),
                "vpn": random.random() < 0.6,
                "tor": random.random() < 0.4,
                "emulator": random.random() < 0.3,
                "rooted": random.random() < 0.3,
            }
        else:
            amount = round(random.uniform(5, 500), 2)
            device = {
                "fingerprint": f"DEV{user_id[-4:]}{random.randint(0,2)}",
                "type": random.choice(DEVICE_TYPES),
                "os": random.choice(OS_OPTIONS),
                "vpn": random.random() < 0.05,
                "tor": False,
                "emulator": False,
                "rooted": False,
            }

        txn = {
            "transaction_id": str(uuid.uuid4()),
            "user_id": user_id,
            "amount": amount,
            "currency": "USD",
            "merchant_id": merchant_id,
            "merchant_category": merchant_cat,
            "location": loc_data,
            "device": device,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        # Run analysis, save to SQLite DB, and publish to SSE subscribers
        from ..db.database import SessionLocal
        from ..routers.transactions import _analyze_transaction

        db = SessionLocal()
        try:
            analyzed = await _analyze_transaction(txn, db)
            await store.publish(analyzed)
            if analyzed.get("decision") == "BLOCK":
                store.sim_fraud_count += 1
        except Exception as e:
            print(f"Simulator analysis/db error: {e}")
        finally:
            db.close()

    store.sim_running = False


async def start_simulator():
    global _sim_task
    store = get_store()
    if store.sim_running:
        return
    _sim_task = asyncio.create_task(_simulate_loop())


async def stop_simulator():
    global _sim_task
    store = get_store()
    store.sim_running = False
    if _sim_task:
        _sim_task.cancel()
        _sim_task = None
