
import React from 'react';
import { Game } from '../types';

interface GameCardProps {
  game: Game;
  studentPin: string;
  onLaunch: (url: string) => void;
}

const GameCard: React.FC<GameCardProps> = ({ game, studentPin, onLaunch }) => {
  const isPinReady = studentPin.length >= 4;
  const finalUrl = `${game.url}${game.url.includes('?') ? '&' : '?'}pin=${studentPin}`;

  return (
    <div className="group relative bg-[#0a0a0a] rounded-3xl overflow-hidden border border-stone-800 transition-all duration-500 hover:border-orange-500/40 shadow-xl flex flex-col h-full">
      {/* Cinematic Thumbnail - Reduced Height */}
      <div className="relative h-48 md:h-56 overflow-hidden">
        <img
          src={game.thumbnail}
          alt={game.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 saturate-[0.8] group-hover:saturate-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-80"></div>

        {/* Category Badge - Smaller */}
        <div className="absolute top-4 left-4 z-20 bg-stone-900/90 backdrop-blur-md px-3 py-1 rounded-lg border border-stone-700/50">
          <span className="text-[8px] font-black uppercase tracking-widest text-orange-500">{game.category}</span>
        </div>
      </div>

      {/* Content Area - Compact */}
      <div className="p-5 flex flex-col flex-1 relative z-20">
        <h3 className="text-xl md:text-2xl font-black text-white italic uppercase tracking-tighter mb-2 group-hover:text-orange-500 transition-colors leading-tight">
          {game.title}
        </h3>
        <p className="text-stone-500 text-[10px] md:text-xs font-bold uppercase tracking-wider leading-relaxed mb-6 grow opacity-70 line-clamp-2">
          {game.description}
        </p>

        <button
          onClick={() => onLaunch(finalUrl)}
          disabled={!isPinReady}
          className={`w-full py-3.5 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-between transition-all duration-300 group/btn ${isPinReady
            ? 'bg-white text-black hover:bg-orange-600 hover:text-white shadow-lg active:scale-95'
            : 'bg-stone-900 text-stone-700 border border-stone-800 cursor-not-allowed'
            }`}
        >
          <span>{isPinReady ? 'Launch Mission' : 'Mission Locked'}</span>
          {isPinReady && (
            <svg className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default GameCard;
