
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
    <div className="group relative bg-stone-900 rounded-2xl overflow-hidden border border-stone-800 hover:border-orange-500/50 transition-all duration-500 shadow-lg hover:shadow-orange-900/20">
      <div className="relative h-56 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900 to-transparent z-10 opacity-60"></div>
        <img
          src={game.thumbnail}
          alt={game.title}
          className="w-full h-full object-cover group-hover:scale-110 group-hover:rotate-1 transition-transform duration-700 filter grayscale group-hover:grayscale-0"
        />
        <div className="absolute top-4 right-4 z-20 bg-black/80 backdrop-blur-sm text-orange-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-orange-500/20">
          {game.category}
        </div>
      </div>

      <div className="p-6 relative z-20 -mt-12">
        <div className="bg-stone-950 p-6 rounded-xl border border-stone-800 shadow-xl group-hover:translate-y-[-5px] transition-transform duration-300">
          <h3 className="text-2xl font-black mb-2 text-white group-hover:text-orange-500 transition-colors uppercase italic">{game.title}</h3>
          <p className="text-stone-400 text-sm mb-6 line-clamp-3 leading-relaxed">
            {game.description}
          </p>

          <button
            onClick={() => onLaunch(finalUrl)}
            disabled={!isPinReady}
            className={`w-full py-4 px-6 rounded-lg font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 ${isPinReady
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white shadow-lg hover:shadow-orange-500/25 transform active:scale-95 cursor-pointer'
                : 'bg-stone-800 text-stone-600 cursor-not-allowed border border-stone-700'
              }`}
          >
            {isPinReady ? (
              <>
                Jogar Agora
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                Aguardando PIN
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameCard;
