
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://saojbwipdxebibjmtxqc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhb2pid2lwZHhlYmliam10eHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzcxODMsImV4cCI6MjA4NDE1MzE4M30.X9FmXtsbqGg1N-2z6UVSW7PoZmC7vK2K-HNsLLbRpNA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndPurge() {
  console.log('--- Listando Jogadores ---');
  const { data: players, error } = await supabase
    .from('players')
    .select('id, name, recovery_pin');

  if (error) {
    console.error('Erro ao listar:', error);
    return;
  }

  console.log(`Encontrados: ${players ? players.length : 0} jogadores.`);
  if (players) players.forEach(p => console.log(` - ${p.name} (PIN: ${p.recovery_pin}) [ID: ${p.id}]`));

  console.log('\n--- Tentando Expurgo ---');
  if (!players) return;

  const targets = players.filter(p => p.recovery_pin !== '8238');

  if (targets.length === 0) {
    console.log('Nenhum alvo para deletar.');
    return;
  }

  for (const t of targets) {
    console.log(`Deletando ${t.name}...`);
    // Delete scores first due to foreign keys
    const { error: scoresErr } = await supabase.from('game_scores').delete().eq('player_id', t.id);
    if (scoresErr) console.log('Erro score:', scoresErr.message);

    const { error: delErr } = await supabase.from('players').delete().eq('id', t.id);
    if (delErr) {
      console.error(`   FALHA: ${delErr.message}`);
    } else {
      console.log(`   SUCESSO.`);
    }
  }
}

checkAndPurge();
