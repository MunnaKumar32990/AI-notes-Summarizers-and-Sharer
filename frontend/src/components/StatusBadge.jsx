import React from "react";

/**
 * Animated status pill
 * @param {{ available: boolean, label: string }}
 */
function Pill({ available, warn, label }) {
  const color  = warn ? "#fbbf24" : available ? "#34d399" : "#f87171";
  const bg     = warn
    ? "rgba(245,158,11,0.12)"
    : available ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.1)";
  const border = warn
    ? "rgba(245,158,11,0.3)"
    : available ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.3)";
  const pulse  = available && !warn;

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.4rem",
      padding: "0.35rem 0.9rem", borderRadius: "100px",
      fontSize: "0.8rem", fontWeight: 600,
      background: bg, border: `1px solid ${border}`, color,
      backdropFilter: "blur(10px)",
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: color,
        boxShadow: pulse ? `0 0 6px ${color}` : "none",
        animation: pulse ? "pulseDot 2s infinite" : "none",
        display: "inline-block",
      }} />
      {label}
    </span>
  );
}

export default function StatusBadge({ microserviceAvailable, groqConfigured }) {
  if (groqConfigured && microserviceAvailable) {
    return (
      <div style={{ display: "flex", gap: "0.65rem", justifyContent: "center", flexWrap: "wrap" }}>
        <Pill available label="AI Summarization Active" />
        <Pill available label="Microservice Online" />
      </div>
    );
  }
  if (microserviceAvailable && !groqConfigured) {
    return (
      <div style={{ display: "flex", gap: "0.65rem", justifyContent: "center", flexWrap: "wrap" }}>
        <Pill warn label="Microservice Online" />
        <Pill available={false} label="Groq API Not Configured" />
      </div>
    );
  }
  return (
    <div style={{ display: "flex", gap: "0.65rem", justifyContent: "center" }}>
      <Pill available={false} label="Microservice Offline" />
    </div>
  );
}
