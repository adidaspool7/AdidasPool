# Supabase Setup Checklist

## 1. Run the SQL Migration

Go to your Supabase project → **SQL Editor** → paste the contents of:
`supabase/migrations/20260413000000_initial_schema.sql`

Run it. This creates all tables, enums, indexes, and triggers.

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

Keep `DATABASE_URL` and `DATABASE_URL_UNPOOLED` for now — Prisma still uses them until Step 3 of the migration is complete.

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
| 2 | SQL schema migration | ✅ Done — run manually in SQL Editor |
| 3 | Replace Prisma repositories with Supabase client | ⏳ Next |
| 4 | Replace Vercel Blob with Supabase Storage | ⏳ Pending |
| 5 | Wire Google OAuth into dashboard flows | ⏳ Pending |
| 6 | Remove Prisma dependency | ⏳ Pending |
