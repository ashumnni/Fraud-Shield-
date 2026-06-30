"""
Risk scoring: maps fraud probability → risk level + decision.
"""
from __future__ import annotations
from typing import Literal, Tuple

RiskLevel = Literal["LOW", "MEDIUM", "HIGH"]
Decision = Literal["APPROVE", "HOLD", "BLOCK"]


from .store import get_store

def score_to_risk(fraud_probability: float) -> Tuple[RiskLevel, Decision]:
    """
    Map fraud probability [0,1] to risk level and action decision.
    Thresholds are dynamically read from the config store.
    """
    store = get_store()
    if fraud_probability < store.threshold_medium:
        return "LOW", "APPROVE"
    elif fraud_probability < store.threshold_high:
        return "MEDIUM", "HOLD"
    else:
        return "HIGH", "BLOCK"
