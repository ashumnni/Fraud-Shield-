"use client";
import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Play, Square, Save, Cpu, Sliders, Trash, Plus, Check, ToggleLeft, ToggleRight } from "lucide-react";

export default function SettingsPage() {
  const [thresholdMedium, setThresholdMedium] = useState(30);
  const [thresholdHigh, setThresholdHigh] = useState(65);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [simRunning, setSimRunning] = useState(false);
  const [simStats, setSimStats] = useState({ generated: 0, fraud: 0 });
  const [simLoading, setSimLoading] = useState(false);

  // Custom Rules State
  const [rules, setRules] = useState<any[]>([]);
  const [newRule, setNewRule] = useState({
    name: "",
    field: "amount",
    operator: ">",
    value: "",
    action: "BLOCK"
  });
  const [rulesLoading, setRulesLoading] = useState(false);

  // Load backend configuration
  useEffect(() => {
    async function loadData() {
      try {
        const settings = await api.settings.get();
        setThresholdMedium(settings.threshold_medium);
        setThresholdHigh(settings.threshold_high);
      } catch (err) {
        console.error("Failed to load thresholds from backend, using defaults", err);
      }

      try {
        const status = await api.simulator.status();
        setSimRunning(status.running);
        setSimStats({
          generated: status.transactions_generated,
          fraud: status.fraud_generated,
        });
      } catch (err) {
        console.error("Failed to load simulator status", err);
      }

      loadRules();
    }
    loadData();

    // Poll simulator status every 3s
    const timer = setInterval(async () => {
      try {
        const status = await api.simulator.status();
        setSimRunning(status.running);
        setSimStats({
          generated: status.transactions_generated,
          fraud: status.fraud_generated,
        });
      } catch {
        // fail silently during polling
      }
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  async function loadRules() {
    try {
      const data = await api.settings.getRules();
      setRules(data || []);
    } catch (err) {
      console.error("Failed to load rules", err);
    }
  }

  async function handleSaveThresholds() {
    setSaving(true);
    setSuccessMsg("");
    try {
      await api.settings.update({
        threshold_medium: thresholdMedium,
        threshold_high: thresholdHigh,
      });
      setSuccessMsg("Configuration saved successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to save thresholds to backend.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleSimulator() {
    setSimLoading(true);
    try {
      if (simRunning) {
        await api.simulator.stop();
        setSimRunning(false);
      } else {
        await api.simulator.start();
        setSimRunning(true);
      }
      // Immediate update
      const status = await api.simulator.status();
      setSimStats({
        generated: status.transactions_generated,
        fraud: status.fraud_generated,
      });
    } catch (err) {
      console.error(err);
      alert("Failed to toggle simulator state.");
    } finally {
      setSimLoading(false);
    }
  }

  async function handleAddRule(e: React.FormEvent) {
    e.preventDefault();
    if (!newRule.name || !newRule.value) {
      alert("Please fill in rule name and value");
      return;
    }
    setRulesLoading(true);
    try {
      await api.settings.createRule(newRule);
      setNewRule({
        name: "",
        field: "amount",
        operator: ">",
        value: "",
        action: "BLOCK"
      });
      loadRules();
    } catch (err) {
      console.error(err);
      alert("Failed to create rule");
    } finally {
      setRulesLoading(false);
    }
  }

  async function toggleRule(id: string) {
    try {
      await api.settings.toggleRule(id);
      loadRules();
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteRule(id: string) {
    try {
      await api.settings.deleteRule(id);
      loadRules();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.4px" }}>Settings</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
          Configure fraud detection thresholds, model configurations, custom engine rules, and live simulator status
        </p>
      </div>

      <div className="page-body">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          
          {/* Risk Thresholds Settings */}
          <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sliders size={18} color="var(--brand-primary)" />
              <div style={{ fontSize: 14, fontWeight: 600 }}>Risk Score Thresholds</div>
            </div>

            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Customize score cutoff thresholds. Transactions scoring below Medium are approved. Transactions scoring above High are automatically blocked, and those in-between are held for investigation.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Medium Risk Threshold (Hold for Review)</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--risk-medium)" }}>≥ {thresholdMedium}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="90"
                  value={thresholdMedium}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setThresholdMedium(val);
                    if (val >= thresholdHigh) {
                      setThresholdHigh(val + 5);
                    }
                  }}
                  style={{ width: "100%", accentColor: "var(--risk-medium)", cursor: "pointer" }}
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>High Risk Threshold (Auto Block)</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--risk-high)" }}>≥ {thresholdHigh}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="95"
                  value={thresholdHigh}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setThresholdHigh(val);
                    if (val <= thresholdMedium) {
                      setThresholdMedium(val - 5);
                    }
                  }}
                  style={{ width: "100%", accentColor: "var(--risk-high)", cursor: "pointer" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
              <button
                onClick={handleSaveThresholds}
                disabled={saving}
                className="btn btn-primary"
                style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
              >
                <Save size={14} />
                {saving ? "Saving..." : "Save Configuration"}
              </button>
              {successMsg && (
                <span style={{ fontSize: 12, color: "var(--risk-low)", fontWeight: 500 }}>
                  {successMsg}
                </span>
              )}
            </div>
          </div>

          {/* Simulator Control Panel */}
          <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Cpu size={18} color="var(--brand-primary)" />
              <div style={{ fontSize: 14, fontWeight: 600 }}>Live Simulator Control</div>
            </div>

            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Manage the background transaction simulator to generate real-time events. Live transactions are analyzed by the ML engine and stored directly in the SQLite database.
            </p>

            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 16,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 8
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className={simRunning ? "live-dot" : undefined} style={!simRunning ? { width: 8, height: 8, borderRadius: "50%", background: "var(--text-muted)" } : undefined} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    Status: {simRunning ? "ACTIVE" : "STOPPED"}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  Polling real-time database state
                </div>
              </div>

              <button
                onClick={toggleSimulator}
                disabled={simLoading}
                className={`btn ${simRunning ? "btn-danger" : "btn-primary"}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  background: simRunning ? "var(--risk-high)" : "var(--brand-primary)",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: 6,
                  color: "white",
                  fontWeight: 600,
                  fontSize: 12
                }}
              >
                {simRunning ? <Square size={12} /> : <Play size={12} />}
                {simRunning ? "Stop Simulator" : "Start Simulator"}
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ padding: 12, border: "1px solid var(--border-subtle)", borderRadius: 6 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Simulated Transactions</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{simStats.generated}</div>
              </div>
              <div style={{ padding: 12, border: "1px solid var(--border-subtle)", borderRadius: 6 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Auto-Blocked Fraud</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: "var(--risk-high)" }}>{simStats.fraud}</div>
              </div>
            </div>
          </div>

          {/* Custom Rules Engine (Full Width Grid Element) */}
          <div className="card" style={{ padding: 24, gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sliders size={18} color="var(--brand-primary)" />
              <div style={{ fontSize: 14, fontWeight: 600 }}>Custom Hybrid Rules Manager</div>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
              Create strict conditional logic rules. Triggered rules instantly override the ML model probability and mark transactions as <strong>BLOCKED</strong> or <strong>HOLD</strong>, appending rule tags automatically.
            </p>

            {/* Create Rule Form */}
            <form onSubmit={handleAddRule} style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "flex-end",
              padding: 16,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 8
            }}>
              <div style={{ flex: 2, minWidth: 150 }}>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Rule Name</label>
                <input
                  type="text"
                  placeholder="e.g. Block High VPN Transactions"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  style={{ width: "100%", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "7px 10px", color: "white", fontSize: 12 }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 100 }}>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Field</label>
                <select
                  value={newRule.field}
                  onChange={(e) => setNewRule({ ...newRule, field: e.target.value })}
                  style={{ width: "100%", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "7px 10px", color: "white", fontSize: 12 }}
                >
                  <option value="amount">Amount ($)</option>
                  <option value="vpn_detected">VPN Detected</option>
                  <option value="tor_detected">TOR Detected</option>
                  <option value="country">Country Code</option>
                </select>
              </div>

              <div style={{ flex: 0.8, minWidth: 80 }}>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Operator</label>
                <select
                  value={newRule.operator}
                  onChange={(e) => setNewRule({ ...newRule, operator: e.target.value })}
                  style={{ width: "100%", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "7px 10px", color: "white", fontSize: 12 }}
                >
                  <option value=">">&gt;</option>
                  <option value="<">&lt;</option>
                  <option value="==">==</option>
                  <option value="!=">!=</option>
                  <option value="contains">contains</option>
                </select>
              </div>

              <div style={{ flex: 1.2, minWidth: 100 }}>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Target Value</label>
                <input
                  type="text"
                  placeholder="e.g. 5000 or true or RU"
                  value={newRule.value}
                  onChange={(e) => setNewRule({ ...newRule, value: e.target.value })}
                  style={{ width: "100%", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "7px 10px", color: "white", fontSize: 12 }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 100 }}>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Action</label>
                <select
                  value={newRule.action}
                  onChange={(e) => setNewRule({ ...newRule, action: e.target.value })}
                  style={{ width: "100%", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "7px 10px", color: "white", fontSize: 12 }}
                >
                  <option value="BLOCK">BLOCK</option>
                  <option value="HOLD">HOLD (Review)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={rulesLoading}
                className="btn btn-primary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: "var(--brand-primary)",
                  border: "none",
                  color: "white",
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: "pointer"
                }}
              >
                <Plus size={14} /> Add Rule
              </button>
            </form>

            {/* Rules List Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)", textAlign: "left" }}>
                    <th style={{ padding: "8px 12px", color: "var(--text-muted)" }}>Rule Name</th>
                    <th style={{ padding: "8px 12px", color: "var(--text-muted)" }}>Condition</th>
                    <th style={{ padding: "8px 12px", color: "var(--text-muted)" }}>Action</th>
                    <th style={{ padding: "8px 12px", color: "var(--text-muted)" }}>Status</th>
                    <th style={{ padding: "8px 12px", color: "var(--text-muted)", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
                        No custom rules configured. Add your first rule above!
                      </td>
                    </tr>
                  ) : (
                    rules.map((rule) => (
                      <tr key={rule.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <td style={{ padding: "10px 12px", fontWeight: 600 }}>{rule.name}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ fontFamily: "var(--font-mono)", background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 4 }}>
                            {rule.field} {rule.operator} {rule.value}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{
                            padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                            background: rule.action === "BLOCK" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.1)",
                            color: rule.action === "BLOCK" ? "var(--risk-high)" : "var(--risk-medium)"
                          }}>
                            {rule.action}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <button
                            onClick={() => toggleRule(rule.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}
                          >
                            {rule.is_active ? (
                              <ToggleRight size={22} color="var(--risk-low)" />
                            ) : (
                              <ToggleLeft size={22} color="var(--text-muted)" />
                            )}
                          </button>
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right" }}>
                          <button
                            onClick={() => deleteRule(rule.id)}
                            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}
                            onMouseEnter={(e) => e.currentTarget.style.color = "var(--risk-high)"}
                            onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
                          >
                            <Trash size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Model Configuration Information */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>ML Model Configuration</div>
            {[
              ["Active Model", "XGBoost + Isolation Forest Ensemble"],
              ["Ensemble Weights", "XGBoost (70%) / Isolation Forest (30%)"],
              ["Training Data Size", "30,000 synthetic transactions"],
              ["Engine Status", "SHAP Explainability Enabled"],
              ["Feature Count", "20+ Derived Behavioral Features"],
              ["Latency Target", "< 10ms (Real-time scoring)"],
            ].map(([k, v]) => (
              <div key={String(k)} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{k}</span>
                <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* API Info */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>System Architecture Endpoints</div>
            {[
              ["Backend REST API", "http://localhost:8000"],
              ["Auto-Generated API Docs", "http://localhost:8000/docs"],
              ["Health Check Endpoint", "http://localhost:8000/health"],
              ["Live Event SSE Stream", "http://localhost:8000/api/v1/stream"],
              ["Frontend Dashboard Port", "http://localhost:3002"],
            ].map(([k, v]) => (
              <div key={String(k)} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{k}</span>
                <a href={String(v)} target="_blank" style={{ fontSize: 11, color: "var(--brand-primary)", fontFamily: "var(--font-mono)", textDecoration: "none" }}>{v}</a>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
