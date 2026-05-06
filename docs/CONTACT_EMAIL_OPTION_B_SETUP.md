# Contact Candidate Email Setup (Option B - Resend Verified Domain)

## Goal
Enable real candidate email delivery for the "Contact candidate" feature by using Resend with a verified custom domain.

This document captures what must be configured and what code changes should be applied later (when implementation starts).

## Why this is needed
Current code already calls Resend for contact emails, but the sender address uses a placeholder domain (`noreply@yourdomain.com`).
Resend rejects sends from non-verified domains, so delivery fails until a real domain is verified in Resend.

## Scope
- In scope: Resend domain verification, DNS setup, environment variables, sender identity, and app-level email settings.
- Not in scope: immediate implementation changes in this session.

## Preconditions
1. You own or control a domain (or subdomain) for outbound mail.
2. You can edit DNS records at your registrar or DNS provider.
3. You have access to the Resend dashboard and Vercel project settings.

## High-level approach
Use Option B:
- Verify a real domain in Resend.
- Use a sender address from that verified domain.
- Move sender identity to environment configuration.
- Add safe operational defaults (reply-to, basic anti-duplicate guard, optional dev fallback).

## Step-by-step setup

### 1. Choose sender domain and address
Pick one sender address to standardize across app emails, for example:
- `noreply@<your-domain>`
- `talent@<your-domain>`

Recommendation:
- Use `noreply@...` as the visible sender.
- Add `Reply-To` to route candidate replies to the HR sender or shared inbox.

### 2. Verify domain in Resend
1. Open Resend dashboard.
2. Go to Domains and add your domain or mail subdomain.
3. Copy the DNS records Resend provides (typically SPF, DKIM, and domain verification records).
4. Add those records at your DNS provider.
5. Wait until Resend marks the domain as verified.

Notes:
- DNS propagation can take minutes to a few hours.
- Keep SPF/DKIM exactly as provided.

### 3. Configure production environment variables (Vercel)
Set these values in Vercel (Production, and optionally Preview):

- `RESEND_API_KEY` = your Resend API key
- `MAIL_FROM_ADDRESS` = chosen verified sender address (example: `noreply@your-domain.com`)

Optional but recommended:
- `MAIL_FROM_NAME` = display name (example: `adidas Talent Team`)

### 4. Plan code configuration updates (when implementation starts)
Update email infrastructure to read sender identity from env vars:

- Replace hardcoded `from` in email service with:
  - `from = "${MAIL_FROM_NAME} <${MAIL_FROM_ADDRESS}>"` (or fallback formatting)
- Apply to both:
  - magic-link sending
  - contact-candidate sending

Validation behavior:
- Fail fast in request path if `MAIL_FROM_ADDRESS` is missing in production.
- Keep errors explicit for easier ops troubleshooting.

### 5. Add Reply-To behavior
For contact-candidate emails:
- Set `reply_to` (or equivalent Resend field) to:
  - HR authenticated user email (preferred), or
  - a shared recruitment inbox

This ensures candidate replies do not go to an unattended noreply mailbox.

### 6. Add operational safeguards (recommended)
When implementing, include:

1. Basic duplicate-send protection:
- Prevent accidental double-submit (same HR, same candidate, same subject/body in a short window).

2. Rate limiting:
- Apply lightweight per-user limits on contact endpoint to avoid accidental spam bursts.

3. Dev fallback:
- In local development, if `RESEND_API_KEY` is missing, log email payload safely instead of failing the full flow.

### 7. Validate after implementation
Test checklist:

1. Happy path:
- HR sends contact email to candidate; API returns success; delivery is received.

2. Interaction history:
- `CONTACT_EMAIL_SENT` notification is recorded with metadata (subject/body).

3. Error path:
- Invalid/missing candidate email returns expected API error.
- Missing env config in production returns explicit operational error.

4. Reply behavior:
- Candidate reply lands in intended HR/shared inbox.

5. No duplicate sends on rapid clicks:
- Verify endpoint does not send multiple identical emails in quick succession.

## Rollout checklist
- [ ] Domain verified in Resend
- [ ] DNS records active (SPF, DKIM, verification)
- [ ] `RESEND_API_KEY` set in Vercel
- [ ] `MAIL_FROM_ADDRESS` set in Vercel
- [ ] Optional `MAIL_FROM_NAME` set
- [ ] Code updated to env-driven sender identity
- [ ] Reply-To policy implemented
- [ ] Basic duplicate/rate safeguards implemented
- [ ] End-to-end tested in Preview
- [ ] Production smoke test completed

## Decision record
Selected option: Option B (Resend verified domain for production-grade delivery).
