
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { STORE_ITEMS, StoreItem } from '../constants';

interface InventoryPageProps {
    player: any;
    onUpdate: () => void;
}

const InventoryPage: React.FC<InventoryPageProps> = ({ player, onUpdate }) => {
    const [isSaving, setIsSaving] = useState(false);

    // Estado local para o "Preview" antes de salvar
    const inventoryIds = player.inventory || [];
    const initialEquipped = player.equipped_items || {};
    const [localEquipped, setLocalEquipped] = useState(initialEquipped);

    const rarityOrder: Record<string, number> = {
        'lendário': 4,
        'épico': 3,
        'raro': 2,
        'comum': 1
    };

    const [activeFilter, setActiveFilter] = useState<string>('Todos');

    const myItems = STORE_ITEMS.filter(item => inventoryIds.includes(item.id));
    const categories = Array.from(new Set(STORE_ITEMS.map(i => i.category)));
    const allCategories = ['Todos', ...categories];

    const getRarityColor = (rarity: string) => {
        switch (rarity) {
            case 'raro': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
            case 'épico': return 'text-purple-400 border-purple-400/30 bg-purple-400/10';
            case 'lendário': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10 shadow-[0_0_10px_rgba(250,204,21,0.2)]';
            default: return 'text-stone-400 border-stone-700 bg-stone-800/20'; // comum
        }
    };

    const toggleLocalEquip = (item: StoreItem) => {
        setLocalEquipped((prev: any) => {
            const type = item.type;
            if (prev[type] === item.id) {
                const next = { ...prev };
                delete next[type];
                return next;
            }
            return { ...prev, [type]: item.id };
        });
    };

    const handleSaveEquipment = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('players')
                .update({
                    equipped_items: localEquipped
                })
                .eq('id', player.id);

            if (error) throw new Error(error.message);

            alert('Configurações de Elite salvas! Seu card foi atualizado no ranking.');
            onUpdate();
        } catch (err: any) {
            console.error(err);
            alert('Erro ao salvar: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in pb-32">
            {/* HEADER & SAVE BUTTON */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                <div>
                    <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-2">
                        Arsenal <span className="text-orange-500 font-black">Privado</span>
                    </h2>
                    <p className="text-stone-500 text-[10px] font-black uppercase tracking-widest text-center md:text-left">Configure e visualize seu card antes de entrar no ranking</p>
                </div>

                <button
                    onClick={handleSaveEquipment}
                    disabled={isSaving}
                    className={`px-10 py-5 rounded-2xl font-black uppercase text-sm tracking-[0.2em] transition-all shadow-2xl ${isSaving ? 'bg-stone-800 text-stone-600 animate-pulse' : 'bg-orange-600 text-white hover:bg-orange-50 hover:text-orange-600 hover:scale-105 active:scale-95'
                        }`}
                >
                    {isSaving ? 'Sincronizando...' : 'Publicar Alterações'}
                </button>
            </div>

            {/* LIVE PREVIEW */}
            <section className="mb-20">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-1.5 h-6 bg-blue-500 skew-x-[-20deg]"></div>
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Preview de Batalha (Tempo Real)</h3>
                </div>

                <div className="max-w-2xl mx-auto pointer-events-none">
                    <div className={`
                relative overflow-hidden border-2 rounded-[2.5rem] p-8 md:p-12 flex items-center gap-8 transition-all duration-700 card-bg-optimized
                ${localEquipped.card ? STORE_ITEMS.find(i => i.id === localEquipped.card)?.preview : 'bg-stone-900/40 border-stone-800/50'}
                ${localEquipped.border ? `${STORE_ITEMS.find(i => i.id === localEquipped.border)?.preview} scale-[1.02]` : ''}
              `}>
                        <div className="absolute inset-0 card-overlay-elite z-0"></div>
                        {Array.from(Object.values(localEquipped)).some(id => {
                            const item = STORE_ITEMS.find(i => i.id === id);
                            return item && item.rarity === 'lendário';
                        }) && <div className="legendary-particle-overlay"></div>}
                        {Array.from(Object.values(localEquipped)).some(id => {
                            const item = STORE_ITEMS.find(i => i.id === id);
                            return item && ['raro', 'épico', 'lendário'].includes(item.rarity);
                        }) && <div className="shimmer-overlay"></div>}
                        <div className="w-20 h-20 rounded-2xl bg-stone-800 flex items-center justify-center text-white text-4xl font-black border border-stone-700 shadow-inner overflow-hidden z-10">
                            {localEquipped.icon ? (
                                (() => {
                                    const icon = STORE_ITEMS.find(i => i.id === localEquipped.icon);
                                    return icon?.preview.startsWith('/') ? (
                                        <img src={icon.preview} alt="Icon" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-5xl">{icon?.preview}</span>
                                    );
                                })()
                            ) : (
                                player.name.charAt(0)
                            )}
                        </div>
                        <div className="grow z-10">
                            <h4 className={`text-2xl md:text-5xl font-black uppercase italic tracking-tighter mb-1 transition-all
                        ${localEquipped.font ? STORE_ITEMS.find(i => i.id === localEquipped.font)?.preview : 'text-white'}
                    `}>
                                {player.name}
                            </h4>
                            <span className="text-[10px] text-stone-500 font-black uppercase tracking-[0.3em]">Player Elite v5.0</span>
                        </div>
                    </div>
                    <p className="text-center mt-6 text-[9px] text-stone-600 font-black uppercase tracking-widest italic">Acima está uma simulação fiel de como seu card aparecerá no Ranking Geral</p>
                </div>
            </section>

            {/* CATEGORY FILTERS */}
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

            {/* ITEM SELECTOR */}
            {myItems.length === 0 ? (
                <div className="bg-stone-900/40 border border-stone-800 rounded-[2.5rem] p-24 text-center">
                    <p className="text-stone-500 font-black uppercase tracking-widest leading-relaxed">Você não possui itens adquiridos.</p>
                    <p className="text-stone-700 text-[10px] mt-4 uppercase">Visite a loja central para iniciar sua coleção de elite.</p>
                </div>
            ) : (
                <div className="space-y-16">
                    {allCategories.filter(cat => cat !== 'Todos' && (activeFilter === 'Todos' || activeFilter === cat)).map(cat => {
                        const itemsInCat = myItems.filter(i => i.category === cat);
                        if (itemsInCat.length === 0) return null;

                        return (
                            <div key={cat} className="animate-fade-in-up">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-1.5 h-6 bg-orange-600 skew-x-[-20deg]"></div>
                                    <h3 className="text-xl md:text-2xl font-black text-white italic uppercase tracking-tighter">{cat}</h3>
                                    <div className="h-px flex-1 bg-gradient-to-r from-stone-800 to-transparent"></div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                                    {itemsInCat.map(item => {
                                        const isSelected = localEquipped[item.type] === item.id;
                                        const isActuallyEquipped = initialEquipped[item.type] === item.id;

                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => toggleLocalEquip(item)}
                                                className={`
                                                  cursor-pointer bg-stone-900/40 border-2 rounded-3xl p-6 flex flex-col items-center transition-all duration-300 group
                                                  ${isSelected ? 'border-orange-500 bg-orange-500/5 shadow-2xl scale-105' : 'border-stone-800 hover:border-stone-700'}
                                                `}
                                            >
                                                <div className="w-full flex justify-between items-center mb-4">
                                                    <span className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest border ${getRarityColor(item.rarity)}`}>
                                                        {item.rarity}
                                                    </span>
                                                </div>

                                                <div className="w-full h-40 rounded-3xl mb-6 relative overflow-hidden flex items-center justify-center border border-stone-800/50">
                                                    <div className={`absolute inset-0 card-bg-optimized ${item.type === 'card' ? item.preview : 'bg-black'}`}></div>
                                                    {item.rarity === 'lendário' && <div className="legendary-particle-overlay"></div>}
                                                    {(item.rarity === 'raro' || item.rarity === 'épico' || item.rarity === 'lendário') && <div className="shimmer-overlay"></div>}
                                                    <div className="relative z-10 flex items-center justify-center w-full h-full p-4">
                                                        {item.type === 'font' && <span className={item.preview + " text-sm"}>PREVIEW</span>}
                                                        {item.type === 'icon' && (
                                                            item.preview.startsWith('/') ? (
                                                                <img src={item.preview} alt={item.name} className="w-20 h-20 object-contain drop-shadow-2xl" />
                                                            ) : (
                                                                <span className="text-6xl drop-shadow-2xl">{item.preview}</span>
                                                            )
                                                        )}
                                                        {item.type === 'border' && (
                                                            <div className={`w-4/5 h-4/5 rounded-2xl border-4 ${item.preview} flex items-center justify-center`}>
                                                                <div className="w-8 h-8 rounded-full bg-stone-800"></div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {isSelected && (
                                                        <div className="absolute top-2 right-2 bg-orange-600 text-white text-[8px] font-black px-2 py-1 rounded-md shadow-lg animate-bounce">
                                                            SELECIONADO
                                                        </div>
                                                    )}
                                                </div>

                                                <h3 className="text-lg font-black text-white uppercase italic mb-1 text-center truncate w-full">{item.name}</h3>
                                                <p className="text-[9px] text-stone-600 font-bold uppercase tracking-widest text-center mb-6 h-8 line-clamp-2">{item.description}</p>

                                                <div className={`
                                                  w-full py-3 rounded-xl font-black uppercase text-[10px] tracking-widest text-center transition-all
                                                  ${isSelected ? 'bg-orange-600 text-white' : 'bg-stone-800 text-stone-500 group-hover:bg-stone-700 group-hover:text-white'}
                                                `}>
                                                    {isSelected ? 'Pronto para Publicar' : 'Selecionar'}
                                                </div>

                                                {isActuallyEquipped && (
                                                    <div className="mt-4 flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                        <span className="text-[8px] text-green-500 font-black uppercase tracking-widest">Atualmente no Ranking</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default InventoryPage;
