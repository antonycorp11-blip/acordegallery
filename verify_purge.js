
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://saojbwipdxebibjmtxqc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhb2pid2lwZHhlYmliam10eHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzcxODMsImV4cCI6MjA4NDE1MzE4M30.X9FmXtsbqGg1N-2z6UVSW7PoZmC7vK2K-HNsLLbRpNA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: players } = await supabase.from('players').select('name, recovery_pin');
  console.log('JOGADORES RESTANTES:', players ? players.length : 0);
  if (players) players.forEach(p => console.log(`- ${p.name} (${p.recovery_pin})`));
}

check();

