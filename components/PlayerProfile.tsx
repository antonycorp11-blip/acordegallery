
import React from 'react';
import { supabase } from '../lib/supabase';
import { STORE_ITEMS } from '../constants';

interface PlayerProfileProps {
    stats: {
        name: string;
        total_xp: number;
        games_played: number;
        most_played_game: string;
        high_score: number;
        days_active: number;
        pin: string;
        icon?: string;
        cardPreview?: string;
        fontClass?: string;
        isElite?: boolean;
    };
    xpGain?: number;
}

const PlayerProfile: React.FC<PlayerProfileProps> = ({ stats, xpGain }) => {
    const formatNumber = (num: number) => num.toLocaleString('pt-BR');

    const headerBg = stats.cardPreview ? `${stats.cardPreview} bg-center bg-no-repeat` : 'bg-gradient-to-br from-orange-600/20 to-transparent';

    return (
        <div className="w-full max-w-4xl mx-auto mb-6 md:mb-10 animate-fade-in-up relative px-1 md:px-0">
            {/* Animação de XP Injetado */}
            {xpGain > 0 && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none z-50">
                    <div className="animate-xp-float flex flex-col items-center">
                        <span className="text-4xl md:text-6xl font-black text-orange-500 drop-shadow-[0_0_20px_rgba(249,115,22,0.8)] italic">
                            +{xpGain} XP
                        </span>
                        <span className="text-xs text-white font-black uppercase tracking-[0.5em] mt-2">Sincronizado!</span>
                    </div>
                </div>
            )}

            <div className={`bg-stone-900/40 backdrop-blur-xl border rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-700 ${xpGain ? 'border-orange-500 animate-glow-pulse scale-[1.02]' : 'border-stone-800/50'}`}>
                {/* Cabeçalho do Perfil */}
                <div className={`p-3 md:p-8 border-b border-stone-800/50 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-6 transition-all duration-700 relative card-bg-optimized ${stats.cardPreview || ''}`}>
                    <div className="absolute inset-0 card-overlay-elite z-0"></div>
                    {stats.isElite && stats.icon && STORE_ITEMS.find(i => i.preview === stats.icon || i.preview === stats.cardPreview || i.preview === stats.fontClass)?.rarity === 'lendário' && <div className="legendary-particle-overlay"></div>}
                    {stats.isElite && <div className="shimmer-overlay"></div>}
                    <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6 z-10">
                        <div
                            className="w-10 h-10 md:w-20 md:h-20 rounded-lg md:rounded-2xl bg-orange-600 flex items-center justify-center text-white text-xl md:text-4xl font-black shadow-lg shadow-orange-900/40 shrink-0 transition-all font-sans overflow-hidden"
                        >
                            {stats.icon ? (
                                stats.icon.startsWith('/') ? (
                                    <img src={stats.icon} alt="Icon" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xl md:text-4xl">{stats.icon}</span>
                                )
                            ) : (
                                <img src="/gallery_icon.png" alt="Icon" className="w-full h-full object-contain p-1.5 brightness-110" />
                            )}
                        </div>
                        <div className="text-center md:text-left">
                            <h2 className={`text-base md:text-3xl font-black uppercase italic tracking-tighter leading-none mb-1 ${stats.fontClass || 'text-white'}`}>
                                <span className="md:inline text-[8px] md:text-base font-bold text-stone-500 not-italic mr-1">JOGADOR:</span>
                                <span className={stats.fontClass ? '' : 'text-orange-500'}>{stats.name}</span>
                            </h2>
                            <p className="text-stone-500 text-[6px] md:text-[10px] font-black uppercase tracking-[0.2em]">{xpGain ? 'Sincronizando XP...' : 'Elite v5.0 Unlocked'}</p>
                        </div>
                    </div>

                    {/* Exibição do PIN para memorização */}
                    <div className="bg-black/40 backdrop-blur-md border border-stone-800/50 px-3 py-1.5 md:px-6 md:py-3 rounded-lg md:rounded-2xl flex flex-col items-center md:items-end scale-90 md:scale-100">
                        <span className="text-[6px] text-stone-600 font-black uppercase tracking-widest mb-0.5 md:mb-1">PIN DE ACESSO</span>
                        <span className="text-sm md:text-2xl text-white font-black tracking-[0.2em]">{stats.pin}</span>
                        <span className="hidden md:block text-[7px] text-orange-700 font-bold uppercase mt-1">Memorize seu código</span>
                    </div>
                </div>


                {/* Grade de Estatísticas */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-stone-800/30">
                    <StatBox label="Experiência Total" value={`${formatNumber(stats.total_xp)} XP`} icon="⚡" highlight={xpGain > 0} />
                    <StatBox label="Missões Concluídas" value={formatNumber(stats.games_played)} icon="🎯" />
                    <StatBox label="Recorde Máximo" value={formatNumber(stats.high_score)} icon="🏆" />
                </div>

                {/* Estatísticas Secundárias */}
                <div className="p-4 md:p-6 bg-black/20 flex flex-wrap justify-center gap-4 md:gap-8 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-stone-600">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        Dias Ativo: {stats.days_active}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                        Status: Combatente
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        Sincronizado: Online
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatBox = ({ label, value, icon, highlight }: { label: string; value: string; icon: string, highlight?: boolean }) => (
    <div className={`bg-stone-900/60 p-2.5 md:p-6 flex flex-col items-center justify-center text-center transition-all duration-1000 ${highlight ? 'bg-orange-950/40' : ''}`}>
        <span className={`text-sm md:text-2xl mb-1 md:mb-2 transition-transform ${highlight ? 'scale-150' : ''}`}>{icon}</span>
        <span className="text-[7px] md:text-[9px] text-stone-500 font-black uppercase tracking-widest mb-0.5 md:mb-1">{label}</span>
        <span className={`font-black text-xs md:text-xl italic uppercase tracking-tighter truncate w-full px-1 md:px-2 transition-all ${highlight ? 'text-orange-500 text-sm md:text-2xl' : 'text-white'}`}>{value}</span>
    </div>
);

export default PlayerProfile;
