import React from 'react';
import { supabase } from '../lib/supabase';
import { STORE_ITEMS, TITLES, Title } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

interface PlayerProfileProps {
    stats: {
        id: string;
        name: string;
        total_xp: number;
        games_played: number;
        most_played_game: string;
        high_score: number;
        days_active: number;
        pin: string;
        current_title?: string;
        titles?: string[]; // Array of owned titles
        icon?: string;
        cardPreview?: string;
        fontClass?: string;
        isElite?: boolean;
    };
    xpGain?: number;
    onResetRequest?: () => void;
}

const AnimatedCounter: React.FC<{ value: number }> = ({ value }) => {
    const [displayValue, setDisplayValue] = React.useState(0);

    React.useEffect(() => {
        let start = displayValue;
        const end = value;
        if (start === end) return;

        const duration = 1000; // 1 second
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.floor(start + (end - start) * progress);

            setDisplayValue(current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [value]);

    return <span>{displayValue.toLocaleString('pt-BR')}</span>;
};

const PlayerProfile: React.FC<PlayerProfileProps> = ({ stats, xpGain, onResetRequest }) => {
    const [selectedTitle, setSelectedTitle] = React.useState<Title | null>(null);
    const [showResetModal, setShowResetModal] = React.useState(false);
    const [equipping, setEquipping] = React.useState(false);
    const formatNumber = (num: number) => num.toLocaleString('pt-BR');

    const handleEquipTitle = async (titleName: string) => {
        if (equipping) return;
        setEquipping(true);
        try {
            // Se for REIVINDICAR um título (não apenas equipar)
            // A lógica de adicionar ao array 'titles' deve ser feita aqui se não tiver
            let currentTitles = stats.titles || [];
            if (!currentTitles.includes(titleName)) {
                // É uma reivindicação!
                const { error } = await supabase
                    .from('players')
                    .update({
                        titles: [...currentTitles, titleName],
                        current_title: titleName
                    })
                    .eq('id', stats.id);
                if (error) throw error;
                alert(`🏆 Título ${titleName} Reivindicado com Sucesso!`);
            } else {
                // Apenas equipar
                const { error } = await supabase
                    .from('players')
                    .update({ current_title: titleName })
                    .eq('id', stats.id);
                if (error) throw error;
            }

            window.location.reload();
        } catch (err) {
            alert('Erro ao equipar título: ' + err);
        } finally {
            setEquipping(false);
            setSelectedTitle(null);
        }
    };

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
                        <span className="text-xs text-white font-black uppercase tracking-[0.5em] mt-2 bg-orange-600 px-3 py-1 rounded-full">Sincronizado!</span>
                    </div>
                </div>
            )}

            <div className={`bg-stone-900/40 backdrop-blur-xl border rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-700 ${xpGain ? 'border-orange-500 animate-glow-pulse scale-[1.02]' : 'border-stone-800/50'}`}>
                {/* Cabeçalho do Perfil */}
                <div
                    className={`p-3 md:p-8 border-b border-stone-800/50 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-6 transition-all duration-700 relative card-bg-optimized ${stats.cardPreview && !stats.cardPreview.startsWith('/') ? stats.cardPreview : ''}`}
                    style={stats.cardPreview?.startsWith('/') ? {
                        backgroundImage: `url(${stats.cardPreview})`,
                        backgroundSize: stats.cardPreview.includes('exclusive') ? '50% !important' : 'cover !important',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                    } : {}}
                >
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
                            <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3">
                                <p className="text-stone-500 text-[6px] md:text-[10px] font-black uppercase tracking-[0.2em]">{xpGain ? 'Sincronizando XP...' : 'Elite v5.0 Unlocked'}</p>
                                {stats.current_title && (
                                    <span className="bg-orange-600/20 border border-orange-500/30 text-orange-400 px-2 py-0.5 rounded-md text-[7px] md:text-[9px] font-black uppercase tracking-widest animate-pulse">
                                        📜 {stats.current_title}
                                    </span>
                                )}
                            </div>
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
                    <StatBox label="Experiência Total" value={<AnimatedCounter value={stats.total_xp} />} suffix=" XP" icon="⚡" highlight={xpGain > 0} />
                    <StatBox label="Missões Concluídas" value={formatNumber(stats.games_played)} icon="🎯" />
                    <StatBox label="Recorde Máximo" value={formatNumber(stats.high_score)} icon="🏆" />
                </div>

                {/* Prestige Titles Showcase */}
                <div className="p-4 md:p-8 bg-black/40 border-t border-stone-800/50">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-sm md:text-xl font-black text-white uppercase italic tracking-tighter">Galeria de Títulos</h3>
                            <p className="text-[7px] md:text-[9px] text-stone-500 font-bold uppercase tracking-[0.2em]">Sorteio aleatório ao atingir 500k XP</p>
                        </div>
                        <div className="flex flex-col md:flex-row items-end gap-2">
                            {stats.total_xp >= 500000 && (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowResetModal(true)}
                                    className="bg-white text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-orange-600 hover:text-white transition-all mb-2 md:mb-0"
                                >
                                    🔥 INICIAR RESET
                                </motion.button>
                            )}
                            <div className="bg-orange-600/10 px-3 py-1 rounded-full border border-orange-500/20 text-orange-500 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-right">
                                {stats.total_xp >= 500000 ? '✅ XP MÁXIMO ATINGIDO' : `${Math.floor((stats.total_xp / 500000) * 100)}% PARA O PRÓXIMO NÍVEL`}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
                        {TITLES.map((title) => (
                            <motion.button
                                key={title.id}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSelectedTitle(title)}
                                className={`relative group p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center text-center gap-1 md:gap-2 ${stats.current_title === title.name
                                    ? 'bg-orange-600/20 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)]'
                                    : 'bg-stone-950 border-stone-800 hover:border-stone-600'
                                    }`}
                            >
                                <div className={`text-[9px] md:text-xs font-black uppercase tracking-tighter leading-tight ${title.style}`}>
                                    {title.name}
                                </div>
                                <div className="text-[6px] md:text-[7px] text-stone-600 font-bold uppercase tracking-widest">
                                    {title.rarity}
                                </div>
                                {stats.current_title === title.name && (
                                    <div className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse shadow-[0_0_10px_#f97316]"></div>
                                )}
                                {(title.name === 'Fundador' && !stats.titles?.includes('Fundador') && stats.total_xp >= 50000) && (
                                    <div className="absolute -top-1 -right-1 flex h-4 w-4">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-500 border border-yellow-200 shadow-md"></span>
                                    </div>
                                )}
                            </motion.button>
                        ))}
                    </div>
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

            {/* Title Details Modal */}
            <AnimatePresence>
                {selectedTitle && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
                            onClick={() => setSelectedTitle(null)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-lg bg-stone-900 border border-stone-800 rounded-[2rem] p-8 md:p-12 shadow-2xl overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                            <div className="relative z-10 text-center">
                                <span className="inline-block bg-orange-600 text-white text-[9px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full mb-6">
                                    Título de Prestígio
                                </span>

                                <h3 className={`text-3xl md:text-5xl font-black uppercase italic tracking-tighter mb-4 leading-none ${selectedTitle.style}`}>
                                    {selectedTitle.name}
                                </h3>

                                <p className="text-stone-400 text-xs md:text-lg mb-8 font-bold uppercase tracking-widest leading-relaxed">
                                    "{selectedTitle.description}"
                                </p>

                                {/* Lógica de Status do Título */}
                                {stats.titles?.includes(selectedTitle.name) ? (
                                    stats.current_title === selectedTitle.name ? (
                                        <div className="bg-green-500/10 border border-green-500/30 text-green-500 py-3 rounded-xl font-black uppercase tracking-widest text-xs mb-6">
                                            ✅ Título Equipado
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleEquipTitle(selectedTitle.name)}
                                            disabled={equipping}
                                            className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg active:scale-95 mb-6"
                                        >
                                            {equipping ? 'Equipando...' : 'Equipar Título'}
                                        </button>
                                    )
                                ) : (
                                    /* Se não tem o título, verifica se pode reivindicar (ex: Fundador) */
                                    (selectedTitle.name === 'Fundador' && stats.total_xp >= 50000) ? (
                                        <button
                                            onClick={() => handleEquipTitle(selectedTitle.name)}
                                            disabled={equipping}
                                            className="w-full py-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(234,179,8,0.4)] animate-pulse mb-6 flex items-center justify-center gap-2"
                                        >
                                            <span>🎁</span> {equipping ? 'Resgatando...' : 'RESGATAR RECOMPENSA EXCLUSIVA'}
                                        </button>
                                    ) : (
                                        <div className="bg-black/40 rounded-2xl p-6 border border-stone-800 mb-8 text-left opacity-50 grayscale">
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="text-[10px] text-stone-500 font-black uppercase">Status</span>
                                                <span className="text-[10px] text-stone-500 font-black uppercase">🔒 Bloqueado</span>
                                            </div>
                                            <div className="w-full h-2 bg-stone-800 rounded-full"></div>
                                            <div className="mt-2 text-[8px] text-stone-600 font-bold text-center">
                                                {selectedTitle.name === 'Fundador' ? 'Necessário: 50.000 XP (Temporada 1)' : 'Disponível no Sorteio de Reset (500k XP)'}
                                            </div>
                                        </div>
                                    )
                                )}

                                <button
                                    onClick={() => setSelectedTitle(null)}
                                    className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all bg-stone-800 text-white hover:bg-stone-700"
                                >
                                    Voltar à Galeria
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Dedicated Reset Modal */}
            <AnimatePresence>
                {showResetModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/95 backdrop-blur-md"
                            onClick={() => setShowResetModal(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-lg bg-stone-900 border-2 border-orange-500/50 rounded-[2.5rem] p-8 md:p-12 shadow-[0_0_100px_rgba(249,115,22,0.2)] overflow-hidden"
                        >
                            <div className="relative z-10 text-center">
                                <span className="inline-block bg-orange-600 text-white text-[10px] font-black uppercase tracking-[0.4em] px-6 py-2 rounded-full mb-8">
                                    🔥 Rito de Passagem
                                </span>

                                <h3 className="text-4xl md:text-5xl font-black text-white uppercase italic tracking-tighter mb-6 leading-none">
                                    ESTÁ <span className="text-orange-500">PRONTO?</span>
                                </h3>

                                <div className="space-y-6 text-stone-400 text-xs md:text-sm font-bold uppercase tracking-widest leading-relaxed mb-10">
                                    <p>Ao realizar o reset de prestígio:</p>
                                    <ul className="space-y-3 text-white">
                                        <li className="flex items-center gap-3 justify-center"><span className="text-orange-500">✦</span> Seu XP acumulado voltará a ZERO</li>
                                        <li className="flex items-center gap-3 justify-center"><span className="text-orange-500">✦</span> Você ganhará um <span className="text-orange-500">NOVO TÍTULO ALEATÓRIO</span></li>
                                        <li className="flex items-center gap-3 justify-center"><span className="text-orange-500">✦</span> Suas moedas e itens <span className="text-green-500 font-black">NÃO SERÃO APAGADOS</span></li>
                                        <li className="flex items-center gap-3 justify-center"><span className="text-orange-500">✦</span> A chance é IGUAL para todos os títulos</li>
                                    </ul>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <button
                                        onClick={() => {
                                            onResetRequest?.();
                                            setShowResetModal(false);
                                        }}
                                        className="w-full py-5 bg-white text-black hover:bg-orange-600 hover:text-white rounded-2xl font-black uppercase tracking-[0.3em] text-xs transition-all shadow-2xl active:scale-95"
                                    >
                                        CONFIRMAR RESET ALEATÓRIO 🎲
                                    </button>
                                    <button
                                        onClick={() => setShowResetModal(false)}
                                        className="w-full py-3 text-stone-600 font-black uppercase tracking-widest text-[10px] hover:text-white transition-colors"
                                    >
                                        Cancelar e Manter meu XP
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const StatBox = ({ label, value, suffix, icon, highlight }: { label: string; value: React.ReactNode; suffix?: string, icon: string, highlight?: boolean }) => (
    <div className={`bg-stone-900/60 p-2.5 md:p-6 flex flex-col items-center justify-center text-center transition-all duration-1000 ${highlight ? 'bg-orange-950/40' : ''}`}>
        <span className={`text-sm md:text-2xl mb-1 md:mb-2 transition-transform ${highlight ? 'scale-150' : ''}`}>{icon}</span>
        <span className="text-[7px] md:text-[9px] text-stone-500 font-black uppercase tracking-widest mb-0.5 md:mb-1">{label}</span>
        <div className={`font-black text-xs md:text-xl italic uppercase tracking-tighter truncate w-full px-1 md:px-2 transition-all ${highlight ? 'text-orange-500 text-sm md:text-2xl' : 'text-white'}`}>
            {value}{suffix}
        </div>
    </div>
);

export default PlayerProfile;
