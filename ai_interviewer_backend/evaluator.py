from __future__ import annotations

from openai import AsyncOpenAI
from typing import Any

from config import settings
from models import CandidateProfile, ChatMessage

VALID_INTEGRITY_STATES = {"CLEAR", "REVIEW", "FAIL"}


EVALUATION_PROMPT = """
You are a strict technical interview evaluator.
Evaluate if the candidate demonstrated sufficient factual technical accuracy overall,
and infer interview integrity from explicit transcript evidence only.

Rules:
1) Use only interview transcript evidence.
2) Prioritize factual correctness, implementation depth, and consistency.
3) Be strict against confident but incorrect claims.
4) Output strict JSON only:
{
  "technical": { "passed": true },
  "integrity": { "status": "CLEAR" },
  "final": true,
  "rationale": {
    "technical": "short reason",
    "integrity": "short reason",
    "final": "short reason"
  }
}
"""


class InterviewEvaluator:
    def __init__(self) -> None:
        self.client = AsyncOpenAI(api_key=settings.ai_api_key, base_url=settings.ai_base_url)
        self.model = settings.ai_evaluator_model

    async def evaluate(self, candidate: CandidateProfile, transcript: list[ChatMessage]) -> dict[str, Any]:
        transcript_text = "\n".join(
            [f"{line.role.upper()}: {line.content}" for line in transcript if line.role != "system"]
        )
        user_payload = f"""
Candidate:
{candidate.model_dump_json(indent=2)}

Transcript:
{transcript_text}
""".strip()

        response = await self.client.chat.completions.create(
            model=self.model,
            response_format={"type": "json_object"},
            temperature=0,
            max_tokens=120,
            messages=[
                {"role": "system", "content": EVALUATION_PROMPT},
                {"role": "user", "content": user_payload},
            ],
        )
        content = response.choices[0].message.content or "{}"
        parsed: dict[str, Any] = {
            "technical": {"passed": False},
            "integrity": {"status": "REVIEW"},
            "final": False,
            "rationale": {
                "technical": "Invalid evaluator response",
                "integrity": "Insufficient integrity signal",
                "final": "Default safe fail",
            },
        }
        try:
            import json

            parsed = json.loads(content)
        except Exception:
            return parsed

        technical_pass = bool(parsed.get("technical", {}).get("passed"))
        integrity_status = str(parsed.get("integrity", {}).get("status", "REVIEW")).upper()
        if integrity_status not in VALID_INTEGRITY_STATES:
            integrity_status = "REVIEW"
        final_gate = bool(technical_pass and integrity_status == "CLEAR")

        rationale = parsed.get("rationale")
        if not isinstance(rationale, dict):
            rationale = {
                "technical": "No rationale provided",
                "integrity": "No rationale provided",
                "final": "No rationale provided",
            }

        return {
            "technical": {"passed": technical_pass},
            "integrity": {"status": integrity_status},
            "final": final_gate,
            "rationale": {
                "technical": str(rationale.get("technical", "")),
                "integrity": str(rationale.get("integrity", "")),
                "final": str(rationale.get("final", "")),
            },
            "raw": parsed,
        }
