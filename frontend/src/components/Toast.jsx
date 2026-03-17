import React, { useEffect, useRef } from "react";

/**
 * Toast notification that slides up from the bottom-right.
 * @param {{ message: string, type: 'success'|'error'|'info', onClose: () => void }}
 */
export default function Toast({ message, type, onClose }) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!message) return;
    timerRef.current = setTimeout(onClose, 3500);
    return () => clearTimeout(timerRef.current);
  }, [message, onClose]);

  if (!message) return null;

  const colors = {
    success: { bg: "rgba(16,185,129,0.18)", border: "rgba(16,185,129,0.4)", color: "#34d399" },
    error:   { bg: "rgba(239,68,68,0.18)",  border: "rgba(239,68,68,0.35)",  color: "#f87171" },
    info:    { bg: "rgba(6,182,212,0.15)",   border: "rgba(6,182,212,0.35)",  color: "#67e8f9" },
  };
  const c = colors[type] || colors.info;

  return (
    <div style={{
      position: "fixed", bottom: "2rem", right: "2rem", zIndex: 9999,
      padding: "0.85rem 1.4rem",
      background: c.bg, border: `1px solid ${c.border}`, color: c.color,
      borderRadius: "12px", fontWeight: 600, fontSize: "0.9rem",
      display: "flex", alignItems: "center", gap: "0.6rem",
      boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
      backdropFilter: "blur(20px)",
      animation: "toastIn 0.35s cubic-bezier(0.4,0,0.2,1)",
      maxWidth: "380px",
    }}>
      {message}
      <button
        onClick={onClose}
        style={{ background: "none", border: "none", cursor: "pointer", color: "inherit",
          marginLeft: "auto", fontSize: "1rem", lineHeight: 1 }}
        aria-label="Close"
      >✕</button>
    </div>
  );
}
