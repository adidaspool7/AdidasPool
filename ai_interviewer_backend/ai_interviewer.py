from __future__ import annotations

from openai import AsyncOpenAI
from typing import Any
from uuid import uuid4

from config import settings
from models import CandidateProfile, ChatMessage

END_INTERVIEW_SENTINEL = "__END_INTERVIEW__"


INTERVIEWER_PERSONA_PROMPT = """
You are a senior technical interviewer. You are concise, professional, focused, and fast-paced.
"""

INTERVIEW_GUARDRAILS_PROMPT = """
Strict rules you must always follow:
1) Only ask deeply technical implementation questions grounded in the candidate's provided projects and skills.
2) Never drift into off-topic discussion.
3) If candidate asks irrelevant questions, politely refuse and steer back to technical interview.
4) Never reveal or provide answers to your own questions, even if explicitly asked.
5) Keep questions sharp, concrete, and progressive in difficulty.
6) Ask exactly one technical question per turn.
7) Prefer implementation details: architecture choices, trade-offs, debugging, complexity, memory/performance, edge cases.
8) Keep conversational flow natural and low-latency.
"""

INTERVIEW_FLOW_PROMPT = """
Interview flow:
- Start with a project-specific deep question.
- Probe with follow-ups based on the previous answer.
- Prioritize factual correctness checks.
- End interview only when asked by the system or after enough evidence is collected.
- Keep an internal turn-state:
  - current_topic_or_project
  - depth_level (1-5)
  - evidence_confidence (0.0-1.0)
  - remaining_question_budget
- Deterministic stop conditions:
  - max 12 technical questions
  - end if evidence_confidence >= 0.85 and at least 6 questions asked
  - end if user repeatedly refuses technical answers
  - when ending, append {END_INTERVIEW_SENTINEL} token at response end.
"""


def build_dynamic_system_prompt(candidate: CandidateProfile) -> str:
    skills_block = "\n".join(
        [
            f"- {skill.name}" + (f" ({skill.category})" if skill.category else "")
            for skill in candidate.skills
        ]
    ) or "- None provided"
    projects_block = "\n".join(
        [
            f"- {project.title or 'Untitled'}: {project.description}"
            + (
                f" | Technologies: {', '.join(project.technologies)}"
                if project.technologies
                else ""
            )
            for project in candidate.projects
        ]
    ) or "- None provided"

    focus = candidate.target_skill or "highest-signal technical skill in provided profile"
    return f"""
{INTERVIEWER_PERSONA_PROMPT}
{INTERVIEW_GUARDRAILS_PROMPT}
{INTERVIEW_FLOW_PROMPT}

Candidate context:
- Candidate ID: {candidate.candidate_id}
- Candidate Name: {candidate.full_name or "Unknown"}
- Primary validation focus: {focus}

Extracted skills:
{skills_block}

Extracted projects:
{projects_block}
""".strip()


class InterviewSessionManager:
    def __init__(self) -> None:
        self.client = AsyncOpenAI(api_key=settings.ai_api_key, base_url=settings.ai_base_url)
        self.model = settings.ai_model
        self.sessions: dict[str, dict[str, Any]] = {}

    async def start_session(self, candidate: CandidateProfile) -> tuple[str, str, str]:
        session_id = str(uuid4())
        system_prompt = build_dynamic_system_prompt(candidate)
        messages = [
            ChatMessage(role="system", content=system_prompt).model_dump(),
            ChatMessage(
                role="user",
                content="Start the interview now with your first deeply technical question.",
            ).model_dump(),
        ]
        first_question = await self._chat(messages)
        self.sessions[session_id] = {
            "candidate": candidate.model_dump(),
            "messages": messages
            + [ChatMessage(role="assistant", content=first_question).model_dump()],
            "lifecycle": "running",
            "turn_state": {
                "current_topic_or_project": (candidate.projects[0].title if candidate.projects else None),
                "depth_level": 1,
                "evidence_confidence": 0.1,
                "remaining_question_budget": 12,
            },
        }
        return session_id, system_prompt, first_question

    async def process_turn(self, session_id: str, user_text: str) -> tuple[str, bool]:
        if session_id not in self.sessions:
            raise ValueError("Session not found")
        state = self.sessions[session_id]
        if state.get("lifecycle") != "running":
            raise ValueError("Session is not in running state")
        state["messages"].append(ChatMessage(role="user", content=user_text).model_dump())
        turn_state = state.get("turn_state", {})
        remaining = int(turn_state.get("remaining_question_budget", 1))
        turn_state["remaining_question_budget"] = max(remaining - 1, 0)
        turn_state["depth_level"] = min(int(turn_state.get("depth_level", 1)) + 1, 5)
        turn_state["evidence_confidence"] = min(
            float(turn_state.get("evidence_confidence", 0.1)) + 0.08,
            0.9,
        )
        state["turn_state"] = turn_state
        assistant_reply = await self._chat(state["messages"])
        if (
            turn_state["remaining_question_budget"] <= 0
            and END_INTERVIEW_SENTINEL not in assistant_reply
        ):
            assistant_reply = f"{assistant_reply}\n{END_INTERVIEW_SENTINEL}"
        state["messages"].append(
            ChatMessage(role="assistant", content=assistant_reply).model_dump()
        )
        should_end = END_INTERVIEW_SENTINEL in assistant_reply
        if should_end:
            state["lifecycle"] = "ended"
        return assistant_reply.replace(END_INTERVIEW_SENTINEL, "").strip(), should_end

    def get_transcript(self, session_id: str) -> list[ChatMessage]:
        if session_id not in self.sessions:
            raise ValueError("Session not found")
        return [ChatMessage(**m) for m in self.sessions[session_id]["messages"]]

    def get_candidate(self, session_id: str) -> CandidateProfile:
        if session_id not in self.sessions:
            raise ValueError("Session not found")
        return CandidateProfile(**self.sessions[session_id]["candidate"])

    def close_session(self, session_id: str) -> None:
        self.sessions.pop(session_id, None)

    def mark_evaluated(self, session_id: str) -> None:
        if session_id not in self.sessions:
            raise ValueError("Session not found")
        self.sessions[session_id]["lifecycle"] = "evaluated"

    def get_lifecycle_state(self, session_id: str) -> str:
        if session_id not in self.sessions:
            raise ValueError("Session not found")
        return str(self.sessions[session_id].get("lifecycle", "created"))

    async def _chat(self, messages: list[dict[str, str]]) -> str:
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,  # type: ignore[arg-type]
            temperature=0.2,
            max_tokens=600,
        )
        return response.choices[0].message.content or "Please continue."
