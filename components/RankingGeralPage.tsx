
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { STORE_ITEMS } from '../constants';

interface PlayerRank {
    id: string;
    name: string;
    accumulated_xp: number;
    acorde_coins: number;
    selected_card_id: string;
    equipped_items: any;
    high_score: number;
}

const RankingGeralPage: React.FC = () => {
    const [rankings, setRankings] = useState<PlayerRank[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRankings = async () => {
        try {
            // Buscamos um número maior de jogadores para evitar que novos perfis (0 XP) fiquem de fora
            const { data, error } = await supabase
                .from('players')
                .select('id, name, accumulated_xp, acorde_coins, selected_card_id, equipped_items, high_score')
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
                                className={`
                                    relative overflow-hidden group transition-all duration-500 border-2 rounded-2xl md:rounded-3xl p-3 md:p-8 flex items-center gap-3 md:gap-8
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
        </div>
    );
};

export default RankingGeralPage;
