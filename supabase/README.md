# Supabase Setup Checklist

## 1. Run the SQL Migration

Go to your Supabase project → **SQL Editor** → paste the contents of:
`supabase/migrations/00000000000000_schema.sql`

Run it. This creates all tables, enums, indexes, and triggers (consolidated canonical schema).

## 2. Configure Authentication

### Google OAuth
Supabase dashboard → **Authentication** → **Providers** → **Google**
- Enable Google provider
- Paste your Google Client ID and Secret

### URL Configuration
Supabase dashboard → **Authentication** → **URL Configuration**
- **Site URL**: `https://adidas-pool.vercel.app`
- **Redirect URLs** (add both):
  - `https://adidas-pool.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback` (for local dev)

## 3. Vercel Environment Variables

In Vercel → Project Settings → Environment Variables, confirm these are set:

| Variable | Where to find it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role secret` key |

(Prisma has been fully removed — no `DATABASE_URL` is required.)

## 4. Google Cloud Console

In Google Cloud Console → **APIs & Services** → **Credentials** → your OAuth 2.0 Client:
- **Authorized JavaScript origins**: `https://adidas-pool.vercel.app`
- **Authorized redirect URIs**:
  - `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`
  - (Your Supabase project ref is visible in the Supabase dashboard URL)

## Migration Status

| Step | Description | Status |
|------|-------------|--------|
| 1 | Supabase client utils + auth middleware + login pages | ✅ Done |
| 2 | SQL schema migration (canonical `00000000000000_schema.sql`) | ✅ Done |
| 3 | Replace Prisma repositories with Supabase client | ✅ Done |
| 4 | Replace Vercel Blob with Supabase Storage | ✅ Done |
| 5 | Wire Google OAuth into dashboard flows | ✅ Done |
| 6 | Remove Prisma dependency | ✅ Done |
