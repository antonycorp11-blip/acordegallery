
import React from 'react';
import { supabase } from '../lib/supabase';
import { STORE_ITEMS, StoreItem, ItemRarity } from '../constants';

interface StorePageProps {
    player: any;
    exchangeRate: number;
    onUpdate: () => void;
    exclusiveDeadline?: string | null;
    exclusiveCollectionName?: string | null;
}

const StorePage: React.FC<StorePageProps> = ({
    player,
    exchangeRate,
    onUpdate,
    exclusiveDeadline,
    exclusiveCollectionName
}) => {
    const [isBuying, setIsBuying] = React.useState<string | null>(null);
    const [selectedItem, setSelectedItem] = React.useState<StoreItem | null>(null); // For mobile details
    const inventory = player.inventory || [];
    const [activeFilter, setActiveFilter] = React.useState<string>('Todos');

    const categories = Array.from(new Set(STORE_ITEMS.map(i => i.category)));
    const allCategories = ['Todos', ...categories];

    const rarityOrder: Record<string, number> = {
        'lendário': 1, // Will sort ascending? No, descending usually
        'épico': 2,
        'raro': 3,
        'comum': 4
    };

    // Correct sorting logic: (a, b) => (rarityOrder[a.rarity] || 99) - (rarityOrder[b.rarity] || 99)
    // To have Lendário first, its order should be smallest if sorting ascending, or largest if descending.
    // Let's use 4, 3, 2, 1 and sort (b - a).
    const fixedRarityOrder: Record<string, number> = {
        'exclusivo': 5,
        'lendário': 4,
        'épico': 3,
        'raro': 2,
        'comum': 1
    };

    const sortedItems = [...STORE_ITEMS]
        .filter(item => !item.collection) // Itens de coleção aparecem apenas no banner
        .filter(item => activeFilter === 'Todos' || item.category === activeFilter)
        .sort((a, b) => (fixedRarityOrder[b.rarity] || 0) - (fixedRarityOrder[a.rarity] || 0));

    const exclusiveItems = STORE_ITEMS.filter(item => item.collection === (exclusiveCollectionName || 'Times de Futebol'));

    const [timeLeft, setTimeLeft] = React.useState<string>('');

    React.useEffect(() => {
        const timer = setInterval(() => {
            const deadlineStr = exclusiveDeadline || (exclusiveItems.length > 0 ? exclusiveItems[0].availableUntil : null);
            if (!deadlineStr) return;

            const now = new Date().getTime();
            const deadline = new Date(deadlineStr).getTime();
            const diff = deadline - now;

            if (diff <= 0) {
                setTimeLeft('EXPIRADO');
                clearInterval(timer);
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        }, 1000);

        return () => clearInterval(timer);
    }, [exclusiveDeadline, exclusiveItems]);

    const formatNumber = (num: number) => num.toLocaleString('pt-BR');

    const getRarityColor = (rarity: ItemRarity) => {
        switch (rarity) {
            case 'exclusivo': return 'text-orange-500 border-orange-500/40 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.3)] animate-pulse';
            case 'raro': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
            case 'épico': return 'text-purple-400 border-purple-400/30 bg-purple-400/10';
            case 'lendário': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10 shadow-[0_0_10px_rgba(250,204,21,0.2)]';
            default: return 'text-stone-400 border-stone-700 bg-stone-800/20'; // comum
        }
    };

    const handlePurchase = async (item: StoreItem) => {
        if (inventory.includes(item.id)) {
            alert('Você já possui este item! Vá ao Inventário para equipar.');
            return;
        }

        if (item.rarity === 'exclusivo') {
            const deadlineStr = exclusiveDeadline || item.availableUntil;
            if (deadlineStr) {
                const now = new Date();
                const deadline = new Date(deadlineStr);
                if (now > deadline) {
                    alert('Este item não está mais disponível para compra!');
                    return;
                }
            }
        }

        if (player.acorde_coins < item.price) {
            alert(`Moedas insuficientes! Você tem ${player.acorde_coins} e o item custa ${item.price}.`);
            return;
        }

        setIsBuying(item.id);
        try {
            const newInventory = [...inventory, item.id];
            const newCoins = player.acorde_coins - item.price;

            const { error } = await supabase
                .from('players')
                .update({
                    acorde_coins: newCoins,
                    inventory: newInventory
                })
                .eq('id', player.id);

            if (error) throw new Error(error.message);

            alert(`Sucesso! Você adquiriu: ${item.name}.\nEquipe-o agora em seu Inventário.`);
            onUpdate();
        } catch (err: any) {
            console.error(err);
            alert('Falha na compra: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setIsBuying(null);
        }
    };

    const handleConvert = async () => {
        const spentXp = player.total_spent_xp || 0;
        const availableXp = player.accumulated_xp - spentXp;

        if (availableXp < exchangeRate) {
            alert(`Você precisa de no mínimo ${exchangeRate} XP disponíveis para converter.`);
            return;
        }

        const coinsToAdd = Math.floor(availableXp / exchangeRate);
        const xpToSpent = coinsToAdd * exchangeRate;

        try {
            const { error } = await supabase
                .from('players')
                .update({
                    total_spent_xp: spentXp + xpToSpent,
                    acorde_coins: (player.acorde_coins || 0) + coinsToAdd
                })
                .eq('id', player.id);

            if (error) throw error;
            onUpdate();
        } catch (err) {
            console.error(err);
            alert('Erro na conversão.');
        }
    };

    const spentXp = player.total_spent_xp || 0;
    const availableXp = player.accumulated_xp - spentXp;

    return (
        <div className="max-w-6xl mx-auto px-1 md:px-4 py-2 md:py-8 animate-fade-in">
            {/* Cabeçalho Compacto */}
            <div className="flex flex-col lg:flex-row justify-between items-center mb-4 md:mb-10 gap-3 md:gap-8 bg-stone-900/40 p-3 md:p-6 rounded-[1.5rem] border border-stone-800/50">
                <div className="text-center lg:text-left">
                    <h2 className="text-xl md:text-4xl font-black text-white italic uppercase tracking-tighter leading-none mb-1">
                        Loja <span className="text-orange-500 font-black">Central</span>
                    </h2>
                    <p className="text-stone-600 text-[7px] md:text-[10px] font-black uppercase tracking-widest italic leading-none">Câmbio: {exchangeRate} XP = 1 🪙</p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 w-full lg:w-auto">
                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="bg-stone-950/80 border border-stone-800 p-2 md:p-4 rounded-xl md:rounded-2xl flex items-center gap-2 md:gap-4 shadow-xl flex-1 md:flex-initial justify-between md:justify-end">
                            <div className="flex flex-col items-start md:items-end">
                                <span className="text-[7px] md:text-[10px] text-stone-600 font-black uppercase leading-none mb-1">Disponível</span>
                                <span className="text-white font-black text-xs md:text-xl italic tracking-tighter">
                                    {formatNumber(availableXp)} <span className="text-[6px] md:text-[8px] uppercase">XP</span>
                                </span>
                            </div>
                            <div className="text-xs md:text-2xl">⚡</div>
                        </div>

                        <div className="bg-stone-950/80 border border-stone-800 p-2 md:p-4 rounded-xl md:rounded-2xl flex items-center gap-2 md:gap-4 shadow-xl flex-1 md:flex-initial justify-between md:justify-end">
                            <div className="flex flex-col items-start md:items-end">
                                <span className="text-[7px] md:text-[10px] text-stone-500 font-black uppercase leading-none mb-1">Saldo</span>
                                <span className="text-orange-500 font-black text-xs md:text-2xl italic tracking-tighter">
                                    {formatNumber(player.acorde_coins || 0)} <span className="text-[7px] md:text-[10px] uppercase">🪙</span>
                                </span>
                            </div>
                            <div className="text-xs md:text-2xl">🪙</div>
                        </div>
                    </div>

                    <button onClick={handleConvert} className="w-full md:w-auto bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 md:px-8 md:py-4 rounded-xl md:rounded-2xl font-black uppercase text-[9px] md:text-[10px] tracking-widest transition-all active:scale-95 shadow-lg shadow-orange-900/40">
                        Converter XP
                    </button>
                </div>
            </div>

            {/* BANNER DE COLEÇÃO EXCLUSIVA */}
            {exclusiveItems.length > 0 && (
                <div className="mb-8 md:mb-12 animate-fade-in px-1">
                    <div className="relative overflow-hidden rounded-[2.5rem] md:rounded-[3.5rem] bg-gradient-to-br from-orange-600/10 via-stone-900/95 to-black border border-orange-500/20 p-6 md:p-10 shadow-[0_20px_50px_rgba(249,115,22,0.1)]">
                        {/* Background Decor */}
                        <div className="absolute top-0 right-0 w-1/3 h-full bg-orange-600/5 blur-[100px] pointer-events-none"></div>

                        <div className="relative z-10 flex flex-col xl:flex-row gap-8 items-center lg:items-start xl:items-center">
                            {/* Promo Info */}
                            <div className="xl:w-1/3 text-center xl:text-left">
                                <span className="inline-block px-3 py-1 rounded-full bg-orange-600/20 border border-orange-500/40 text-[8px] md:text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-4 animate-pulse">
                                    ★ Coleção por Tempo Limitado ★
                                </span>
                                <h2 className="text-3xl md:text-6xl font-black text-white italic uppercase tracking-tighter leading-none mb-3">
                                    {exclusiveCollectionName || 'Times de Futebol'}
                                </h2>
                                <p className="text-stone-500 text-xs md:text-sm font-medium mb-6 max-w-md mx-auto xl:mx-0">
                                    Adquira os mantos lendários da elite. Edição única.
                                </p>

                                <div className="bg-black/60 backdrop-blur-md border border-orange-500/10 p-4 md:p-5 rounded-2xl md:rounded-3xl inline-flex flex-col items-center xl:items-start shadow-2xl">
                                    <span className="text-[7px] md:text-[9px] text-stone-600 font-black uppercase tracking-widest mb-1">Encerramento em:</span>
                                    <span className="text-xl md:text-3xl font-black text-orange-500 tabular-nums drop-shadow-[0_0_15px_rgba(249,115,22,0.4)]">
                                        {timeLeft || '---'}
                                    </span>
                                </div>
                            </div>

                            {/* Item Grid in Banner */}
                            <div className="flex-1 w-full grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                {exclusiveItems.map(item => {
                                    const isBought = inventory.includes(item.id);
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => setSelectedItem(item)}
                                            className="bg-black/40 border-2 border-stone-800/50 rounded-xl md:rounded-3xl p-2 md:p-5 flex flex-col items-center group transition-all duration-500 hover:border-orange-500/50 hover:bg-black/60 cursor-pointer active:scale-95 md:active:scale-100 shadow-xl backdrop-blur-sm h-full justify-between"
                                        >
                                            <div className="w-full">
                                                <div className="w-full flex justify-between items-center mb-1.5 md:mb-4">
                                                    <span className={`px-1 py-0.5 rounded text-[5px] md:text-[7px] font-black uppercase tracking-widest border ${getRarityColor(item.rarity)}`}>
                                                        {item.rarity.substring(0, 3)}
                                                    </span>
                                                    <span className="text-orange-500 font-black text-[9px] md:text-xs italic tracking-tighter flex items-center gap-1">
                                                        {formatNumber(item.price)} 🪙
                                                    </span>
                                                </div>

                                                <div className="w-full h-24 md:h-40 rounded-lg md:rounded-3xl mb-2 md:mb-5 relative overflow-hidden flex items-center justify-center border border-stone-800/50 shadow-inner bg-black">
                                                    <div
                                                        className="absolute inset-0 w-full h-full transition-transform duration-1000 group-hover:scale-110"
                                                        style={{
                                                            backgroundImage: `url(${item.preview})`,
                                                            backgroundSize: 'contain',
                                                            backgroundPosition: 'center',
                                                            backgroundRepeat: 'no-repeat',
                                                            transform: 'scale(0.5)'
                                                        }}
                                                    ></div>

                                                    {/* EFFECTS */}
                                                    <div className="legendary-particle-overlay scale-50 md:scale-100 opacity-40"></div>
                                                    <div className="shimmer-overlay"></div>

                                                    {isBought && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-[2px] z-20">
                                                            <span className="text-[8px] md:text-[10px] font-black text-green-500 uppercase tracking-widest border border-green-500/50 px-3 py-1 rounded backdrop-blur-md">ADQUIRIDO</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <h3 className="text-[10px] md:text-sm font-black text-white uppercase italic mb-1 text-center w-full tracking-tighter leading-tight line-clamp-2 min-h-[2.5em] flex items-center justify-center">
                                                    {item.name}
                                                </h3>

                                                <p className="hidden md:block text-stone-500 text-[8px] font-black uppercase tracking-widest text-center mb-4 h-8 line-clamp-2">
                                                    {item.description}
                                                </p>
                                            </div>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); handlePurchase(item); }}
                                                disabled={isBought || isBuying === item.id}
                                                className={`hidden md:block w-full py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${isBought ? 'bg-stone-800/50 text-green-500/40 cursor-not-allowed border border-stone-800' :
                                                    player.acorde_coins >= item.price
                                                        ? 'bg-orange-600 text-white hover:bg-orange-500 shadow-lg shadow-orange-900/20'
                                                        : 'bg-stone-800 text-stone-700 cursor-not-allowed border border-stone-800'
                                                    }`}
                                            >
                                                {isBought ? 'JÁ POSSUI' : isBuying === item.id ? '...' : 'COMPRAR'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Filters */}
            <div className="flex gap-4 overflow-x-auto pb-6 mb-8 scrollbar-hide">
                {allCategories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveFilter(cat)}
                        className={`px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest whitespace-nowrap transition-all ${activeFilter === cat ? 'bg-orange-600 text-white shadow-lg' : 'bg-stone-900 text-stone-500 border border-stone-800'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {
                allCategories.filter(cat => cat !== 'Todos' && (activeFilter === 'Todos' || activeFilter === cat)).map(cat => {
                    const itemsInCat = sortedItems.filter(i => i.category === cat);
                    if (itemsInCat.length === 0) return null;

                    return (
                        <div key={cat} className="mb-20 last:mb-0">
                            <div className="flex items-center gap-4 mb-10">
                                <div className="w-1.5 h-6 bg-orange-600 skew-x-[-20deg]"></div>
                                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">{cat}</h3>
                                <div className="h-px flex-1 bg-gradient-to-r from-stone-800 to-transparent"></div>
                            </div>

                            <div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 md:gap-6">
                                {itemsInCat.map((item) => {
                                    const owns = inventory.includes(item.id);
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => setSelectedItem(item)}
                                            className="bg-stone-900/40 border-2 border-stone-800/50 rounded-xl md:rounded-3xl p-2 md:p-5 flex flex-col items-center group transition-all duration-500 hover:border-stone-700 hover:bg-stone-900/60 cursor-pointer active:scale-95 md:active:scale-100"
                                        >
                                            <div className="w-full flex justify-between items-center mb-1.5 md:mb-4">
                                                <span className={`px-1 py-0.5 rounded text-[5px] md:text-[7px] font-black uppercase tracking-widest border ${getRarityColor(item.rarity)}`}>
                                                    {item.rarity.substring(0, 3)}
                                                </span>
                                                <span className="text-orange-500 font-black text-[9px] md:text-xs italic tracking-tighter">{formatNumber(item.price)}</span>
                                            </div>

                                            <div className="w-full h-16 md:h-40 rounded-lg md:rounded-3xl mb-2 md:mb-5 relative overflow-hidden flex items-center justify-center border border-stone-800/50 shadow-inner">
                                                {item.type === 'card' && item.preview.startsWith('/') ? (
                                                    <img src={item.preview} className="absolute inset-0 w-full h-full object-cover" alt="" />
                                                ) : (
                                                    <div className={`absolute inset-0 card-bg-optimized ${item.type === 'card' ? item.preview : 'bg-black'}`}></div>
                                                )}
                                                {item.rarity === 'lendário' && <div className="legendary-particle-overlay scale-50 md:scale-100"></div>}
                                                {item.rarity === 'exclusivo' && <div className="legendary-particle-overlay scale-50 md:scale-100 opacity-40"></div>}
                                                {(item.rarity === 'raro' || item.rarity === 'épico' || item.rarity === 'lendário' || item.rarity === 'exclusivo') && <div className="shimmer-overlay"></div>}

                                                {/* Countdown for Exclusive Items */}
                                                {item.rarity === 'exclusivo' && (exclusiveDeadline || item.availableUntil) && (
                                                    <div className="absolute top-2 left-2 z-30 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded border border-orange-500/30 text-[4px] md:text-[8px] font-black text-orange-500 uppercase tracking-tighter shadow-2xl">
                                                        ⏳ Expira em: {new Date(exclusiveDeadline || item.availableUntil || '').toLocaleDateString('pt-BR')}
                                                    </div>
                                                )}

                                                <div className="relative z-10 w-full h-full flex items-center justify-center p-1 md:p-4">
                                                    {item.type === 'font' && <span className={item.preview + " text-[8px] md:text-sm"}>Aa</span>}
                                                    {item.type === 'icon' && (
                                                        item.preview.startsWith('/') ? (
                                                            <img src={item.preview} alt={item.name} className="w-8 h-8 md:w-20 md:h-20 object-contain drop-shadow-2xl" />
                                                        ) : (
                                                            <span className="text-2xl md:text-6xl drop-shadow-2xl">{item.preview}</span>
                                                        )
                                                    )}
                                                    {item.type === 'border' && (
                                                        <div className={`w-3/4 h-3/4 rounded-lg border md:border-4 ${item.preview} flex items-center justify-center`}>
                                                            <div className="w-2 h-2 md:w-8 md:h-8 rounded-full bg-stone-800"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <h3 className="text-[8px] md:text-sm font-black text-white uppercase italic mb-1 text-center truncate w-full tracking-tighter">{item.name}</h3>

                                            {/* Desktop Description */}
                                            <p className="hidden md:block text-stone-600 text-[8px] font-black uppercase tracking-widest text-center mb-6 h-8 line-clamp-2">
                                                {item.description}
                                            </p>

                                            {/* Desktop Button */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handlePurchase(item); }}
                                                disabled={owns || isBuying === item.id}
                                                className={`hidden md:block w-full py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${owns ? 'bg-stone-800/50 text-green-500/40 cursor-not-allowed border border-stone-800' :
                                                    player.acorde_coins >= item.price
                                                        ? 'bg-white text-black hover:bg-orange-500 hover:text-white shadow-lg'
                                                        : 'bg-stone-800 text-stone-700 cursor-not-allowed border border-stone-800'
                                                    }`}
                                            >
                                                {owns ? 'ADQUIRIDO ✓' : isBuying === item.id ? '...' : 'COMPRAR'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })
            }

            {/* ITEM DETAILS MODAL (MOBILE & DESKTOP BANNER) */}
            {
                selectedItem && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 animate-fade-in">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedItem(null)}></div>
                        <div className="bg-stone-900 border border-stone-700 rounded-3xl p-6 w-full max-w-sm relative animate-scale-in shadow-2xl">
                            <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 text-stone-500 text-xl font-bold">✕</button>

                            <div className="flex flex-col items-center">
                                <div className="w-32 h-32 rounded-3xl mb-6 relative overflow-hidden flex items-center justify-center border border-stone-700 bg-black">
                                    <div className={`absolute inset-0 ${selectedItem.type === 'card' ? selectedItem.preview : ''}`}></div>
                                    <div className="relative z-10 p-4">
                                        {selectedItem.type === 'icon' && !selectedItem.preview.startsWith('/') && <span className="text-6xl">{selectedItem.preview}</span>}
                                        {selectedItem.type === 'icon' && selectedItem.preview.startsWith('/') && <img src={selectedItem.preview} className="w-20 h-20 object-contain" />}
                                        {selectedItem.type === 'font' && <span className={`text-2xl text-white ${selectedItem.preview}`}>Abc</span>}
                                    </div>
                                </div>

                                <h3 className="text-2xl font-black text-white italic uppercase text-center mb-2">{selectedItem.name}</h3>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border mb-6 ${getRarityColor(selectedItem.rarity)}`}>
                                    {selectedItem.rarity}
                                </span>

                                <p className="text-stone-400 text-xs font-bold uppercase text-center mb-8 leading-relaxed">
                                    {selectedItem.description}
                                </p>

                                <div className="text-orange-500 font-black text-3xl italic tracking-tighter mb-8">{formatNumber(selectedItem.price)} Moedas</div>

                                <button
                                    onClick={() => { handlePurchase(selectedItem); setSelectedItem(null); }}
                                    disabled={inventory.includes(selectedItem.id) || isBuying === selectedItem.id}
                                    className={`w-full py-4 rounded-xl font-black uppercase text-xs tracking-[0.2em] transition-all shadow-xl ${inventory.includes(selectedItem.id)
                                        ? 'bg-stone-800 text-green-500/50'
                                        : player.acorde_coins >= selectedItem.price
                                            ? 'bg-orange-600 text-white hover:bg-orange-500' // Available
                                            : 'bg-stone-800 text-stone-600' // Unavailable
                                        }`}
                                >
                                    {inventory.includes(selectedItem.id) ? 'JÁ POSSUI' : 'CONFIRMAR COMPRA'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

        </div >
    );
};

export default StorePage;
