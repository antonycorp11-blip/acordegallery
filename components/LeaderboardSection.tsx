
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

                        // LÓGICA ESPECÍFICA POR JOGO
                        if (game.id === 'ritmo-pro') {
                            // Ritmo Pro usa tabela própria 'repita_leaderboard'
                            const { data } = await supabase
                                .from('repita_leaderboard')
                                .select('player_name, total_xp')
                                .order('total_xp', { ascending: false })
                                .limit(5);

                            if (data) {
                                formattedRanking = data.map((d: any) => ({
                                    name: d.player_name,
                                    score: d.total_xp // Aqui o XP atua como Score
                                }));
                            }
                        } else {
                            // Chord Rush e Voice Rush (Default)
                            // Usam tabela 'players' e coluna 'high_score'
                            const { data } = await supabase
                                .from('players')
                                .select('name, high_score')
                                .gt('high_score', 0) // Só pega quem tem pontuação
                                .order('high_score', { ascending: false })
                                .limit(5);

                            if (data) {
                                formattedRanking = data.map((d: any) => ({
                                    name: d.name,
                                    score: d.high_score
                                }));
                            }
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
        <div className="max-w-7xl mx-auto mb-16">
            <div className="flex items-center gap-4 mb-8">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-stone-800"></div>
                <h2 className="text-2xl font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <span className="text-orange-500 text-3xl">🏆</span> Hall da Fama
                </h2>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-stone-800"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {GAMES.map((game) => {
                    const board = leaderboards.find(l => l.gameId === game.id);
                    const ranking = board?.ranking || [];

                    return (
                        <div key={game.id} className="bg-stone-900/50 backdrop-blur border border-stone-800 rounded-xl p-6 relative overflow-hidden group hover:border-orange-500/30 transition-all">
                            {/* Header do Card */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-lg overflow-hidden border border-stone-700">
                                    <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover" />
                                </div>
                                <h3 className="font-bold text-white text-sm uppercase tracking-wider">{game.title}</h3>
                            </div>

                            {/* Lista */}
                            <div className="space-y-3">
                                {ranking.length > 0 ? (
                                    ranking.map((player, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-xs p-2 rounded bg-black/40 border border-stone-800/50">
                                            <div className="flex items-center gap-3">
                                                <span className={`
                          w-5 h-5 flex items-center justify-center rounded font-bold text-[10px]
                          ${idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black shadow-lg shadow-yellow-900/20' :
                                                        idx === 1 ? 'bg-gradient-to-br from-stone-300 to-stone-500 text-black' :
                                                            idx === 2 ? 'bg-gradient-to-br from-orange-400 to-amber-700 text-white' : 'text-stone-500 font-mono'}
                        `}>
                                                    {idx + 1}
                                                </span>
                                                <span className={`font-medium ${idx === 0 ? 'text-white' : 'text-stone-400'}`}>
                                                    {player.name}
                                                </span>
                                            </div>
                                            <span className="font-mono text-orange-500/80 font-bold">{player.score.toLocaleString()}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-4 text-stone-600 italic text-xs">
                                        Sem registros ainda
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
