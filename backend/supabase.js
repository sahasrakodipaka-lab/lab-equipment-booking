const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServerKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServerKey) {
  console.warn('Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to backend/.env.');
}

const supabase = (supabaseUrl && supabaseServerKey)
  ? createClient(supabaseUrl, supabaseServerKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

function requireSupabase(_req, res, next) {
  if (!supabase) return res.status(503).json({ error: 'Database is not configured. Check backend/.env.' });
  next();
}
module.exports = { supabase, requireSupabase };
