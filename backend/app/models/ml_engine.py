"""
ML Engine: XGBoost + Isolation Forest ensemble for fraud detection.
Trains on synthetic data at startup. SHAP-explainable.
"""
from __future__ import annotations
import os
import time
import pickle
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple, Optional

from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import xgboost as xgb

from .feature_engineering import engineer_features, FEATURE_LABELS

MODEL_PATH = os.path.join(os.path.dirname(__file__), "fraud_model.pkl")
FEATURE_NAMES = list(FEATURE_LABELS.keys())


def _generate_synthetic_data(n_samples: int = 30000, fraud_rate: float = 0.025) -> pd.DataFrame:
    """Generate realistic synthetic transaction data for training."""
    rng = np.random.default_rng(42)
    n_fraud = int(n_samples * fraud_rate)
    n_legit = n_samples - n_fraud

    def make_legit(n):
        return {
            "hour_of_day": rng.uniform(0.3, 0.85, n),  # mostly daytime
            "is_night": rng.choice([0, 1], n, p=[0.85, 0.15]),
            "is_weekend": rng.choice([0, 1], n, p=[0.71, 0.29]),
            "amount_normalized": rng.beta(1.5, 5, n),
            "amount_zscore": rng.exponential(0.3, n),
            "is_new_device": rng.choice([0, 1], n, p=[0.92, 0.08]),
            "vpn_flag": rng.choice([0, 1], n, p=[0.93, 0.07]),
            "tor_flag": rng.choice([0, 1], n, p=[0.998, 0.002]),
            "emulator_flag": rng.choice([0, 1], n, p=[0.995, 0.005]),
            "rooted_flag": rng.choice([0, 1], n, p=[0.97, 0.03]),
            "impossible_travel": rng.choice([0, 1], n, p=[0.998, 0.002]),
            "geo_distance_km": rng.beta(1.5, 8, n),
            "country_mismatch": rng.choice([0, 1], n, p=[0.88, 0.12]),
            "velocity_1min": rng.beta(1, 8, n),
            "velocity_5min": rng.beta(1, 7, n),
            "velocity_1hr": rng.beta(1.2, 6, n),
            "velocity_24hr": rng.beta(1.5, 5, n),
            "merchant_risk_score": rng.beta(1, 5, n),
            "user_risk_score": rng.beta(1, 6, n),
            "failed_otp_attempts": rng.choice([0, 1], n, p=[0.97, 0.03]),
            "account_age_normalized": rng.beta(3, 2, n),
            "label": np.zeros(n, dtype=int),
        }

    def make_fraud(n):
        # Night-time bias: mix early morning and late evening
        half = n // 2
        hour_arr = np.concatenate([rng.uniform(0, 0.25, half), rng.uniform(0.75, 1.0, n - half)])
        rng.shuffle(hour_arr)
        return {
            "hour_of_day": hour_arr,  # night
            "is_night": rng.choice([0, 1], n, p=[0.3, 0.7]),
            "is_weekend": rng.choice([0, 1], n, p=[0.4, 0.6]),
            "amount_normalized": rng.beta(3, 1.5, n),  # higher amounts
            "amount_zscore": rng.exponential(1.5, n),
            "is_new_device": rng.choice([0, 1], n, p=[0.3, 0.7]),
            "vpn_flag": rng.choice([0, 1], n, p=[0.4, 0.6]),
            "tor_flag": rng.choice([0, 1], n, p=[0.6, 0.4]),
            "emulator_flag": rng.choice([0, 1], n, p=[0.5, 0.5]),
            "rooted_flag": rng.choice([0, 1], n, p=[0.5, 0.5]),
            "impossible_travel": rng.choice([0, 1], n, p=[0.4, 0.6]),
            "geo_distance_km": rng.beta(5, 2, n),
            "country_mismatch": rng.choice([0, 1], n, p=[0.25, 0.75]),
            "velocity_1min": rng.beta(4, 2, n),
            "velocity_5min": rng.beta(4, 2, n),
            "velocity_1hr": rng.beta(4, 2, n),
            "velocity_24hr": rng.beta(4, 2, n),
            "merchant_risk_score": rng.beta(4, 1.5, n),
            "user_risk_score": rng.beta(4, 1.5, n),
            "failed_otp_attempts": rng.choice([0, 1], n, p=[0.3, 0.7]),
            "account_age_normalized": rng.beta(1, 4, n),
            "label": np.ones(n, dtype=int),
        }

    legit = make_legit(n_legit)
    fraud = make_fraud(n_fraud)

    df_legit = pd.DataFrame(legit)
    df_fraud = pd.DataFrame(fraud)
    df = pd.concat([df_legit, df_fraud], ignore_index=True)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)

    # Clip to [0, 1]
    for col in FEATURE_NAMES:
        df[col] = df[col].clip(0, 1)

    return df


