"""
Feature engineering for fraud detection.
Derives 20+ features from raw transaction data plus user history.
"""
from __future__ import annotations
import math
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate great-circle distance between two coordinates in km."""
    R = 6371  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def is_impossible_travel(
    last_lat: float, last_lng: float, last_time: datetime,
    curr_lat: float, curr_lng: float, curr_time: datetime,
    max_speed_kmh: float = 900.0  # commercial flight speed
) -> tuple[bool, float]:
    """Detect impossible travel: distance implies faster than max_speed_kmh."""
    distance_km = haversine_km(last_lat, last_lng, curr_lat, curr_lng)
    if distance_km < 50:
        return False, distance_km

    time_diff_hours = abs((curr_time - last_time).total_seconds()) / 3600
    if time_diff_hours < 0.001:
        time_diff_hours = 0.001

    required_speed = distance_km / time_diff_hours
    return required_speed > max_speed_kmh, distance_km


def engineer_features(
    transaction: Dict[str, Any],
    user_history: Dict[str, Any],
) -> Dict[str, float]:
    """
    Build the feature vector used by the ML model.

    Args:
        transaction: raw transaction dict
        user_history: aggregated stats for this user

    Returns:
        feature dict (all numeric, model-ready)
    """
    ts: datetime = transaction.get("timestamp") or datetime.now(timezone.utc)
    if isinstance(ts, str):
        ts = datetime.fromisoformat(ts)

    amount = float(transaction.get("amount", 0))
    device: Dict = transaction.get("device", {})
    location: Dict = transaction.get("location", {})

    # ── Temporal features ──────────────────────────────────────────────────
    hour = ts.hour
    is_night = 1 if hour < 6 or hour >= 22 else 0
    is_weekend = 1 if ts.weekday() >= 5 else 0

    # ── Amount features ──────────────────────────────────────────────────────
    avg_amount = user_history.get("avg_amount", amount)
    std_amount = user_history.get("std_amount", 1.0) or 1.0
    amount_zscore = abs((amount - avg_amount) / std_amount) if std_amount > 0 else 0
    amount_normalized = min(amount / 10000, 1.0)  # cap at 10k

    # ── Device features ──────────────────────────────────────────────────────
    known_devices: List[str] = user_history.get("known_devices", [])
    device_fingerprint = device.get("fingerprint", "")
    is_new_device = 1 if device_fingerprint and device_fingerprint not in known_devices else 0
    vpn_flag = 1 if device.get("vpn") else 0
    tor_flag = 1 if device.get("tor") else 0
    emulator_flag = 1 if device.get("emulator") else 0
    rooted_flag = 1 if device.get("rooted") else 0

    # ── Geo features ──────────────────────────────────────────────────────────
    last_lat = user_history.get("last_lat")
    last_lng = user_history.get("last_lng")
    last_txn_time = user_history.get("last_txn_time")
    curr_lat = location.get("lat", 0)
    curr_lng = location.get("lng", 0)

    impossible_travel = 0
    geo_distance_km = 0.0
    if last_lat is not None and last_lng is not None and last_txn_time is not None:
        if isinstance(last_txn_time, str):
            last_txn_time = datetime.fromisoformat(last_txn_time)
        impossible_travel_flag, geo_distance_km = is_impossible_travel(
            last_lat, last_lng, last_txn_time,
            curr_lat, curr_lng, ts
        )
        impossible_travel = 1 if impossible_travel_flag else 0

    # Country mismatch (user's registered country vs. current location)
    user_country = user_history.get("country", "")
    txn_country = location.get("country", "")
    country_mismatch = 1 if user_country and txn_country and user_country != txn_country else 0

    # ── Velocity features ─────────────────────────────────────────────────────
    velocity_1min = float(user_history.get("velocity_1min", 0))
    velocity_5min = float(user_history.get("velocity_5min", 0))
    velocity_1hr = float(user_history.get("velocity_1hr", 0))
    velocity_24hr = float(user_history.get("velocity_24hr", 0))

    # ── Merchant features ─────────────────────────────────────────────────────
    merchant_risk_score = float(user_history.get("merchant_risk_score", 0.1))

    # ── User risk features ────────────────────────────────────────────────────
    user_risk_score = float(user_history.get("user_risk_score", 0.1))
    failed_otp_attempts = float(user_history.get("failed_otp_attempts", 0))
    account_age_days = float(user_history.get("account_age_days", 365))
    account_age_normalized = min(account_age_days / 365, 5.0) / 5.0  # normalize to 5 years

    features = {
        # Temporal
        "hour_of_day": hour / 23.0,
        "is_night": is_night,
        "is_weekend": is_weekend,
        # Amount
        "amount_normalized": amount_normalized,
        "amount_zscore": min(amount_zscore, 10.0) / 10.0,
        # Device
        "is_new_device": is_new_device,
        "vpn_flag": vpn_flag,
        "tor_flag": tor_flag,
        "emulator_flag": emulator_flag,
        "rooted_flag": rooted_flag,
        # Geo
        "impossible_travel": impossible_travel,
        "geo_distance_km": min(geo_distance_km, 20000) / 20000,
        "country_mismatch": country_mismatch,
        # Velocity
        "velocity_1min": min(velocity_1min, 20) / 20,
        "velocity_5min": min(velocity_5min, 50) / 50,
        "velocity_1hr": min(velocity_1hr, 100) / 100,
        "velocity_24hr": min(velocity_24hr, 500) / 500,
        # Merchant
        "merchant_risk_score": merchant_risk_score,
        # User
        "user_risk_score": user_risk_score,
        "failed_otp_attempts": min(failed_otp_attempts, 10) / 10,
        "account_age_normalized": account_age_normalized,
    }

    return features


FEATURE_LABELS = {
    "hour_of_day": "Time of Day",
    "is_night": "Night-Time Transaction",
    "is_weekend": "Weekend Transaction",
    "amount_normalized": "Transaction Amount",
    "amount_zscore": "Amount Deviation (Z-Score)",
    "is_new_device": "New Device Detected",
    "vpn_flag": "VPN Detected",
    "tor_flag": "TOR Network Detected",
    "emulator_flag": "Emulator Detected",
    "rooted_flag": "Rooted/Jailbroken Device",
    "impossible_travel": "Impossible Travel Detected",
    "geo_distance_km": "Unusual Location Distance",
    "country_mismatch": "Country Mismatch",
    "velocity_1min": "High Transaction Velocity (1 min)",
    "velocity_5min": "High Transaction Velocity (5 min)",
    "velocity_1hr": "High Transaction Velocity (1 hr)",
    "velocity_24hr": "High Transaction Velocity (24 hr)",
    "merchant_risk_score": "High-Risk Merchant",
    "user_risk_score": "High-Risk User Profile",
    "failed_otp_attempts": "Failed OTP Attempts",
    "account_age_normalized": "Account Age",
}
