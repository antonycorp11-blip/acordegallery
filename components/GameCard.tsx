
import React from 'react';
import { Game } from '../types';

interface GameCardProps {
  game: Game;
  studentPin: string;
  onLaunch: (url: string) => void;
}

const GameCard: React.FC<GameCardProps> = ({ game, studentPin, onLaunch }) => {
  const isPinReady = studentPin.length >= 4;
  const isComingSoon = game.url === '#';

  // Lógica de liberação agendada (Bypass para Admin)
  const isAdmin = studentPin === '8238';
  const now = new Date();
  const releaseDate = game.scheduledRelease ? new Date(game.scheduledRelease) : null;
  const isLockedBySchedule = releaseDate && now < releaseDate && !isAdmin;

  const finalUrl = isComingSoon ? '#' : `${game.url}${game.url.includes('?') ? '&' : '?'}pin=${studentPin}`;

  return (
    <div className={`group relative bg-[#0a0a0a] rounded-3xl overflow-hidden border border-stone-800 transition-all duration-500 hover:border-orange-500/40 shadow-xl flex flex-col h-full ${isComingSoon ? 'opacity-70 grayscale-[0.5]' : ''}`}>
      {/* Cinematic Thumbnail */}
      <div className="relative h-48 md:h-56 overflow-hidden">
        {isComingSoon && (
          <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center">
            <span className="bg-orange-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl animate-pulse">Em Breve</span>
          </div>
        )}
        <img
          src={game.thumbnail}
          alt={game.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 saturate-[0.8] group-hover:saturate-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-80"></div>

        {/* Categoria */}
        <div className="absolute top-4 left-4 z-20 bg-stone-900/90 backdrop-blur-md px-3 py-1 rounded-lg border border-stone-700/50">
          <span className="text-[8px] font-black uppercase tracking-widest text-orange-500">{game.category}</span>
        </div>
      </div>

      {/* Área de Conteúdo */}
      <div className="p-5 flex flex-col flex-1 relative z-20">
        <h3 className="text-xl md:text-2xl font-black text-white italic uppercase tracking-tighter mb-2 group-hover:text-orange-500 transition-colors leading-tight">
          {game.title}
        </h3>
        <p className="text-stone-500 text-[10px] md:text-xs font-bold uppercase tracking-wider leading-relaxed mb-6 grow opacity-70 line-clamp-2">
          {game.description}
        </p>

        <button
          onClick={() => !isComingSoon && !isLockedBySchedule && onLaunch(finalUrl)}
          disabled={!isPinReady || isComingSoon || isLockedBySchedule}
          className={`w-full py-3.5 px-6 rounded-xl font-black uppercase tracking-widest text-[9px] md:text-[10px] flex items-center justify-between transition-all duration-300 group/btn ${isPinReady && !isComingSoon && !isLockedBySchedule
            ? 'bg-white text-black hover:bg-orange-600 hover:text-white shadow-lg active:scale-95'
            : 'bg-stone-900 text-stone-700 border border-stone-800 cursor-not-allowed'
            }`}
        >
          <span>
            {isComingSoon ? 'Desenvolvimento...' :
              isLockedBySchedule ? `Liberado em: ${releaseDate?.toLocaleDateString('pt-BR')} ${releaseDate?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` :
                isPinReady ? 'Iniciar Missão' : 'Missão Bloqueada'}
          </span>
          {isPinReady && !isComingSoon && !isLockedBySchedule && (
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
