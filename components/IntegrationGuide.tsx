
import React, { useState } from 'react';
import { INSTRUCTIONS } from '../constants';

const IntegrationGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-20 border-t border-slate-800 pt-10">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-2 mb-4 mx-auto"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
        Como vincular seus jogos do Google VR Studio / Antigravity
      </button>

      {isOpen && (
        <div className="max-w-2xl mx-auto bg-slate-800/50 p-6 rounded-xl text-left border border-slate-700">
          <h4 className="text-white font-bold mb-4">Passos para Implementação:</h4>
          <ol className="space-y-4 text-sm text-slate-300">
            {INSTRUCTIONS.map((step, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-blue-400">
                  {idx + 1}
                </span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6 bg-slate-900 p-4 rounded-lg font-mono text-xs overflow-x-auto border border-slate-800">
            <p className="text-slate-500 mb-2">// No código do seu jogo VR:</p>
            <p className="text-blue-400">const pin = new URLSearchParams(window.location.search).get('pin');</p>
            <p className="text-blue-400">const &#123; data, error &#125; = await supabase.from('scores').insert(&#123; pin, score: currentScore &#125;);</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationGuide;
