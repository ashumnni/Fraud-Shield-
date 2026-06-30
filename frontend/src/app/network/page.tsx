"use client";
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { api } from "@/lib/api";
import { ShieldAlert, User, Cpu, CreditCard, Globe, ShieldCheck, Zap } from "lucide-react";

// Node types and colors
const NODE_COLORS: Record<string, string> = {
  user: "#6366f1",
  merchant: "#10b981",
  device: "#f59e0b",
  card: "#ef4444",
  ip: "#8b5cf6",
};

const NODE_ICONS: Record<string, string> = {
  user: "👤",
  merchant: "🏪",
  device: "📱",
  card: "💳",
  ip: "🌐",
};

// Initial graph structure
const INITIAL_NODES = [
  // Fraud ring 1
  { id: "u1", type: "user", label: "USR0012", fraud: true, size: 14, quarantined: false },
  { id: "u2", type: "user", label: "USR0047", fraud: true, size: 12, quarantined: false },
  { id: "u3", type: "user", label: "USR0089", fraud: false, size: 10, quarantined: false },
  { id: "d1", type: "device", label: "DEV-A4B2", fraud: true, size: 11, quarantined: false },
  { id: "d2", type: "device", label: "DEV-C7F1", fraud: true, size: 10, quarantined: false },
  { id: "m1", type: "merchant", label: "Unknown Vendor", fraud: true, size: 16, quarantined: false },
  { id: "c1", type: "card", label: "CARD-4491", fraud: true, size: 10, quarantined: false },
  { id: "c2", type: "card", label: "CARD-7823", fraud: true, size: 10, quarantined: false },
  { id: "ip1", type: "ip", label: "185.220.xxx", fraud: true, size: 12, quarantined: false },
  // Legit cluster
  { id: "u4", type: "user", label: "USR0023", fraud: false, size: 10, quarantined: false },
  { id: "u5", type: "user", label: "USR0061", fraud: false, size: 10, quarantined: false },
  { id: "d3", type: "device", label: "DEV-B3C5", fraud: false, size: 9, quarantined: false },
  { id: "m2", type: "merchant", label: "Amazon", fraud: false, size: 14, quarantined: false },
  { id: "c3", type: "card", label: "CARD-1234", fraud: false, size: 9, quarantined: false },
  { id: "ip2", type: "ip", label: "192.168.xxx", fraud: false, size: 9, quarantined: false },
  // Mixed
  { id: "u6", type: "user", label: "USR0034", fraud: false, size: 10, quarantined: false },
  { id: "m3", type: "merchant", label: "Binance", fraud: true, size: 13, quarantined: false },
  { id: "d4", type: "device", label: "DEV-X9Y3", fraud: true, size: 11, quarantined: false },
];

const INITIAL_LINKS = [
  // Fraud ring edges
  { source: "u1", target: "d1" }, { source: "u2", target: "d1" },
  { source: "u1", target: "m1" }, { source: "u2", target: "m1" },
  { source: "u1", target: "c1" }, { source: "u2", target: "c2" },
  { source: "d1", target: "ip1" }, { source: "d2", target: "ip1" },
  { source: "u3", target: "d2" }, { source: "u3", target: "m1" },
  { source: "c1", target: "m1" }, { source: "c2", target: "m1" },
  // Legit edges
  { source: "u4", target: "d3" }, { source: "u5", target: "d3" },
  { source: "u4", target: "m2" }, { source: "u5", target: "m2" },
  { source: "u4", target: "c3" }, { source: "d3", target: "ip2" },
  // Mixed
  { source: "u6", target: "m3" }, { source: "u6", target: "d4" },
  { source: "d4", target: "m3" }, { source: "d4", target: "ip1" },
];

