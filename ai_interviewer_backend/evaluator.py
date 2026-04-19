from __future__ import annotations

from openai import AsyncOpenAI
from typing import Any

from config import settings
from models import CandidateProfile, ChatMessage

VALID_INTEGRITY_STATES = {"CLEAR", "REVIEW", "FAIL"}
VALID_CEFR_LEVELS = {"A1", "A2", "B1", "B2", "C1", "C2"}


TECHNICAL_EVALUATION_PROMPT = """
You are a rigorous but fair technical interview evaluator.

Your task: decide whether the candidate demonstrated sufficient technical competence
for the skill under assessment, based solely on the interview transcript.

## Evaluation rules

1. Use only transcript evidence — ignore résumé claims not confirmed in the interview.
2. Prioritise implementation depth, factual accuracy, and consistency.
3. FAIL requires at least one concrete, citable factual error or a clear inability
   to engage with the topic. Vague, incomplete, or short answers are NOT sufficient
   grounds to fail — they are grounds for lower confidence only.
4. If the candidate shows partial understanding with no explicit errors, default to PASS.
5. For integrity: flag REVIEW only if you observe copy-paste patterns, unnaturally
   perfect answers, or explicit contradiction between turns. Do not flag short answers
   as suspicious.

## Output format — strict JSON only

{
  "technical": { "passed": true },
  "integrity": { "status": "CLEAR" },
  "final": true,
  "evidence": [],
  "rationale": {
    "technical": "one or two sentences citing specific transcript evidence",
    "integrity": "one sentence",
    "final": "one sentence summary"
  }
}

Rules for the `evidence` array:
- On PASS: may be empty or contain supporting quotes.
- On FAIL: MUST contain at least one entry in the form
  "Candidate stated [X] — this is incorrect because [Y]".
- Never fabricate evidence. If you cannot cite a specific error, do not fail.

Turn count context: {turn_count} user turns were recorded.
If turn_count < 5, require strong evidence of factual error to fail.
"""


LANGUAGE_EVALUATION_PROMPT = """
You are a certified CEFR English language examiner evaluating a language assessment
transcript. Assess the candidate's English proficiency across four dimensions:

- Grammar accuracy and range
- Vocabulary range and precision
- Fluency and coherence
- Task achievement (appropriate and extended responses)

## CEFR level criteria
- A1/A2: Basic phrases, very limited vocabulary, frequent errors
- B1: Can handle familiar topics, some errors, limited range
- B2: Clear and detailed on a wide range of topics, good grammar control
- C1: Fluent, flexible, precise language with rare errors
- C2: Near-native mastery, wide range, minimal errors

## Output format — strict JSON only

{
  "technical": { "passed": true, "cefr_level": "B2", "grammar": "B2", "vocabulary": "B1", "fluency": "B2" },
  "integrity": { "status": "CLEAR" },
  "final": true,
  "evidence": [],
  "rationale": {
    "technical": "B2 overall — good grammar control, varied vocabulary, minor errors in complex structures",
    "integrity": "Natural conversational responses with appropriate complexity",
    "final": "B2 — recommended for roles requiring professional English communication"
  }
}

Pass threshold: B1 or above (passed=true). A1/A2 is passed=false.

Turn count context: {turn_count} user turns were recorded.
"""


def _count_user_turns(transcript: list[ChatMessage]) -> int:
    """Count non-system, non-opening user turns (actual candidate answers)."""
    user_turns = [m for m in transcript if m.role == "user"]
    # The first user message is always the system opening instruction, skip it
    return max(0, len(user_turns) - 1)


class InterviewEvaluator:
    def __init__(self) -> None:
        self.client = AsyncOpenAI(api_key=settings.ai_api_key, base_url=settings.ai_base_url)
        self.model = settings.ai_evaluator_model

    async def evaluate(
        self,
        candidate: CandidateProfile,
        transcript: list[ChatMessage],
        mode: str = "TECHNICAL",
    ) -> dict[str, Any]:
        turn_count = _count_user_turns(transcript)

        if mode == "LANGUAGE":
            system_prompt = LANGUAGE_EVALUATION_PROMPT.replace(
                "{turn_count}", str(turn_count)
            )
        else:
            system_prompt = TECHNICAL_EVALUATION_PROMPT.replace(
                "{turn_count}", str(turn_count)
            )

        transcript_text = "\n".join(
            [
                f"{line.role.upper()}: {line.content}"
                for line in transcript
                if line.role != "system"
            ]
        )
        user_payload = f"""
Candidate:
{candidate.model_dump_json(indent=2)}

Transcript ({turn_count} candidate turns):
{transcript_text}
""".strip()

        response = await self.client.chat.completions.create(
            model=self.model,
            response_format={"type": "json_object"},
            temperature=0,
            max_tokens=500,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_payload},
            ],
        )
        content = response.choices[0].message.content or "{}"

        parsed: dict[str, Any] = {
            "technical": {"passed": False},
            "integrity": {"status": "REVIEW"},
            "final": False,
            "evidence": [],
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

        technical_data = parsed.get("technical", {})
        technical_pass = bool(technical_data.get("passed"))

        # Gate: FAIL requires non-empty evidence
        evidence: list[str] = parsed.get("evidence") or []
        if not technical_pass and not evidence:
            # Evaluator said fail but cited no evidence — override to PASS
            technical_pass = True
            evidence = []

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

        result_technical: dict[str, Any] = {"passed": technical_pass}
        if mode == "LANGUAGE":
            cefr_level = str(technical_data.get("cefr_level", "B1")).upper()
            if cefr_level not in VALID_CEFR_LEVELS:
                cefr_level = "B1"
            result_technical["cefr_level"] = cefr_level
            result_technical["grammar"] = str(technical_data.get("grammar", cefr_level)).upper()
            result_technical["vocabulary"] = str(technical_data.get("vocabulary", cefr_level)).upper()
            result_technical["fluency"] = str(technical_data.get("fluency", cefr_level)).upper()

        return {
            "technical": result_technical,
            "integrity": {"status": integrity_status},
            "final": final_gate,
            "evidence": evidence,
            "rationale": {
                "technical": str(rationale.get("technical", "")),
                "integrity": str(rationale.get("integrity", "")),
                "final": str(rationale.get("final", "")),
            },
            "raw": parsed,
            "turn_count": turn_count,
        }
