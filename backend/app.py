import os
import io
import re
import smtplib
import logging
import requests
from email.message import EmailMessage

from flask import Flask, request, redirect, send_file, jsonify
from werkzeug.utils import secure_filename
from flask_cors import CORS
from dotenv import load_dotenv
import docx
import PyPDF2

# ── Configuration ────────────────────────────────────────────────────────────
UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"txt", "pdf", "docx"}

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.secret_key = os.environ.get("FLASK_SECRET", "super-secret-key")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Microservice
MICROSERVICE_URL = os.environ.get("MICROSERVICE_URL", "http://localhost:8000")

# SMTP
SMTP_HOST     = os.environ.get("SMTP_HOST", "")
SMTP_PORT     = int(os.environ.get("SMTP_PORT", 587))
SMTP_USERNAME = os.environ.get("SMTP_USERNAME", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
EMAIL_FROM    = os.environ.get("EMAIL_FROM", SMTP_USERNAME or "no-reply@example.com")

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# ── Helpers ──────────────────────────────────────────────────────────────────

def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def extract_text_local(filepath: str) -> str:
    """Fallback text extraction when microservice is unavailable."""
    ext = filepath.rsplit(".", 1)[1].lower()
    if ext == "txt":
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    elif ext == "pdf":
        text = []
        with open(filepath, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                try:
                    text.append(page.extract_text() or "")
                except Exception:
                    continue
        return "\n".join(text)
    elif ext == "docx":
        doc = docx.Document(filepath)
        return "\n".join([p.text for p in doc.paragraphs])
    return ""


def call_extract(file_path: str):
    """Ask microservice to extract text; fallback to local."""
    try:
        with open(file_path, "rb") as f:
            resp = requests.post(
                f"{MICROSERVICE_URL}/extract-text",
                files={"file": (os.path.basename(file_path), f, "application/octet-stream")},
                timeout=30,
            )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("success"):
                return data.get("text", ""), True
    except requests.exceptions.RequestException as exc:
        logger.warning(f"Microservice extract failed: {exc}")
    # Fallback
    try:
        text = extract_text_local(file_path)
        return text, bool(text.strip())
    except Exception as exc:
        logger.error(f"Local extraction failed: {exc}")
        return "", False


def call_summarize(text: str, prompt: str = ""):
    """Ask microservice to summarize; returns (summary, success, error)."""
    try:
        payload = {"text": text, "prompt": prompt, "max_tokens": 2000, "temperature": 0.0}
        resp = requests.post(f"{MICROSERVICE_URL}/summarize", json=payload, timeout=90)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("success"):
                return data.get("summary", ""), True, ""
            return "", False, data.get("error", "Summarization failed")
        return "", False, f"HTTP {resp.status_code}"
    except requests.exceptions.Timeout:
        return "", False, "Request timed out. Try a smaller document."
    except requests.exceptions.ConnectionError:
        return "", False, f"Cannot connect to microservice at {MICROSERVICE_URL}. Is it running?"
    except Exception as exc:
        return "", False, str(exc)


def parse_recipients(raw: str):
    parts = re.split(r"[,\n;\r]+", raw or "")
    return [e.strip() for e in parts if e.strip() and EMAIL_REGEX.match(e.strip())]


def send_email_smtp(subject: str, html_body: str, recipients: list):
    if not all([SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD]):
        raise RuntimeError("SMTP not configured. Set SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD in .env")
    msg = EmailMessage()
    msg["From"]    = EMAIL_FROM
    msg["To"]      = ", ".join(recipients)
    msg["Subject"] = subject
    msg.set_content("This email contains an HTML summary. View with an HTML-capable mail client.")
    msg.add_alternative(html_body, subtype="html")

    if SMTP_PORT == 465:
        server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT)
    else:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20)

    try:
        server.ehlo()
        if SMTP_PORT in (587, 25):
            server.starttls()
            server.ehlo()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
    finally:
        server.quit()


# ── API Routes ───────────────────────────────────────────────────────────────

@app.route("/api/status", methods=["GET"])
def api_status():
    """Health check — tells frontend if microservice & Groq are ready."""
    microservice_available = False
    groq_configured = False
    try:
        r = requests.get(f"{MICROSERVICE_URL}/health", timeout=5)
        if r.status_code == 200:
            microservice_available = True
        r2 = requests.get(f"{MICROSERVICE_URL}/", timeout=5)
        if r2.status_code == 200:
            groq_configured = r2.json().get("groq_configured", False)
    except requests.exceptions.RequestException:
        logger.warning("Microservice not reachable")
    return jsonify(
        microservice_available=microservice_available,
        groq_configured=groq_configured,
    )


@app.route("/api/generate", methods=["POST"])
def api_generate():
    """Accept file upload OR transcript text, return AI summary."""
    prompt = (request.form.get("prompt") or "").strip()
    transcript = ""

    file = request.files.get("transcript_file")
    if file and file.filename:
        filename = secure_filename(file.filename)
        if not allowed_file(filename):
            return jsonify(ok=False, error="Only .txt, .pdf, .docx files are supported."), 400

        save_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(save_path)

        extracted, ok = call_extract(save_path)
        if not ok or not extracted.strip():
            return jsonify(ok=False, error="Could not extract text from the uploaded file."), 422
        transcript = extracted
    else:
        transcript = (request.form.get("transcript_text") or "").strip()

    if not transcript:
        return jsonify(ok=False, error="Please upload a file or paste a transcript."), 400

    summary, ok, err = call_summarize(transcript, prompt)

    if not ok:
        return jsonify(ok=False, error=err or "Failed to generate summary."), 502

    return jsonify(ok=True, summary=summary, prompt=prompt, transcript=transcript)


@app.route("/api/download", methods=["POST"])
def api_download():
    """Return the summary as a downloadable .txt file."""
    data = request.get_json(silent=True) or {}
    text = data.get("edited_summary", "").strip()
    if not text:
        return jsonify(ok=False, error="No summary to download."), 400

    buf = io.BytesIO(text.encode("utf-8"))
    buf.seek(0)
    return send_file(
        buf,
        as_attachment=True,
        download_name="ai_summary.txt",
        mimetype="text/plain",
    )


@app.route("/api/send_email", methods=["POST"])
def api_send_email():
    """Send the summary to one or more email recipients."""
    data = request.get_json(silent=True) or {}

    recipients = parse_recipients(data.get("recipients", ""))
    if not recipients:
        return jsonify(ok=False, error="No valid recipient email addresses provided."), 400

    subject      = data.get("subject") or "AI Meeting Summary"
    edited_text  = data.get("edited_summary") or ""
    prompt       = data.get("prompt") or ""
    transcript   = data.get("transcript") or ""

    body_html = f"<pre style='white-space:pre-wrap;font-family:inherit'>{edited_text}</pre>"
    if prompt:
        body_html = f"<p><strong>Prompt:</strong> {prompt}</p>" + body_html
    if transcript:
        body_html += (
            "<hr/><details><summary>Original Transcript</summary>"
            f"<pre style='white-space:pre-wrap'>{transcript}</pre></details>"
        )

    try:
        send_email_smtp(subject, body_html, recipients)
    except Exception as exc:
        return jsonify(ok=False, error=str(exc)), 500

    return jsonify(ok=True, message=f"Summary sent to: {', '.join(recipients)}")


# ── Run ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=True, port=int(os.environ.get("PORT", 5000)))
