
import React from 'react';
import { supabase } from '../lib/supabase';
import { STORE_ITEMS, StoreItem, ItemRarity } from '../constants';

interface StorePageProps {
    player: any;
    exchangeRate: number;
    onUpdate: () => void;
}

const StorePage: React.FC<StorePageProps> = ({ player, exchangeRate, onUpdate }) => {
    const [isBuying, setIsBuying] = React.useState<string | null>(null);
    const [selectedItem, setSelectedItem] = React.useState<StoreItem | null>(null); // For mobile details
    const inventory = player.inventory || [];
    const [activeFilter, setActiveFilter] = React.useState<string>('Todos');

    const categories = Array.from(new Set(STORE_ITEMS.map(i => i.category)));
    const allCategories = ['Todos', ...categories];

    const rarityOrder: Record<string, number> = {
        'lendário': 4,
        'épico': 3,
        'raro': 2,
        'comum': 1
    };

    const sortedItems = [...STORE_ITEMS]
        .filter(item => activeFilter === 'Todos' || item.category === activeFilter)
        .sort((a, b) => (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0));

    const formatNumber = (num: number) => num.toLocaleString('pt-BR');

    const getRarityColor = (rarity: ItemRarity) => {
        switch (rarity) {
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
        <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
            <div className="flex flex-col lg:flex-row justify-between items-center mb-16 gap-8">
                <div>
                    <h2 className="text-4xl md:text-5xl font-black text-white italic uppercase tracking-tighter mb-2">
                        Loja <span className="text-orange-500 font-black">Central</span>
                    </h2>
                    <p className="text-stone-500 text-[10px] font-black uppercase tracking-widest italic">Taxa de Câmbio Atual: {exchangeRate} XP = 1 Moeda</p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4 w-full lg:w-auto">
                    <div className="bg-stone-950 border border-stone-800 p-4 rounded-2xl flex items-center gap-4 shadow-xl flex-1 md:flex-initial">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-stone-600 font-black uppercase leading-none mb-1">XP para Troca</span>
                            <span className="text-white font-black text-xl italic tracking-tighter">
                                {formatNumber(availableXp)} <span className="text-[10px] uppercase ml-1">Pontos</span>
                            </span>
                        </div>
                        <div className="text-2xl">⚡</div>
                    </div>

                    <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl flex items-center gap-4 shadow-xl flex-1 md:flex-initial">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-stone-500 font-black uppercase leading-none mb-1">Seu Saldo</span>
                            <span className="text-orange-500 font-black text-2xl italic tracking-tighter">
                                {formatNumber(player.acorde_coins || 0)} <span className="text-xs uppercase ml-1">Moedas</span>
                            </span>
                        </div>
                        <div className="text-2xl">🪙</div>
                    </div>
                    <button onClick={handleConvert} className="w-full md:w-auto bg-orange-600 hover:bg-orange-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all active:scale-95 shadow-lg shadow-orange-900/40">
                        Trocar XP ({exchangeRate}:1)
                    </button>
                </div>
            </div>

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

            {allCategories.filter(cat => cat !== 'Todos' && (activeFilter === 'Todos' || activeFilter === cat)).map(cat => {
                const itemsInCat = sortedItems.filter(i => i.category === cat);
                if (itemsInCat.length === 0) return null;

                return (
                    <div key={cat} className="mb-20 last:mb-0">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-1.5 h-6 bg-orange-600 skew-x-[-20deg]"></div>
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">{cat}</h3>
                            <div className="h-px flex-1 bg-gradient-to-r from-stone-800 to-transparent"></div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-6">
                            {itemsInCat.map((item) => {
                                const owns = inventory.includes(item.id);
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => setSelectedItem(item)}
                                        className="bg-stone-900/40 border-2 border-stone-800/50 rounded-2xl md:rounded-3xl p-3 md:p-5 flex flex-col items-center group transition-all duration-500 hover:border-stone-700 hover:bg-stone-900/60 cursor-pointer active:scale-95 md:active:scale-100"
                                    >
                                        <div className="w-full flex justify-between items-center mb-2 md:mb-4">
                                            <span className={`px-1.5 py-0.5 rounded text-[6px] md:text-[7px] font-black uppercase tracking-widest border ${getRarityColor(item.rarity)}`}>
                                                {item.rarity}
                                            </span>
                                            <span className="text-orange-500 font-black text-[10px] md:text-xs italic tracking-tighter">{formatNumber(item.price)} <span className="hidden md:inline">Moedas</span></span>
                                        </div>

                                        <div className="w-full h-24 md:h-40 rounded-xl md:rounded-3xl mb-3 md:mb-5 relative overflow-hidden flex items-center justify-center border border-stone-800/50">
                                            <div className={`absolute inset-0 card-bg-optimized ${item.type === 'card' ? item.preview : 'bg-black'}`}></div>
                                            {item.rarity === 'lendário' && <div className="legendary-particle-overlay"></div>}
                                            {(item.rarity === 'raro' || item.rarity === 'épico' || item.rarity === 'lendário') && <div className="shimmer-overlay"></div>}

                                            <div className="relative z-10 w-full h-full flex items-center justify-center p-2 md:p-4">
                                                {item.type === 'font' && <span className={item.preview + " text-xs md:text-sm"}>Abc</span>}
                                                {item.type === 'icon' && (
                                                    item.preview.startsWith('/') ? (
                                                        <img src={item.preview} alt={item.name} className="w-12 h-12 md:w-20 md:h-20 object-contain drop-shadow-2xl" />
                                                    ) : (
                                                        <span className="text-4xl md:text-6xl drop-shadow-2xl">{item.preview}</span>
                                                    )
                                                )}
                                                {item.type === 'border' && (
                                                    <div className={`w-3/4 h-3/4 rounded-xl border-2 md:border-4 ${item.preview} flex items-center justify-center`}>
                                                        <div className="w-4 h-4 md:w-8 md:h-8 rounded-full bg-stone-800"></div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <h3 className="text-[10px] md:text-sm font-black text-white uppercase italic mb-1 text-center truncate w-full">{item.name}</h3>

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
            })}

            {/* MOBILE ITEM DETAILS MODAL */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 md:hidden">
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
            )}

        </div>
    );
};

export default StorePage;
