"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { TrendChart, MerchantChart } from "@/components/charts";
import type { TrendPoint, GeoRisk, MerchantRisk } from "@/types";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const COUNTRY_ISO_MAP: Record<string, string> = {
  US: "840", IN: "356", CN: "156", RU: "643", NG: "566",
  BR: "076", GB: "826", DE: "276", SG: "702", AU: "036",
  UA: "804", KP: "408", FR: "250", CA: "124", JP: "392",
};

const VELOCITY_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

export default function AnalyticsPage() {
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [geo, setGeo] = useState<GeoRisk[]>([]);
  const [merchants, setMerchants] = useState<MerchantRisk[]>([]);
  const [velocity, setVelocity] = useState<{ day: number; hour: number; fraud: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [t, g, m, v] = await Promise.all([
          api.analytics.trends(days) as Promise<{ trends: TrendPoint[] }>,
          api.analytics.geo() as Promise<{ geo: GeoRisk[] }>,
          api.analytics.merchants() as Promise<{ merchants: MerchantRisk[] }>,
          api.analytics.velocity() as Promise<{ heatmap: { day: number; hour: number; count: number; fraud: number }[] }>,
        ]);
        setTrends(t.trends);
        setGeo(g.geo);
        setMerchants(m.merchants);
        setVelocity(v.heatmap);
      } catch {
        // Demo fallback
        const today = new Date();
        setTrends(Array.from({ length: days }, (_, i) => ({
          date: new Date(today.getTime() - (days - 1 - i) * 86400000).toISOString().slice(0, 10),
          fraud: Math.floor(Math.random() * 60 + 15),
          legitimate: Math.floor(Math.random() * 800 + 800),
          total: 0,
        })));
        setGeo([
          { country: "US", country_code: "US", fraud_count: 180, total_count: 4200, risk_score: 0.043 },
          { country: "RU", country_code: "RU", fraud_count: 290, total_count: 1500, risk_score: 0.193 },
          { country: "NG", country_code: "NG", fraud_count: 310, total_count: 890, risk_score: 0.348 },
          { country: "CN", country_code: "CN", fraud_count: 210, total_count: 2800, risk_score: 0.075 },
          { country: "IN", country_code: "IN", fraud_count: 120, total_count: 3100, risk_score: 0.039 },
        ]);
        setMerchants([
          { merchant_id: "M1", merchant_name: "Binance", category: "crypto", fraud_count: 87, total_count: 412, fraud_rate: 0.211 },
          { merchant_id: "M2", merchant_name: "Casino Royal", category: "gambling", fraud_count: 71, total_count: 234, fraud_rate: 0.303 },
          { merchant_id: "M3", merchant_name: "Unknown Vendor", category: "other", fraud_count: 62, total_count: 189, fraud_rate: 0.328 },
          { merchant_id: "M4", merchant_name: "AliExpress", category: "e-commerce", fraud_count: 44, total_count: 891, fraud_rate: 0.049 },
          { merchant_id: "M5", merchant_name: "Steam", category: "gaming", fraud_count: 31, total_count: 620, fraud_rate: 0.050 },
        ]);
        setVelocity(Array.from({ length: 168 }, (_, i) => ({
          day: Math.floor(i / 24), hour: i % 24, fraud: Math.floor(Math.random() * 20),
        })));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [days]);

  const maxFraud = Math.max(...geo.map((g) => g.fraud_count), 1);
  const geoMap: Record<string, GeoRisk> = {};
  geo.forEach((g) => { if (COUNTRY_ISO_MAP[g.country]) geoMap[COUNTRY_ISO_MAP[g.country]] = g; });

  const maxVelocityFraud = Math.max(...velocity.map((v) => v.fraud), 1);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.4px" }}>Analytics</h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
              Fraud trends, geographic distribution & behavioral patterns
            </p>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                className="btn btn-ghost"
                onClick={() => setDays(d)}
                style={{
                  padding: "5px 12px", fontSize: 11,
                  background: days === d ? "rgba(99,102,241,0.15)" : "transparent",
                  color: days === d ? "var(--brand-primary)" : "var(--text-muted)",
                  border: days === d ? "1px solid rgba(99,102,241,0.3)" : "1px solid var(--border-subtle)",
                }}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="page-body" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Trend */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Fraud vs. Legitimate Trend ({days} days)</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>Comparing fraud and legitimate transaction volumes over time</div>
          {loading ? <div className="skeleton" style={{ height: 200 }} /> : <TrendChart data={trends} />}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 20 }}>
          {/* Geographic heatmap */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Geographic Risk Heatmap</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>Fraud concentration by country (darker = higher fraud rate)</div>
            <div style={{ borderRadius: 12, overflow: "hidden", background: "var(--bg-elevated)" }}>
              <ComposableMap projectionConfig={{ scale: 147 }} style={{ width: "100%", height: 280 }}>
                <Geographies geography={GEO_URL}>
                  {({ geographies }: { geographies: { rsmKey: string; id: string }[] }) =>
                    geographies.map((geo) => {
                      const data = geoMap[geo.id];
                      const intensity = data ? clamp(data.fraud_count / maxFraud, 0, 1) : 0;
                      const r = Math.floor(intensity * 220 + 30);
                      const fill = data
                        ? `rgba(${r}, ${Math.floor(30 + (1 - intensity) * 40)}, ${Math.floor(30 + (1 - intensity) * 20)}, ${0.3 + intensity * 0.7})`
                        : "rgba(255,255,255,0.04)";
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={fill}
                          stroke="rgba(255,255,255,0.06)"
                          strokeWidth={0.5}
                          style={{ default: { outline: "none" }, hover: { fill: "#6366f1", outline: "none" }, pressed: { outline: "none" } }}
                        />
                      );
                    })
                  }
                </Geographies>
              </ComposableMap>
            </div>

            {/* Legend */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Low Risk</span>
              <div style={{ flex: 1, height: 6, borderRadius: 99, background: "linear-gradient(to right, rgba(30,40,60,0.5), rgba(220,30,30,0.9))" }} />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>High Risk</span>
            </div>

            {/* Top countries */}
            <div style={{ marginTop: 12 }}>
              {geo.slice(0, 5).map((g) => (
                <div key={g.country} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{g.country}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 80 }}>
                      <div className="risk-bar">
                        <div className="risk-bar-fill" style={{ width: `${(g.fraud_count / maxFraud) * 100}%`, background: "var(--risk-high)" }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--risk-high)", fontWeight: 600, minWidth: 30, textAlign: "right" }}>{g.fraud_count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Merchant risk */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Merchant Fraud Rankings</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>Top merchants by fraud case volume</div>
            {loading ? <div className="skeleton" style={{ height: 200 }} /> : <MerchantChart data={merchants} />}
            <div style={{ marginTop: 12 }}>
              {merchants.slice(0, 5).map((m) => (
                <div key={m.merchant_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>{m.merchant_name}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "capitalize" }}>{m.category}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: m.fraud_rate > 0.1 ? "var(--risk-high)" : "var(--risk-medium)" }}>
                      {(m.fraud_rate * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>fraud rate</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Velocity Heatmap */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Fraud Velocity Heatmap</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>Hour × Day of week fraud frequency (darker = more fraud)</div>
          <div style={{ display: "flex", gap: 4, alignItems: "flex-start" }}>
            {/* Day labels */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 24 }}>
              {VELOCITY_DAYS.map((d) => (
                <div key={d} style={{ height: 24, display: "flex", alignItems: "center", fontSize: 10, color: "var(--text-muted)", width: 28 }}>
                  {d}
                </div>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              {/* Hour labels */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(24, 1fr)", gap: 3, marginBottom: 4 }}>
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} style={{ fontSize: 8, color: "var(--text-muted)", textAlign: "center" }}>
                    {h % 4 === 0 ? `${h}h` : ""}
                  </div>
                ))}
              </div>
              {/* Grid */}
              {VELOCITY_DAYS.map((_, dayIdx) => (
                <div key={dayIdx} style={{ display: "grid", gridTemplateColumns: "repeat(24, 1fr)", gap: 3, marginBottom: 3 }}>
                  {Array.from({ length: 24 }, (_, h) => {
                    const cell = velocity.find((v) => v.day === dayIdx && v.hour === h);
                    const fraud = cell?.fraud ?? 0;
                    const intensity = fraud / maxVelocityFraud;
                    return (
                      <div
                        key={h}
                        title={`${VELOCITY_DAYS[dayIdx]} ${h}:00 — ${fraud} fraud`}
                        style={{
                          height: 24, borderRadius: 4,
                          background: intensity > 0
                            ? `rgba(239,68,68,${0.1 + intensity * 0.85})`
                            : "rgba(255,255,255,0.04)",
                          cursor: "default",
                          transition: "background 0.15s",
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
