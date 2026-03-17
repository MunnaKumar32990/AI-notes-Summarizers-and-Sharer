import React, { useState } from "react";
import { sendEmail } from "../api/client.js";

export default function EmailPanel({ summary, prompt, transcript, showToast }) {
  const [open, setOpen]           = useState(false);
  const [recipients, setRecipients] = useState("");
  const [subject, setSubject]     = useState("AI Meeting Summary");
  const [sending, setSending]     = useState(false);

  async function handleSend() {
    if (!recipients.trim()) {
      showToast("⚠️ Please enter at least one recipient email.", "error");
      return;
    }
    setSending(true);
    try {
      const msg = await sendEmail({
        recipients: recipients.trim(),
        subject: subject.trim() || "AI Meeting Summary",
        edited_summary: summary,
        prompt,
        transcript,
      });
      showToast("✓ " + msg, "success");
      setOpen(false);
      setRecipients("");
    } catch (err) {
      showToast("❌ " + err.message, "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ marginTop: "0.75rem" }}>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => setOpen(o => !o)}
      >
        {open ? "✕ Close" : "✉️ Share via Email"}
      </button>

      {open && (
        <div className="email-panel">
          <div className="email-row">
            <div className="email-field">
              <div className="email-label">Recipients</div>
              <input
                type="text"
                value={recipients}
                onChange={e => setRecipients(e.target.value)}
                placeholder="alice@example.com, bob@co.com"
              />
            </div>
            <div className="email-field">
              <div className="email-label">Subject</div>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>
          </div>
          <button
            type="button"
            className="btn btn-success"
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? <><span className="spinner" /> Sending…</> : "🚀 Send Email"}
          </button>
        </div>
      )}
    </div>
  );
}
