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
  },
  "trajectory": {
    "skill_assessed": "the single skill under assessment (e.g. SQL)",
    "criteria": [
      { "name": "e.g. JOIN semantics", "grade": "STRONG | ADEQUATE | WEAK | NOT_ASSESSED",
        "evidence": "short quote or paraphrase of what the candidate said" }
    ],
    "how_graded": "one or two sentences on the grading method and where the passing bar sat",
    "strengths": ["..."],
    "weaknesses": ["..."],
    "pass_fail_justification": "explicit reason the candidate is above/below the passing bar"
  }
}

Rules for the `trajectory` object (MANDATORY — this is the audit trail HR reads):
- `criteria` must contain one entry per distinct sub-topic actually probed in the interview.
  Grade each STRONG/ADEQUATE/WEAK, or NOT_ASSESSED if the topic never came up.
- `pass_fail_justification` must name the concrete bar and why the candidate cleared or missed it.
- Base everything only on transcript evidence.

Rules for the `evidence` array:
- On PASS: may be empty or contain supporting quotes.
- On FAIL: MUST contain at least one entry in the form
  "Candidate stated [X] — this is incorrect because [Y]".
- Never fabricate evidence. If you cannot cite a specific error, do not fail.

Turn count context: {turn_count} user turns were recorded.
If turn_count < 5, require strong evidence of factual error to fail.
{early_termination_clause}
"""


LANGUAGE_EVALUATION_PROMPT = """
You are a certified CEFR language examiner evaluating a structured language assessment transcript.
The assessment followed a fixed 5-phase script: intro, 5 oral questions, 1 listening-comprehension
task, 1 writing dictation task, and a closing. You MUST score all three mandated aspects —
LISTENING, WRITING, and SPEAKING — plus grammar and vocabulary. Assess these SIX dimensions:

1. Speaking (fluency) — coherence, natural flow, response length and depth across the oral turns
2. Grammar — accuracy and range across all oral turns
3. Vocabulary — range and precision across all oral turns
4. Task achievement — did the candidate engage appropriately with the job-context questions?
5. Listening — the listening turn is the candidate message that immediately follows the AI's
   listening-comprehension prompt (the AI played a short passage aloud and asked a question about
   it; the passage text was NOT shown to the candidate). Judge how correctly and relevantly the
   candidate answered that comprehension question. If the candidate clearly did not understand the
   spoken passage, score listening low.
6. Writing — accuracy of the dictation turn: how faithfully did the candidate reproduce the
   reference text? Penalise spelling errors, missing words, punctuation errors, and omissions.
   Award full marks (C2) only for a perfect or near-perfect reproduction.

## CEFR level criteria
- A1/A2: Basic phrases, very limited vocabulary, frequent errors
- B1: Can handle familiar topics, some errors, limited range
- B2: Clear and detailed on a wide range of topics, good grammar control
- C1: Fluent, flexible, precise language with rare errors
- C2: Near-native mastery, wide range, minimal errors

## Output format — strict JSON only

{
  "technical": {
    "passed": true,
    "cefr_level": "B2",
    "grammar": "B2",
    "vocabulary": "B1",
    "fluency": "B2",
    "listening": "B2",
    "writing": "B1"
  },
  "integrity": { "status": "CLEAR" },
  "final": true,
  "evidence": [],
  "rationale": {
    "technical": "B2 overall — good grammar control, varied vocabulary; listening answer on-point; writing had 3 spelling errors",
    "integrity": "Natural responses, no copy-paste pattern detected in oral turns",
    "final": "B2 — meets B1 threshold, recommended for roles requiring professional communication"
  },
  "trajectory": {
    "skill_assessed": "CEFR language proficiency (<language>)",
    "criteria": [
      { "name": "Speaking (fluency)", "grade": "B2", "evidence": "short paraphrase" },
      { "name": "Grammar", "grade": "B2", "evidence": "short paraphrase" },
      { "name": "Vocabulary", "grade": "B1", "evidence": "short paraphrase" },
      { "name": "Listening", "grade": "B2", "evidence": "how well the comprehension answer matched the spoken passage" },
      { "name": "Writing", "grade": "B1", "evidence": "number/type of dictation errors" }
    ],
    "how_graded": "one or two sentences: overall CEFR is the balanced average of the dimensions, bar is B1",
    "strengths": ["..."],
    "weaknesses": ["..."],
    "pass_fail_justification": "explicit reason the overall level is above/below the B1 bar"
  }
}

Pass threshold: B1 or above overall (passed=true). A1/A2 is passed=false.
If the writing turn is absent (candidate skipped it), set "writing": "A1" and note it in the rationale.
If the listening turn is absent, set "listening": "A1" and note it in the rationale.
The `trajectory` object is MANDATORY and must grade every dimension listed above.

Turn count context: {turn_count} user turns were recorded.
{early_termination_clause}
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
        early_terminated: bool = False,
    ) -> dict[str, Any]:
        turn_count = _count_user_turns(transcript)

        early_termination_clause = (
            "IMPORTANT — this interview was ENDED EARLY (the candidate exited or the time window "
            "elapsed before all planned questions were asked). Evaluate fairly and only on the "
            "questions that WERE answered. Do NOT penalise the candidate for the reduced number of "
            "questions, and do NOT fail them merely because fewer topics were covered. Apply the "
            "same evidence bar as a full interview."
            if early_terminated
            else ""
        )

        if mode == "LANGUAGE":
            system_prompt = LANGUAGE_EVALUATION_PROMPT.replace(
                "{turn_count}", str(turn_count)
            ).replace("{early_termination_clause}", early_termination_clause)
        else:
            system_prompt = TECHNICAL_EVALUATION_PROMPT.replace(
                "{turn_count}", str(turn_count)
            ).replace("{early_termination_clause}", early_termination_clause)

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
            max_tokens=900,
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

            def _cefr(key: str) -> str:
                value = str(technical_data.get(key, cefr_level)).upper()
                return value if value in VALID_CEFR_LEVELS else cefr_level

            result_technical["cefr_level"] = cefr_level
            result_technical["grammar"] = _cefr("grammar")
            result_technical["vocabulary"] = _cefr("vocabulary")
            result_technical["fluency"] = _cefr("fluency")
            result_technical["listening"] = _cefr("listening")
            result_technical["writing"] = _cefr("writing")

        # Structured grading trajectory (audit trail for HR).
        trajectory = parsed.get("trajectory")
        if not isinstance(trajectory, dict):
            trajectory = {}

        result_rationale: dict[str, str] = {
            "technical": str(rationale.get("technical", "")),
            "integrity": str(rationale.get("integrity", "")),
            "final": str(rationale.get("final", "")),
        }

        # Early termination: fair eval already applied above. If the candidate still
        # passed, attach an explicit early-termination note (per product requirement).
        if early_terminated:
            note = (
                f"Interview ended early; the candidate was evaluated fairly on the "
                f"{turn_count} question(s) answered."
            )
            if final_gate:
                result_rationale["early_termination"] = f"{note} They still met the passing bar."
                result_rationale["final"] = (
                    f"{result_rationale['final']} ({note} Passing bar still met.)".strip()
                )
            else:
                result_rationale["early_termination"] = note

        return {
            "technical": result_technical,
            "integrity": {"status": integrity_status},
            "final": final_gate,
            "evidence": evidence,
            "rationale": result_rationale,
            "trajectory": trajectory,
            "early_terminated": early_terminated,
            "raw": parsed,
            "turn_count": turn_count,
        }
