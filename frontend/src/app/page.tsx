import { api, formatAmount } from "@/lib/api";
import { StatCard } from "@/components/ui";
import { TrendChart, HourlyBar, RiskDonut, MerchantChart } from "@/components/charts";
import { LiveFeed } from "@/components/dashboard/LiveFeed";
import {
  AlertTriangle, ShieldOff, Clock, CheckCircle,
  DollarSign, Zap, Target, TrendingDown,
} from "lucide-react";
import type { DashboardSummary, TrendPoint, MerchantRisk } from "@/types";

async function getData() {
  try {
    const [summary, trends, velocity, merchants] = await Promise.all([
      api.analytics.summary() as Promise<DashboardSummary>,
      api.analytics.trends(30) as Promise<{ trends: TrendPoint[] }>,
      api.analytics.velocity() as Promise<{ heatmap: { hour: number; count: number; fraud: number }[] }>,
      api.analytics.merchants() as Promise<{ merchants: MerchantRisk[] }>,
    ]);
    return { summary, trends: trends.trends, velocity: velocity.heatmap, merchants: merchants.merchants };
  } catch {
    // Return demo data if backend not running
    const today = new Date();
    const trends: TrendPoint[] = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(today.getTime() - (29 - i) * 86400000).toISOString().slice(0, 10),
      fraud: Math.floor(Math.random() * 60 + 15),
      legitimate: Math.floor(Math.random() * 800 + 800),
      total: 0,
    })).map((d) => ({ ...d, total: d.fraud + d.legitimate }));

    return {
      summary: {
        fraud_today: 47, blocked_today: 38, under_review: 12,
        legitimate_today: 2841, fraud_amount_prevented: 189420,
        avg_detection_latency_ms: 43, false_positive_rate: 0.021,
        model_accuracy: 0.972, total_today: 2938,
      } as DashboardSummary,
      trends,
      velocity: Array.from({ length: 168 }, (_, i) => ({
        hour: i % 24, count: Math.floor(Math.random() * 200 + 20),
        fraud: Math.floor(Math.random() * 15),
      })),
      merchants: [
        { merchant_id: "M1", merchant_name: "Binance", category: "crypto", fraud_count: 87, total_count: 412, fraud_rate: 0.211 },
        { merchant_id: "M2", merchant_name: "Casino Royal", category: "gambling", fraud_count: 71, total_count: 234, fraud_rate: 0.303 },
        { merchant_id: "M3", merchant_name: "Unknown Vendor", category: "other", fraud_count: 62, total_count: 189, fraud_rate: 0.328 },
        { merchant_id: "M4", merchant_name: "AliExpress", category: "e-commerce", fraud_count: 44, total_count: 891, fraud_rate: 0.049 },
        { merchant_id: "M5", merchant_name: "Steam", category: "gaming", fraud_count: 31, total_count: 620, fraud_rate: 0.050 },
      ] as MerchantRisk[],
    };
  }
}

