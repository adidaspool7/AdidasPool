from __future__ import annotations

import difflib
import re
from openai import AsyncOpenAI
from typing import Any

from config import settings
from models import CandidateProfile, ChatMessage
from skill_taxonomy import classify_target

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


SOFT_SKILL_EVALUATION_PROMPT = """
You are a rigorous but fair BEHAVIOURAL interview evaluator assessing ONE soft skill
(an interpersonal or professional competency), based solely on the interview transcript.

This is NOT a technical assessment. Do not look for factual/technical correctness. Judge
whether the candidate demonstrated the target competency through their described behaviour.

## Evaluation rules

1. Use only transcript evidence — ignore résumé claims not confirmed in the interview.
2. Assess behavioural signal, not knowledge. Look for: concrete real situations (not
   hypotheticals), the candidate's OWN actions (first-person ownership, not "the team"),
   the reasoning behind those actions, outcomes, and reflection/self-awareness.
3. PASS = the candidate gave at least one concrete, credible example in which THEY personally
   demonstrated the target skill, with enough specificity to be believable.
4. FAIL requires a concrete behavioural deficiency — e.g. the candidate could give no real
   example, spoke only in vague generalities/platitudes with no personal action, or described
   behaviour that directly contradicts the target skill. Short answers alone are NOT grounds
   to fail; they lower confidence only.
5. For integrity: flag REVIEW only for copy-paste patterns, rehearsed/inconsistent stories, or
   contradictions between turns. Do not flag brevity or nervousness as suspicious.

## Output format — strict JSON only

{
  "technical": { "passed": true },
  "integrity": { "status": "CLEAR" },
  "final": true,
  "evidence": [],
  "rationale": {
    "technical": "one or two sentences citing specific behavioural evidence from the transcript",
    "integrity": "one sentence",
    "final": "one sentence summary"
  },
  "trajectory": {
    "skill_assessed": "the single soft skill under assessment (e.g. Communication)",
    "criteria": [
      { "name": "e.g. Concrete situation", "grade": "STRONG | ADEQUATE | WEAK | NOT_ASSESSED",
        "evidence": "short quote or paraphrase of what the candidate described" },
      { "name": "Personal ownership of actions", "grade": "STRONG | ADEQUATE | WEAK | NOT_ASSESSED",
        "evidence": "..." },
      { "name": "Outcome & reflection", "grade": "STRONG | ADEQUATE | WEAK | NOT_ASSESSED",
        "evidence": "..." }
    ],
    "how_graded": "one or two sentences on the grading method and where the passing bar sat",
    "strengths": ["..."],
    "weaknesses": ["..."],
    "pass_fail_justification": "explicit reason the candidate is above/below the passing bar"
  }
}

Rules for the `trajectory` object (MANDATORY — this is the audit trail HR reads):
- `criteria` must grade the behavioural dimensions actually observable in the transcript
  (situation concreteness, personal ownership, reasoning, outcome, reflection, consistency).
- `pass_fail_justification` must name the concrete behavioural bar and why it was cleared or missed.
- Base everything only on transcript evidence.

Rules for the `evidence` array:
- On PASS: may be empty or contain supporting quotes.
- On FAIL: MUST contain at least one entry naming the behavioural gap, e.g.
  "Candidate gave no concrete example of [skill] — only generic statements with no personal action".
- Never fabricate evidence. If you cannot cite a specific behavioural deficiency, do not fail.

Turn count context: {turn_count} user turns were recorded.
If turn_count < 4, require a clear behavioural deficiency (not mere brevity) to fail.
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


# ── Deterministic writing-dictation scoring ──────────────────────────────────────
# The LANGUAGE writing task asks the candidate to reproduce a fixed reference text.
# Grading this by LLM eyeballing is not explainable; we compute a hard character/word
# accuracy against the reference and derive the writing CEFR from it deterministically.

def _normalize_ws(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip())


def compute_writing_accuracy(candidate_text: str, reference_text: str) -> dict[str, Any]:
    """Character- and word-level similarity of a dictation submission vs the reference."""
    cand = _normalize_ws(candidate_text)
    ref = _normalize_ws(reference_text)
    if not ref:
        return {"reference_present": False, "char_ratio": 0.0, "word_ratio": 0.0}
    # Character ratio is case-sensitive so spelling/capitalisation/punctuation count.
    char_ratio = difflib.SequenceMatcher(None, cand, ref).ratio()
    # Word ratio is case-insensitive to isolate missing/extra/reordered words.
    word_ratio = difflib.SequenceMatcher(
        None, cand.lower().split(), ref.lower().split()
    ).ratio()
    return {
        "reference_present": True,
        "char_ratio": round(char_ratio, 4),
        "word_ratio": round(word_ratio, 4),
        "candidate_words": len(cand.split()),
        "reference_words": len(ref.split()),
    }


# Heuristic accuracy -> CEFR bands for the writing dimension. Documented, tunable.
_WRITING_CEFR_BANDS: list[tuple[float, str]] = [
    (0.98, "C2"), (0.93, "C1"), (0.85, "B2"), (0.72, "B1"), (0.55, "A2"),
]


def accuracy_to_cefr(char_ratio: float) -> str:
    for threshold, level in _WRITING_CEFR_BANDS:
        if char_ratio >= threshold:
            return level
    return "A1"


def _locate_writing_submission(
    transcript: list[ChatMessage], reference_text: str
) -> str | None:
    """Return the candidate's dictation submission, or None if writing never occurred.

    The dictation is the candidate turn immediately after the assistant presents the
    reference text. We detect presentation by matching a leading slice of the reference
    inside an assistant message, then take the next candidate message.
    """
    ref = _normalize_ws(reference_text)
    if not ref:
        return None
    probe = ref[:24].lower()
    for idx, msg in enumerate(transcript):
        if msg.role == "assistant" and probe and probe in _normalize_ws(msg.content).lower():
            for later in transcript[idx + 1:]:
                if later.role == "user":
                    return later.content
    return None


def _ensure_trajectory(
    trajectory: Any, skill_assessed: str, rationale: dict[str, str], passed: bool
) -> dict[str, Any]:
    """Never let the HR audit trail be empty. Fill any missing keys with safe defaults."""
    if not isinstance(trajectory, dict):
        trajectory = {}
    synthesized = not trajectory.get("criteria")
    trajectory.setdefault("skill_assessed", skill_assessed or "Unspecified")
    if not trajectory.get("criteria"):
        trajectory["criteria"] = [
            {
                "name": "Overall assessment",
                "grade": "ADEQUATE" if passed else "WEAK",
                "evidence": rationale.get("technical")
                or "No per-criterion breakdown returned by the evaluator.",
            }
        ]
    trajectory.setdefault(
        "how_graded",
        rationale.get("technical") or "Graded holistically from the transcript.",
    )
    trajectory.setdefault("strengths", [])
    trajectory.setdefault("weaknesses", [])
    trajectory.setdefault(
        "pass_fail_justification",
        rationale.get("final")
        or ("Met the passing bar." if passed else "Did not meet the passing bar."),
    )
    if synthesized:
        # Flag that this trajectory was auto-completed, so reviewers know it is not
        # a full model-produced breakdown.
        trajectory["synthesized"] = True
    return trajectory


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

        # Soft skills run under TECHNICAL mode but must be graded behaviourally,
        # not against a "citable factual error" bar. Classify off the candidate's
        # target skill (same source of truth the interviewer uses).
        is_soft = mode != "LANGUAGE" and classify_target(candidate) == "soft"

        if mode == "LANGUAGE":
            base_prompt = LANGUAGE_EVALUATION_PROMPT
        elif is_soft:
            base_prompt = SOFT_SKILL_EVALUATION_PROMPT
        else:
            base_prompt = TECHNICAL_EVALUATION_PROMPT

        system_prompt = base_prompt.replace(
            "{turn_count}", str(turn_count)
        ).replace("{early_termination_clause}", early_termination_clause)

        transcript_text = "\n".join(
            [
                f"{line.role.upper()}: {line.content}"
                for line in transcript
                if line.role != "system"
            ]
        )

        # Deterministic writing-dictation scoring (LANGUAGE only). Computed here so the
        # hard accuracy can be handed to the evaluator as the authoritative writing signal.
        writing_accuracy: dict[str, Any] | None = None
        writing_hint = ""
        if mode == "LANGUAGE":
            from ai_interviewer import get_writing_reference_text

            reference_text = get_writing_reference_text(candidate.target_language or "English")
            submission = _locate_writing_submission(transcript, reference_text)
            if submission is None:
                writing_accuracy = {
                    "reference_present": bool(reference_text),
                    "submission_found": False,
                    "char_ratio": 0.0,
                    "word_ratio": 0.0,
                    "suggested_cefr": "A1",
                }
            else:
                acc = compute_writing_accuracy(submission, reference_text)
                acc["submission_found"] = True
                acc["suggested_cefr"] = accuracy_to_cefr(acc["char_ratio"])
                writing_accuracy = acc
            writing_hint = f"""

