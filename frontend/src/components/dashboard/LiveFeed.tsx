"use client";
import { useSSE } from "@/hooks/useSSE";
import { DecisionBadge, RiskBadge, ScoreGauge } from "@/components/ui";
import { formatAmount, formatDate } from "@/lib/api";
import { Wifi, WifiOff } from "lucide-react";

export function LiveFeed() {
  const { events, connected } = useSSE(30);

  return (
    <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px 12px",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex", alignItems: "center", gap: 10,
        flexShrink: 0,
      }}>
        <span className={connected ? "live-dot" : undefined} style={!connected ? { width: 8, height: 8, borderRadius: "50%", background: "var(--text-muted)" } : undefined} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Live Transaction Feed</span>
        {connected
          ? <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--risk-low)" }}><Wifi size={11} /> Connected</span>
          : <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-muted)" }}><WifiOff size={11} /> Reconnecting…</span>
        }
      </div>

      {/* Feed */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {events.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            {connected ? "Waiting for transactions…" : "Connecting to live stream…"}
          </div>
        ) : (
          events.map((evt, i) => (
            <div
              key={evt.transaction_id + i}
              style={{
                padding: "10px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.03)",
                display: "flex", alignItems: "center", gap: 12,
                animation: i === 0 ? "fadeInUp 0.3s ease" : "none",
                opacity: 1 - i * 0.015,
              }}
            >
              <ScoreGauge score={evt.risk_score ?? 0} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                    {formatAmount(evt.amount, evt.currency)}
                  </span>
                  <RiskBadge level={evt.risk_level} size="sm" />
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {evt.user_id} · {evt.location?.city}, {evt.location?.country} · {formatDate(evt.timestamp)}
                </div>
              </div>
              <DecisionBadge decision={evt.decision} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
