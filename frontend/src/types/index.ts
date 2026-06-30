// API types for Fraud Shield

export interface Location {
  country: string;
  city: string;
  lat: number;
  lng: number;
}

export interface Device {
  fingerprint: string;
  type: "mobile" | "desktop" | "tablet";
  os?: string;
  browser?: string;
  vpn: boolean;
  tor: boolean;
  emulator: boolean;
  rooted: boolean;
}

export interface ShapFeature {
  feature: string;
  label: string;
  value: number;
  impact: number;
  direction: "increases_risk" | "decreases_risk";
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type Decision = "APPROVE" | "HOLD" | "BLOCK";

export interface FraudAnalysisResult {
  transaction_id: string;
  user_id: string;
  amount: number;
  currency: string;
  merchant_id: string;
  location: Location;
  fraud_probability: number;
  risk_score: number;
  risk_level: RiskLevel;
  decision: Decision;
  latency_ms: number;
  explanations: ShapFeature[];
  flags: string[];
  timestamp: string;
}

export interface TransactionSummary {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  merchant_id: string;
  country: string;
  city: string;
  fraud_probability: number | null;
  risk_score: number | null;
  risk_level: RiskLevel | null;
  decision: Decision | null;
  status: string;
  flags: string[];
  timestamp: string;
}

export interface DashboardSummary {
  fraud_today: number;
  blocked_today: number;
  under_review: number;
  legitimate_today: number;
  fraud_amount_prevented: number;
  avg_detection_latency_ms: number;
  false_positive_rate: number;
  model_accuracy: number;
  total_today: number;
}

export interface TrendPoint {
  date: string;
  fraud: number;
  legitimate: number;
  total: number;
}

export interface GeoRisk {
  country: string;
  country_code: string;
  fraud_count: number;
  total_count: number;
  risk_score: number;
}

export interface MerchantRisk {
  merchant_id: string;
  merchant_name: string;
  category: string;
  fraud_count: number;
  total_count: number;
  fraud_rate: number;
}

export interface FraudCase {
  id: string;
  transaction_id: string;
  user_id: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  notes: { analyst: string; note: string; timestamp: string }[];
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolution: string | null;
  amount: number | null;
  merchant_id: string | null;
  risk_score: number | null;
  risk_level: RiskLevel | null;
  flags: string[];
}
