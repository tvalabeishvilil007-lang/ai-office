import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// Supabase client — frontend only.
//
// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are PUBLIC — they are safe to
// expose in the browser. The anon key only grants access that Row Level
// Security policies allow. The service role key (secret) lives ONLY in the
// Express server environment, never here.
// ─────────────────────────────────────────────────────────────────────────────

// These are PUBLIC values — safe to expose in the browser.
// VITE_ vars are baked in at build time; the fallbacks ensure prod works
// even if the build environment doesn't forward them.
const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  || 'https://lsbfgeceymkckbbxdktq.supabase.co';
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_eDf0lBRnHPtRtv_uKf-joQ_u68BzI1z';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnon,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
