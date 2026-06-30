"use client";
import { scoreToColor } from "@/lib/api";
import type { RiskLevel } from "@/types";

interface RiskBadgeProps {
  level: RiskLevel | string | null;
  size?: "sm" | "md";
}

export function RiskBadge({ level, size = "md" }: RiskBadgeProps) {
  const l = level || "LOW";
  return (
    <span className={`risk-badge ${l}`} style={{ fontSize: size === "sm" ? 10 : 11 }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
      {l}
    </span>
  );
}

interface ScoreGaugeProps {
  score: number;
  size?: number;
}

export function ScoreGauge({ score, size = 56 }: ScoreGaugeProps) {
  const color = scoreToColor(score);
  const radius = (size - 6) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.3s ease" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column",
      }}>
        <span style={{ fontSize: size > 50 ? 13 : 10, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
      </div>
    </div>
  );
}

interface DecisionBadgeProps {
  decision: string | null;
}

export function DecisionBadge({ decision }: DecisionBadgeProps) {
  const d = decision || "APPROVE";
  const icons: Record<string, string> = { BLOCK: "🛑", HOLD: "⏸", APPROVE: "✅" };
  return (
    <span className={`decision-badge ${d}`}>
      {icons[d]} {d}
    </span>
  );
}

interface FlagPillProps {
  flag: string;
}

export function FlagPill({ flag }: FlagPillProps) {
  const labels: Record<string, string> = {
    IMPOSSIBLE_TRAVEL: "✈ Impossible Travel",
    VPN_DETECTED: "🔒 VPN",
    TOR_NETWORK: "🧅 TOR",
    EMULATOR_DETECTED: "📱 Emulator",
    ROOTED_DEVICE: "⚠ Rooted",
    NEW_DEVICE: "📲 New Device",
    UNUSUAL_AMOUNT: "💰 Unusual Amount",
    HIGH_VELOCITY: "⚡ High Velocity",
    COUNTRY_MISMATCH: "🌍 Country Mismatch",
    NIGHT_TRANSACTION: "🌙 Night",
    FAILED_OTP: "🔑 Failed OTP",
  };
  return (
    <span className="flag-pill">{labels[flag] || flag}</span>
  );
}

interface ShapBarProps {
  feature: { label: string; impact: number; direction: string };
  maxImpact: number;
}

export function ShapBar({ feature, maxImpact }: ShapBarProps) {
  const pct = maxImpact > 0 ? Math.abs(feature.impact) / maxImpact : 0;
  const isRisk = feature.direction === "increases_risk";
  const color = isRisk ? "var(--risk-high)" : "var(--risk-low)";
  const bg = isRisk ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)";

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: "70%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {feature.label}
        </span>
        <span style={{ fontSize: 11, color, fontWeight: 600 }}>
          {isRisk ? "↑" : "↓"} {(feature.impact * 100).toFixed(1)}%
        </span>
      </div>
      <div className="risk-bar">
        <div
          className="risk-bar-fill"
          style={{ width: `${pct * 100}%`, background: color }}
        />
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  accent?: string;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
}

export function StatCard({ label, value, subtitle, accent = "var(--brand-primary)", icon, trend }: StatCardProps) {
  return (
    <div className="stat-card" style={{ "--accent": accent } as React.CSSProperties}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px" }}>
          {label}
        </div>
        {icon && (
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `${accent}18`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-1px", lineHeight: 1 }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{subtitle}</div>
      )}
      {trend && (
        <div style={{
          marginTop: 8, display: "flex", alignItems: "center", gap: 4,
          fontSize: 12, color: trend.value >= 0 ? "var(--risk-high)" : "var(--risk-low)",
        }}>
          <span>{trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%</span>
          <span style={{ color: "var(--text-muted)" }}>{trend.label}</span>
        </div>
      )}
    </div>
  );
}
