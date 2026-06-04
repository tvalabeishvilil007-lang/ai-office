import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// Supabase client — frontend only.
//
// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are PUBLIC — they are safe to
// expose in the browser. The anon key only grants access that Row Level
// Security policies allow. The service role key (secret) lives ONLY in the
// Express server environment, never here.
// ─────────────────────────────────────────────────────────────────────────────

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnon) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set. ' +
    'Auth and DB features will not work until you add them to .env',
  );
}

export const supabase = createClient(
  supabaseUrl  ?? 'https://placeholder.supabase.co',
  supabaseAnon ?? 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
