
import React from 'react';

interface PlayerProfileProps {
    stats: {
        name: string;
        total_xp: number;
        games_played: number;
        most_played_game: string;
        high_score: number;
        days_active: number;
    };
}

const PlayerProfile: React.FC<PlayerProfileProps> = ({ stats }) => {
    return (
        <div className="w-full max-w-4xl mx-auto mb-10 animate-fade-in-up">
            <div className="bg-stone-900/40 backdrop-blur-xl border border-stone-800/50 rounded-[2rem] overflow-hidden shadow-2xl">
                {/* Cabeçalho do Perfil */}
                <div className="p-6 md:p-8 bg-gradient-to-br from-orange-600/20 to-transparent border-b border-stone-800/50 flex flex-col md:flex-row items-center gap-6">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-orange-600 flex items-center justify-center text-white text-3xl md:text-4xl font-black shadow-lg shadow-orange-900/40 shrink-0">
                        {stats.name.charAt(0)}
                    </div>
                    <div className="text-center md:text-left">
                        <h2 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter leading-none mb-1">
                            Jogador: <span className="text-orange-500">{stats.name}</span>
                        </h2>
                        <p className="text-stone-500 text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em]">Status de Combate Desbloqueado</p>
                    </div>
                </div>

                {/* Grade de Estatísticas */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-stone-800/30">
                    <StatBox label="Experiência Total" value={`${stats.total_xp} XP`} icon="⚡" />
                    <StatBox label="Missões Concluídas" value={stats.games_played.toString()} icon="🎯" />
                    <StatBox label="Mais Jogado" value={stats.most_played_game} icon="🔥" />
                    <StatBox label="Recorde Máximo" value={stats.high_score.toLocaleString()} icon="🏆" />
                </div>

                {/* Estatísticas Secundárias */}
                <div className="p-4 md:p-6 bg-black/20 flex flex-wrap justify-center gap-4 md:gap-8 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-stone-600">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        Dias Ativo: {stats.days_active}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                        Divisão: Mestre
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        Servidor: Online
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatBox = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
    <div className="bg-stone-900/60 p-4 md:p-6 flex flex-col items-center justify-center text-center">
        <span className="text-xl md:text-2xl mb-2">{icon}</span>
        <span className="text-[8px] md:text-[9px] text-stone-500 font-black uppercase tracking-widest mb-1">{label}</span>
        <span className="text-white font-black text-lg md:text-xl italic uppercase tracking-tighter truncate w-full px-2">{value}</span>
    </div>
);

export default PlayerProfile;
