from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Any, Literal


class CandidateSkill(BaseModel):
    name: str
    category: str | None = None


class CandidateProject(BaseModel):
    title: str | None = None
    description: str
    technologies: list[str] = Field(default_factory=list)
    start_date: str | None = None
    end_date: str | None = None


class CandidateProfile(BaseModel):
    candidate_id: str
    full_name: str | None = None
    skills: list[CandidateSkill] = Field(default_factory=list)
    projects: list[CandidateProject] = Field(default_factory=list)
    target_skill: str | None = None
    mode: Literal["TECHNICAL", "LANGUAGE"] = "TECHNICAL"
    target_language: str = "English"


class ChatMessage(BaseModel):
    role: Literal["system", "assistant", "user"]
    content: str


class InterviewSessionLifecycle(BaseModel):
    state: Literal["created", "running", "ended", "evaluated"] = "created"


class StartInterviewRequest(BaseModel):
    candidate: CandidateProfile


class StartInterviewResponse(BaseModel):
    session_id: str
    system_prompt: str
    first_question: str
    audio_base64: str | None = None
    audio_mime_type: str | None = None
    lifecycle: InterviewSessionLifecycle = Field(
        default_factory=lambda: InterviewSessionLifecycle(state="running")
    )


class TurnRequest(BaseModel):
    session_id: str
    user_text: str | None = None
    user_audio_base64: str | None = None
    is_clarification: bool = False


class TurnResponse(BaseModel):
    session_id: str
    transcript_user: str
    assistant_reply: str
    # For listening turns: the text spoken aloud (hidden passage) differs from the
    # visible reply, and the stored transcript includes the passage for evaluation.
    speak_text: str | None = None
    transcript_assistant: str | None = None
    audio_base64: str | None = None
    audio_mime_type: str | None = None
    should_end: bool = False
    lifecycle: InterviewSessionLifecycle = Field(
        default_factory=lambda: InterviewSessionLifecycle(state="running")
    )


class EndInterviewRequest(BaseModel):
    session_id: str


class InterviewEvaluationResult(BaseModel):
    technical: dict[str, Any]
    integrity: dict[str, Any]
    final: bool
    rationale: dict[str, str] | None = None


class EndInterviewResponse(BaseModel):
    session_id: str
    result: InterviewEvaluationResult
    lifecycle: InterviewSessionLifecycle = Field(
        default_factory=lambda: InterviewSessionLifecycle(state="evaluated")
    )


class EvaluationRequest(BaseModel):
    candidate: CandidateProfile
    transcript: list[ChatMessage]
    mode: Literal["TECHNICAL", "LANGUAGE"] = "TECHNICAL"
    early_terminated: bool = False


class EvaluationResponse(BaseModel):
    technical: dict[str, Any]
    integrity: dict[str, Any]
    final: bool
    rationale: dict[str, str] | None = None
    trajectory: dict[str, Any] | None = None
    early_terminated: bool = False
    evidence: list[str] = Field(default_factory=list)
    raw: dict[str, Any] | None = None
