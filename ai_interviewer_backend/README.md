# AI Interviewer Backend (Python)

This directory contains the Python backend for the real-time AI technical interviewer.

## What it does

- Builds a strict, dynamic interview system prompt from CV-extracted data (skills + project details)
- Runs a technical interview conversation with guardrails
- Supports placeholder STT/TTS handlers for low-latency voice loop integration
- Evaluates full transcript for factual technical correctness and returns strict pass/fail

## Files

- `main.py` — FastAPI app and API routes
- `ai_interviewer.py` — prompt templates + interview session manager
- `audio_handlers.py` — async STT/TTS placeholder adapters
- `evaluator.py` — transcript evaluator (strict boolean decision)
- `models.py` — shared typed request/response models
- `config.py` — provider/model/API-key config

## Quick start

```bash
cd ai_interviewer_backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8010
```

## API key and model setup (Groq now, any provider later)

### Current default (Groq via OpenAI-compatible endpoint)

Set:

- `AI_PROVIDER=groq`
- `AI_BASE_URL=https://api.groq.com/openai/v1`
- `AI_API_KEY=YOUR_GROQ_KEY_PLACEHOLDER`
- `AI_MODEL=openai/gpt-oss-120b` (or any Groq model)

Optional:

- `AI_EVALUATOR_MODEL=openai/gpt-oss-120b`
- `STT_PROVIDER=placeholder` (or your implementation)
- `TTS_PROVIDER=placeholder` (or your implementation)

### Switching later to another provider

1. Change `AI_PROVIDER` (label only, for logging)
2. Change `AI_BASE_URL` to the provider’s OpenAI-compatible endpoint
3. Change `AI_API_KEY` to that provider’s key
4. Change `AI_MODEL` and `AI_EVALUATOR_MODEL` to supported models
5. If provider is not OpenAI-compatible, replace `OpenAI(...)` usage in:
   - `ai_interviewer.py`
   - `evaluator.py`

No route contracts need to change when switching models/providers.

## Placeholder key note

This implementation intentionally supports a placeholder API key value for local testing and integration wiring. Replace it with a real key before production use.
