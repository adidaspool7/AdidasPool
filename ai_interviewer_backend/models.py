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


class CandidateProfile(BaseModel):
    candidate_id: str
    full_name: str | None = None
    skills: list[CandidateSkill] = Field(default_factory=list)
    projects: list[CandidateProject] = Field(default_factory=list)
    target_skill: str | None = None
    mode: Literal["TECHNICAL", "LANGUAGE"] = "TECHNICAL"


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


class TurnResponse(BaseModel):
    session_id: str
    transcript_user: str
    assistant_reply: str
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


class EvaluationResponse(BaseModel):
    technical: dict[str, Any]
    integrity: dict[str, Any]
    final: bool
    rationale: dict[str, str] | None = None
    raw: dict[str, Any] | None = None
