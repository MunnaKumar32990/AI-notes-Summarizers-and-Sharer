import React, { useCallback, useEffect, useState } from "react";
import { useNavigate }  from "react-router-dom";
import Header           from "../components/Header.jsx";
import SummaryEditor    from "../components/SummaryEditor.jsx";
import EmailPanel       from "../components/EmailPanel.jsx";
import Toast            from "../components/Toast.jsx";
import { downloadSummary } from "../api/client.js";

export default function ResultPage() {
  const navigate  = useNavigate();
  const [result,  setResult]  = useState(null);
  const [summary, setSummary] = useState("");
  const [toast,   setToast]   = useState({ message: "", type: "info" });

  const showToast = useCallback((message, type = "info") => setToast({ message, type }), []);

  useEffect(() => {
    const raw = sessionStorage.getItem("summaryResult");
    if (!raw) {
      navigate("/");
      return;
    }
    const data = JSON.parse(raw);
    setResult(data);
    setSummary(data.summary || "");
  }, [navigate]);

  async function handleDownload() {
    try {
      await downloadSummary(summary);
      showToast("✓ Download started!", "success");
    } catch (err) {
      showToast("❌ " + err.message, "error");
    }
  }

  async function handleCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summary);
      } else {
        const ta = document.createElement("textarea");
        ta.value = summary;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      showToast("✓ Copied to clipboard!", "success");
    } catch {
      showToast("❌ Could not copy. Please select and copy manually.", "error");
    }
  }

  if (!result) return null;

  return (
    <>
      <Header backLink={{ to: "/", label: "New Summary" }} />

      <main className="container">
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <h1 className="page-title">📝 Generated Summary</h1>
          {result.prompt && (
            <div className="prompt-badge">🎯 {result.prompt}</div>
          )}
        </div>

        {/* Summary card */}
        <div className="glass-card">
          <SummaryEditor summary={summary} onChange={setSummary} />

          {/* Action buttons */}
          <div className="actions" style={{ marginTop: "1.5rem" }}>
            <button type="button" className="btn btn-primary" onClick={handleDownload}>
              💾 Download .txt
            </button>
            <button type="button" className="btn btn-ghost" onClick={handleCopy}>
              📋 Copy
            </button>
          </div>

          {/* Email panel */}
          <EmailPanel
            summary={summary}
            prompt={result.prompt || ""}
            transcript={result.transcript || ""}
            showToast={showToast}
          />
        </div>
      </main>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "info" })} />
    </>
  );
}
