"use client";
import { useState, useEffect } from "react";
import { api, formatAmount, formatDate } from "@/lib/api";
import { RiskBadge, ScoreGauge, FlagPill } from "@/components/ui";
import type { FraudCase } from "@/types";
import { AlertCircle, Clock, CheckCircle, ArrowUp, Snowflake, MessageSquare } from "lucide-react";

const COLUMNS = [
  { key: "NEW", label: "New Cases", icon: AlertCircle, color: "var(--risk-high)" },
  { key: "REVIEWING", label: "Under Review", icon: Clock, color: "var(--risk-medium)" },
  { key: "ESCALATED", label: "Escalated", icon: ArrowUp, color: "#8b5cf6" },
  { key: "RESOLVED_FRAUD", label: "Confirmed Fraud", icon: CheckCircle, color: "var(--risk-low)" },
];

const DEMO_CASES: FraudCase[] = Array.from({ length: 12 }, (_, i) => ({
  id: `case-${Math.random().toString(36).slice(2, 10)}`,
  transaction_id: `txn-${Math.random().toString(36).slice(2, 10)}`,
  user_id: `USR${String(i + 1).padStart(4, "0")}`,
  status: COLUMNS[i % 4].key,
  priority: ["CRITICAL", "HIGH", "MEDIUM"][i % 3],
  assigned_to: i % 3 === 0 ? "analyst@fraud-shield.io" : null,
  notes: i % 2 === 0 ? [{ analyst: "system", note: "Auto-flagged by ML engine", timestamp: new Date().toISOString() }] : [],
  created_at: new Date(Date.now() - i * 3600000).toISOString(),
  updated_at: new Date(Date.now() - i * 1800000).toISOString(),
  resolved_at: null,
  resolution: null,
  amount: Math.random() * 5000 + 100,
  merchant_id: ["Binance", "Casino Royal", "Unknown Vendor", "AliExpress"][i % 4],
  risk_score: Math.floor(Math.random() * 40 + 60),
  risk_level: "HIGH",
  flags: [["VPN_DETECTED", "IMPOSSIBLE_TRAVEL", "NEW_DEVICE", "HIGH_VELOCITY"][i % 4]],
}));

