
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://saojbwipdxebibjmtxqc.supabase.co';
const serviceKey = process.argv[2];

if (!serviceKey) {
    console.error("ERRO: Você precisa fornecer a SERVICE_ROLE_KEY como argumento.");
    console.error("Exemplo: node purge_with_key.js eyJhbGciOiJIUzI1Ni...");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function nuke() {
    console.log('--- INICIANDO PROTOCOLO DE EXPURGO (SERVICE ROLE) ---');

    // 1. Identificar Admin para proteger
    const { data: admin } = await supabase
        .from('players')
        .select('id')
        .eq('recovery_pin', '8238')
        .single();

    if (!admin) {
        console.error("ALERTA: Admin '8238' não encontrado. Abortando para segurança.");
        return;
    }

    const adminId = admin.id;
    console.log(`Admin Protegido: ${adminId}`);

    // 2. Deletar tudo que nao for admin
    const { error: scoreErr } = await supabase.from('game_scores').delete().neq('player_id', adminId);
    if (scoreErr) console.error("Erro score:", scoreErr);
    else console.log("Scores deletados.");

    const { error: playerErr, count } = await supabase.from('players').delete({ count: 'exact' }).neq('id', adminId);
    if (playerErr) console.error("Erro player:", playerErr);
    else console.log(`SUCESSO: ${count} Jogadores removidos permanentemente.`);

    console.log("--- EXPURGO CONCLUÍDO ---");
}

nuke();
