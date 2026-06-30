"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  CreditCard,
  Search,
  BarChart2,
  Network,
  Settings,
  Activity,
  AlertTriangle,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Transactions", href: "/transactions", icon: CreditCard },
  { label: "Investigation", href: "/investigation", icon: Search },
  { label: "ML Playground", href: "/playground", icon: Activity },
  { label: "Analytics", href: "/analytics", icon: BarChart2 },
  { label: "Network Graph", href: "/network", icon: Network },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{
        padding: "20px 20px 16px",
        borderBottom: "1px solid var(--border-subtle)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 20px rgba(99,102,241,0.4)",
            flexShrink: 0,
          }}>
            <Shield size={18} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>
              Fraud Shield
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
              AI Detection Platform
            </div>
          </div>
        </div>
      </div>

      {/* Live Status */}
      <div style={{
        margin: "12px 12px 4px",
        background: "rgba(16,185,129,0.08)",
        border: "1px solid rgba(16,185,129,0.15)",
        borderRadius: 10,
        padding: "8px 12px",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span className="live-dot" />
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--risk-low)" }}>LIVE MONITORING</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Real-time mode active</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, paddingTop: 8, overflowY: "auto" }}>
        <div style={{ padding: "4px 16px 6px", fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>
          Main
        </div>
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className={`sidebar-nav-item ${active ? "active" : ""}`}>
              <Icon size={15} />
              {label}
              {label === "Investigation" && (
                <span style={{
                  marginLeft: "auto",
                  background: "rgba(245,158,11,0.15)",
                  color: "var(--risk-medium)",
                  padding: "1px 6px",
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 700,
                }}>
                  NEW
                </span>
              )}
            </Link>
          );
        })}

        <div style={{ padding: "12px 16px 6px", fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>
          System
        </div>
        <Link href="/settings" className={`sidebar-nav-item ${pathname === "/settings" ? "active" : ""}`}>
          <Settings size={15} />
          Settings
        </Link>
      </nav>

      {/* Model Status */}
      <div style={{
        padding: "12px 12px 16px",
        borderTop: "1px solid var(--border-subtle)",
      }}>
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 10,
          padding: "10px 12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Activity size={12} color="var(--brand-primary)" />
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>ML Engine</span>
            <span style={{
              marginLeft: "auto",
              background: "rgba(16,185,129,0.15)",
              color: "#10b981",
              padding: "1px 6px",
              borderRadius: 4,
              fontSize: 9,
              fontWeight: 700,
            }}>ONLINE</span>
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
            XGBoost + Isolation Forest
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
            Accuracy: <span style={{ color: "var(--risk-low)" }}>97.2%</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
