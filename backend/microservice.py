"""
FastAPI Microservice — Document Text Extraction + Groq AI Summarization
"""

import os
import io
import logging
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
import docx
import PyPDF2
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Document Processing Microservice",
    description="Text extraction and AI summarization via Groq",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY       = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL         = os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant")
ALLOWED_EXTENSIONS = {"txt", "pdf", "docx"}

groq_client = None


def init_groq():
    global groq_client
    if groq_client:
        return groq_client
    if not GROQ_API_KEY or GROQ_API_KEY == "YOUR_GROQ_API_KEY_HERE":
        logger.warning("GROQ_API_KEY not set")
        return None
    try:
        groq_client = Groq(api_key=GROQ_API_KEY)
        logger.info("Groq client ready")
        return groq_client
    except Exception as e:
        logger.exception(f"Groq init failed: {e}")
        return None


# ── Models ───────────────────────────────────────────────────────────────────

class SummarizeRequest(BaseModel):
    text: str
    prompt: Optional[str] = ""
    model: Optional[str] = None
    max_tokens: Optional[int] = 2000
    temperature: Optional[float] = 0.0


class SummarizeResponse(BaseModel):
    summary: str
    success: bool
    error: Optional[str] = None


class ExtractTextResponse(BaseModel):
    text: str
    success: bool
    error: Optional[str] = None


# ── Helpers ──────────────────────────────────────────────────────────────────

def extract_bytes(content: bytes, filename: str) -> str:
    ext = filename.rsplit(".", 1)[1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported type: {ext}")

    if ext == "txt":
        return content.decode("utf-8", errors="ignore")

    if ext == "pdf":
        text = []
        reader = PyPDF2.PdfReader(io.BytesIO(content))
        for page in reader.pages:
            try:
                text.append(page.extract_text() or "")
            except Exception:
                continue
        return "\n".join(text)

    if ext == "docx":
        doc = docx.Document(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs)

    return ""


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "service": "Document Processing Microservice",
        "version": "1.1.0",
        "status": "running",
        "groq_configured": bool(GROQ_API_KEY and GROQ_API_KEY != "YOUR_GROQ_API_KEY_HERE"),
        "model": GROQ_MODEL,
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/extract-text", response_model=ExtractTextResponse)
async def extract_text(file: UploadFile = File(...)):
    filename = file.filename or "unknown"
    ext = filename.rsplit(".", 1)[1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type: {ext}")

    content = await file.read()
    if not content:
        raise HTTPException(400, "Empty file")

    try:
        text = extract_bytes(content, filename)
    except ValueError as e:
        return ExtractTextResponse(text="", success=False, error=str(e))
    except Exception as e:
        return ExtractTextResponse(text="", success=False, error=f"Extraction error: {e}")

    if not text.strip():
        raise HTTPException(400, "No text found in file")

    logger.info(f"Extracted {len(text)} chars from {filename}")
    return ExtractTextResponse(text=text, success=True)


@app.post("/summarize", response_model=SummarizeResponse)
async def summarize(req: SummarizeRequest):
    if not req.text.strip():
        raise HTTPException(400, "Text is required")

    client = init_groq()
    if not client:
        return SummarizeResponse(
            summary="", success=False,
            error="Groq API key not configured. Add GROQ_API_KEY to backend/.env",
        )

    try:
        system = {
            "role": "system",
            "content": (
                "You are an expert document summarizer. "
                "Produce clear, well-structured summaries with bullet points, "
                "key decisions, and action items where relevant."
            ),
        }
        user_content = (
            f"Instruction: {req.prompt}\n\nDocument:\n{req.text}"
            if req.prompt
            else f"Summarize this document clearly:\n\n{req.text}"
        )

        model = req.model or GROQ_MODEL
        logger.info(f"Groq call — model:{model}, chars:{len(req.text)}")

        resp = client.chat.completions.create(
            messages=[system, {"role": "user", "content": user_content}],
            model=model,
            temperature=req.temperature,
            max_completion_tokens=req.max_tokens,
        )
        summary = resp.choices[0].message.content.strip()
        if not summary:
            return SummarizeResponse(summary="", success=False, error="Empty response from Groq")
        logger.info(f"Summary ready ({len(summary)} chars)")
        return SummarizeResponse(summary=summary, success=True)

    except Exception as e:
        err = str(e)
        if "rate_limit" in err.lower():
            msg = "Rate limit reached — please wait a moment and try again."
        elif "invalid_api_key" in err.lower():
            msg = "Invalid Groq API key."
        else:
            msg = f"Groq error: {err}"
        logger.exception(f"Groq call failed: {e}")
        return SummarizeResponse(summary="", success=False, error=msg)


@app.post("/process-document", response_model=SummarizeResponse)
async def process_document(
    file: UploadFile = File(...),
    prompt: str = Form(""),
    model: Optional[str] = Form(None),
    max_tokens: int = Form(2000),
    temperature: float = Form(0.0),
):
    extract_resp = await extract_text(file)
    if not extract_resp.success:
        return SummarizeResponse(summary="", success=False, error=extract_resp.error)
    return await summarize(
        SummarizeRequest(
            text=extract_resp.text,
            prompt=prompt,
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
        )
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("MICROSERVICE_PORT", 8000))
    logger.info(f"Microservice starting on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
