
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { GAMES } from '../constants';

interface AdminPanelProps {
    adminPlayer: any;
    onUpdate: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ adminPlayer, onUpdate }) => {
    const [players, setPlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLog, setActionLog] = useState<string>('');
    const [gameOfWeekId, setGameOfWeekId] = useState<string>('');
    const [gamePrize, setGamePrize] = useState<string>('');
    const [exchangeRate, setExchangeRate] = useState<string>('10');
    const [exclusiveCollectionName, setExclusiveCollectionName] = useState<string>('Times de Futebol');
    const [exclusiveDeadline, setExclusiveDeadline] = useState<string>('2026-02-15T23:59:59');

    // Configurações persistidas no inventário do admin
    useEffect(() => {
        if (adminPlayer.equipped_items?.game_settings) {
            setGameOfWeekId(adminPlayer.equipped_items.game_settings.id || '');
            setGamePrize(adminPlayer.equipped_items.game_settings.prize || '');
            setExchangeRate(adminPlayer.equipped_items.game_settings.exchange_rate || '10');
            setExclusiveCollectionName(adminPlayer.equipped_items.game_settings.exclusive_collection_name || 'Times de Futebol');
            setExclusiveDeadline(adminPlayer.equipped_items.game_settings.exclusive_deadline || '2026-02-15T23:59:59');
        }
        fetchPlayers();
    }, [adminPlayer]);

    const fetchPlayers = async () => {
        const { data } = await supabase.from('players').select('*').order('name');
        if (data) setPlayers(data);
    };

    const log = (msg: string) => setActionLog(prev => `> ${msg}\n${prev}`);

    const handleGiveCoins = async (playerId: string, amount: number) => {
        const player = players.find(p => p.id === playerId);
        if (!player) return;

        const { error } = await supabase
            .from('players')
            .update({ acorde_coins: (player.acorde_coins || 0) + amount })
            .eq('id', playerId);

        if (error) log(`Erro ao dar moedas p/ ${player.name}: ${error.message}`);
        else {
            log(`DEU ${amount} MOEDAS PARA ${player.name}`);
            fetchPlayers();
        }
    };

    const handleGiveCoinsAll = async (amount: number) => {
        if (!confirm(`Tem certeza que quer dar ${amount} moedas para TODOS?`)) return;
        setLoading(true);

        // Supabase não permite update em massa sem where as vezes, mas vamos tentar
        // Se falhar, fazemos loop (lento mas seguro para admin panel)
        for (const p of players) {
            await supabase
                .from('players')
                .update({ acorde_coins: (p.acorde_coins || 0) + amount })
                .eq('id', p.id);
        }

        log(`DEU ${amount} MOEDAS PARA TODOS OS JOGADORES`);
        setLoading(false);
        fetchPlayers();
        onUpdate();
    };

    const handleResetRanking = async () => {
        if (!confirm("ISSO VAI ZERAR TODA A XP E SCORES DE TODOS OS JOGADORES. TEM CERTEZA?")) return;
        setLoading(true);

        const { error: error1 } = await supabase.from('game_scores').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        const { error: error2 } = await supabase.from('players').update({
            accumulated_xp: 0,
            xp: 0,
            total_xp: 0,
            high_score: 0
        }).neq('id', '00000000-0000-0000-0000-000000000000');

        if (error1 || error2) log("Erro ao resetar ranking.");
        else log("RANKING RESETADO COM SUCESSO.");

        setLoading(false);
        fetchPlayers();
        onUpdate();
    };

    const handleSetGameOfWeek = async () => {
        setLoading(true);
        const newSettings = {
            id: gameOfWeekId,
            prize: gamePrize,
            exchange_rate: exchangeRate,
            exclusive_collection_name: exclusiveCollectionName,
            exclusive_deadline: exclusiveDeadline
        };

        // Salvar nas configurações do Admin (hack para persistencia sem tabela nova)
        const newEquipped = {
            ...adminPlayer.equipped_items,
            game_settings: newSettings
        };

        const { error } = await supabase
            .from('players')
            .update({ equipped_items: newEquipped })
            .eq('id', adminPlayer.id);

        if (error) log("Erro ao salvar Configurações.");
        else log(`CONFIGURAÇÕES GLOBAIS ATUALIZADAS. Coleção: ${exclusiveCollectionName}`);

        setLoading(false);
        onUpdate();
    };

    const handleResetAdmin = async () => {
        const { error } = await supabase
            .from('players')
            .update({
                acorde_coins: 0,
                equipped_items: {} // Limpa tudo, mas mantem game settings se cuidado, mas o user pediu resetar icones
            })
            .eq('id', adminPlayer.id);

        if (!error) {
            alert("Admin resetado. Recarregue a pagina.");
            window.location.reload();
        }
    };

    const handleResetMyXP = async () => {
        if (!confirm("ISSO VAI ZERAR APENAS AS SUAS ESTATÍSTICAS (XP/RECORDE). VOCÊ FICARÁ EM ÚLTIMO NO RANKING. CONTINUAR?")) return;
        setLoading(true);
        log("LIMPANDO PROGRESSO DO CRIADOR...");

        try {
            // 1. Limpar Tabelas de Scores por ID e por game_id de teste
            await supabase.from('game_scores').delete().eq('player_id', adminPlayer.id);
            await supabase.from('game_scores').delete().eq('game_id', 'god-mode-test');
            await supabase.from('scores').delete().eq('player_id', adminPlayer.id);

            // 2. Limpar Tabelas de Scores por PIN (Repita/Ritmo)
            await supabase.from('repita_leaderboard').delete().eq('pin', adminPlayer.recovery_pin);
            await supabase.from('ritmo_pro_ranking').delete().eq('pin', adminPlayer.recovery_pin);

            // 3. Resetar Atributos do Player
            const { error } = await supabase
                .from('players')
                .update({
                    accumulated_xp: 0,
                    xp: 0,
                    total_xp: 0,
                    high_score: 0,
                    games_played: 0,
                    last_viewed_xp: 0,
                    total_spent_xp: 0,
                    acorde_coins: 2000
                })
                .eq('id', adminPlayer.id);

            if (error) throw error;

            log("PROGRESSO DO CRIADOR ZERADO COM SUCESSO.");
            fetchPlayers();
            onUpdate();
        } catch (err: any) {
            log("ERRO AO ZERAR XP: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGiveXP = async (playerId: string, amount: number) => {
        const player = players.find(p => p.id === playerId);
        if (!player) return;

        log(`INJETANDO ${amount} XP PARA ${player.name}...`);

        // Inserimos na tabela scores para que o gatilho de sincronização detecte e salve permanentemente
        const { error } = await supabase
            .from('scores')
            .insert([{
                player_id: playerId,
                score: amount,
                level: 1,
                xp_earned: amount
            }]);

        if (error) log(`Erro ao dar XP p/ ${player.name}: ${error.message}`);
        else {
            log(`SUCESSO: ${amount} XP ADICIONADO PARA ${player.name}`);
            fetchPlayers();
            onUpdate();
        }
    };

    const handleGiveXPManual = async (playerId: string) => {
        const player = players.find(p => p.id === playerId);
        if (!player) return;

        const amount = prompt(`Quanto XP deseja injetar para ${player.name}?`);
        if (amount && !isNaN(Number(amount))) {
            handleGiveXP(playerId, Number(amount));
        }
    };

    const handlePurgePlayers = async () => {
        const confirmText = prompt("DIGITE 'DELETAR' PARA CONFIRMAR A EXCLUSÃO DE TODOS OS ALUNOS (MENOS VOCÊ). ISSO É IRREVERSÍVEL.");
        if (confirmText !== 'DELETAR') return;

        setLoading(true);
        log("INICIANDO EXPURGO TOTAL...");

        // 1. Identificar IDs para não deletar (O Admin)
        const { data: adminData } = await supabase
            .from('players')
            .select('id')
            .eq('recovery_pin', '8238')
            .eq('name', 'AQUILLES ANTONY')
            .single();

        const adminId = adminData?.id;

        if (!adminId) {
            log("ERRO: Admin não identificado. Cancelando para segurança.");
            setLoading(false);
            return;
        }

        // 2. Deletar Scores de todos menos Admin
        const { error: scoreError } = await supabase
            .from('game_scores')
            .delete()
            .neq('player_id', adminId);

        if (scoreError) log("Erro ao limpar scores: " + scoreError.message);
        else log("Scores de alunos deletados.");

        // 3. Deletar Jogadores menos Admin
        const { error: playerError, count } = await supabase
            .from('players')
            .delete({ count: 'exact' })
            .neq('id', adminId);

        if (playerError) log("Erro ao deletar alunos: " + playerError.message);
        else log(`EXPURGO CONCLUÍDO. ${count} ALUNOS REMOVIDOS.`);

        setLoading(false);
        fetchPlayers();
        onUpdate();
    };

    return (
        <div className="max-w-6xl mx-auto p-8 animate-fade-in pb-32">
            <h1 className="text-4xl font-black text-red-500 uppercase mb-8">Painel de Controle do Criador</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                {/* JOGO DA SEMANA */}
                <div className="bg-stone-900 border border-red-900/50 p-6 rounded-2xl">
                    <h2 className="text-xl font-bold text-white mb-4 uppercase">Jogo da Semana</h2>
                    <select
                        value={gameOfWeekId}
                        onChange={(e) => setGameOfWeekId(e.target.value)}
                        className="w-full bg-black border border-stone-700 text-white p-3 rounded-lg mb-4 text-xs font-bold uppercase"
                    >
                        <option value="">Nenhum</option>
                        {GAMES.map(g => (
                            <option key={g.id} value={g.id}>{g.title}</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        placeholder="Descrição do Prêmio (ex: Um Chocolate)"
                        value={gamePrize}
                        onChange={(e) => setGamePrize(e.target.value)}
                        className="w-full bg-black border border-stone-700 text-white p-3 rounded-lg mb-4 text-xs font-bold uppercase"
                    />
                    <div className="mb-4">
                        <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest block mb-2">
                            TAXA DE CÂMBIO XP: MOEDAS (Atual: {exchangeRate}:1)
                        </label>
                        <input
                            type="number"
                            placeholder="XP necessária para 1 Moeda"
                            value={exchangeRate}
                            onChange={(e) => setExchangeRate(e.target.value)}
                            className="w-full bg-black border border-stone-700 text-white p-3 rounded-lg text-xs font-bold uppercase"
                        />
                    </div>
                    <div className="mb-4 p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl">
                        <h3 className="text-[10px] text-orange-500 font-bold uppercase tracking-widest mb-3">Gerenciar Coleção Exclusiva</h3>
                        <input
                            type="text"
                            placeholder="Nome da Coleção (ex: Times de Futebol)"
                            value={exclusiveCollectionName}
                            onChange={(e) => setExclusiveCollectionName(e.target.value)}
                            className="w-full bg-black border border-stone-700 text-white p-3 rounded-lg mb-2 text-[10px] font-bold uppercase"
                        />
                        <input
                            type="datetime-local"
                            value={exclusiveDeadline.substring(0, 16)}
                            onChange={(e) => setExclusiveDeadline(e.target.value)}
                            className="w-full bg-black border border-stone-700 text-white p-3 rounded-lg text-[10px] font-bold uppercase"
                        />
                    </div>
                    <button onClick={handleSetGameOfWeek} disabled={loading} className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-xl uppercase tracking-widest text-xs">
                        Salvar Todas Configurações
                    </button>
                </div>

                {/* AÇÕES GLOBAIS */}
                <div className="bg-stone-900 border border-red-900/50 p-6 rounded-2xl flex flex-col gap-4">
                    <h2 className="text-xl font-bold text-white mb-4 uppercase">Ações de Emergência</h2>
                    <button onClick={() => handleGiveCoinsAll(1000)} disabled={loading} className="bg-stone-800 hover:bg-green-800 text-white py-3 rounded-xl font-bold text-xs uppercase border border-stone-700">
                        +1.000 Moedas para TODOS
                    </button>
                    <button onClick={handleResetRanking} disabled={loading} className="bg-stone-800 hover:bg-red-900 text-white py-3 rounded-xl font-bold text-xs uppercase border border-stone-700">
                        ⚠️ RESETAR RANKING (XP ZERO)
                    </button>
                    <button onClick={handlePurgePlayers} disabled={loading} className="bg-red-900 hover:bg-red-700 text-white py-3 rounded-xl font-black text-xs uppercase border border-red-500 animate-pulse">
                        💀 EXPURGO TOTAL (DELETAR TODOS ALUNOS)
                    </button>
                    <button onClick={handleResetAdmin} className="bg-stone-800 hover:bg-blue-900 text-white py-3 rounded-xl font-bold text-xs uppercase border border-stone-700">
                        Resetar Meu Admin (Zero Coins/Items)
                    </button>
                    <button onClick={handleResetMyXP} disabled={loading} className="bg-orange-600/10 hover:bg-orange-600 text-orange-500 hover:text-white py-3 rounded-xl font-black text-xs uppercase border border-orange-500/50 transition-all">
                        🚀 ZERAR MEU XP (SAIR DO RANKING)
                    </button>
                </div>
            </div>

            {/* LISTA DE JOGADORES */}
            <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
                <div className="p-4 bg-stone-950 border-b border-stone-800 font-black text-white uppercase text-xs tracking-widest flex justify-between">
                    <span>Lista de Alunos ({players.length})</span>
                    <button onClick={fetchPlayers} className="text-stone-500 hover:text-white">Atualizar</button>
                </div>
                <div className="max-h-[600px] overflow-y-auto">
                    {players.map(p => (
                        <div key={p.id} className="p-4 border-b border-stone-800 flex items-center justify-between text-xs hover:bg-stone-800/30">
                            <div>
                                <div className="font-bold text-white uppercase">{p.name}</div>
                                <div className="text-stone-500 font-mono">PIN: {p.recovery_pin}</div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded">
                                    <span className="text-orange-500 font-bold">{p.acorde_coins || 0} C</span>
                                    <button onClick={() => handleGiveCoins(p.id, 500)} className="px-2 py-0.5 bg-green-900/40 text-green-400 text-[10px] rounded hover:bg-green-700 hover:text-white transition-all">
                                        +500 C
                                    </button>
                                </div>

                                <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded border border-orange-500/20">
                                    <span className="text-blue-400 font-bold">{p.accumulated_xp || 0} XP</span>
                                    <button onClick={() => handleGiveXP(p.id, 1000)} className="px-2 py-0.5 bg-blue-900/40 text-blue-400 text-[10px] rounded hover:bg-blue-700 hover:text-white transition-all">
                                        +1k XP
                                    </button>
                                    <button onClick={() => handleGiveXPManual(p.id)} className="px-2 py-0.5 bg-stone-800 text-stone-400 text-[10px] rounded hover:bg-orange-600 hover:text-white transition-all">
                                        Manual
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* LOG */}
            <div className="mt-8 bg-black p-4 rounded-xl font-mono text-[10px] text-stone-500 h-32 overflow-y-auto whitespace-pre-wrap">
                {actionLog || "Aguardando comandos..."}
            </div>
        </div>
    );
};

export default AdminPanel;
