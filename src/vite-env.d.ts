/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WARUNG_SNAPSHOT_MODE?: 'local' | 'prepared' | 'remote'
  readonly VITE_WARUNG_LOCAL_SNAPSHOT_URL?: string
  readonly VITE_WARUNG_PREPARED_SNAPSHOT_URL?: string
  readonly VITE_WARUNG_REMOTE_SNAPSHOT_URL?: string
  readonly VITE_WARUNG_REMOTE_AUTH_MODE?: 'none' | 'supabase-auth-placeholder'
  readonly VITE_WARUNG_SNAPSHOT_MAX_AGE_MINUTES?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
