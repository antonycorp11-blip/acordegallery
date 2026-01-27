
import React, { useState, useEffect } from 'react';
import { GAMES } from './constants';
import GameCard from './components/GameCard';
import PinEntry from './components/PinEntry';
import IntegrationGuide from './components/IntegrationGuide';
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
    <div className="min-h-screen bg-black text-stone-100 py-12 px-4 sm:px-6 lg:px-8 selection:bg-orange-500 selection:text-white">
      {/* Seção de Cabeçalho */}
      <div className="max-w-7xl mx-auto flex flex-col items-center mb-16">

        {/* LOGO */}
        <div className="mb-8 w-64 md:w-80 hover:scale-105 transition-transform duration-500 drop-shadow-2xl">
          <img src="/logo.png" alt="Acorde Gallery Logo" className="w-full h-auto object-contain" />
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-4 uppercase">
          Acorde <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600">Gallery</span>
        </h1>

        <div className="w-32 h-2 bg-gradient-to-r from-transparent via-orange-600 to-transparent rounded-full mb-8 opacity-80"></div>

        <p className="text-stone-400 max-w-2xl mx-auto text-lg text-center font-light">
          {studentName
            ? (
              <span className="flex flex-col items-center animate-fade-in">
                <span className="text-stone-500 text-sm uppercase tracking-[0.2em] mb-2">Bem-vindo ao palco</span>
                <span className="text-orange-500 font-bold text-4xl drop-shadow-lg">{studentName}</span>
              </span>
            )
            : "Insira seu PIN para liberar seu acesso."}
        </p>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Área de Entrada de PIN */}
        <PinEntry pin={pin} setPin={setPin} />

        {isLoading && <div className="text-center mb-8"><div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto"></div></div>}

        {/* Grade de Jogos */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 transition-all duration-700 ${!studentName && pin.length > 0 ? 'opacity-40 grayscale' : 'opacity-100'}`}>
          {GAMES.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              studentPin={studentName ? pin : ''}
              onLaunch={handleLaunchGame}
            />
          ))}
        </div>

        {/* Instruções para Desenvolvedores/Administradores */}
        <IntegrationGuide />
      </div>

      {/* Rodapé */}
      <footer className="max-w-7xl mx-auto mt-24 pt-10 border-t border-stone-900 text-center text-stone-600 text-sm">
        <p>© {new Date().getFullYear()} Acorde Gallery. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default App;
