const WebSocket = require('ws');

// ponytail: @supabase/realtime-js v2.108+ uses WebSocketFactory.detectEnvironment()
// which checks globalThis.WebSocket BEFORE reading the transport option.
// Node 20 has no native WebSocket, so we must polyfill before importing supabase-js.
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket;
}

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY in environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
});

module.exports = supabase;
