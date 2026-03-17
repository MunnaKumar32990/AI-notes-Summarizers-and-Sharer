import React, { useEffect, useState } from "react";

export default function SummaryEditor({ summary, onChange }) {
  const [chars, setChars] = useState(0);

  useEffect(() => {
    setChars(summary.length);
  }, [summary]);

  function handleChange(e) {
    setChars(e.target.value.length);
    onChange(e.target.value);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>✏️ Edit your summary below</span>
        <span style={{
          fontSize: "0.78rem", color: "var(--text-muted)",
          padding: "2px 8px", background: "rgba(255,255,255,0.05)",
          borderRadius: "6px",
        }}>
          {chars.toLocaleString()} chars
        </span>
      </div>
      <textarea
        value={summary}
        onChange={handleChange}
        placeholder="Your AI-generated summary will appear here…"
        rows={18}
        style={{ minHeight: "380px" }}
      />
    </div>
  );
}
