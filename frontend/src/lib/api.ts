// API client for Fraud Shield

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const BASE = `${API_URL}/api/v1`;

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export const api = {
  analytics: {
    summary: () => get("/analytics/summary"),
    trends: (days = 30) => get(`/analytics/trends?days=${days}`),
    geo: () => get("/analytics/geo"),
    merchants: () => get("/analytics/merchants"),
    velocity: () => get("/analytics/velocity"),
  },
  transactions: {
    list: (params?: Record<string, string | number>) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return get(`/transactions${q ? `?${q}` : ""}`);
    },
    get: (id: string) => get(`/transactions/${id}`),
    analyze: (body: unknown) => post("/transactions/analyze", body),
  },
  cases: {
    list: (params?: Record<string, string | number>) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return get(`/cases${q ? `?${q}` : ""}`);
    },
    get: (id: string) => get(`/cases/${id}`),
    update: (id: string, body: unknown) => patch(`/cases/${id}`, body),
    freeze: (id: string) => post(`/cases/${id}/freeze`),
    escalate: (id: string) => post(`/cases/${id}/escalate`),
    quarantineUser: (userId: string) => post<{ success: boolean; quarantined: boolean }>(`/cases/quarantine/user/${userId}`),
    quarantineDevice: (deviceFp: string) => post<{ success: boolean; quarantined: boolean }>(`/cases/quarantine/device/${deviceFp}`),
  },
  simulator: {
    start: () => post("/simulator/start"),
    stop: () => post("/simulator/stop"),
    status: () => get<{ running: boolean; transactions_generated: number; fraud_generated: number; started_at: string | null }>("/simulator/status"),
  },
  settings: {
    get: () => get<{ threshold_medium: number; threshold_high: number }>("/settings"),
    update: (body: { threshold_medium: number; threshold_high: number }) => post<{ success: boolean; settings: { threshold_medium: number; threshold_high: number } }>("/settings", body),
    getRules: () => get<any[]>("/settings/rules"),
    createRule: (body: { name: string; field: string; operator: string; value: string; action: string }) => post<{ success: boolean; id: string }>("/settings/rules", body),
    toggleRule: (id: string) => patch<{ success: boolean; is_active: boolean }>(`/settings/rules/${id}/toggle`, {}),
    deleteRule: (id: string) => fetch(`${BASE}/settings/rules/${id}`, { method: "DELETE" }).then(res => {
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    }),
  },
};

export function formatAmount(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export function formatDate(ts: string): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function riskColor(level: string | null): string {
  if (level === "HIGH") return "var(--risk-high)";
  if (level === "MEDIUM") return "var(--risk-medium)";
  return "var(--risk-low)";
}

export function scoreToColor(score: number): string {
  if (score >= 65) return "var(--risk-high)";
  if (score >= 30) return "var(--risk-medium)";
  return "var(--risk-low)";
}
