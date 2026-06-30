"use client";
import React, { useState } from "react";
import { api, formatAmount, riskColor } from "@/lib/api";
import { DecisionBadge, ScoreGauge } from "@/components/ui";
import { Cpu, Play, HelpCircle, Shield, AlertTriangle, CheckCircle, Clock } from "lucide-react";

const MERCHANTS = [
  { id: "MCH001", name: "Amazon", category: "e-commerce" },
  { id: "MCH002", name: "Starbucks", category: "food" },
  { id: "MCH004", name: "Walmart", category: "retail" },
  { id: "MCH007", name: "Binance", category: "crypto" },
  { id: "MCH009", name: "Casino Royal", category: "gambling" },
];

const LOCATIONS = [
  { code: "US", city: "New York", lat: 40.71, lng: -74.01 },
  { code: "IN", city: "Bangalore", lat: 12.97, lng: 77.59 },
  { code: "GB", city: "London", lat: 51.51, lng: -0.13 },
  { code: "RU", city: "Moscow", lat: 55.75, lng: 37.62 },
  { code: "BR", city: "São Paulo", lat: -23.55, lng: -46.63 },
];

export default function PlaygroundPage() {
  const [userId, setUserId] = useState("USR0015");
  const [amount, setAmount] = useState(150);
  const [merchantIdx, setMerchantIdx] = useState(0);
  const [locationIdx, setLocationIdx] = useState(0);
  const [vpn, setVpn] = useState(false);
  const [tor, setTor] = useState(false);
  const [rooted, setRooted] = useState(false);
  const [emulator, setEmulator] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  async function handleAnalyze() {
    setLoading(true);
    const merchant = MERCHANTS[merchantIdx];
    const loc = LOCATIONS[locationIdx];

    const payload = {
      transaction_id: `play-${Math.random().toString(36).slice(2, 10)}`,
      user_id: userId,
      amount: parseFloat(amount.toString()),
      currency: "USD",
      merchant_id: merchant.id,
      merchant_category: merchant.category,
      location: {
        country: loc.code,
        city: loc.city,
        lat: loc.lat,
        lng: loc.lng,
      },
      device: {
        fingerprint: `DEV-PLAY-${userId ? userId.slice(-4) : "99"}`,
        type: "mobile",
        vpn: vpn,
        tor: tor,
        emulator: emulator,
        rooted: rooted,
      },
      timestamp: new Date().toISOString(),
    };

    try {
      const data = await api.transactions.analyze(payload);
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Failed to analyze transaction");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.4px" }}>Interactive ML Playground</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
          Simulate transactions, trigger custom rules, and inspect real-time SHAP local model explanations.
        </p>
      </div>

      <div className="page-body" style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 20 }}>
        
        {/* Simulator Inputs */}
        <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 12 }}>
            <Cpu size={16} color="var(--brand-primary)" />
            <div style={{ fontSize: 13, fontWeight: 600 }}>Configure Custom Transaction</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>User ID</label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                style={{ width: "100%", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "7px 10px", color: "white", fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Merchant</label>
              <select
                value={merchantIdx}
                onChange={(e) => setMerchantIdx(Number(e.target.value))}
                style={{ width: "100%", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "7px 10px", color: "white", fontSize: 12 }}
              >
                {MERCHANTS.map((m, idx) => (
                  <option key={m.id} value={idx}>{m.name} ({m.category})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Transaction Amount</label>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--brand-primary)" }}>{formatAmount(amount)}</span>
            </div>
            <input
              type="range"
              min="5"
              max="10000"
              step="5"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--brand-primary)", cursor: "pointer" }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Location</label>
            <select
              value={locationIdx}
              onChange={(e) => setLocationIdx(Number(e.target.value))}
              style={{ width: "100%", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "7px 10px", color: "white", fontSize: 12 }}
            >
              {LOCATIONS.map((loc, idx) => (
                <option key={loc.code} value={idx}>{loc.city}, {loc.code} (Lat: {loc.lat}, Lng: {loc.lng})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 8 }}>Device Indicators</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "VPN Enabled", val: vpn, set: setVpn },
                { label: "TOR Connection", val: tor, set: setTor },
                { label: "Rooted Device", val: rooted, set: setRooted },
                { label: "Emulator Detected", val: emulator, set: setEmulator },
              ].map((item) => (
                <label key={item.label} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  padding: "8px 10px",
                  borderRadius: 6,
                  cursor: "pointer"
                }}>
                  <input
                    type="checkbox"
                    checked={item.val}
                    onChange={(e) => item.set(e.target.checked)}
                    style={{ accentColor: "var(--brand-primary)" }}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="btn btn-primary"
            style={{
              marginTop: 8,
              width: "100%",
              justifyContent: "center",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer"
            }}
          >
            <Play size={14} />
            {loading ? "Evaluating Transaction..." : "Evaluate Transaction"}
          </button>
        </div>

        {/* Evaluation Output & SHAP Explainer */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {!result ? (
            <div className="card" style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 40,
              textAlign: "center",
              color: "var(--text-muted)",
              minHeight: 350
            }}>
              <HelpCircle size={36} color="var(--border-default)" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Awaiting Analysis</div>
              <p style={{ fontSize: 12, maxWidth: 260, marginTop: 4 }}>
                Configure parameters on the left and run the evaluation to inspect machine learning factors.
              </p>
            </div>
          ) : (
            <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
              
              {/* Header metrics */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)", paddingBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <ScoreGauge score={result.risk_score} size={64} />
                  <div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>ML Ensemble Risk Score</div>
                    <div style={{ fontSize: 24, fontWeight: 800, marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
                      {result.risk_score}
                      <span style={{ fontSize: 12, fontWeight: 600, color: riskColor(result.risk_level) }}>
                        ({result.risk_level})
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Action Decision</div>
                  <div style={{ marginTop: 4 }}>
                    <DecisionBadge decision={result.decision} />
                  </div>
                </div>
              </div>

              {/* Signals / Threat indicators */}
              {result.flags.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                    Triggered Signals
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {result.flags.map((flag: string) => {
                      const isRule = flag.startsWith("RULE_TRIGGERED:");
                      return (
                        <span
                          key={flag}
                          style={{
                            padding: "3px 8px",
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            background: isRule ? "rgba(139,92,246,0.15)" : "rgba(239,68,68,0.1)",
                            color: isRule ? "#a78bfa" : "var(--risk-high)",
                            border: isRule ? "1px solid rgba(139,92,246,0.3)" : "1px solid rgba(239,68,68,0.2)",
                          }}
                        >
                          {flag.replace(/_/g, " ")}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SHAP Explanation visual chart */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
                  SHAP Explanation (Local Feature Attribution)
                </div>

                <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16 }}>
                  Attribution weights indicating which transaction features pushed the risk score higher (red) or lower (green).
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {result.explanations?.map((exp: any) => {
                    const pct = Math.min(Math.abs(exp.impact) * 20, 100); // Scale SHAP value for visualization
                    const increases = exp.direction === "increases_risk";

                    return (
                      <div key={exp.feature}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                          <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{exp.label}</span>
                          <span style={{ fontWeight: 600, color: increases ? "var(--risk-high)" : "var(--risk-low)" }}>
                            {increases ? "+" : ""}{exp.impact.toFixed(2)}
                          </span>
                        </div>

                        {/* Double sided progress bar simulation */}
                        <div style={{
                          height: 8,
                          background: "var(--bg-elevated)",
                          borderRadius: 4,
                          position: "relative",
                          overflow: "hidden"
                        }}>
                          <div style={{
                            position: "absolute",
                            top: 0,
                            bottom: 0,
                            left: increases ? "50%" : undefined,
                            right: !increases ? "50%" : undefined,
                            width: `${pct / 2}%`,
                            background: increases ? "var(--risk-high)" : "var(--risk-low)",
                            borderRadius: 4
                          }} />
                          {/* Center line marker */}
                          <div style={{
                            position: "absolute",
                            top: 0,
                            bottom: 0,
                            left: "50%",
                            width: 1,
                            background: "rgba(255,255,255,0.15)"
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
                <span>Latency: {result.latency_ms}ms</span>
                <span>Ensemble: XGBoost 70% + IsoForest 30%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
