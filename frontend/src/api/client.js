const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Check if the backend services are healthy.
 */
export async function getStatus() {
  const res = await fetch(`${API_BASE}/api/status`);
  if (!res.ok) throw new Error("Could not reach the backend.");
  return res.json(); // { microservice_available, groq_configured }
}

/**
 * Generate a summary from a file or pasted text.
 * @param {FormData} formData  — transcript_file, transcript_text, prompt
 */
export async function generateSummary(formData) {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "Failed to generate summary.");
  }
  return data; // { summary, prompt, transcript }
}

/**
 * Download the edited summary as a .txt file.
 * @param {string} editedSummary
 */
export async function downloadSummary(editedSummary) {
  const res = await fetch(`${API_BASE}/api/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ edited_summary: editedSummary }),
  });
  if (!res.ok) throw new Error("Download failed.");

  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "ai_summary.txt";
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Send the summary to email recipients.
 */
export async function sendEmail({ recipients, subject, edited_summary, prompt, transcript }) {
  const res = await fetch(`${API_BASE}/api/send_email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipients, subject, edited_summary, prompt, transcript }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Failed to send email.");
  return data.message;
}
