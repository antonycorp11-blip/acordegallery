
import React, { useState } from 'react';
import { INSTRUCTIONS } from '../constants';

const IntegrationGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-20 border-t border-stone-900 pt-10 px-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-stone-500 hover:text-orange-500 font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 mb-4 mx-auto transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
        Guia de Integração para Desenvolvedores
      </button>

      {isOpen && (
        <div className="max-w-2xl mx-auto bg-stone-900/50 backdrop-blur-md p-6 rounded-2xl text-left border border-stone-800 shadow-2xl">
          <h4 className="text-white font-black uppercase italic mb-6 tracking-tighter">Etapas de Implementação:</h4>
          <ol className="space-y-6 text-xs text-stone-400">
            {INSTRUCTIONS.map((step, idx) => (
              <li key={idx} className="flex gap-4">
                <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-orange-600/20 flex items-center justify-center text-[10px] font-black text-orange-500 border border-orange-500/20">
                  {idx + 1}
                </span>
                <p className="leading-relaxed font-bold uppercase tracking-wide">{step}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 bg-black p-5 rounded-xl font-mono text-[10px] overflow-x-auto border border-stone-800 shadow-inner">
            <p className="text-stone-600 mb-3">// Injetar dados a partir da Galeria:</p>
            <p className="text-orange-500">const pin = new URLSearchParams(window.location.search).get('pin');</p>
            <p className="text-orange-500">const &#123; data, error &#125; = await supabase.from('game_scores').insert(&#123; player_id: player.id, game_id: 'seu-id', score: total &#125;);</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationGuide;
