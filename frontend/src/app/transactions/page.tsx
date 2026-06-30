"use client";
import { useState, useEffect, useCallback } from "react";
import { api, formatAmount, formatDate } from "@/lib/api";
import { RiskBadge, DecisionBadge, ScoreGauge, FlagPill, ShapBar, StatCard } from "@/components/ui";
import type { TransactionSummary } from "@/types";
import { Search, Filter, X, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

const RISK_FILTERS = ["ALL", "HIGH", "MEDIUM", "LOW"];
const STATUS_FILTERS = ["ALL", "BLOCKED", "PENDING", "APPROVED"];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: 20 };
      if (riskFilter !== "ALL") params.risk_level = riskFilter;
      if (statusFilter !== "ALL") params.status = statusFilter;
      const data = await api.transactions.list(params) as { transactions: TransactionSummary[]; total: number };
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
    } catch {
      // Demo fallback
      setTransactions(DEMO_TRANSACTIONS);
      setTotal(DEMO_TRANSACTIONS.length);
    } finally {
      setLoading(false);
    }
  }, [page, riskFilter, statusFilter]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const openDetail = async (id: string) => {
    setSelected(id);
    try {
      const d = await api.transactions.get(id);
      setDetail(d as Record<string, unknown>);
    } catch {
      setDetail(null);
    }
  };

  const filtered = search
    ? transactions.filter((t) =>
        t.user_id.toLowerCase().includes(search.toLowerCase()) ||
        t.id.toLowerCase().includes(search.toLowerCase()) ||
        t.merchant_id.toLowerCase().includes(search.toLowerCase())
      )
    : transactions;

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.4px" }}>Transactions</h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
              {total.toLocaleString()} total · Click any row for details & SHAP explanations
            </p>
          </div>
          <button className="btn btn-ghost" onClick={fetchTransactions}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginTop: 16, alignItems: "center", flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, txn ID…"
              style={{
                background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
                borderRadius: 8, padding: "7px 12px 7px 30px", fontSize: 12,
                color: "var(--text-primary)", outline: "none", width: 200,
              }}
            />
          </div>

          {/* Risk filter */}
          <div style={{ display: "flex", gap: 4 }}>
            {RISK_FILTERS.map((f) => (
              <button
                key={f}
                className="btn btn-ghost"
                onClick={() => { setRiskFilter(f); setPage(1); }}
                style={{
                  padding: "5px 12px", fontSize: 11,
                  background: riskFilter === f ? "rgba(99,102,241,0.15)" : "transparent",
                  color: riskFilter === f ? "var(--brand-primary)" : "var(--text-muted)",
                  border: riskFilter === f ? "1px solid rgba(99,102,241,0.3)" : "1px solid var(--border-subtle)",
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div style={{ display: "flex", gap: 4 }}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                className="btn btn-ghost"
                onClick={() => { setStatusFilter(f); setPage(1); }}
                style={{
                  padding: "5px 12px", fontSize: 11,
                  background: statusFilter === f ? "rgba(99,102,241,0.15)" : "transparent",
                  color: statusFilter === f ? "var(--brand-primary)" : "var(--text-muted)",
                  border: statusFilter === f ? "1px solid rgba(99,102,241,0.3)" : "1px solid var(--border-subtle)",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>User</th>
                  <th>Amount</th>
                  <th>Merchant</th>
                  <th>Location</th>
                  <th>Risk Score</th>
                  <th>Risk Level</th>
                  <th>Decision</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j}><div className="skeleton" style={{ height: 14, width: "80%" }} /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => openDetail(t.id)}
                    style={{ cursor: "pointer", background: selected === t.id ? "rgba(99,102,241,0.06)" : "" }}
                  >
                    <td>
                      <span className="font-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {t.id.slice(0, 12)}…
                      </span>
                    </td>
                    <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{t.user_id}</td>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{formatAmount(t.amount, t.currency)}</td>
                    <td>{t.merchant_id}</td>
                    <td>{t.city}, {t.country}</td>
                    <td>
                      {t.risk_score != null ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <ScoreGauge score={t.risk_score} size={32} />
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{t.risk_score}</span>
                        </div>
                      ) : "—"}
                    </td>
                    <td><RiskBadge level={t.risk_level} /></td>
                    <td><DecisionBadge decision={t.decision} /></td>
                    <td style={{ fontSize: 11, whiteSpace: "nowrap" }}>{formatDate(t.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "6px 10px" }}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Page {page} of {totalPages}</span>
              <button className="btn btn-ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: "6px 10px" }}>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      {selected && (
        <>
          <div className="drawer-overlay" onClick={() => setSelected(null)} />
          <aside className="drawer-panel">
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => setSelected(null)} style={{ padding: "6px 8px" }}>
                <X size={14} />
              </button>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Transaction Detail</div>
                <div className="font-mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>{selected}</div>
              </div>
            </div>

            {detail ? (
              <div style={{ padding: "20px 24px" }}>
                {/* Score */}
                <div style={{ display: "flex", gap: 20, marginBottom: 20, alignItems: "center" }}>
                  <ScoreGauge score={(detail.risk_score as number) ?? 0} size={72} />
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
                      {formatAmount((detail.amount as number) ?? 0)}
                    </div>
                    <RiskBadge level={detail.risk_level as string} />
                    <span style={{ margin: "0 6px" }} />
                    <DecisionBadge decision={detail.decision as string} />
                  </div>
                </div>

                {/* Details */}
                <div className="card" style={{ padding: 14, marginBottom: 16 }}>
                  {[
                    ["User", detail.user_id],
                    ["Merchant", detail.merchant_id],
                    ["Location", `${detail.city}, ${detail.country}`],
                    ["Device", detail.device_fingerprint || "Unknown"],
                    ["VPN", (detail.vpn_detected as boolean) ? "Yes ⚠" : "No"],
                    ["Latency", `${detail.latency_ms}ms`],
                    ["Fraud Probability", `${((detail.fraud_probability as number) * 100).toFixed(1)}%`],
                  ].map(([k, v]) => (
                    <div key={String(k)} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{k}</span>
                      <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>{String(v)}</span>
                    </div>
                  ))}
                </div>

                {/* Flags */}
                {((detail.flags as string[]) || []).length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 8 }}>
                      Fraud Signals
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {((detail.flags as string[]) || []).map((f: string) => <FlagPill key={f} flag={f} />)}
                    </div>
                  </div>
                )}

                {/* SHAP */}
                {((detail.explanations as unknown[]) || []).length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 12 }}>
                      AI Explanation (Top Factors)
                    </div>
                    {((detail.explanations as { label: string; impact: number; direction: string }[]) || []).map((f) => (
                      <ShapBar
                        key={f.label}
                        feature={f}
                        maxImpact={Math.max(...((detail.explanations as { impact: number }[]) || []).map((e) => Math.abs(e.impact)))}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: 32, textAlign: "center" }}>
                <div className="spinner" style={{ margin: "0 auto" }} />
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 12 }}>Loading details…</p>
              </div>
            )}
          </aside>
        </>
      )}
    </div>
  );
}

const DEMO_TRANSACTIONS: TransactionSummary[] = Array.from({ length: 15 }, (_, i) => ({
  id: `txn-${Math.random().toString(36).slice(2, 14)}`,
  user_id: `USR${String(i + 1).padStart(4, "0")}`,
  amount: Math.random() * 4000 + 50,
  currency: "USD",
  merchant_id: ["Amazon", "Binance", "Starbucks", "Unknown Vendor", "Casino Royal"][i % 5],
  country: ["US", "IN", "GB", "RU", "NG"][i % 5],
  city: ["New York", "Bangalore", "London", "Moscow", "Lagos"][i % 5],
  fraud_probability: Math.random(),
  risk_score: Math.floor(Math.random() * 100),
  risk_level: (["HIGH", "MEDIUM", "LOW"] as const)[Math.floor(Math.random() * 3)],
  decision: (["BLOCK", "HOLD", "APPROVE"] as const)[Math.floor(Math.random() * 3)],
  status: "PENDING",
  flags: i % 3 === 0 ? ["VPN_DETECTED", "NEW_DEVICE"] : [],
  timestamp: new Date(Date.now() - i * 120000).toISOString(),
}));
