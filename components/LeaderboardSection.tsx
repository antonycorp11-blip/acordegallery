
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

const calculateDaysLeft = () => {
    const endDate = new Date('2026-02-20T23:59:59');
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
};

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
                                const { data } = await supabase
                                    .from('repita_leaderboard')
                                    .select('player_name, total_xp')
                                    .order('total_xp', { ascending: false })
                                    .limit(3);

                                if (data) {
                                    formattedRanking = data.map((d: any) => ({
                                        name: d.player_name,
                                        score: d.total_xp
                                    }));
                                }
                            } else if (game.id === 'ritmo-pro') {
                                const { data } = await supabase
                                    .from('ritmo_pro_ranking')
                                    .select('player_name, score')
                                    .order('score', { ascending: false })
                                    .limit(3);

                                if (data) {
                                    formattedRanking = data.map((d: any) => ({
                                        name: d.player_name || 'Anônimo',
                                        score: Math.floor(d.score || 0)
                                    }));
                                }
                            } else if (game.id === 'chord-rush') {
                                const { data } = await supabase
                                    .from('players')
                                    .select('name, high_score')
                                    .gt('high_score', 0)
                                    .order('high_score', { ascending: false })
                                    .limit(3);

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
        <div className="max-w-7xl mx-auto mb-16 animate-fade-in">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-1 h-8 bg-orange-600 skew-x-[-20deg]"></div>
                <h2 className="text-xl md:text-2xl font-black text-white italic uppercase tracking-tighter">
                    Global Standings
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-stone-800 to-transparent"></div>
            </div>

            {/* Temporada Countdown */}
            <div className="mb-10 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 border border-stone-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in-up">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-orange-900/40">⏳</div>
                    <div>
                        <h3 className="text-white font-black uppercase italic tracking-tighter text-sm md:text-lg leading-none">Temporada de Fundação</h3>
                        <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mt-1">Acabe: 20 de Fevereiro</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-8">
                    <div className="text-center">
                        <span className="block text-2xl md:text-4xl font-black text-white italic tracking-tighter">
                            {calculateDaysLeft()}
                        </span>
                        <span className="text-[8px] text-stone-500 font-black uppercase tracking-widest">Dias Restantes</span>
                    </div>
                    <div className="h-8 w-px bg-stone-700/50"></div>
                    <div className="text-right">
                        <p className="text-[9px] text-orange-500 font-black uppercase tracking-widest max-w-[150px]">
                            Jogue agora para garantir seu título de Fundador!
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {GAMES.map((game) => {
                    const board = leaderboards.find(l => l.gameId === game.id);
                    const ranking = board?.ranking || [];

                    return (
                        <div key={game.id} className="bg-stone-900/20 backdrop-blur-md border border-stone-800/40 rounded-2xl p-6 relative overflow-hidden group hover:border-orange-500/10 transition-all duration-300">
                            {/* Game Info Header - Compact */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl overflow-hidden border border-stone-800 shrink-0">
                                    <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <h3 className="font-black text-white text-xs uppercase italic tracking-tight truncate">{game.title}</h3>
                                    <span className="text-[7px] text-orange-500/60 font-black uppercase tracking-widest leading-none">Hall of Fame</span>
                                </div>
                            </div>

                            {/* Rankings List - Tighter */}
                            <div className="space-y-2">
                                {ranking.length > 0 ? (
                                    ranking.map((player, idx) => (
                                        <div key={idx} className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${idx === 0 ? 'bg-orange-600/5 border border-orange-500/10' : 'bg-black/20 border border-stone-800/20'}`}>
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <span className={`
                          w-5 h-5 flex items-center justify-center rounded-lg font-black text-[8px] italic shrink-0
                          ${idx === 0 ? 'bg-orange-500 text-white shadow-lg' :
                                                        idx === 1 ? 'bg-stone-700 text-stone-300' :
                                                            'bg-stone-800 text-stone-500'}
                        `}>
                                                    #{idx + 1}
                                                </span>
                                                <span className={`font-black uppercase text-[10px] tracking-tight truncate max-w-[80px] ${idx === 0 ? 'text-white' : 'text-stone-400'}`}>
                                                    {player.name}
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-end shrink-0">
                                                <span className={`font-black font-mono text-xs ${idx === 0 ? 'text-orange-500' : 'text-stone-600'}`}>{player.score.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-6">
                                        <div className="text-stone-700 text-[8px] font-black uppercase tracking-widest">No Records Yet</div>
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
