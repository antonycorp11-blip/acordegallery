
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface PlayerRank {
    id: string;
    name: string;
    accumulated_xp: number;
    acorde_coins: number;
    selected_card_id: string;
    high_score: number;
}

const RankingGeralPage: React.FC = () => {
    const [rankings, setRankings] = useState<PlayerRank[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRankings = async () => {
            try {
                const { data, error } = await supabase
                    .from('players')
                    .select('id, name, accumulated_xp, acorde_coins, selected_card_id, high_score')
                    .order('accumulated_xp', { ascending: false })
                    .limit(50);

                if (error) throw error;
                setRankings(data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchRankings();
    }, []);

    if (loading) return (
        <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
            <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-black text-white italic uppercase tracking-tighter mb-4">
                    Hall da <span className="text-orange-500">Fama Geral</span>
                </h2>
                <p className="text-stone-500 text-xs md:text-sm font-black uppercase tracking-[0.3em]">
                    Os maiores guerreiros da Acorde Studio
                </p>
            </div>

            <div className="space-y-4">
                {rankings.map((player, idx) => (
                    <div
                        key={player.id}
                        className={`
              relative overflow-hidden group transition-all duration-500
              ${player.selected_card_id === 'epic-red' ? 'bg-gradient-to-r from-red-950/40 to-stone-900/40' :
                                player.selected_card_id === 'cyber-aqua' ? 'bg-gradient-to-r from-cyan-950/40 to-stone-900/40' :
                                    'bg-stone-900/30'} 
              border-2 
              ${player.selected_card_id === 'neon-orange' ? 'border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.2)]' : 'border-stone-800/50'}
              rounded-3xl p-4 md:p-6 flex items-center gap-4 md:gap-8
            `}
                    >
                        {/* Posição */}
                        <div className={`
              w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded-2xl font-black text-xl md:text-2xl italic shrink-0
              ${idx === 0 ? 'bg-orange-600 text-white shadow-lg rotate-[-10deg]' :
                                idx === 1 ? 'bg-stone-700 text-stone-300' :
                                    idx === 2 ? 'bg-stone-800 text-stone-500' : 'text-stone-700 border border-stone-800'}
            `}>
                            #{idx + 1}
                        </div>

                        {/* Avatar & Nome */}
                        <div className="flex items-center gap-4 grow min-w-0">
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-stone-800 flex items-center justify-center text-white text-xl md:text-2xl font-black shrink-0 border border-stone-700">
                                {player.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <h3 className={`text-lg md:text-2xl font-extrabold uppercase italic truncate leading-none mb-1 ${player.selected_card_id === 'gold-name' ? 'text-yellow-400 drop-shadow-md' : 'text-white'}`}>
                                    {player.name}
                                </h3>
                                <span className="text-[8px] md:text-[10px] text-stone-600 font-black uppercase tracking-widest">Player Profile v1.0</span>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-6 md:gap-12 shrink-0">
                            <div className="flex flex-col items-end">
                                <span className="text-[8px] md:text-[10px] text-stone-600 font-black uppercase leading-none mb-1">XP Total</span>
                                <span className="text-orange-500 font-black text-lg md:text-2xl italic tracking-tighter">{player.accumulated_xp?.toLocaleString() || 0}</span>
                            </div>
                            <div className="hidden sm:flex flex-col items-end">
                                <span className="text-[8px] md:text-[10px] text-stone-600 font-black uppercase leading-none mb-1">Coins</span>
                                <span className="text-white font-black text-lg md:text-2xl italic tracking-tighter">{player.acorde_coins || 0}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RankingGeralPage;
