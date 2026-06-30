"""
Pydantic schemas for Fraud Shield API.
"""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


# ─── Location ────────────────────────────────────────────────────────────────

class Location(BaseModel):
    country: str
    city: str
    lat: float
    lng: float


# ─── Device ──────────────────────────────────────────────────────────────────

class Device(BaseModel):
    fingerprint: str
    type: Literal["mobile", "desktop", "tablet"] = "mobile"
    os: Optional[str] = None
    browser: Optional[str] = None
    vpn: bool = False
    tor: bool = False
    emulator: bool = False
    rooted: bool = False


# ─── Transaction Input ────────────────────────────────────────────────────────

class TransactionRequest(BaseModel):
    transaction_id: Optional[str] = None  # auto-generated if absent
    user_id: str
    amount: float = Field(..., gt=0)
    currency: str = "USD"
    merchant_id: str
    merchant_category: str
    location: Location
    device: Device
    timestamp: Optional[datetime] = None  # defaults to now


# ─── SHAP Explanation ─────────────────────────────────────────────────────────

class ShapFeature(BaseModel):
    feature: str
    label: str
    value: float
    impact: float
    direction: Literal["increases_risk", "decreases_risk"]


# ─── Fraud Analysis Result ───────────────────────────────────────────────────

class FraudAnalysisResult(BaseModel):
    transaction_id: str
    user_id: str
    amount: float
    currency: str
    merchant_id: str
    location: Location
    fraud_probability: float
    risk_score: int
    risk_level: Literal["LOW", "MEDIUM", "HIGH"]
    decision: Literal["APPROVE", "HOLD", "BLOCK"]
    latency_ms: int
    explanations: List[ShapFeature]
    flags: List[str]
    timestamp: datetime


# ─── Transaction List ─────────────────────────────────────────────────────────

class TransactionSummary(BaseModel):
    id: str
    user_id: str
    amount: float
    currency: str
    merchant_id: str
    country: str
    city: str
    fraud_probability: Optional[float]
    risk_score: Optional[int]
    risk_level: Optional[str]
    decision: Optional[str]
    status: str
    flags: List[str] = []
    timestamp: datetime


# ─── Analytics ───────────────────────────────────────────────────────────────

class DashboardSummary(BaseModel):
    fraud_today: int
    blocked_today: int
    under_review: int
    legitimate_today: int
    fraud_amount_prevented: float
    avg_detection_latency_ms: float
    false_positive_rate: float
    model_accuracy: float
    total_today: int


class TrendPoint(BaseModel):
    date: str
    fraud: int
    legitimate: int
    total: int


class GeoRisk(BaseModel):
    country: str
    country_code: str
    fraud_count: int
    total_count: int
    risk_score: float


class MerchantRisk(BaseModel):
    merchant_id: str
    merchant_name: str
    category: str
    fraud_count: int
    total_count: int
    fraud_rate: float


# ─── Fraud Cases ──────────────────────────────────────────────────────────────

class CaseNote(BaseModel):
    analyst: str
    note: str
    timestamp: datetime


class FraudCase(BaseModel):
    id: str
    transaction_id: str
    user_id: str
    status: str
    priority: str
    assigned_to: Optional[str]
    notes: List[CaseNote] = []
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]
    resolution: Optional[str]
    # Joined fields
    amount: Optional[float]
    merchant_id: Optional[str]
    risk_score: Optional[int]
    risk_level: Optional[str]
    flags: List[str] = []


class CaseUpdateRequest(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    note: Optional[str] = None
    analyst: Optional[str] = "System"
    resolution: Optional[str] = None


# ─── Simulator ────────────────────────────────────────────────────────────────

class SimulatorStatus(BaseModel):
    running: bool
    transactions_generated: int
    fraud_generated: int
    started_at: Optional[datetime]
