"use client";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { TrendPoint, MerchantRisk } from "@/types";

const TOOLTIP_STYLE = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--border-default)",
  borderRadius: 10,
  color: "var(--text-primary)",
  fontSize: 12,
};

interface TrendChartProps {
  data: TrendPoint[];
}
export function TrendChart({ data }: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="fraudGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="legitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickLine={false} axisLine={false}
          tickFormatter={(v) => v.slice(5)} />
        <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Area type="monotone" dataKey="legitimate" name="Legitimate" stroke="#6366f1" fill="url(#legitGrad)" strokeWidth={2} dot={false} />
        <Area type="monotone" dataKey="fraud" name="Fraud" stroke="#ef4444" fill="url(#fraudGrad)" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const HOUR_COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ef4444"];
const HOURS = ["12AM","2","4","6","8","10","12PM","2","4","6","8","10"];

interface HourlyBarProps {
  data: { hour: number; count: number; fraud: number }[];
}
export function HourlyBar({ data }: HourlyBarProps) {
  const hourly = Array.from({ length: 12 }, (_, i) => {
    const h1 = data.find((d) => d.hour === i * 2);
    const h2 = data.find((d) => d.hour === i * 2 + 1);
    return {
      hour: HOURS[i],
      count: (h1?.count ?? 0) + (h2?.count ?? 0),
      fraud: (h1?.fraud ?? 0) + (h2?.fraud ?? 0),
    };
  });

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={hourly} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 9, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="count" name="Total" radius={[3, 3, 0, 0]} fill="#6366f1" opacity={0.6} />
        <Bar dataKey="fraud" name="Fraud" radius={[3, 3, 0, 0]} fill="#ef4444" />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface MerchantChartProps {
  data: MerchantRisk[];
}
export function MerchantChart({ data }: MerchantChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        layout="vertical"
        data={data.slice(0, 6)}
        margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} />
        <YAxis dataKey="merchant_name" type="category" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} tickLine={false} axisLine={false} width={90} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="fraud_count" name="Fraud Cases" fill="#ef4444" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const RISK_COLORS = ["#ef4444", "#f59e0b", "#10b981"];
interface RiskDonutProps {
  high: number;
  medium: number;
  low: number;
}
export function RiskDonut({ high, medium, low }: RiskDonutProps) {
  const data = [
    { name: "High Risk", value: high },
    { name: "Medium Risk", value: medium },
    { name: "Low Risk", value: low },
  ];
  return (
    <ResponsiveContainer width="100%" height={160}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
          {data.map((_, i) => (
            <Cell key={i} fill={RISK_COLORS[i]} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
