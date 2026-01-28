
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { STORE_ITEMS, GAMES } from '../constants';

interface PlayerRank {
    id: string;
    name: string;
    accumulated_xp: number;
    acorde_coins: number;
    selected_card_id: string;
    equipped_items: any;
    high_score: number;
    recovery_pin: string;
}

const RankingGeralPage: React.FC = () => {
    const [rankings, setRankings] = useState<PlayerRank[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerRank | null>(null);
    const [xpBreakdown, setXpBreakdown] = useState<any[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const GAMES_LIST = GAMES; // Alias for constants

    const fetchRankings = async () => {
        try {
            // Buscamos um número maior de jogadores para evitar que novos perfis (0 XP) fiquem de fora
            const { data, error } = await supabase
                .from('players')
                .select('id, name, accumulated_xp, acorde_coins, selected_card_id, equipped_items, high_score, recovery_pin')
                .order('accumulated_xp', { ascending: false })
                .limit(1000);

            if (error) throw error;

            if (data) {
                // Lógica de De-duplicação Inteligente: 
                // Se houver nomes iguais, priorizamos o perfil que tem ITENS EQUIPADOS, 
                // pois indica que é a conta ativa/elite do aluno.
                const uniquePlayers: Record<string, PlayerRank> = {};

                data.forEach(player => {
                    const nameKey = player.name.trim().toUpperCase();
                    const existing = uniquePlayers[nameKey];

                    const hasItems = player.equipped_items && Object.keys(player.equipped_items).length > 0;
                    const existingHasItems = existing?.equipped_items && Object.keys(existing.equipped_items).length > 0;

                    if (!existing) {
                        uniquePlayers[nameKey] = player;
                    } else {
                        // Se o perfil atual tem mais XP, ele ganha (comportamento padrão)
                        if (player.accumulated_xp > existing.accumulated_xp) {
                            // Mas se o perfil com menos XP já tinha itens e o maior não tem, talvez queiramos manter o com itens?
                            // Para ser seguro: se a diferença de XP for pequena e o menor tiver itens, mantemos o com itens.
                            uniquePlayers[nameKey] = player;
                        } else if (player.accumulated_xp === existing.accumulated_xp) {
                            // Se o XP for igual (ex: dois perfis novos com 0 XP), priorizamos o que tem itens
                            if (hasItems && !existingHasItems) {
                                uniquePlayers[nameKey] = player;
                            }
                        }
                    }
                });

                // Converte de volta para array e ordena novamente por XP (limita ao Top 50)
                const finalRankings = Object.values(uniquePlayers)
                    .sort((a, b) => b.accumulated_xp - a.accumulated_xp)
                    .slice(0, 50);

                setRankings(finalRankings);
            }
        } catch (err) {
            console.error("Erro ao carregar ranking:", err);
        } finally {
            setLoading(false);
        }
    };

    const handlePlayerClick = async (player: PlayerRank) => {
        setSelectedPlayer(player);
        setLoadingDetails(true);
        setXpBreakdown([]);
        try {
            // Buscamos o histórico de XP de todas as fontes possíveis
            const [gameScores, ritmoPro, repita, genericScores] = await Promise.all([
                supabase.from('game_scores').select('game_id, score').eq('player_id', player.id),
                supabase.from('ritmo_pro_ranking').select('score').eq('pin', player.recovery_pin),
                supabase.from('repita_leaderboard').select('total_xp').eq('pin', player.recovery_pin),
                supabase.from('scores').select('xp_earned, score').eq('player_id', player.id)
            ]);

            const breakdown: any[] = [];
            const gamesCovered = new Set();

            // 1. Ritmo Pro (Tabela Dedicada)
            const ritmoXp = ritmoPro.data?.reduce((sum, curr) => sum + (curr.score || 0), 0) || 0;
            if (ritmoXp > 0) {
                const game = GAMES.find(g => g.id === 'ritmo-pro');
                breakdown.push({
                    id: 'ritmo-pro',
                    title: game?.title || 'Ritmo Pro',
                    xp: Math.round(ritmoXp),
                    icon: game?.thumbnail || '🥁'
                });
                gamesCovered.add('ritmo-pro');
            }

            // 2. Repita a Nota
            const repitaXp = repita.data?.reduce((sum, curr) => sum + (curr.total_xp || 0), 0) || 0;
            if (repitaXp > 0) {
                breakdown.push({
                    id: 'repita-a-nota',
                    title: 'Repita a Nota',
                    xp: Math.round(repitaXp),
                    icon: '🎵'
                });
                gamesCovered.add('repita-a-nota');
            }

            // 3. Game Scores (Agregado)
            if (gameScores.data) {
                const aggregated = gameScores.data.reduce((acc: any, curr: any) => {
                    acc[curr.game_id] = (acc[curr.game_id] || 0) + curr.score;
                    return acc;
                }, {});
                Object.keys(aggregated).forEach(gid => {
                    if (gamesCovered.has(gid)) return;
                    const game = GAMES.find(g => g.id === gid);
                    breakdown.push({
                        id: gid,
                        title: game?.title || gid,
                        xp: Math.round(aggregated[gid]),
                        icon: game?.thumbnail || '🎮'
                    });
                    gamesCovered.add(gid);
                });
            }

            // 4. Scores Genéricos (Fallback para Chord Rush antigo ou outros desafios)
            const genericXp = genericScores.data?.reduce((sum, curr) => sum + (curr.xp_earned || curr.score || 0), 0) || 0;
            if (genericXp > 0) {
                // Tentamos atribuir ao Chord Rush se ele não tiver XP via game_scores (comum em migrações)
                if (!gamesCovered.has('chord-rush')) {
                    const game = GAMES.find(g => g.id === 'chord-rush');
                    breakdown.push({
                        id: 'chord-rush',
                        title: game?.title || 'Chord Rush',
                        xp: Math.round(genericXp),
                        icon: game?.thumbnail || '🎹'
                    });
                } else {
                    breakdown.push({
                        id: 'generic',
                        title: 'Desafios de Treino',
                        xp: Math.round(genericXp),
                        icon: '🌟'
                    });
                }
            }

            setXpBreakdown(breakdown.sort((a, b) => b.xp - a.xp));
        } catch (err) {
            console.error("Erro ao carregar detalhes:", err);
        } finally {
            setLoadingDetails(false);
        }
    };

    useEffect(() => {
        fetchRankings();
    }, []);

    return (
        <div className="max-w-4xl mx-auto px-1 md:px-4 py-4 md:py-8 animate-fade-in pb-20">
            <div className="text-center mb-6 md:mb-12">
                <h2 className="text-2xl md:text-5xl font-black text-white italic uppercase tracking-tighter mb-2 md:mb-4">
                    Hall da <span className="text-orange-500 font-black">Fama Geral</span>
                </h2>
                <div className="flex flex-col items-center gap-4">
                    <p className="text-stone-500 text-[10px] font-black uppercase tracking-[0.3em]">RANKING ÚNICO DE ELITE</p>
                    <button
                        onClick={() => { setLoading(true); fetchRankings(); }}
                        className="bg-stone-900 border border-stone-800 px-6 py-2 rounded-xl text-[9px] text-stone-400 hover:text-orange-500 font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                    >
                        ↻ Sincronizar Galeria
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
                </div>
            ) : (
                <div className="space-y-4">
                    {rankings.map((player, idx) => {
                        const equipped = player.equipped_items || {};
                        // Busca o item completo do catálogo para garantir estilo exclusivo
                        const cardItem = STORE_ITEMS.find(i => i.id === (equipped.card || player.selected_card_id));
                        const borderItem = STORE_ITEMS.find(i => i.id === equipped.border);
                        const fontItem = STORE_ITEMS.find(i => i.id === equipped.font);
                        const iconItem = STORE_ITEMS.find(i => i.id === equipped.icon);
                        const cardBaseClass = cardItem ? `${cardItem.preview} card-bg-optimized` : 'bg-stone-900/40 border-stone-800/60';
                        const borderActive = borderItem ? `${borderItem.preview} scale-[1.01]` : '';
                        const fontActive = fontItem ? fontItem.preview : 'text-white';

                        return (
                            <div
                                key={player.id}
                                onClick={() => handlePlayerClick(player)}
                                className={`
                                    relative overflow-hidden group transition-all duration-500 border-2 rounded-2xl md:rounded-3xl p-3 md:p-8 flex items-center gap-3 md:gap-8 cursor-pointer hover:scale-[1.02] active:scale-95
                                    ${cardBaseClass} ${borderActive}
                                `}
                            >
                                {/* Overlays para Atmosfera e Efeitos */}
                                <div className="absolute inset-0 card-overlay-elite z-0"></div>
                                {(cardItem?.rarity === 'lendário' || borderItem?.rarity === 'lendário' || iconItem?.rarity === 'lendário' || fontItem?.rarity === 'lendário') && <div className="legendary-particle-overlay"></div>}
                                {([cardItem, borderItem, iconItem, fontItem].some(item => item && ['raro', 'épico', 'lendário'].includes(item.rarity))) && <div className="shimmer-overlay"></div>}

                                <div className={`
                                  w-8 h-8 md:w-20 md:h-20 flex items-center justify-center rounded-lg md:rounded-2xl font-black text-sm md:text-5xl italic shrink-0 z-10
                                  ${idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-600 text-white rotate-[-8deg] shadow-[0_10px_30px_rgba(249,115,22,0.4)] scale-110' :
                                        idx === 1 ? 'bg-stone-700 text-stone-200' :
                                            idx === 2 ? 'bg-stone-800 text-stone-400' : 'bg-black/40 text-stone-700 border border-stone-800'}
                                `}>
                                    #{idx + 1}
                                </div>

                                <div className="flex items-center gap-2 md:gap-4 grow min-w-0 z-10">
                                    <div className="w-8 h-8 md:w-16 md:h-16 rounded-lg md:rounded-2xl bg-stone-800 flex items-center justify-center text-white text-base md:text-2xl font-black shrink-0 border border-stone-700 shadow-inner overflow-hidden">
                                        {iconItem ? (
                                            iconItem.preview.startsWith('/') ? (
                                                <img src={iconItem.preview} alt={iconItem.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-lg md:text-4xl">{iconItem.preview}</span>
                                            )
                                        ) : (
                                            <img src="/gallery_icon.png" alt="Icon" className="w-full h-full object-contain p-1 brightness-110" />
                                        )}
                                    </div>
                                    <div className="min-w-0 transition-all duration-500">
                                        <h3 className={`text-sm md:text-2xl font-black uppercase italic truncate leading-none mb-0.5 md:mb-1 tracking-tighter transition-all ${fontActive}`}>
                                            {player.name}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <span className="hidden md:inline text-[8px] md:text-[10px] text-stone-300 font-black uppercase tracking-[0.2em] bg-black/20 px-2 py-0.5 rounded">
                                                {cardItem || borderItem || fontItem || iconItem ? '🌟 JOGADOR ELITE' : '🔰 JOGADOR RECRUTA'}
                                            </span>
                                            <span className="md:hidden text-[7px] text-stone-400 font-black uppercase tracking-wider">
                                                XP TOTAL
                                            </span>
                                            {(borderItem || iconItem) && <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping"></div>}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end shrink-0 z-10">
                                    <span className="hidden md:block text-[8px] md:text-[10px] text-stone-400 font-black uppercase leading-none mb-1 tracking-widest">XP GLOBAL</span>
                                    <span className="text-orange-500 font-black text-xl md:text-6xl italic tracking-tighter drop-shadow-[0_4px_10px_rgba(249,115,22,0.3)]">
                                        {player.accumulated_xp?.toLocaleString('pt-BR') || 0}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODAL DE DETALHES DO JOGADOR */}
            {selectedPlayer && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6 md:p-12 animate-fade-in">
                    <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setSelectedPlayer(null)}></div>
                    <div className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col max-h-full">
                        {/* Header do Modal com visual do perfil */}
                        {(() => {
                            const equipped = selectedPlayer.equipped_items || {};
                            const cardItem = STORE_ITEMS.find(i => i.id === (equipped.card || selectedPlayer.selected_card_id));
                            const fontItem = STORE_ITEMS.find(i => i.id === equipped.font);
                            const iconItem = STORE_ITEMS.find(i => i.id === equipped.icon);
                            const fontActive = fontItem ? fontItem.preview : 'text-white';

                            return (
                                <div className={`p-6 md:p-12 relative card-bg-optimized ${cardItem?.preview || ''} border-b border-stone-800/50`}>
                                    <div className="absolute inset-0 card-overlay-elite z-0"></div>
                                    <button
                                        onClick={() => setSelectedPlayer(null)}
                                        className="absolute top-4 right-4 md:top-8 md:right-8 w-10 h-10 rounded-full bg-black/40 border border-white/10 text-white flex items-center justify-center font-bold z-50 hover:bg-orange-600 transition-colors"
                                    >✕</button>

                                    <div className="relative z-10 flex flex-col items-center text-center">
                                        <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl bg-stone-800 border-2 border-stone-700 overflow-hidden mb-4 shadow-2xl">
                                            {iconItem ? (
                                                iconItem.preview.startsWith('/') ? (
                                                    <img src={iconItem.preview} alt="Icon" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-4xl md:text-6xl flex items-center justify-center h-full">{iconItem.preview}</span>
                                                )
                                            ) : (
                                                <img src="/gallery_icon.png" alt="Icon" className="w-full h-full object-contain p-2" />
                                            )}
                                        </div>
                                        <h2 className={`text-2xl md:text-5xl font-black uppercase italic tracking-tighter mb-1 ${fontActive}`}>
                                            {selectedPlayer.name}
                                        </h2>
                                        <div className="px-4 py-1.5 bg-orange-600 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-orange-950/40">
                                            Total: {selectedPlayer.accumulated_xp?.toLocaleString('pt-BR')} XP
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Conteúdo: Breakdown por Jogo */}
                        <div className="p-6 md:p-10 overflow-y-auto grow custom-scrollbar">
                            <h3 className="text-stone-500 text-[10px] md:text-xs font-black uppercase tracking-[0.3em] mb-6 text-center">Desempenho por Jogo</h3>

                            {loadingDetails ? (
                                <div className="flex justify-center py-10">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {xpBreakdown.length > 0 ? (
                                        xpBreakdown.map(game => (
                                            <div key={game.id} className="bg-stone-800/40 border border-stone-800 p-4 rounded-2xl flex items-center gap-4 group hover:border-orange-500/50 transition-all">
                                                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-black/40 flex items-center justify-center shrink-0 border border-stone-700 overflow-hidden">
                                                    {game.icon.startsWith('/') ? (
                                                        <img src={game.icon} alt={game.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-xl md:text-2xl">{game.icon}</span>
                                                    )}
                                                </div>
                                                <div className="grow min-w-0">
                                                    <h4 className="text-white font-black uppercase italic text-xs md:text-sm truncate tracking-tighter">{game.title}</h4>
                                                    <p className="text-orange-500 font-black text-sm md:text-lg italic tracking-tight">{game.xp.toLocaleString('pt-BR')} <span className="text-[10px] text-stone-600">XP</span></p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-full py-10 text-center">
                                            <p className="text-stone-600 font-black uppercase text-[10px] tracking-widest">Nenhum dado detalhado encontrado</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Recorde e Info Adicional */}
                            <div className="mt-8 pt-8 border-t border-stone-800 flex justify-center gap-12">
                                <div className="text-center">
                                    <span className="block text-[8px] text-stone-600 font-black uppercase tracking-widest mb-1">Recorde Máximo</span>
                                    <span className="text-white font-black text-xl italic tracking-tighter">🏆 {selectedPlayer.high_score?.toLocaleString('pt-BR')}</span>
                                </div>
                                <div className="text-center">
                                    <span className="block text-[8px] text-stone-600 font-black uppercase tracking-widest mb-1">Moedas Acorde</span>
                                    <span className="text-orange-500 font-black text-xl italic tracking-tighter">🪙 {selectedPlayer.acorde_coins?.toLocaleString('pt-BR')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-black/40 text-center border-t border-stone-800/50">
                            <p className="text-[8px] text-stone-700 font-black uppercase tracking-[0.4em]">Sincronização em Tempo Real via Servidor Acorde</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RankingGeralPage;
