
import React, { useState, useEffect } from 'react';
import { GAMES, STORE_ITEMS } from './constants';
import GameCard from './components/GameCard';
import PinEntry from './components/PinEntry';
import IntegrationGuide from './components/IntegrationGuide';
import LeaderboardSection from './components/LeaderboardSection';
import PlayerProfile from './components/PlayerProfile';
import StorePage from './components/StorePage';
import InventoryPage from './components/InventoryPage';
import RankingGeralPage from './components/RankingGeralPage';
import AdminPanel from './components/AdminPanel';
import { supabase } from './lib/supabase';

type View = 'gallery' | 'ranking' | 'store' | 'inventory' | 'admin';
type AuthMode = 'login' | 'register';

// Constantes de Admin
const ADMIN_NAME_CHECK = "AQUILLES ANTONY";
const ADMIN_PIN_CHECK = "8238";

const App: React.FC = () => {
  const [pin, setPin] = useState<string>('');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [studentName, setStudentName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [playerData, setPlayerData] = useState<any>(null);
  const [xpGain, setXpGain] = useState<number>(0);
  const [currentView, setCurrentView] = useState<View>('gallery');

  // Game of Week & Economy State
  const [gameOfWeekId, setGameOfWeekId] = useState<string>('');
  const [gamePrize, setGamePrize] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<number>(10); // Default 10 XP = 1 Coin

  // Efeito de Persistência: Carregar PIN salvo ao iniciar
  useEffect(() => {
    const savedPin = localStorage.getItem('acorde_gallery_pin');
    if (savedPin) {
      setPin(savedPin);
      fetchStudentData(savedPin);
    }

    // LISTENER DE FOCO: Sincroniza dados automaticamente ao voltar para a galeria (ex: após fechar um jogo)
    const handleFocus = () => {
      const activePin = localStorage.getItem('acorde_gallery_pin');
      if (activePin) {
        fetchStudentData(activePin);
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleFocus();
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

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

        const currentXp = player.accumulated_xp || 0;
        const lastSeenXp = player.last_viewed_xp || 0;

        if (currentXp > lastSeenXp) {
          setXpGain(currentXp - lastSeenXp);
          await supabase
            .from('players')
            .update({ last_viewed_xp: currentXp })
            .eq('id', player.id);
          setTimeout(() => setXpGain(0), 5000);
        }

        setPlayerData({
          ...player,
          most_played_game: mostPlayed,
          days_active: diffDays || 1
        });

        // Salvar PIN para persistência
        localStorage.setItem('acorde_gallery_pin', activePin);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('acorde_gallery_pin');
    setPin('');
    setStudentName(null);
    setPlayerData(null);
    setCurrentView('gallery');
    setAuthMode('login');
  };

  // Fetch Game of Week & Economy Config (From Admin Player)
  useEffect(() => {
    const fetchAdminSettings = async () => {
      const { data: admin } = await supabase
        .from('players')
        .select('equipped_items')
        .eq('recovery_pin', ADMIN_PIN_CHECK) // Get config from Admin's pin
        .maybeSingle();

      if (admin && admin.equipped_items?.game_settings) {
        setGameOfWeekId(admin.equipped_items.game_settings.id || '');
        setGamePrize(admin.equipped_items.game_settings.prize || '');
        if (admin.equipped_items.game_settings.exchange_rate) {
          setExchangeRate(Number(admin.equipped_items.game_settings.exchange_rate));
        }
      }
    }
    fetchAdminSettings();
  }, [currentView]); // Re-fetch when view changes to update if admin changed it

  const handleRegister = async () => {
    if (newName.trim().length < 3) {
      alert('O nome deve ter no mínimo 3 letras!');
      return;
    }

    setIsLoading(true);
    try {
      // Gerar PIN e Device ID Aleatórios
      const newPin = Math.floor(1000 + Math.random() * 9000).toString();
      const fakeDeviceId = 'galeria-' + Math.random().toString(36).substring(2, 10);

      const { data, error } = await supabase
        .from('players')
        .insert([
          {
            name: newName.trim().toUpperCase(),
            recovery_pin: newPin,
            device_id: fakeDeviceId,
            accumulated_xp: 0,
            acorde_coins: 2000, // PRÊMIO DE BOAS VINDAS
            xp: 0,
            total_xp: 0,
            last_viewed_xp: 0,
            total_spent_xp: 0,
            equipped_items: {}
          }
        ])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setGeneratedPin(newPin);
        setNewName('');
      }
    } catch (err: any) {
      alert('Erro ao criar perfil: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const enterGalleryAfterRegister = () => {
    if (generatedPin) {
      setPin(generatedPin);
      setAuthMode('login');
      fetchStudentData(generatedPin);
      setGeneratedPin(null);
    }
  };

  useEffect(() => {
    if (authMode === 'login' && pin.length >= 4) {
      const timeoutId = setTimeout(() => fetchStudentData(), 500);
      return () => clearTimeout(timeoutId);
    }
  }, [pin, authMode]);

  const handleLaunchGame = (url: string) => {
    window.open(url, '_blank');
  };

  const isAdmin = playerData?.name === ADMIN_NAME_CHECK && playerData?.recovery_pin === ADMIN_PIN_CHECK;

  return (
    <div className="min-h-screen bg-[#050505] text-stone-100 font-sans selection:bg-orange-600 overflow-x-hidden">
      {/* Fundo Dinâmico */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-[100%] md:w-[50%] h-[50%] bg-orange-950/20 rounded-full blur-[60px] md:blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[100%] md:w-[40%] h-[40%] bg-stone-900/40 rounded-full blur-[60px] md:blur-[100px]"></div>
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto py-4 md:py-10 px-2 md:px-6">
        {/* BARRA SUPERIOR */}
        <header className="flex flex-col border-b border-stone-800/30 pb-4 md:pb-6 mb-4 md:mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-5">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-tr from-orange-600 to-orange-400 rounded-2xl blur-md opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-black border border-stone-800 p-2 shadow-2xl overflow-hidden">
                  <img src="/gallery_icon.png" alt="Icone" className="w-full h-full object-contain brightness-125 contrast-110 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-orange-500/10 to-transparent"></div>
                </div>
              </div>
              <div>
                <h1 className="text-xl md:text-3xl font-black uppercase italic tracking-tighter text-white leading-none">
                  Acorde <span className="text-orange-500 font-extrabold not-italic">Gallery</span>
                </h1>
                <p className="text-stone-600 text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] mt-1">Elite Division v5.1 Platinum</p>
              </div>
            </div>

            {studentName ? (
              <nav className="hidden md:flex items-center bg-stone-900/50 p-1.5 rounded-2xl border border-stone-800 overflow-x-auto max-w-full">
                <NavBtn active={currentView === 'gallery'} onClick={() => setCurrentView('gallery')} icon="🎮" label="Galeria" />
                <NavBtn active={currentView === 'ranking'} onClick={() => setCurrentView('ranking')} icon="🏆" label="Ranking" />
                <NavBtn active={currentView === 'store'} onClick={() => setCurrentView('store')} icon="🛒" label="Loja" />
                <NavBtn active={currentView === 'inventory'} onClick={() => setCurrentView('inventory')} icon="🎒" label="Inventário" />
                {isAdmin && <NavBtn active={currentView === 'admin'} onClick={() => setCurrentView('admin')} icon="👑" label="ADMIN" />}
                <button
                  onClick={handleLogout}
                  className="px-4 py-2.5 text-red-500 hover:bg-red-500/10 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2"
                >
                  🚪 Sair
                </button>
              </nav>
            ) : (
              <div className="bg-stone-900 px-4 py-2 border border-stone-800 rounded-lg text-[9px] font-black uppercase tracking-widest text-stone-500 animate-pulse text-center">
                Acesso Restrito
              </div>
            )}
          </div>
        </header>

        <main>
          {/* SEÇÃO LOGIN / REGISTRO */}
          {!studentName && (
            <div className="max-w-2xl mx-auto mb-16 animate-fade-in-up">
              {!generatedPin ? (
                <>
                  {/* Alternar Modos */}
                  <div className="flex justify-center gap-4 mb-10 overflow-hidden p-1 bg-stone-950/50 border border-stone-900 rounded-2xl max-w-sm mx-auto">
                    <button
                      onClick={() => setAuthMode('login')}
                      className={`flex-1 py-3 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all ${authMode === 'login' ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/40' : 'text-stone-600 hover:text-stone-300'}`}
                    >
                      Já sou Aluno
                    </button>
                    <button
                      onClick={() => setAuthMode('register')}
                      className={`flex-1 py-3 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all ${authMode === 'register' ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/40' : 'text-stone-600 hover:text-stone-300'}`}
                    >
                      Criar Perfil
                    </button>
                  </div>

                  {authMode === 'login' ? (
                    <>
                      <div className="text-center mb-6">
                        <h2 className="text-3xl md:text-4xl font-black text-white italic uppercase tracking-tighter leading-none mb-2">Portal de Acesso</h2>
                        <p className="text-stone-500 text-xs md:text-sm uppercase font-bold tracking-widest">Digite seu PIN para entrar na arena</p>
                      </div>
                      <PinEntry pin={pin} setPin={setPin} />
                    </>
                  ) : (
                    <div className="bg-stone-900/40 backdrop-blur-xl p-8 md:p-12 rounded-[2rem] border border-orange-500/20 shadow-2xl flex flex-col items-center">
                      <h2 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter mb-2">Novo Guerreiro</h2>
                      <p className="text-stone-500 text-[10px] md:text-xs font-black mb-10 uppercase tracking-widest text-center italic">Alistamento obrigatório para novos talentos musicais</p>

                      <input
                        type="text"
                        placeholder="SEU NOME COMPLETO"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value.toUpperCase())}
                        className="w-full bg-black border border-stone-800 text-white text-center text-xl md:text-2xl font-black py-4 md:py-6 rounded-2xl outline-none focus:border-orange-500 transition-all mb-8 placeholder:text-stone-900 tracking-widest"
                      />

                      <button
                        onClick={handleRegister}
                        disabled={isLoading}
                        className="w-full py-5 md:py-6 bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {isLoading ? 'Forjando Identidade...' : 'Gerar meu Código de Acesso'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-gradient-to-b from-stone-900 to-black p-8 md:p-16 rounded-[3rem] border-2 border-orange-500 shadow-[0_0_50px_rgba(249,115,22,0.15)] flex flex-col items-center text-center animate-scale-in">
                  <div className="w-20 h-20 bg-orange-600 rounded-3xl flex items-center justify-center text-4xl mb-8 animate-bounce">🗝️</div>
                  <h2 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tighter mb-4">Registro Concluído!</h2>
                  <p className="text-stone-400 text-xs md:text-sm font-bold uppercase tracking-widest mb-12 max-w-md">Anote seu código abaixo. Ele é sua única chave para entrar na Acorde Gallery.</p>

                  <div className="bg-orange-600/10 border-2 border-orange-600/50 px-8 md:px-12 py-6 md:py-8 rounded-3xl mb-12 group cursor-pointer active:scale-95 transition-all">
                    <span className="text-stone-500 text-[8px] font-black uppercase tracking-[0.4em] block mb-2">SEU PIN DE ALUNO</span>
                    <span className="text-5xl md:text-7xl text-white font-black tracking-[0.3em] drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]">
                      {generatedPin}
                    </span>
                  </div>

                  <button
                    onClick={enterGalleryAfterRegister}
                    className="w-full max-w-md py-5 bg-white text-black hover:bg-orange-500 hover:text-white font-black uppercase tracking-[0.3em] rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95"
                  >
                    Entrar na Galeria 🎮
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CONTEÚDO PÓS-AUTH */}
          {studentName && playerData && (
            <div className="animate-fade-in pb-24 md:pb-0"> {/* Padding bottom for mobile nav */}

              {/* Profile visible only on Gallery */}
              {currentView === 'gallery' && (
                <PlayerProfile
                  stats={{
                    name: playerData.name,
                    total_xp: playerData.accumulated_xp || 0,
                    games_played: playerData.games_played || 0,
                    most_played_game: playerData.most_played_game,
                    high_score: playerData.high_score || 0,
                    days_active: playerData.days_active || 1,
                    pin: pin,
                    icon: STORE_ITEMS.find(i => i.id === (playerData.equipped_items?.icon))?.preview,
                    cardPreview: STORE_ITEMS.find(i => i.id === (playerData.equipped_items?.card))?.preview,
                    fontClass: STORE_ITEMS.find(i => i.id === (playerData.equipped_items?.font))?.preview,
                    isElite: Object.values(playerData.equipped_items || {}).some(id => {
                      const item = STORE_ITEMS.find(i => i.id === id);
                      return item && ['raro', 'épico', 'lendário'].includes(item.rarity);
                    })
                  }}
                  xpGain={xpGain}
                />
              )}

              <nav className="mb-12">
                {/* JOGO DA SEMANA BANNER */}
                {currentView === 'gallery' && gameOfWeekId && GAMES.find(g => g.id === gameOfWeekId) && (
                  <div className="mb-8 md:mb-12 relative group cursor-pointer" onClick={() => handleLaunchGame(GAMES.find(g => g.id === gameOfWeekId)?.url || '')}>
                    <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-600 rounded-3xl opacity-75 blur-lg group-hover:opacity-100 transition-all duration-700 animate-pulse"></div>
                    <div className="relative bg-[#1a0505] border-2 border-red-500 rounded-3xl p-6 md:p-12 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8 overflow-hidden">
                      {/* Compact Mobile Banner Layout */}
                      <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                      <div className="z-10 text-center md:text-left flex-1">
                        <span className="inline-block bg-red-600 text-white text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-lg mb-2 md:mb-4 animate-bounce">
                          🔥 Jogo da Semana
                        </span>
                        <h2 className="text-2xl md:text-5xl font-black text-white italic uppercase tracking-tighter mb-1 md:mb-2 leading-none">
                          {GAMES.find(g => g.id === gameOfWeekId)?.title}
                        </h2>
                        <p className="text-orange-500 text-xs md:text-xl font-bold uppercase tracking-widest max-w-lg mx-auto md:mx-0">
                          {gamePrize || "Jogue agora e conquiste a glória!"}
                        </p>
                      </div>

                      <div className="z-10 shrink-0 w-full md:w-auto">
                        <button className="w-full md:w-auto bg-white text-red-600 px-6 py-3 md:px-8 md:py-4 rounded-xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl text-[10px] md:text-xs">
                          JOGAR
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {currentView === 'gallery' && (
                  <section>
                    <div className="flex items-center gap-4 mb-8 px-2">
                      <div className="w-1.5 h-6 bg-orange-600 skew-x-[-20deg]"></div>
                      <h2 className="text-xl md:text-3xl font-black text-white italic uppercase tracking-tighter">Missões da Arena</h2>
                      <div className="h-px flex-1 bg-gradient-to-r from-stone-800 to-transparent"></div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8">
                      {GAMES.map((game) => (
                        <GameCard
                          key={game.id}
                          game={game}
                          studentPin={pin}
                          onLaunch={handleLaunchGame}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {currentView === 'ranking' && <RankingGeralPage />}
                {currentView === 'store' && <StorePage player={playerData} exchangeRate={exchangeRate} onUpdate={() => fetchStudentData(pin)} />}
                {currentView === 'inventory' && <InventoryPage player={playerData} onUpdate={() => fetchStudentData(pin)} />}
                {currentView === 'admin' && isAdmin && <AdminPanel adminPlayer={playerData} onUpdate={() => fetchStudentData(pin)} />}
              </nav>
            </div>
          )}

          {!studentName && (
            <div className="opacity-20 blur-sm pointer-events-none scale-95 origin-top transition-all duration-700">
              <LeaderboardSection />
            </div>
          )}
        </main>

        {/* BOTTOM NAV MOBILE */}
        {studentName && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-stone-950/90 backdrop-blur-xl border-t border-stone-800 z-50 px-4 py-3 flex justify-between items-center overflow-x-auto shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            <NavBtnMobile active={currentView === 'gallery'} onClick={() => setCurrentView('gallery')} icon="🎮" label="Jogos" />
            <NavBtnMobile active={currentView === 'ranking'} onClick={() => setCurrentView('ranking')} icon="🏆" label="Rank" />
            <NavBtnMobile active={currentView === 'store'} onClick={() => setCurrentView('store')} icon="🛒" label="Loja" />
            <NavBtnMobile active={currentView === 'inventory'} onClick={() => setCurrentView('inventory')} icon="🎒" label="Items" />
            {isAdmin && <NavBtnMobile active={currentView === 'admin'} onClick={() => setCurrentView('admin')} icon="👑" label="Admin" />}
            <button onClick={handleLogout} className="flex flex-col items-center justify-center gap-1 min-w-[60px] p-2 rounded-xl text-red-500">
              <span className="text-xl">🚪</span>
              <span className="text-[9px] font-black uppercase tracking-wider">Sair</span>
            </button>
          </div>
        )}

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
    className={`px-4 md:px-6 py-2.5 rounded-xl font-black uppercase text-[9px] md:text-xs tracking-widest transition-all flex items-center gap-2 shrink-0 ${active ? 'bg-orange-600 text-white shadow-lg' : 'text-stone-500 hover:text-white hover:bg-stone-800/50'
      }`}
  >
    <span>{icon}</span>
    <span>{label}</span>
  </button>
);

const NavBtnMobile = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-1 min-w-[60px] p-2 rounded-xl transition-all ${active ? 'text-orange-500 bg-orange-500/10' : 'text-stone-500'}`}
  >
    <span className="text-xl">{icon}</span>
    <span className="text-[9px] font-black uppercase tracking-wider">{label}</span>
  </button>
);

export default App;
