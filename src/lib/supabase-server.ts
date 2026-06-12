import { createClient } from '@supabase/supabase-js';

// Server-only Supabase client (uses service role key)
// This file should only be imported by server-side code (middleware, API routes)
export const supabaseServer = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
