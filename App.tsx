
import React, { useState, useEffect } from 'react';
import { GAMES } from './constants';
import GameCard from './components/GameCard';
import PinEntry from './components/PinEntry';
import IntegrationGuide from './components/IntegrationGuide';
import LeaderboardSection from './components/LeaderboardSection';
import PlayerProfile from './components/PlayerProfile';
import StorePage from './components/StorePage';
import RankingGeralPage from './components/RankingGeralPage';
import { supabase } from './lib/supabase';

type View = 'gallery' | 'ranking' | 'store';

const App: React.FC = () => {
  const [pin, setPin] = useState<string>('');
  const [studentName, setStudentName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [playerData, setPlayerData] = useState<any>(null);
  const [currentView, setCurrentView] = useState<View>('gallery');

  const fetchStudentData = async (forcePin?: string) => {
    const activePin = forcePin || pin;
    if (activePin.length < 4) {
      setStudentName(null);
      setPlayerData(null);
      return;
    }

    if (!forcePin) setIsLoading(true);
    try {
      const { data: player, error } = await supabase
        .from('players')
        .select('*')
        .eq('recovery_pin', activePin)
        .maybeSingle();

      if (player) {
        setStudentName(player.name);

        // Buscar jogo mais jogado
        const { data: scores } = await supabase
          .from('game_scores')
          .select('game_id')
          .eq('player_id', player.id);

        let mostPlayed = 'Nenhum';
        if (scores && scores.length > 0) {
          const counts = scores.reduce((acc: any, curr: any) => {
            acc[curr.game_id] = (acc[curr.game_id] || 0) + 1;
            return acc;
          }, {});
          mostPlayed = Object.keys(counts).reduce((a, b) => (counts[a] || 0) > (counts[b] || 0) ? a : b);
          const gameObj = GAMES.find(g => g.id === mostPlayed);
          if (gameObj) mostPlayed = gameObj.title;
        }

        const created = new Date(player.created_at);
        const now = new Date();
        const diffDays = Math.ceil(Math.abs(now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

        setPlayerData({
          ...player,
          most_played_game: mostPlayed,
          days_active: diffDays || 1
        });
      } else {
        setStudentName(null);
        setPlayerData(null);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => fetchStudentData(), 500);
    return () => clearTimeout(timeoutId);
  }, [pin]);

  const handleLaunchGame = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-stone-100 font-sans selection:bg-orange-600 overflow-x-hidden">
      {/* Fundo Dinâmico */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-[100%] md:w-[50%] h-[50%] bg-orange-950/20 rounded-full blur-[60px] md:blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[100%] md:w-[40%] h-[40%] bg-stone-900/40 rounded-full blur-[60px] md:blur-[100px]"></div>
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto py-6 md:py-10 px-4 md:px-12">
        {/* BARRA SUPERIOR E NAVEGAÇÃO */}
        <header className="flex flex-col border-b border-stone-800/30 pb-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 p-2.5 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
                <img src="/gallery_icon.png" alt="Icone" className="w-full h-full object-contain brightness-110" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-white">
                  Acorde <span className="text-orange-500 font-black">Gallery</span>
                </h1>
                <p className="text-stone-600 text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em]">Divisão de Elite v4.0</p>
              </div>
            </div>

            {studentName ? (
              <nav className="flex items-center bg-stone-900/50 p-1.5 rounded-2xl border border-stone-800">
                <NavBtn active={currentView === 'gallery'} onClick={() => setCurrentView('gallery')} icon="🎮" label="Galeria" />
                <NavBtn active={currentView === 'ranking'} onClick={() => setCurrentView('ranking')} icon="🏆" label="Ranking" />
                <NavBtn active={currentView === 'store'} onClick={() => setCurrentView('store')} icon="🛒" label="Loja" />
              </nav>
            ) : (
              <div className="bg-stone-900 px-4 py-2 border border-stone-800 rounded-lg text-[9px] font-black uppercase tracking-widest text-stone-500 animate-pulse">
                Aguardando Identificação...
              </div>
            )}
          </div>
        </header>

        <main>
          {/* SEÇÃO DE PERFIL / AUTH */}
          <section className="mb-12">
            {!studentName ? (
              <div className="animate-fade-in-up">
                <div className="max-w-xl mx-auto text-center mb-6 px-2">
                  <h2 className="text-3xl md:text-4xl font-black text-white italic uppercase tracking-tighter leading-none mb-2">Portal de Acesso</h2>
                  <p className="text-stone-500 text-xs md:text-sm uppercase font-bold tracking-widest text-center">Insira seu PIN para entrar na arena</p>
                </div>
                <PinEntry pin={pin} setPin={setPin} />
                {isLoading && (
                  <div className="flex justify-center -mt-8">
                    <div className="text-orange-500 font-black uppercase text-[10px] tracking-widest animate-bounce text-center w-full">Sincronizando Rede...</div>
                  </div>
                )}
              </div>
            ) : (
              playerData && (
                <PlayerProfile
                  stats={{
                    name: playerData.name,
                    total_xp: playerData.accumulated_xp || 0,
                    games_played: playerData.games_played || 0,
                    most_played_game: playerData.most_played_game,
                    high_score: playerData.high_score || 0,
                    days_active: playerData.days_active || 1
                  }}
                />
              )
            )}
          </section>

          {/* CONTEÚDO DINÂMICO BASEADO NA NAVEGAÇÃO */}
          {studentName && (
            <div className="animate-fade-in">
              {currentView === 'gallery' && (
                <section className="mb-16">
                  <div className="flex items-center gap-4 mb-8 px-2">
                    <div className="w-1.5 h-6 bg-orange-600 skew-x-[-20deg]"></div>
                    <h2 className="text-xl md:text-3xl font-black text-white italic uppercase tracking-tighter">Missões Disponíveis</h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-stone-800 to-transparent"></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {GAMES.map((game) => (
                      <GameCard
                        key={game.id}
                        game={game}
                        studentPin={studentName ? pin : ''}
                        onLaunch={handleLaunchGame}
                      />
                    ))}
                  </div>
                </section>
              )}

              {currentView === 'ranking' && <RankingGeralPage />}

              {currentView === 'store' && (
                <StorePage
                  player={playerData}
                  onUpdate={() => fetchStudentData(pin)}
                />
              )}
            </div>
          )}

          {!studentName && (
            <div className="opacity-20 blur-sm pointer-events-none">
              <LeaderboardSection />
            </div>
          )}
        </main>

        <footer className="pt-8 border-t border-stone-900 flex flex-col md:flex-row justify-between items-center text-stone-700 text-[8px] font-black uppercase tracking-[0.4em] gap-4">
          <p>© {new Date().getFullYear()} Acorde Studio Intelligence</p>
          <div className="flex gap-8">
            <span className="text-orange-700">Protocolo: Seguro</span>
            <span className="hidden sm:inline">Servidor: Online</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

const NavBtn = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) => (
  <button
    onClick={onClick}
    className={`px-4 md:px-6 py-2.5 rounded-xl font-black uppercase text-[9px] md:text-xs tracking-widest transition-all flex items-center gap-2 ${active ? 'bg-orange-600 text-white shadow-lg' : 'text-stone-500 hover:text-white hover:bg-stone-800/50'
      }`}
  >
    <span>{icon}</span>
    <span className="hidden xs:inline">{label}</span>
  </button>
);

export default App;
