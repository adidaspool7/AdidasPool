from __future__ import annotations

import logging
from config import settings

logger = logging.getLogger(__name__)


class STTService:
    async def _placeholder_stt(self, audio_base64: str) -> str:
        _ = audio_base64
        return "[placeholder transcription]"

    async def transcribe_audio(self, audio_base64: str) -> str:
        if settings.stt_provider == "placeholder":
            return await self._placeholder_stt(audio_base64)
        if settings.stt_provider == "openai-whisper":
            # Provider adapter placeholder until concrete integration is wired.
            return await self._placeholder_stt(audio_base64)
        raise NotImplementedError("Implement concrete STT provider adapter here.")


class TTSService:
    def __init__(self) -> None:
        if settings.tts_provider == "placeholder":
            logger.warning("TTS provider is placeholder. Audio synthesis is disabled.")

    async def _placeholder_tts(self, _text: str) -> tuple[str | None, str | None]:
        """Placeholder provider intentionally emits no audio payload while preserving method signature."""
        return None, None

    async def synthesize_text(self, text: str) -> tuple[str | None, str | None]:
        if settings.tts_provider == "placeholder":
            return await self._placeholder_tts(text)
        if settings.tts_provider == "elevenlabs":
            # Provider adapter placeholder until concrete integration is wired.
            return await self._placeholder_tts(text)
        raise NotImplementedError("Implement concrete TTS provider adapter here.")
