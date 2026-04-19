from __future__ import annotations

from fastapi import FastAPI, HTTPException

from ai_interviewer import InterviewSessionManager
from audio_handlers import STTService, TTSService
from evaluator import InterviewEvaluator
from models import (
    EndInterviewRequest,
    EndInterviewResponse,
    EvaluationRequest,
    EvaluationResponse,
    InterviewEvaluationResult,
    StartInterviewRequest,
    StartInterviewResponse,
    TurnRequest,
    TurnResponse,
    InterviewSessionLifecycle,
)

app = FastAPI(title="AI Technical Interviewer Backend", version="1.0.0")

interviewer = InterviewSessionManager()
evaluator = InterviewEvaluator()
stt_service = STTService()
tts_service = TTSService()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/interview/start", response_model=StartInterviewResponse)
async def start_interview(payload: StartInterviewRequest) -> StartInterviewResponse:
    session_id, system_prompt, first_question = await interviewer.start_session(payload.candidate)
    audio_base64, audio_mime_type = await tts_service.synthesize_text(first_question)
    return StartInterviewResponse(
        session_id=session_id,
        system_prompt=system_prompt,
        first_question=first_question,
        audio_base64=audio_base64,
        audio_mime_type=audio_mime_type,
        lifecycle=InterviewSessionLifecycle(state=interviewer.get_lifecycle_state(session_id)),
    )


@app.post("/interview/turn", response_model=TurnResponse)
async def next_turn(payload: TurnRequest) -> TurnResponse:
    if not payload.user_text and not payload.user_audio_base64:
        raise HTTPException(status_code=400, detail="user_text or user_audio_base64 is required")

    try:
        transcript_user = payload.user_text or await stt_service.transcribe_audio(
            payload.user_audio_base64 or ""
        )
        assistant_reply, should_end = await interviewer.process_turn(payload.session_id, transcript_user)
        audio_base64, audio_mime_type = await tts_service.synthesize_text(assistant_reply)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error

    return TurnResponse(
        session_id=payload.session_id,
        transcript_user=transcript_user,
        assistant_reply=assistant_reply,
        audio_base64=audio_base64,
        audio_mime_type=audio_mime_type,
        should_end=should_end,
        lifecycle=InterviewSessionLifecycle(
            state=interviewer.get_lifecycle_state(payload.session_id)
        ),
    )


@app.post("/interview/end", response_model=EndInterviewResponse)
async def end_interview(payload: EndInterviewRequest) -> EndInterviewResponse:
    try:
        transcript = interviewer.get_transcript(payload.session_id)
        candidate = interviewer.get_candidate(payload.session_id)
        mode = interviewer.get_mode(payload.session_id)
        result = await evaluator.evaluate(candidate, transcript, mode=mode)
        interviewer.mark_evaluated(payload.session_id)
        lifecycle = InterviewSessionLifecycle(state=interviewer.get_lifecycle_state(payload.session_id))
        interviewer.close_session(payload.session_id)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error

    return EndInterviewResponse(
        session_id=payload.session_id,
        result=InterviewEvaluationResult(
            technical=result["technical"],
            integrity=result["integrity"],
            final=bool(result["final"]),
            rationale=result.get("rationale"),
        ),
        lifecycle=lifecycle,
    )


@app.post("/interview/evaluate", response_model=EvaluationResponse)
async def evaluate_interview(payload: EvaluationRequest) -> EvaluationResponse:
    result = await evaluator.evaluate(payload.candidate, payload.transcript, mode=payload.mode)
    return EvaluationResponse(
        technical=result["technical"],
        integrity=result["integrity"],
        final=bool(result["final"]),
        rationale=result.get("rationale"),
        raw=result.get("raw"),
    )
