
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
    <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-blue-500 transition-all group shadow-lg">
      <div className="relative h-48 overflow-hidden">
        <img 
          src={game.thumbnail} 
          alt={game.title} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-3 right-3 bg-blue-600 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
          {game.category}
        </div>
      </div>
      
      <div className="p-5">
        <h3 className="text-xl font-bold mb-2 text-white">{game.title}</h3>
        <p className="text-slate-400 text-sm mb-6 line-clamp-2">
          {game.description}
        </p>
        
        <button
          onClick={() => onLaunch(finalUrl)}
          disabled={!isPinReady}
          className={`w-full py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
            isPinReady 
            ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer' 
            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {isPinReady ? (
            <>
              Iniciar Jogo
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </>
          ) : (
            'Insira o PIN para Jogar'
          )}
        </button>
      </div>
    </div>
  );
};

export default GameCard;