export default function InvestigationPage() {
  const [cases, setCases] = useState<FraudCase[]>([]);
  const [selected, setSelected] = useState<FraudCase | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await api.cases.list({ page_size: 100 }) as { cases: FraudCase[] };
        setCases(data.cases?.length ? data.cases : DEMO_CASES);
      } catch {
        setCases(DEMO_CASES);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function doAction(action: "freeze" | "escalate" | "resolve" | "legitimate" | "note") {
    if (!selected) return;
    setActionLoading(true);
    try {
      if (action === "freeze") {
        await api.cases.freeze(selected.id);
        const updatedNotes = [...selected.notes, { analyst: "Analyst", note: "Account frozen manually", timestamp: new Date().toISOString() }];
        const updatedCase = { ...selected, notes: updatedNotes };
        setSelected(updatedCase);
        setCases((prev) => prev.map((c) => c.id === selected.id ? updatedCase : c));
        setSuccessMsg("Account frozen successfully");
      } else if (action === "escalate") {
        await api.cases.escalate(selected.id);
        const updatedNotes = [...selected.notes, { analyst: "Analyst", note: "Case escalated to CRITICAL", timestamp: new Date().toISOString() }];
        const updatedCase = { ...selected, status: "ESCALATED", priority: "CRITICAL", notes: updatedNotes };
        setSelected(updatedCase);
        setCases((prev) => prev.map((c) => c.id === selected.id ? updatedCase : c));
        setSuccessMsg("Case escalated");
      } else if (action === "resolve") {
        await api.cases.update(selected.id, { status: "RESOLVED_FRAUD", resolution: "Confirmed fraud by analyst" });
        const updatedNotes = [...selected.notes, { analyst: "Analyst", note: "Resolved: Confirmed Fraud", timestamp: new Date().toISOString() }];
        const updatedCase = { ...selected, status: "RESOLVED_FRAUD", notes: updatedNotes };
        setSelected(updatedCase);
        setCases((prev) => prev.map((c) => c.id === selected.id ? updatedCase : c));
        setSuccessMsg("Case resolved as fraud");
      } else if (action === "legitimate") {
        await api.cases.update(selected.id, { status: "RESOLVED_LEGITIMATE", resolution: "Verified legitimate by analyst" });
        const updatedNotes = [...selected.notes, { analyst: "Analyst", note: "Resolved: Confirmed Legitimate", timestamp: new Date().toISOString() }];
        const updatedCase = { ...selected, status: "RESOLVED_LEGITIMATE", notes: updatedNotes };
        setSelected(updatedCase);
        setCases((prev) => prev.map((c) => c.id === selected.id ? updatedCase : c));
        setSuccessMsg("Case resolved as legitimate");
      } else if (action === "note" && note) {
        await api.cases.update(selected.id, { note, analyst: "Analyst" });
        const updatedNotes = [...selected.notes, { analyst: "Analyst", note, timestamp: new Date().toISOString() }];
        const updatedCase = { ...selected, notes: updatedNotes };
        setSelected(updatedCase);
        setCases((prev) => prev.map((c) => c.id === selected.id ? updatedCase : c));
        setNote("");
        setSuccessMsg("Note added");
      }
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch {
      setSuccessMsg("Action failed");
      setTimeout(() => setSuccessMsg(""), 2000);
    } finally {
      setActionLoading(false);
    }
  }

  const casesByStatus = (status: string) => cases.filter((c) => c.status === status);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.4px" }}>Investigation Portal</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
            {cases.length} active cases · Fraud analyst workspace
          </p>
        </div>
      </div>

      <div className="page-body" style={{ display: "flex", gap: 16, height: "calc(100vh - 120px)", overflow: "hidden" }}>
        {/* Kanban */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${COLUMNS.length}, 1fr)`, gap: 12, overflowY: "auto" }}>
          {COLUMNS.map(({ key, label, icon: Icon, color }) => (
            <div key={key} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Column header */}
              <div style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
                background: "var(--bg-card)", borderRadius: 10,
                border: "1px solid var(--border-subtle)", flexShrink: 0,
              }}>
                <Icon size={12} color={color} />
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>{label}</span>
                <span style={{
                  marginLeft: "auto", background: `${color}18`, color,
                  padding: "1px 6px", borderRadius: 5, fontSize: 10, fontWeight: 700,
                }}>
                  {casesByStatus(key).length}
                </span>
              </div>

              {/* Cases */}
              <div style={{ overflowY: "auto", flex: 1, paddingRight: 2 }}>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: 90, borderRadius: 12, marginBottom: 8 }} />
                  ))
                ) : casesByStatus(key).map((c) => (
                  <div
                    key={c.id}
                    className="case-card"
                    onClick={() => setSelected(c)}
                    style={{ border: selected?.id === c.id ? "1px solid var(--brand-primary)" : undefined }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{c.user_id}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{formatDate(c.created_at)}</div>
                      </div>
                      <ScoreGauge score={c.risk_score ?? 0} size={36} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                          {formatAmount(c.amount ?? 0)}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{c.merchant_id}</div>
                      </div>
                      <span style={{
                        padding: "2px 6px", borderRadius: 4,
                        fontSize: 9, fontWeight: 700, letterSpacing: "0.5px",
                        background: c.priority === "CRITICAL" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.1)",
                        color: c.priority === "CRITICAL" ? "var(--risk-high)" : "var(--risk-medium)",
                      }}>
                        {c.priority}
                      </span>
                    </div>
                    {c.flags.length > 0 && (
                      <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {c.flags.slice(0, 2).map((f) => <FlagPill key={f} flag={f} />)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Case Detail Panel */}
        {selected && (
          <div style={{
            width: 340, background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)", borderRadius: 16,
            display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0,
          }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Case Detail</div>
              <div className="font-mono" style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{selected.id}</div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {/* Summary */}
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
                <ScoreGauge score={selected.risk_score ?? 0} size={60} />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{formatAmount(selected.amount ?? 0)}</div>
                  <RiskBadge level={selected.risk_level} />
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{selected.merchant_id}</div>
                </div>
              </div>

              {/* Info */}
              <div className="card" style={{ padding: 12, marginBottom: 12 }}>
                {[
                  ["User", selected.user_id],
                  ["Status", selected.status],
                  ["Priority", selected.priority],
                  ["Assigned", selected.assigned_to || "Unassigned"],
                  ["Created", formatDate(selected.created_at)],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{k}</span>
                    <span style={{ fontSize: 11, color: "var(--text-primary)", fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Flags */}
              {selected.flags.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 6 }}>Signals</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {selected.flags.map((f) => <FlagPill key={f} flag={f} />)}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selected.notes.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 6 }}>
                    Audit Trail
                  </div>
                  {selected.notes.map((n, i) => (
                    <div key={i} style={{
                      background: "var(--bg-card)", borderRadius: 8, padding: "8px 10px", marginBottom: 6,
                      border: "1px solid var(--border-subtle)",
                    }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>
                        {n.analyst} · {formatDate(n.timestamp)}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{n.note}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add note */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 6 }}>
                  Add Note
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Write investigation note…"
                  style={{
                    width: "100%", background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
                    borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "var(--text-primary)",
                    resize: "none", outline: "none",
                  }}
                />
                <button className="btn btn-ghost" onClick={() => doAction("note")} style={{ marginTop: 6, width: "100%", justifyContent: "center", fontSize: 12 }}>
                  <MessageSquare size={12} /> Add Note
                </button>
              </div>

              {/* Success message */}
              {successMsg && (
                <div style={{
                  padding: "8px 12px", background: "rgba(16,185,129,0.1)",
                  border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8,
                  fontSize: 12, color: "var(--risk-low)", marginBottom: 12,
                }}>
                  ✅ {successMsg}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <button className="btn btn-danger" onClick={() => doAction("freeze")} disabled={actionLoading} style={{ justifyContent: "center", fontSize: 11 }}>
                  <Snowflake size={11} /> Freeze Account
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => doAction("escalate")}
                  disabled={actionLoading}
                  style={{ justifyContent: "center", fontSize: 11, color: "#8b5cf6", borderColor: "rgba(139,92,246,0.3)" }}
                >
                  <ArrowUp size={11} /> Escalate
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <button
                  className="btn"
                  onClick={() => doAction("resolve")}
                  disabled={actionLoading}
                  style={{ justifyContent: "center", fontSize: 11, background: "rgba(239,68,68,0.15)", color: "var(--risk-high)", border: "1px solid rgba(239,68,68,0.3)" }}
                >
                  Mark Fraud
                </button>
                <button
                  className="btn"
                  onClick={() => doAction("legitimate")}
                  disabled={actionLoading}
                  style={{ justifyContent: "center", fontSize: 11, background: "rgba(16,185,129,0.1)", color: "var(--risk-low)", border: "1px solid rgba(16,185,129,0.3)" }}
                >
                  Mark Legit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
