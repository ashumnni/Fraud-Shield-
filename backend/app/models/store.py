"""
In-memory state store for Fraud Shield.
Manages velocity windows, user history, and the SSE event queue.
Simulates what Redis + Kafka would handle in production.
"""
from __future__ import annotations
import asyncio
import json
import uuid
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Any, Deque, Dict, List, Optional


class InMemoryStore:
    def __init__(self):
        # User histories: user_id → stats dict
        self._user_history: Dict[str, Dict[str, Any]] = {}

        # Velocity windows: user_id → list of (timestamp, amount)
        self._user_txn_times: Dict[str, Deque] = defaultdict(lambda: deque(maxlen=1000))

        # Merchant risk cache
        self._merchant_risk: Dict[str, float] = {}

        # SSE subscriber queues
        self._sse_queues: List[asyncio.Queue] = []

        # Simulator state
        self.sim_running = False
        self.sim_txn_count = 0
        self.sim_fraud_count = 0
        self.sim_started_at: Optional[datetime] = None

        # Configuration thresholds
        self.threshold_medium = 0.30
        self.threshold_high = 0.65

    # ── User history ──────────────────────────────────────────────────────────

    def get_user_history(self, user_id: str) -> Dict[str, Any]:
        return self._user_history.get(user_id, {
            "avg_amount": 200.0,
            "std_amount": 150.0,
            "known_devices": [],
            "last_lat": None,
            "last_lng": None,
            "last_txn_time": None,
            "country": "US",
            "velocity_1min": 0,
            "velocity_5min": 0,
            "velocity_1hr": 0,
            "velocity_24hr": 0,
            "merchant_risk_score": 0.1,
            "user_risk_score": 0.1,
            "failed_otp_attempts": 0,
            "account_age_days": 365,
        })

    def update_user_history(self, user_id: str, transaction: Dict[str, Any]):
        history = self.get_user_history(user_id)
        now = transaction.get("timestamp") or datetime.now(timezone.utc)
        if isinstance(now, str):
            now = datetime.fromisoformat(now)

        amount = float(transaction.get("amount", 0))
        device = transaction.get("device", {})
        location = transaction.get("location", {})

        # Update rolling average amount
        old_avg = history.get("avg_amount", amount)
        old_std = history.get("std_amount", 100.0)
        # Exponential moving average
        alpha = 0.05
        new_avg = alpha * amount + (1 - alpha) * old_avg
        new_std = max(abs(amount - new_avg) * alpha + old_std * (1 - alpha), 1.0)

        # Update known devices
        known_devices: List[str] = history.get("known_devices", [])
        fp = device.get("fingerprint", "")
        if fp and fp not in known_devices:
            known_devices.append(fp)
        if len(known_devices) > 20:
            known_devices = known_devices[-20:]

        # Velocity tracking
        txn_times = self._user_txn_times[user_id]
        txn_times.append((now, amount))

        def count_in_window(minutes: int) -> int:
            cutoff = now.timestamp() - minutes * 60
            return sum(1 for (t, _) in txn_times if t.timestamp() > cutoff)

        self._user_history[user_id] = {
            **history,
            "avg_amount": new_avg,
            "std_amount": new_std,
            "known_devices": known_devices,
            "last_lat": location.get("lat"),
            "last_lng": location.get("lng"),
            "last_txn_time": now,
            "country": location.get("country", history.get("country", "US")),
            "velocity_1min": count_in_window(1),
            "velocity_5min": count_in_window(5),
            "velocity_1hr": count_in_window(60),
            "velocity_24hr": count_in_window(1440),
            "merchant_risk_score": self._merchant_risk.get(
                transaction.get("merchant_id", ""), history.get("merchant_risk_score", 0.1)
            ),
            "user_risk_score": history.get("user_risk_score", 0.1),
            "failed_otp_attempts": history.get("failed_otp_attempts", 0),
            "account_age_days": history.get("account_age_days", 365),
        }

    def set_merchant_risk(self, merchant_id: str, risk: float):
        self._merchant_risk[merchant_id] = risk

    # ── SSE pub/sub ───────────────────────────────────────────────────────────

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=100)
        self._sse_queues.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        try:
            self._sse_queues.remove(q)
        except ValueError:
            pass

    async def publish(self, event: Dict[str, Any]):
        """Broadcast an event to all SSE subscribers."""
        for q in list(self._sse_queues):
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                pass


# Singleton
_store: Optional[InMemoryStore] = None


def get_store() -> InMemoryStore:
    global _store
    if _store is None:
        _store = InMemoryStore()
    return _store
