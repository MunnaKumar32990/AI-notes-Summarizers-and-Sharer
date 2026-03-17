import React, { useRef, useState } from "react";

const TYPES = [".pdf", ".docx", ".txt"];

export default function UploadForm({ onSubmit, loading, microserviceAvailable, groqConfigured }) {
  const [fileName, setFileName]     = useState("");
  const [dragOver, setDragOver]     = useState(false);
  const fileRef                     = useRef(null);
  const textRef                     = useRef(null);
  const promptRef                   = useRef(null);

  function handleFileChange(file) {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["txt", "pdf", "docx"].includes(ext)) {
      alert("Only .txt, .pdf, or .docx files are supported.");
      return;
    }
    setFileName(file.name);
    // assign to the hidden file input via DataTransfer
    const dt = new DataTransfer();
    dt.items.add(file);
    fileRef.current.files = dt.files;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const hasFile = fileRef.current?.files?.length > 0;
    const hasText = textRef.current?.value?.trim().length > 0;
    if (!hasFile && !hasText) {
      alert("Please upload a file or paste a transcript.");
      return;
    }
    const fd = new FormData();
    if (hasFile)  fd.append("transcript_file", fileRef.current.files[0]);
    if (hasText)  fd.append("transcript_text", textRef.current.value.trim());
    fd.append("prompt", promptRef.current.value.trim());
    onSubmit(fd);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1.5rem" }}>
      {/* Alert banners */}
      {!microserviceAvailable && (
        <div className="alert-banner warn">
          <span>⚠️</span>
          <div>
            <strong>Microservice Not Running</strong>
            <p>Open a terminal in <code>backend/</code> and run: <code>python microservice.py</code></p>
          </div>
        </div>
      )}
      {microserviceAvailable && !groqConfigured && (
        <div className="alert-banner warn">
          <span>🔑</span>
          <div>
            <strong>Groq API Key Required</strong>
            <p>Get a free key at <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">console.groq.com/keys</a> and add it to <code>backend/.env</code></p>
          </div>
        </div>
      )}

      {/* Drop Zone */}
      <div className="form-section">
        <label className="form-label">
          <span>📁</span> Upload Document
          <span className="label-sub">PDF · DOCX · TXT</span>
        </label>
        <div
          className={`drop-zone${dragOver ? " dragover" : ""}`}
          onClick={() => fileRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault();
            setDragOver(false);
            handleFileChange(e.dataTransfer.files[0]);
          }}
        >
          <input
            type="file"
            ref={fileRef}
            accept=".txt,.pdf,.docx"
            style={{ display: "none" }}
            onChange={e => handleFileChange(e.target.files[0])}
          />
          <span className="drop-icon">☁️</span>
          <div className="drop-text">
            <strong>Click to browse</strong> or drag &amp; drop
          </div>
          <div className="drop-types">
            {TYPES.map(t => <span key={t} className="type-badge">{t}</span>)}
          </div>
        </div>
        {fileName && (
          <div className="file-selected-msg">✓ {fileName}</div>
        )}
      </div>

      <div className="divider">or paste text directly</div>

      {/* Text Area */}
      <div className="form-section">
        <label className="form-label" htmlFor="transcriptText">
          <span>📝</span> Paste Transcript / Notes
        </label>
        <textarea
          id="transcriptText"
          ref={textRef}
          placeholder={"Paste your meeting notes or transcript here…\n\nExample:\nMeeting — Jan 15, 2024\nAttendees: John, Sarah, Mike\n\n• Reviewed Q4 performance\n• Approved new product launch\n• Action: John to send proposal by Friday"}
          rows={8}
        />
      </div>

      {/* Custom Instructions */}
      <div className="form-section">
        <label className="form-label" htmlFor="promptInput">
          <span>🎯</span> Custom Instructions
          <span className="label-sub">Optional</span>
        </label>
        <input
          id="promptInput"
          type="text"
          ref={promptRef}
          placeholder="e.g. Summarize in bullet points. List only action items. Focus on decisions."
        />
      </div>

      {/* Submit */}
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? (
          <><span className="spinner" /> Generating Summary…</>
        ) : (
          "🚀 Generate AI Summary"
        )}
      </button>
    </form>
  );
}
