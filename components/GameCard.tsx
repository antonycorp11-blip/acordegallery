
import React from 'react';
import { Game } from '../types';

interface GameCardProps {
  game: Game;
  studentPin: string;
  onLaunch: (url: string) => void;
}

const GameCard: React.FC<GameCardProps> = ({ game, studentPin, onLaunch }) => {
  const isPinReady = studentPin.length >= 4;

  // Construct URL with PIN parameter
  const finalUrl = `${game.url}${game.url.includes('?') ? '&' : '?'}pin=${studentPin}`;

  return (
    <div className="group relative bg-[#0a0a0a] rounded-[2.5rem] overflow-hidden border border-stone-800 transition-all duration-700 hover:border-orange-500/50 shadow-2xl hover:shadow-[0_0_60px_rgba(249,115,22,0.15)] flex flex-col h-full">
      {/* Cinematic Thumbnail */}
      <div className="relative h-72 overflow-hidden">
        <img
          src={game.thumbnail}
          alt={game.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 saturate-[0.8] group-hover:saturate-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-90"></div>

        {/* Category Badge */}
        <div className="absolute top-6 left-6 z-20 bg-stone-900/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-stone-700/50 shadow-2xl">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-500">{game.category}</span>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-8 pt-0 flex flex-col flex-1 relative z-20">
        <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-3 group-hover:text-orange-500 transition-colors leading-none">
          {game.title}
        </h3>
        <p className="text-stone-500 text-xs font-bold uppercase tracking-widest leading-relaxed mb-8 grow opacity-80">
          {game.description}
        </p>

        <button
          onClick={() => onLaunch(finalUrl)}
          disabled={!isPinReady}
          className={`w-full py-5 px-8 rounded-2xl font-black uppercase tracking-[0.2em] text-sm flex items-center justify-between transition-all duration-500 group/btn ${isPinReady
            ? 'bg-white text-black hover:bg-orange-500 hover:text-white shadow-[0_10px_30px_rgba(255,255,255,0.1)] hover:shadow-[0_15px_40px_rgba(249,115,22,0.4)] active:scale-95'
            : 'bg-stone-900 text-stone-700 border border-stone-800 cursor-not-allowed'
            }`}
        >
          <span>{isPinReady ? 'Launch Mission' : 'Mission Locked'}</span>
          {isPinReady && (
            <svg className="w-5 h-5 transition-transform group-hover/btn:translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default GameCard;
