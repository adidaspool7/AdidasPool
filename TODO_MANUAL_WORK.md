# Manual Follow-ups

## Pending

- [ ] **`INTERVIEW_BACKEND_URL`** — Vercel → Settings → Environment Variables → add the FastAPI base URL once the backend is deployed. Leave unset until then.
- [ ] **Google OAuth consent screen** — [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → OAuth consent screen. If status is "Testing", add each demo user's Google email under "Test users". For open access, publish the app and complete verification.
- [ ] **Manually test interview** — Chrome/Edge only for voice (STT). Open `/dashboard/ai-interview`, start an interview, verify: camera preview shows, microphone works, TTS speaks AI questions, STT captures answers, "Return to Dashboard" button is available immediately after ending.

## Done

- [x] Supabase project created, Auth URLs configured
- [x] Google OAuth callback URL added to Supabase allowlist (`https://adidas-pool.vercel.app`)
- [x] SQL schema migrated (run `supabase/migrations/20260413000000_initial_schema.sql` in Supabase SQL Editor)
- [x] `talent-pool` storage bucket created in Supabase (also auto-created on first upload)
- [x] TTS/STT — switched to browser APIs (`window.speechSynthesis` + `window.SpeechRecognition`), no credentials needed
- [x] HTTPS — Vercel provides this automatically, `getUserMedia` works on production URL
- [x] Popup permissions — interview opened via button click (trusted gesture), not blocked by browsers
