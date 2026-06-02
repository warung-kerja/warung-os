# Warung OS — Supabase/Vercel Hosted Mirror Config Template

**Status:** Template only. No real credentials in this file.
**Scope:** Phase 5 hosted mirror, private snapshot storage, auth-gated frontend later.

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
