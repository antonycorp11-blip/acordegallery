
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface RankingProps {
    gameId: string;
}

interface RankedPlayer {
    player_name: string;
    total_xp: number;
}

const Ranking: React.FC<RankingProps> = ({ gameId }) => {
    const [ranking, setRanking] = useState<RankedPlayer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRanking = async () => {
            // In a real scenario, you would query the game_scores table or similar.
            // For now, we will use the existing 'repita_leaderboard' or 'players' table as a proxy
            // since the specific logic for each game might differ.
            // We will default to showing top XP players generally for now, or mock per game if needed.

            // Adaptation: querying the players table sorted by XP as a general leaderboard example
            // In a real multi-game scenario, you'd filter by game_id in a scores table.

            try {
                const { data, error } = await supabase
                    .from('players')
                    .select('name, total_xp')
                    .order('total_xp', { ascending: false })
                    .limit(5);

                if (error) throw error;

                if (data) {
                    // Mapping to the interface
                    const formattedData = data.map(p => ({
                        player_name: p.name,
                        total_xp: p.total_xp || 0
                    }));
                    setRanking(formattedData);
                }
            } catch (err) {
                console.error("Error fetching ranking", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRanking();
    }, [gameId]);

    if (loading) return <div className="text-stone-500 text-xs text-center p-2">Carregando ranking...</div>;

    return (
        <div className="mt-4 bg-black/40 rounded-lg p-3 border border-stone-800/50">
            <h4 className="text-orange-500 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-2.293-9.707a1 1 0 011.414 0L10 9.172l.879-.879a1 1 0 111.243 1.243l-1.5 1.5a1 1 0 01-1.414 0l-1.5-1.5a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Top 5 Jogadores
            </h4>
            <div className="space-y-2">
                {ranking.length > 0 ? (
                    ranking.map((player, index) => (
                        <div key={index} className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                                <span className={`
                  w-4 h-4 rounded-full flex items-center justify-center font-bold text-[10px]
                  ${index === 0 ? 'bg-yellow-500 text-black' :
                                        index === 1 ? 'bg-stone-400 text-black' :
                                            index === 2 ? 'bg-orange-700 text-white' : 'bg-stone-800 text-stone-400'}
                `}>
                                    {index + 1}
                                </span>
                                <span className="text-stone-300 truncate max-w-[100px]">{player.player_name}</span>
                            </div>
                            <span className="text-stone-500 font-mono">{player.total_xp} XP</span>
                        </div>
                    ))
                ) : (
                    <p className="text-stone-600 text-xs italic text-center">Nenhum dado ainda</p>
                )}
            </div>
        </div>
    );
};

export default Ranking;
