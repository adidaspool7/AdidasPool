# Manual Follow-ups

- [ ] Set `INTERVIEW_BACKEND_URL` in deployment environments to the reachable FastAPI base URL.
- [ ] Configure non-placeholder TTS provider credentials/settings (current placeholder mode returns no audio by design).
- [ ] Ensure backend returns real `audio_base64` bytes plus correct `audio_mime_type` (for example `audio/mpeg` or `audio/wav`) once TTS integration is enabled.
- [ ] Validate popup permissions in browsers used for interviews (runtime window is opened via `window.open`).
- [ ] Manually test interview media UX across Chrome, Edge, and Safari (desktop/mobile), including camera preview visibility and camera switching behavior.
- [ ] Confirm HTTPS origin and browser permissions policy allow camera/microphone access in production.