Deterministic writing check (AUTHORITATIVE — use as the PRIMARY basis for the "writing" score):
- Reference dictation was presented: {writing_accuracy.get("reference_present")}
- Candidate submission located: {writing_accuracy.get("submission_found")}
- Character accuracy vs reference: {writing_accuracy.get("char_ratio")}
- Word accuracy vs reference: {writing_accuracy.get("word_ratio")}
- Accuracy-derived writing CEFR: {writing_accuracy.get("suggested_cefr")}
Set "writing" to the accuracy-derived CEFR above. If no submission was located, set "writing" to A1.
""".rstrip()

        user_payload = f"""
Candidate:
{candidate.model_dump_json(indent=2)}

Transcript ({turn_count} candidate turns):
{transcript_text}{writing_hint}
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

        # Explainability: track WHY a result is what it is, and flag borderline cases
        # for the separate human-review process (which surfaces later in the
        # skill-validation tab). The candidate-facing result stays strictly binary.
        review_required = False
        review_reasons: list[str] = []

        # Gate: a FAIL must be backed by evidence. Previously an unsupported FAIL was
        # silently flipped to PASS with no trace. We still give the benefit of the doubt
        # for the binary result, but now record the discrepancy for human review instead
        # of hiding it.
        evidence: list[str] = parsed.get("evidence") or []
        if not technical_pass and not evidence:
            technical_pass = True
            review_required = True
            review_reasons.append(
                "Evaluator returned FAIL without citable evidence; defaulted to PASS "
                "pending human review."
            )

        integrity_status = str(parsed.get("integrity", {}).get("status", "REVIEW")).upper()
        if integrity_status not in VALID_INTEGRITY_STATES:
            integrity_status = "REVIEW"

        # REVIEW integrity no longer silently fails the candidate. It is surfaced as a
        # human-review signal; only a proven integrity FAIL blocks the pass.
        if integrity_status == "REVIEW":
            review_required = True
            review_reasons.append(
                "Integrity flagged REVIEW (possible anomaly); routed to human review "
                "rather than auto-failed."
            )

        final_gate = bool(technical_pass and integrity_status != "FAIL")

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
            # Writing is scored deterministically from the dictation diff, not the LLM.
            if writing_accuracy is not None:
                result_technical["writing"] = str(writing_accuracy.get("suggested_cefr", "A1"))
                result_technical["writing_accuracy"] = writing_accuracy
            else:
                result_technical["writing"] = _cefr("writing")

        # Structured grading trajectory (audit trail for HR) — never allowed to be empty.
        skill_assessed = (
            str(parsed.get("trajectory", {}).get("skill_assessed", ""))
            if isinstance(parsed.get("trajectory"), dict)
            else ""
        ) or (candidate.target_skill or ("CEFR " + (candidate.target_language or "language")))
        trajectory = _ensure_trajectory(
            parsed.get("trajectory"), skill_assessed, {
                "technical": str(rationale.get("technical", "")),
                "final": str(rationale.get("final", "")),
            }, technical_pass
        )

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

        if review_required and review_reasons:
            result_rationale["review"] = " ".join(review_reasons)

        return {
            "technical": result_technical,
            "integrity": {"status": integrity_status},
            "final": final_gate,
            "evidence": evidence,
            "rationale": result_rationale,
            "trajectory": trajectory,
            "review_required": review_required,
            "review_reason": " ".join(review_reasons) if review_reasons else None,
            "writing_accuracy": writing_accuracy,
            "early_terminated": early_terminated,
            "raw": parsed,
            "turn_count": turn_count,
        }
