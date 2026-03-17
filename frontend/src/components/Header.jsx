import React from "react";
import { Link } from "react-router-dom";

export default function Header({ backLink }) {
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 20,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "1.1rem 2rem",
      borderBottom: "1px solid var(--card-border)",
      backdropFilter: "blur(20px)",
      background: "rgba(15,10,30,0.7)",
    }}>
      <Link to="/" style={{ textDecoration: "none" }}>
        <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text)" }}>
          ✨ AI Notes Summarizer
        </span>
      </Link>
      {backLink && (
        <Link to={backLink.to} style={{
          display: "inline-flex", alignItems: "center", gap: "0.4rem",
          padding: "0.45rem 1rem",
          background: "rgba(124,58,237,0.12)",
          border: "1px solid rgba(124,58,237,0.3)",
          borderRadius: "10px", color: "var(--primary-light)",
          textDecoration: "none", fontSize: "0.875rem", fontWeight: 600,
          transition: "all 0.2s",
        }}>
          ← {backLink.label}
        </Link>
      )}
    </nav>
  );
}