export default async function DashboardPage() {
  const { summary, trends, velocity, merchants } = await getData();

  const fraudPct = summary.total_today > 0
    ? ((summary.fraud_today / summary.total_today) * 100).toFixed(1)
    : "0.0";

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.4px" }}>
              Fraud Detection Dashboard
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
              Real-time monitoring · {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="live-dot" />
            <span style={{ fontSize: 12, color: "var(--risk-low)", fontWeight: 600 }}>Live</span>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* KPI Grid */}
        <div className="grid-cols-4" style={{ marginBottom: 24 }}>
          <StatCard
            label="Fraud Detected Today"
            value={summary.fraud_today.toLocaleString()}
            subtitle={`${fraudPct}% of total transactions`}
            accent="var(--risk-high)"
            icon={<AlertTriangle size={14} color="var(--risk-high)" />}
            trend={{ value: 12.4, label: "vs yesterday" }}
          />
          <StatCard
            label="Transactions Blocked"
            value={summary.blocked_today.toLocaleString()}
            subtitle={`${formatAmount(summary.fraud_amount_prevented)} prevented`}
            accent="var(--risk-medium)"
            icon={<ShieldOff size={14} color="var(--risk-medium)" />}
          />
          <StatCard
            label="Under Review"
            value={summary.under_review.toLocaleString()}
            subtitle="Awaiting analyst decision"
            accent="#8b5cf6"
            icon={<Clock size={14} color="#8b5cf6" />}
          />
          <StatCard
            label="Legitimate Today"
            value={summary.legitimate_today.toLocaleString()}
            subtitle="Successfully processed"
            accent="var(--risk-low)"
            icon={<CheckCircle size={14} color="var(--risk-low)" />}
            trend={{ value: -3.1, label: "vs yesterday" }}
          />
          <StatCard
            label="Amount Prevented"
            value={formatAmount(summary.fraud_amount_prevented)}
            subtitle="Fraud blocked today"
            accent="#06b6d4"
            icon={<DollarSign size={14} color="#06b6d4" />}
          />
          <StatCard
            label="Avg Detection Latency"
            value={`${summary.avg_detection_latency_ms.toFixed(0)}ms`}
            subtitle="End-to-end ML pipeline"
            accent="var(--brand-primary)"
            icon={<Zap size={14} color="var(--brand-primary)" />}
          />
          <StatCard
            label="False Positive Rate"
            value={`${(summary.false_positive_rate * 100).toFixed(1)}%`}
            subtitle="Low = better model precision"
            accent="#f59e0b"
            icon={<TrendingDown size={14} color="#f59e0b" />}
          />
          <StatCard
            label="Model Accuracy"
            value={`${(summary.model_accuracy * 100).toFixed(1)}%`}
            subtitle="XGBoost + Isolation Forest"
            accent="var(--risk-low)"
            icon={<Target size={14} color="var(--risk-low)" />}
          />
        </div>

        {/* Main Charts + Live Feed */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 340px", gap: 16, marginBottom: 24 }}>
          {/* Trend Chart */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "var(--text-primary)" }}>
              30-Day Fraud Trend
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16 }}>
              Fraud vs. legitimate transactions over time
            </div>
            <TrendChart data={trends} />
          </div>

          {/* Risk Distribution */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "var(--text-primary)" }}>
              Risk Distribution
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
              Today's transactions by risk level
            </div>
            <RiskDonut
              high={summary.fraud_today}
              medium={summary.under_review}
              low={summary.legitimate_today}
            />
            <HourlyBar data={velocity} />
          </div>

          {/* Live Feed */}
          <div style={{ height: 440 }}>
            <LiveFeed />
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid-cols-2">
          {/* Merchant Risk */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "var(--text-primary)" }}>
              Top Fraudulent Merchants
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16 }}>
              Ranked by fraud case volume
            </div>
            <MerchantChart data={merchants} />
          </div>

          {/* Recent Flags */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "var(--text-primary)" }}>
              Active Threat Indicators
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16 }}>
              Most triggered fraud signals today
            </div>
            {[
              { flag: "IMPOSSIBLE_TRAVEL", count: 23, pct: 88 },
              { flag: "VPN_DETECTED", count: 71, pct: 100 },
              { flag: "NEW_DEVICE", count: 156, pct: 72 },
              { flag: "HIGH_VELOCITY", count: 44, pct: 60 },
              { flag: "UNUSUAL_AMOUNT", count: 89, pct: 45 },
              { flag: "COUNTRY_MISMATCH", count: 37, pct: 38 },
            ].map((item) => (
              <div key={item.flag} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{item.flag.replace(/_/g, " ")}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{item.count}</span>
                </div>
                <div className="risk-bar">
                  <div className="risk-bar-fill" style={{ width: `${item.pct}%`, background: item.pct > 70 ? "var(--risk-high)" : item.pct > 40 ? "var(--risk-medium)" : "var(--brand-primary)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
