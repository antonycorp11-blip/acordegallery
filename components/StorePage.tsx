
import React from 'react';
import { supabase } from '../lib/supabase';

interface StoreItem {
    id: string;
    name: string;
    price: number;
    type: 'card' | 'font' | 'border';
    preview: string;
    description: string;
}

const STORE_ITEMS: StoreItem[] = [
    { id: 'neon-orange', name: 'Borda Neon Laranja', price: 100, type: 'border', preview: 'border-orange-500 shadow-[0_0_15px_#f97316]', description: 'Destaque o seu card com um brilho neon vibrante.' },
    { id: 'gold-name', name: 'Nome Dourado', price: 250, type: 'font', preview: 'text-yellow-400 font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]', description: 'Deixe seu nome com a cor da vitória.' },
    { id: 'epic-red', name: 'Card Epic Red', price: 500, type: 'card', preview: 'bg-gradient-to-br from-red-900 to-stone-900', description: 'Um fundo de batalha intimidador para os mestres.' },
    { id: 'cyber-aqua', name: 'Estilo Cyber Aqua', price: 500, type: 'card', preview: 'bg-gradient-to-br from-cyan-900 to-stone-900', description: 'Visual futurista para jogadores de elite.' },
];

interface StorePageProps {
    player: any;
    onUpdate: () => void;
}

const StorePage: React.FC<StorePageProps> = ({ player, onUpdate }) => {
    const [isBuying, setIsBuying] = React.useState<string | null>(null);

    const handleBuy = async (item: StoreItem) => {
        if (player.acorde_coins < item.price) {
            alert('Moedas insuficientes!');
            return;
        }

        setIsBuying(item.id);
        try {
            const { error } = await supabase
                .from('players')
                .update({
                    acorde_coins: player.acorde_coins - item.price,
                    selected_card_id: item.id // Por enquanto salvando como o item selecionado
                })
                .eq('id', player.id);

            if (error) throw error;
            alert(`Você adquiriu: ${item.name}!`);
            onUpdate();
        } catch (err) {
            console.error(err);
            alert('Erro ao processar compra.');
        } finally {
            setIsBuying(null);
        }
    };

    const handleConvert = async () => {
        if (player.accumulated_xp < 10) {
            alert('Você precisa de pelo menos 10 XP para converter!');
            return;
        }

        const coinsToAdd = Math.floor(player.accumulated_xp / 10);
        const xpToRemove = coinsToAdd * 10;

        try {
            const { error } = await supabase
                .from('players')
                .update({
                    accumulated_xp: player.accumulated_xp - xpToRemove,
                    acorde_coins: (player.acorde_coins || 0) + coinsToAdd
                })
                .eq('id', player.id);

            if (error) throw error;
            alert(`Conversão completa! +${coinsToAdd} Moedas.`);
            onUpdate();
        } catch (err) {
            console.error(err);
            alert('Erro na conversão.');
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
            {/* Header da Loja */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                <div>
                    <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-2">
                        Loja de <span className="text-orange-500 font-black">Itens</span>
                    </h2>
                    <p className="text-stone-500 text-xs font-black uppercase tracking-widest text-center md:text-left">
                        Personalize seu card de batalha
                    </p>
                </div>

                <div className="flex items-center gap-6">
                    <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl flex items-center gap-4 shadow-xl">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-stone-500 font-black uppercase leading-none mb-1">Seu Saldo</span>
                            <span className="text-orange-500 font-black text-2xl italic tracking-tighter">
                                {player.acorde_coins || 0} <span className="text-xs uppercase ml-1">Moedas</span>
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-orange-600/20 flex items-center justify-center text-orange-500 text-2xl">🪙</div>
                    </div>

                    <button
                        onClick={handleConvert}
                        className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-900/20 transition-all active:scale-95"
                    >
                        Converter XP
                    </button>
                </div>
            </div>

            {/* Grid de Itens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {STORE_ITEMS.map((item) => (
                    <div key={item.id} className="bg-stone-900/40 border border-stone-800 rounded-3xl p-6 flex flex-col items-center group hover:border-orange-500/30 transition-all duration-500">
                        <div className={`w-full h-32 rounded-2xl mb-6 relative overflow-hidden flex items-center justify-center border border-stone-800/50 ${item.type === 'card' ? item.preview : 'bg-black'}`}>
                            {item.type === 'font' && <span className={item.preview}>NOME EXEMPO</span>}
                            {item.type === 'border' && (
                                <div className={`w-4/5 h-4/5 rounded-xl border-4 ${item.preview} flex items-center justify-center`}>
                                    <div className="w-8 h-8 rounded-full bg-stone-700 animate-pulse"></div>
                                </div>
                            )}
                            {item.type === 'card' && <div className="text-white/20 font-black text-4xl">CARD</div>}
                        </div>

                        <h3 className="text-lg font-black text-white uppercase italic mb-2">{item.name}</h3>
                        <p className="text-stone-500 text-[10px] font-bold uppercase tracking-widest text-center mb-6 line-clamp-2">
                            {item.description}
                        </p>

                        <button
                            onClick={() => handleBuy(item)}
                            disabled={isBuying === item.id}
                            className={`w-full py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all ${player.acorde_coins >= item.price
                                    ? 'bg-white text-black hover:bg-orange-500 hover:text-white'
                                    : 'bg-stone-800 text-stone-600 cursor-not-allowed'
                                }`}
                        >
                            {isBuying === item.id ? 'Processando...' : `${item.price} Moedas`}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StorePage;
