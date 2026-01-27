
import React, { useState, useEffect } from 'react';
import { GAMES } from './constants';
import GameCard from './components/GameCard';
import PinEntry from './components/PinEntry';
import IntegrationGuide from './components/IntegrationGuide';
import LeaderboardSection from './components/LeaderboardSection';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [pin, setPin] = useState<string>('');
  const [studentName, setStudentName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorCount, setErrorCount] = useState<number>(0);

  useEffect(() => {
    const fetchStudent = async () => {
      if (pin.length < 4) {
        setStudentName(null);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('players')
          .select('name')
          .eq('recovery_pin', pin)
          .maybeSingle();

        if (error) {
          console.error('Error fetching student:', error);
          // Don't show technical error to user, just fail quietly or show generic invalid
        }

        if (data) {
          setStudentName(data.name);
          setErrorCount(0);
        } else {
          setStudentName(null);
          // Only increment error count if it was a "complete" attempt (simple logic here)
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce checking
    const timeoutId = setTimeout(() => {
      fetchStudent();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [pin]);

  const handleLaunchGame = (url: string) => {
    // Abrir em uma nova aba para preservar o estado da galeria
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-stone-100 font-sans selection:bg-orange-600">
      {/* Background Decorative Element */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-[80%] md:w-[50%] h-[50%] bg-orange-950/20 md:bg-orange-950/30 rounded-full blur-[80px] md:blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[70%] md:w-[40%] h-[40%] bg-stone-900 rounded-full blur-[60px] md:blur-[100px]"></div>
      </div>

      {/* Main Dashboard Layout */}
      <div className="relative z-10 max-w-[1600px] mx-auto py-10 px-6 lg:px-12">

        {/* TOP BAR / NAVIGATION STYLE */}
        <header className="flex flex-col md:flex-row items-center justify-between mb-16 border-b border-stone-800/50 pb-8">
          <div className="flex items-center gap-6 mb-6 md:mb-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 p-3 shadow-[0_0_30px_rgba(249,115,22,0.3)]">
              <img src="/gallery_icon.png" alt="Icon" className="w-full h-full object-contain brightness-110" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-white">
                Acorde <span className="text-orange-500">Gallery</span>
              </h1>
              <p className="text-stone-500 text-xs font-bold uppercase tracking-[0.3em]">Game Intelligence Hub</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-stone-900/50 p-2 rounded-2xl border border-stone-800">
            {studentName ? (
              <div className="flex items-center gap-4 px-4 py-2">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-stone-500 uppercase font-black tracking-widest leading-none mb-1">Authenticated Player</span>
                  <span className="text-white font-black uppercase text-xl italic tracking-tight">{studentName}</span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-orange-900/40">
                  {studentName.charAt(0)}
                </div>
              </div>
            ) : (
              <div className="px-6 py-2 text-stone-500 text-xs font-bold uppercase tracking-widest animate-pulse">
                System Awaiting Identification...
              </div>
            )}
          </div>
        </header>

        <main>
          {/* IDENTIFICATION ZONE */}
          {!studentName && (
            <section className="mb-20">
              <div className="max-w-xl mx-auto text-center mb-10">
                <h2 className="text-5xl font-black text-white mb-4 italic uppercase tracking-tighter">Enter the Arena</h2>
                <p className="text-stone-400">Log in with your unique player PIN to sync your progress and unlock the leaderboard.</p>
              </div>
              <PinEntry pin={pin} setPin={setPin} />
              {isLoading && (
                <div className="flex justify-center -mt-8">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* HALL OF FAME - EPIC VIEW */}
          <section className="mb-24">
            <LeaderboardSection />
          </section>

          {/* GAME LIBRARY */}
          <section className="mb-24">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
                <div className="w-2 h-8 bg-orange-600 skew-x-[-20deg]"></div>
                Available Missions
              </h2>
              <div className="text-stone-500 text-xs font-bold uppercase tracking-widest lg:block hidden">
                Select a title to begin your training session
              </div>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 transition-all duration-1000 ${!studentName ? 'opacity-30 blur-sm pointer-events-none grayscale' : 'opacity-100'}`}>
              {GAMES.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  studentPin={studentName ? pin : ''}
                  onLaunch={handleLaunchGame}
                />
              ))}
            </div>

            {!studentName && (
              <div className="mt-[-200px] relative z-20 flex flex-col items-center">
                <div className="bg-orange-600/10 backdrop-blur-md border border-orange-500/20 px-8 py-4 rounded-xl text-orange-500 font-bold uppercase tracking-widest">
                  🔒 Identification Required to Play
                </div>
              </div>
            )}
          </section>

          {/* DEVELOPER CONSOLE */}
          <div className="opacity-50 hover:opacity-100 transition-opacity">
            <IntegrationGuide />
          </div>
        </main>

        <footer className="mt-32 pt-10 border-t border-stone-900 flex flex-col md:flex-row justify-between items-center text-stone-600 text-[10px] font-bold uppercase tracking-[0.3em]">
          <p>© {new Date().getFullYear()} Acorde Studio Intelligence Division</p>
          <div className="flex gap-8 mt-4 md:mt-0">
            <span className="hover:text-orange-500 cursor-pointer transition-colors">Security Protocol</span>
            <span className="hover:text-orange-500 cursor-pointer transition-colors">Server Status: Online</span>
            <span className="text-orange-600">v2.0 Console Edition</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