class FraudMLEngine:
    """Ensemble XGBoost + Isolation Forest fraud detector."""

    def __init__(self):
        self.xgb_model: Optional[xgb.XGBClassifier] = None
        self.iso_model: Optional[IsolationForest] = None
        self.scaler: Optional[StandardScaler] = None
        self.is_trained = False

    def train(self, force: bool = False):
        """Train models (or load from cache)."""
        if not force and os.path.exists(MODEL_PATH):
            self._load()
            return

        print("🤖 Training Fraud Shield ML models on synthetic data...")
        df = _generate_synthetic_data(30000)
        X = df[FEATURE_NAMES].values
        y = df["label"].values

        # XGBoost classifier
        self.xgb_model = xgb.XGBClassifier(
            n_estimators=150,
            max_depth=6,
            learning_rate=0.1,
            scale_pos_weight=40,  # handle class imbalance
            use_label_encoder=False,
            eval_metric="logloss",
            random_state=42,
            n_jobs=-1,
        )
        self.xgb_model.fit(X, y)

        # Isolation Forest (unsupervised anomaly detection)
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        self.iso_model = IsolationForest(
            n_estimators=100,
            contamination=0.025,
            random_state=42,
            n_jobs=-1,
        )
        self.iso_model.fit(X_scaled)

        self.is_trained = True
        self._save()
        print("✅ Models trained and saved.")

    def _save(self):
        with open(MODEL_PATH, "wb") as f:
            pickle.dump({
                "xgb": self.xgb_model,
                "iso": self.iso_model,
                "scaler": self.scaler,
            }, f)

    def _load(self):
        with open(MODEL_PATH, "rb") as f:
            data = pickle.load(f)
        self.xgb_model = data["xgb"]
        self.iso_model = data["iso"]
        self.scaler = data["scaler"]
        self.is_trained = True
        print("✅ Fraud model loaded from cache.")

    def predict(
        self,
        transaction: Dict[str, Any],
        user_history: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Full prediction pipeline.
        Returns fraud_probability, risk_score, risk_level, decision, flags, latency_ms.
        """
        t0 = time.time()

        # Feature engineering
        features = engineer_features(transaction, user_history)
        feature_vector = np.array([[features[f] for f in FEATURE_NAMES]])

        # XGBoost probability
        xgb_prob = float(self.xgb_model.predict_proba(feature_vector)[0][1])

        # Isolation Forest score → normalized to [0, 1]
        X_scaled = self.scaler.transform(feature_vector)
        iso_score_raw = -float(self.iso_model.score_samples(X_scaled)[0])  # higher = more anomalous
        iso_prob = min(max(iso_score_raw / 1.0, 0.0), 1.0)  # rough normalize

        # Ensemble
        fraud_probability = 0.7 * xgb_prob + 0.3 * iso_prob
        fraud_probability = min(max(fraud_probability, 0.0), 1.0)

        risk_score = int(round(fraud_probability * 100))
        latency_ms = int((time.time() - t0) * 1000)

        # SHAP explanations
        shap_features = self._explain(feature_vector, features)

        # Flags
        flags = self._derive_flags(features)

        return {
            "fraud_probability": round(fraud_probability, 4),
            "risk_score": risk_score,
            "features": features,
            "explanations": shap_features,
            "flags": flags,
            "latency_ms": latency_ms,
        }

    def _explain(
        self,
        feature_vector: np.ndarray,
        features: Dict[str, float],
    ) -> List[Dict[str, Any]]:
        """Generate SHAP-like explanations using XGBoost feature importances + local values."""
        # Use XGBoost's built-in feature importance as a proxy for SHAP when shap is unavailable
        try:
            import shap
            explainer = shap.TreeExplainer(self.xgb_model)
            shap_values = explainer.shap_values(feature_vector)[0]  # for class 1 (fraud)

            results = []
            for i, fname in enumerate(FEATURE_NAMES):
                impact = float(shap_values[i])
                results.append({
                    "feature": fname,
                    "label": FEATURE_LABELS.get(fname, fname),
                    "value": float(features[fname]),
                    "impact": round(impact, 4),
                    "direction": "increases_risk" if impact > 0 else "decreases_risk",
                })

            # Sort by absolute impact, take top 5
            results.sort(key=lambda x: abs(x["impact"]), reverse=True)
            return results[:5]

        except Exception:
            # Fallback: use feature values × global importances
            importances = self.xgb_model.feature_importances_
            results = []
            for i, fname in enumerate(FEATURE_NAMES):
                val = features[fname]
                impact = float(importances[i] * val)
                results.append({
                    "feature": fname,
                    "label": FEATURE_LABELS.get(fname, fname),
                    "value": round(val, 4),
                    "impact": round(impact, 4),
                    "direction": "increases_risk" if val > 0.3 else "decreases_risk",
                })
            results.sort(key=lambda x: abs(x["impact"]), reverse=True)
            return results[:5]

    def _derive_flags(self, features: Dict[str, float]) -> List[str]:
        """Convert high-risk feature values to human-readable flags."""
        flags = []
        if features.get("impossible_travel", 0) > 0.5:
            flags.append("IMPOSSIBLE_TRAVEL")
        if features.get("vpn_flag", 0) > 0.5:
            flags.append("VPN_DETECTED")
        if features.get("tor_flag", 0) > 0.5:
            flags.append("TOR_NETWORK")
        if features.get("emulator_flag", 0) > 0.5:
            flags.append("EMULATOR_DETECTED")
        if features.get("rooted_flag", 0) > 0.5:
            flags.append("ROOTED_DEVICE")
        if features.get("is_new_device", 0) > 0.5:
            flags.append("NEW_DEVICE")
        if features.get("amount_zscore", 0) > 0.5:
            flags.append("UNUSUAL_AMOUNT")
        if features.get("velocity_1min", 0) > 0.5:
            flags.append("HIGH_VELOCITY")
        if features.get("country_mismatch", 0) > 0.5:
            flags.append("COUNTRY_MISMATCH")
        if features.get("is_night", 0) > 0.5:
            flags.append("NIGHT_TRANSACTION")
        if features.get("failed_otp_attempts", 0) > 0.3:
            flags.append("FAILED_OTP")
        return flags


# Singleton instance
_engine_instance: Optional[FraudMLEngine] = None


def get_ml_engine() -> FraudMLEngine:
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = FraudMLEngine()
        _engine_instance.train()
    return _engine_instance
