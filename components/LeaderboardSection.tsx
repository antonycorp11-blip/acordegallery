
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { GAMES } from '../constants';

interface RankedPlayer {
    name: string;
    score: number;
}

interface GameLeaderboard {
    gameId: string;
    ranking: RankedPlayer[];
}

const LeaderboardSection: React.FC = () => {
    const [leaderboards, setLeaderboards] = useState<GameLeaderboard[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllRankings = async () => {
            try {
                const results = await Promise.all(
                    GAMES.map(async (game) => {
                        let formattedRanking: RankedPlayer[] = [];

                        try {
                            if (game.id === 'voice-rush') {
                                // Voice Rush usa 'repita_leaderboard'
                                const { data } = await supabase
                                    .from('repita_leaderboard')
                                    .select('player_name, total_xp')
                                    .order('total_xp', { ascending: false })
                                    .limit(5);

                                if (data) {
                                    formattedRanking = data.map((d: any) => ({
                                        name: d.player_name,
                                        score: d.total_xp
                                    }));
                                }
                            } else if (game.id === 'ritmo-pro') {
                                // Ritmo Pro usa 'ritmo_pro_ranking' com 'player_name' direto
                                const { data } = await supabase
                                    .from('ritmo_pro_ranking')
                                    .select('player_name, score')
                                    .order('score', { ascending: false })
                                    .limit(5);

                                if (data) {
                                    formattedRanking = data.map((d: any) => ({
                                        name: d.player_name || 'Anônimo',
                                        score: Math.floor(d.score || 0)
                                    }));
                                }
                            } else if (game.id === 'chord-rush') {
                                // Chord Rush usa 'players' e 'high_score'
                                const { data } = await supabase
                                    .from('players')
                                    .select('name, high_score')
                                    .gt('high_score', 0)
                                    .order('high_score', { ascending: false })
                                    .limit(5);

                                if (data) {
                                    formattedRanking = data.map((d: any) => ({
                                        name: d.name,
                                        score: d.high_score
                                    }));
                                }
                            } else {
                                // Fallback genérico para novos jogos
                                const { data } = await supabase
                                    .from('players')
                                    .select('name, high_score')
                                    .order('high_score', { ascending: false })
                                    .limit(5);
                                if (data) {
                                    formattedRanking = data.map((d: any) => ({
                                        name: d.name,
                                        score: d.high_score
                                    }));
                                }
                            }
                        } catch (e) {
                            console.error(`Error loading ranking for ${game.id}`, e);
                        }

                        return {
                            gameId: game.id,
                            ranking: formattedRanking
                        };
                    })
                );

                setLeaderboards(results);
            } catch (err) {
                console.error("Error fetching leaderboards", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAllRankings();
    }, []);

    if (loading) return null;

    return (
        <div className="max-w-7xl mx-auto mb-24 animate-fade-in">
            <div className="flex items-center gap-6 mb-8">
                <h2 className="text-2xl md:text-4xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
                    <div className="w-2 h-10 bg-orange-600 skew-x-[-20deg]"></div>
                    Global Standings
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-stone-800 to-transparent"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {GAMES.map((game) => {
                    const board = leaderboards.find(l => l.gameId === game.id);
                    const ranking = board?.ranking || [];

                    return (
                        <div key={game.id} className="bg-stone-900/30 backdrop-blur-xl border border-stone-800/50 rounded-3xl p-6 md:p-8 relative overflow-hidden group hover:border-orange-500/20 transition-all duration-500 shadow-2xl">
                            {/* Background Glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/5 rounded-full blur-[60px] group-hover:bg-orange-600/10 transition-colors"></div>

                            {/* Game Info Header */}
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl overflow-hidden border border-stone-800 shadow-lg">
                                    <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-black text-white text-base uppercase italic tracking-tight truncate">{game.title}</h3>
                                    <span className="text-[10px] text-orange-500/70 font-black uppercase tracking-[0.2em]">{game.category} Division</span>
                                </div>
                            </div>

                            {/* Rankings List */}
                            <div className="space-y-4">
                                {ranking.length > 0 ? (
                                    ranking.map((player, idx) => (
                                        <div key={idx} className={`flex items-center justify-between p-3 rounded-2xl transition-all ${idx === 0 ? 'bg-orange-600/10 border border-orange-500/20' : 'bg-black/40 border border-stone-800/30'}`}>
                                            <div className="flex items-center gap-4">
                                                <span className={`
                          w-6 h-6 flex items-center justify-center rounded-lg font-black text-[10px] italic
                          ${idx === 0 ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]' :
                                                        idx === 1 ? 'bg-stone-700 text-stone-300' :
                                                            idx === 2 ? 'bg-stone-800 text-stone-500' : 'text-stone-700'}
                        `}>
                                                    #{idx + 1}
                                                </span>
                                                <span className={`font-black uppercase text-xs tracking-tight truncate max-w-[100px] ${idx === 0 ? 'text-white' : 'text-stone-400'}`}>
                                                    {player.name}
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[8px] text-stone-600 font-black uppercase leading-none">Score</span>
                                                <span className={`font-black font-mono text-sm ${idx === 0 ? 'text-orange-500' : 'text-stone-500'}`}>{player.score.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10">
                                        <div className="text-stone-700 text-[10px] font-black uppercase tracking-[0.3em] mb-2">No Data Available</div>
                                        <div className="h-1 w-8 bg-stone-900 mx-auto rounded-full"></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default LeaderboardSection;
