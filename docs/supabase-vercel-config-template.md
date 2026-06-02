# Warung OS — Supabase/Vercel Hosted Mirror Config Template

**Status:** Template only. No real credentials in this file.
**Scope:** Phase 5 hosted mirror, private snapshot storage, auth-gated frontend later.

## Env variable boundary — what goes where

The secret boundary is the critical safety rule. Never cross it.

| Variable | Where it lives | Browser/Vercel safe? | Notes |
|---|---|---|---|
| `VITE_WARUNG_SNAPSHOT_MODE` | `.env` / Vercel env | Yes | `local`, `prepared`, or `remote` |
| `VITE_WARUNG_REMOTE_SNAPSHOT_URL` | `.env` / Vercel env | Yes | Remote snapshot URL for hosted mode |
| `VITE_WARUNG_REMOTE_AUTH_MODE` | `.env` / Vercel env | Yes | `supabase-auth` in P5.5 hosted deployment |
| `VITE_WARUNG_SNAPSHOT_MAX_AGE_MINUTES` | `.env` / Vercel env | Yes | Stale threshold |
| `VITE_SUPABASE_URL` | `.env` / Vercel env | **Yes** | Public project URL — anon access only |
| `VITE_SUPABASE_ANON_KEY` | `.env` / Vercel env | **Yes** | Public anon key — no special access |
| `SUPABASE_URL` | `.env.publish` (local only) | **NO** | Publisher upload target — never in Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.publish` (local only) | **NO** | Upload credential — bypasses RLS, Mac-only |
| `SUPABASE_STORAGE_BUCKET` | `.env.publish` (local only) | No | Bucket name for publisher |
| `SUPABASE_STORAGE_OBJECT` | `.env.publish` (local only) | No | Object path for publisher |

**Rule:** `SUPABASE_SERVICE_ROLE_KEY` must never appear in a `VITE_` variable, a Vercel env var, a committed file, or the browser bundle. If it ever does, treat it as a credential leak.

Run `npm run hosted:preflight` to validate the boundary is intact locally.

---

## Local files

- `.env.example` — frontend/public runtime config template.
- `.env.publish.example` — local publisher secret template.
- `.env.publish` — local-only file Raz creates later; gitignored.

## Supabase Storage target

Recommended first-pass defaults:

- Project: use the approved Warung OS / Mission Control Online-adjacent Supabase project once Raz confirms it.
- Bucket: `warung-os-snapshots`
- Object: `latest.json`
- Access: private bucket, no public read.
- Local publisher: uploads with `SUPABASE_SERVICE_ROLE_KEY` from `.env.publish` only.
- Browser: never receives service-role key.

## Bucket setup checklist

1. Create private Storage bucket named `warung-os-snapshots`.
2. Keep public access disabled.
3. Upload `latest.json` only from the local publisher.
4. Add a future authenticated read path in Phase 5.5:
   - either signed URLs generated after Supabase Auth session validation, or
   - an authenticated Edge Function that returns the private object.

## Local publisher commands

```bash
npm run snapshot:prepare-hosted
npm run hosted:publish:dry-run
```

Actual upload is intentionally explicit:

```bash
npm run hosted:publish -- --upload
```

The upload command fails closed unless `.env.publish` exists and contains a real Supabase URL + service-role key.

## Safety rules

- Do not commit `.env.publish`.
- Do not put `SUPABASE_SERVICE_ROLE_KEY` in Vercel or any `VITE_` variable.
- Do not make the bucket public.
- Do not upload if `npm run snapshot:prepare-hosted` fails.
- Do not upload if `hosted-export/manifest.json` hash mismatches `hosted-export/latest.json`.
- Keep snapshots latest-only until Raz asks for dated versions.

## Future Phase 5.5 auth wall

The frontend now has a data-source boundary for `local`, `prepared`, and `remote` modes, but `supabase-auth-placeholder` deliberately reports `auth_required` until the actual auth wall is implemented.
