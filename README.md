# AI Notes Summarizer & Sharer

A full-stack app that turns meeting transcripts / notes into a clean AI summary (Groq LLM), then lets you **edit**, **download**, **copy**, or **email** the result.

## Features

- **Upload or paste input**
  - Upload **`.pdf` / `.docx` / `.txt`** documents
  - Or paste transcript/notes text directly
- **Custom instructions (prompt)**
  - Optional “how to summarize” instruction to shape the output (e.g., action items only)
- **AI summarization via Groq**
  - FastAPI microservice calls Groq chat completions (default model: `llama-3.1-8b-instant`)
- **Text extraction**
  - Microservice extracts text from PDF/DOCX/TXT
  - Flask backend includes a **local fallback extractor** if the microservice is unavailable
- **Editable results**
  - Generated summary is shown in an editor so you can adjust before sharing
- **Download**
  - Download the edited summary as **`ai_summary.txt`**
- **Copy to clipboard**
- **Email sharing (SMTP)**
  - Send the edited summary to one or more recipients (comma/newline/semicolon separated)
  - Email includes optional prompt and an expandable “Original Transcript” section
- **Health/status indicator**
  - UI badge shows whether the microservice is reachable and whether Groq is configured

## Architecture

- **Frontend**: React + Vite (`frontend/`)
  - Dev proxy routes `/api/*` to the Flask backend at `http://localhost:5000`
  - Pages:
    - `/` upload/paste + prompt + status badge
    - `/result` summary editor + download/copy + email panel
- **Backend (API gateway)**: Flask (`backend/app.py`)
  - Handles file uploads, calls microservice, returns JSON to the frontend
  - Provides download + email endpoints
- **Microservice**: FastAPI (`backend/microservice.py`)
  - Extracts text from documents
  - Summarizes with Groq LLM

## API endpoints

### Flask backend (`http://localhost:5000`)

- `GET /api/status`
  - Returns `{ microservice_available, groq_configured }`
- `POST /api/generate` (multipart form)
  - Fields:
    - `transcript_file` (optional): `.pdf/.docx/.txt`
    - `transcript_text` (optional): pasted text
    - `prompt` (optional): instruction text
  - Returns `{ ok, summary, prompt, transcript }`
- `POST /api/download` (JSON)
  - Body: `{ "edited_summary": "..." }`
  - Returns a downloadable `ai_summary.txt`
- `POST /api/send_email` (JSON)
  - Body: `{ recipients, subject, edited_summary, prompt, transcript }`

### FastAPI microservice (`http://localhost:8000`)

- `GET /` (service info + `groq_configured` + model)
- `GET /health`
- `POST /extract-text` (file upload)
- `POST /summarize` (JSON: `{ text, prompt?, model?, max_tokens?, temperature? }`)
- `POST /process-document` (file upload + form fields for prompt/model/max_tokens/temperature)

## Setup

### 1) Backend environment variables

Create `backend/.env` (do **not** commit it) with:

```env
# Flask
FLASK_SECRET=change-me
PORT=5000

# Microservice URL (Flask -> FastAPI)
MICROSERVICE_URL=http://localhost:8000

# Groq (used by the microservice)
GROQ_API_KEY=your_groq_key_here
GROQ_MODEL=llama-3.1-8b-instant

# Email (optional, used by Flask /api/send_email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@example.com
SMTP_PASSWORD=your_app_password_here
EMAIL_FROM=your_email@example.com
```

### 2) Install dependencies

#### Backend (Python)

From `backend/`:

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

#### Frontend (Node)

From `frontend/`:

```bash
npm install
```

## Run (local dev)

You’ll typically run **two backends** + the frontend:

### Terminal A — FastAPI microservice (port 8000)

From `backend/` (venv activated):

```bash
python microservice.py
```

### Terminal B — Flask backend (port 5000)

From `backend/` (venv activated):

```bash
python app.py
```

### Terminal C — React frontend (port 5173)

From `frontend/`:

```bash
npm run dev
```

Open the app at `http://localhost:5173`.

## Notes / Security

- **Do not commit `backend/.env`**. It contains secrets (API keys, SMTP credentials).
- If you accidentally committed real credentials at any point, **rotate/revoke them immediately** (Groq key + email app password).