export default function NetworkPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [links] = useState(INITIAL_LINKS);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: any } | null>(null);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [quarantineLoading, setQuarantineLoading] = useState(false);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const W = svgRef.current.clientWidth || 800;
    const H = svgRef.current.clientHeight || 520;

    // Deep copy node definitions for D3 layout tracking
    const d3Nodes = nodes.map(n => ({ ...n }));
    const d3Links = links.map(l => ({
      source: d3Nodes.find(n => n.id === l.source) || l.source,
      target: d3Nodes.find(n => n.id === l.target) || l.target,
    }));

    // Zoom group
    const g = svg.append("g");
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on("zoom", (event) => g.attr("transform", event.transform))
    );

    // Force simulation
    const sim = d3.forceSimulation(d3Nodes as d3.SimulationNodeDatum[])
      .force("link", d3.forceLink(d3Links).distance(80).strength(0.8))
      .force("charge", d3.forceManyBody().strength(-220))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force("collision", d3.forceCollide(28));

    // Links
    const link = g.append("g").selectAll("line").data(d3Links).join("line")
      .attr("stroke", (d: any) => {
        if (d.source.fraud && d.target.fraud) return "#ef444440";
        return "rgba(255,255,255,0.08)";
      })
      .attr("stroke-width", 1.5);

    // Nodes
    const node = g.append("g").selectAll("g").data(d3Nodes).join("g")
      .attr("cursor", "pointer")
      .call(
        d3.drag<SVGGElement, any>()
          .on("start", (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) sim.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Node circles
    node.append("circle")
      .attr("r", (d) => d.size)
      .attr("fill", (d) => {
        if (d.quarantined) return "rgba(239,68,68,0.2)";
        const base = NODE_COLORS[d.type] || "#6366f1";
        return d.fraud ? "#ef444488" : base + "55";
      })
      .attr("stroke", (d) => d.quarantined ? "#ef4444" : d.fraud ? "#ef4444" : NODE_COLORS[d.type] || "#6366f1")
      .attr("stroke-width", (d) => d.quarantined ? 3.5 : d.fraud ? 2.5 : 1.5)
      .attr("stroke-dasharray", (d) => d.quarantined ? "2,2" : d.fraud ? "4,2" : "none");

    // Node icons
    node.append("text")
      .text((d) => d.quarantined ? "🚫" : NODE_ICONS[d.type] || "⬤")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", (d) => d.size * 0.9)
      .style("pointer-events", "none");

    // Labels
    node.append("text")
      .text((d) => d.label)
      .attr("y", (d) => d.size + 12)
      .attr("text-anchor", "middle")
      .attr("font-size", 9)
      .attr("fill", (d) => d.quarantined ? "var(--risk-high)" : "rgba(255,255,255,0.5)")
      .style("pointer-events", "none");

    node.on("mouseover", (event, d) => {
      setTooltip({ x: event.clientX, y: event.clientY, node: d });
    }).on("mousemove", (event) => {
      setTooltip((prev) => prev ? { ...prev, x: event.clientX, y: event.clientY } : null);
    }).on("mouseout", () => {
      setTooltip(null);
    }).on("click", (_, d) => {
      setSelectedNode(nodes.find(n => n.id === d.id) || d);
    });

    sim.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x ?? 0)
        .attr("y1", (d: any) => d.source.y ?? 0)
        .attr("x2", (d: any) => d.target.x ?? 0)
        .attr("y2", (d: any) => d.target.y ?? 0);
      node.attr("transform", (d: any) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => { sim.stop(); };
  }, [nodes]);

  async function handleQuarantine() {
    if (!selectedNode) return;
    setQuarantineLoading(true);
    try {
      if (selectedNode.type === "user") {
        const res = await api.cases.quarantineUser(selectedNode.label);
        const nextQuarantined = res.quarantined;
        setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, quarantined: nextQuarantined } : n));
        setSelectedNode((prev: any) => prev ? { ...prev, quarantined: nextQuarantined } : null);
      } else if (selectedNode.type === "device") {
        const res = await api.cases.quarantineDevice(selectedNode.label);
        const nextQuarantined = res.quarantined;
        setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, quarantined: nextQuarantined } : n));
        setSelectedNode((prev: any) => prev ? { ...prev, quarantined: nextQuarantined } : null);
      } else {
        alert("Only Users and Devices can be quarantined from the network graph");
      }
    } catch (err) {
      console.error(err);
      alert("Quarantine update failed");
    } finally {
      setQuarantineLoading(false);
    }
  }

  // Count active stats
  const totalNodes = nodes.length;
  const fraudNodes = nodes.filter(n => n.fraud).length;
  const quarantinedNodes = nodes.filter(n => n.quarantined).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.4px" }}>Fraud Network Graph</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
            Interactive D3 graph · Click a User or Device to inspect details and toggle quarantine deactivation
          </p>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 16 }}>
          
          {/* Graph view container */}
          <div className="card" style={{ position: "relative", overflow: "hidden", border: "1px solid var(--border-subtle)" }}>
            <svg ref={svgRef} style={{ width: "100%", height: 560 }} />

            {/* Tooltip */}
            {tooltip && (
              <div
                style={{
                  position: "fixed",
                  left: tooltip.x + 12, top: tooltip.y - 10,
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-default)",
                  borderRadius: 10, padding: "8px 12px",
                  fontSize: 12, color: "var(--text-primary)",
                  zIndex: 999, pointerEvents: "none",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
              >
                <div style={{ fontWeight: 600 }}>{tooltip.node.label}</div>
                <div style={{ color: "var(--text-muted)", marginTop: 2, textTransform: "capitalize" }}>
                  Type: {tooltip.node.type}
                </div>
                <div style={{ color: tooltip.node.quarantined ? "var(--risk-high)" : tooltip.node.fraud ? "var(--risk-high)" : "var(--risk-low)", marginTop: 2, fontWeight: 600 }}>
                  {tooltip.node.quarantined ? "🚫 QUARANTINED" : tooltip.node.fraud ? "⚠ HIGH FRAUD RISK" : "✓ Low Risk"}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Inspect Panel & Legend */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            
            {/* Inspect Selection Details Card */}
            {selectedNode ? (
              <div className="card" style={{ padding: 16, border: "1px solid var(--border-subtle)", borderColor: selectedNode.quarantined ? "var(--risk-high)" : "var(--border-subtle)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 12 }}>
                  Selected Entity
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: selectedNode.quarantined ? "rgba(239,68,68,0.15)" : `${NODE_COLORS[selectedNode.type] || "#6366f1"}20`,
                    border: `1.5px solid ${selectedNode.quarantined ? "#ef4444" : NODE_COLORS[selectedNode.type] || "#6366f1"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14
                  }}>
                    {selectedNode.quarantined ? "🚫" : NODE_ICONS[selectedNode.type] || "⬤"}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{selectedNode.label}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "capitalize" }}>{selectedNode.type}</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ color: "var(--text-muted)" }}>ML Scored State:</span>
                    <span style={{ fontWeight: 600, color: selectedNode.fraud ? "var(--risk-high)" : "var(--risk-low)" }}>
                      {selectedNode.fraud ? "High Risk" : "Safe"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ color: "var(--text-muted)" }}>Quarantine:</span>
                    <span style={{ fontWeight: 600, color: selectedNode.quarantined ? "var(--risk-high)" : "var(--risk-low)" }}>
                      {selectedNode.quarantined ? "QUARANTINED" : "ACTIVE"}
                    </span>
                  </div>
                </div>

                {/* Action button */}
                {(selectedNode.type === "user" || selectedNode.type === "device") ? (
                  <button
                    onClick={handleQuarantine}
                    disabled={quarantineLoading}
                    className={`btn ${selectedNode.quarantined ? "btn-secondary" : "btn-danger"}`}
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "8px",
                      borderRadius: 6,
                      background: selectedNode.quarantined ? "var(--bg-elevated)" : "var(--risk-high)",
                      border: selectedNode.quarantined ? "1px solid var(--border-default)" : "none",
                      color: selectedNode.quarantined ? "var(--text-primary)" : "white",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    {selectedNode.quarantined ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                    {selectedNode.quarantined ? "Re-Activate Entity" : "Quarantine Entity"}
                  </button>
                ) : (
                  <div style={{ fontSize: 10, color: "var(--text-muted)", fontStyle: "italic", textAlign: "center" }}>
                    Select a User or Device node to perform quarantine actions.
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{ padding: 16, textAlign: "center", color: "var(--text-muted)", fontSize: 11 }}>
                Click on any node in the graph network to inspect parameters and freeze entities.
              </div>
            )}

            {/* Legend */}
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 12 }}>
                Legend
              </div>
              {Object.entries(NODE_ICONS).map(([type, icon]) => (
                <div key={type} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: `${NODE_COLORS[type]}30`,
                    border: `1.5px solid ${NODE_COLORS[type]}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, flexShrink: 0,
                  }}>
                    {icon}
                  </div>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "capitalize" }}>{type}</span>
                </div>
              ))}
              <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: 8, paddingTop: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(239,68,68,0.2)", border: "2.5px dashed #ef4444", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "var(--risk-high)" }}>High Fraud Risk</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(239,68,68,0.1)", border: "3.5px dashed #ef4444", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "var(--risk-high)" }}>Quarantined Node</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(99,102,241,0.2)", border: "1.5px solid #6366f1", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Active / Low Risk</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 12 }}>
                Graph Stats
              </div>
              {[
                ["Total Nodes", String(totalNodes)],
                ["High Risk Nodes", String(fraudNodes)],
                ["Quarantined Nodes", String(quarantinedNodes)],
                ["Active Fraud Rings", "2"],
                ["Shared Device Fingerprints", "1"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{k}</span>
                  <span style={{ fontSize: 11, color: "var(--text-primary)", fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
