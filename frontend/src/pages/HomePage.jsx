import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header       from "../components/Header.jsx";
import StatusBadge  from "../components/StatusBadge.jsx";
import UploadForm   from "../components/UploadForm.jsx";
import Toast        from "../components/Toast.jsx";
import { getStatus, generateSummary } from "../api/client.js";

export default function HomePage() {
  const navigate = useNavigate();
  const [status,  setStatus]  = useState({ microservice_available: false, groq_configured: false });
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState({ message: "", type: "info" });

  const showToast = useCallback((message, type = "info") => setToast({ message, type }), []);

  useEffect(() => {
    getStatus()
      .then(setStatus)
      .catch(() => {}); // silently fail — badge will show "offline"
  }, []);

  async function handleSubmit(formData) {
    setLoading(true);
    try {
      const result = await generateSummary(formData);
      // Store result for ResultPage via sessionStorage
      sessionStorage.setItem("summaryResult", JSON.stringify(result));
      navigate("/result");
    } catch (err) {
      showToast("❌ " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />

      {/* Hero */}
      <header style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "4rem 2rem 3rem" }}>
        <div className="logo-badge">✦ Powered by Groq AI</div>
        <h1>
          AI Notes Summarizer<br />&amp; Sharer
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1.1rem", maxWidth: 520, margin: "0 auto 1.5rem" }}>
          Transform meeting transcripts &amp; notes into clear,<br />actionable summaries — in seconds.
        </p>
        <StatusBadge
          microserviceAvailable={status.microservice_available}
          groqConfigured={status.groq_configured}
        />
      </header>

      <main className="container">
        <div className="glass-card">
          <UploadForm
            onSubmit={handleSubmit}
            loading={loading}
            microserviceAvailable={status.microservice_available}
            groqConfigured={status.groq_configured}
          />
        </div>

        {/* How it works */}
        <div className="info-grid">
          {[
            { n: "1", title: "Upload or Paste", desc: "Add a PDF, DOCX, TXT file or paste your notes directly." },
            { n: "2", title: "Customize",        desc: "Optionally give instructions to shape the summary format." },
            { n: "3", title: "Generate & Share", desc: "Get a summary you can edit, download, or share via email." },
          ].map(item => (
            <div key={item.n} className="info-item">
              <div className="info-num">{item.n}</div>
              <div className="info-text">
                <strong>{item.title}</strong>
                <span>{item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer>
        Powered by <strong>Groq AI</strong> (Llama 3.1) &nbsp;·&nbsp;{" "}
        <strong>Flask</strong> + <strong>FastAPI</strong> + <strong>React</strong>
      </footer>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "info" })} />
    </>
  );
}
