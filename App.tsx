
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
    <div className="min-h-screen bg-slate-900 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      {/* Seção de Cabeçalho */}
      <div className="max-w-7xl mx-auto text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-4">
          Acorde Gallery
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
          {studentName
            ? <span className="text-green-400 font-bold text-2xl animate-fade-in block mb-2">Olá, {studentName}!</span>
            : "Insira seu PIN para acessar seus jogos."}
          <span className="block text-sm opacity-75">Suas pontuações serão sincronizadas automaticamente.</span>
        </p>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Área de Entrada de PIN */}
        <PinEntry pin={pin} setPin={setPin} />

        {isLoading && <p className="text-center text-blue-400 mb-8 animate-pulse">Verificando PIN...</p>}

        {/* Grade de Jogos - Só mostra "ativa" se tiver nome, mas deixa visível para instigar */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-opacity duration-500 ${!studentName && pin.length > 0 ? 'opacity-50' : 'opacity-100'}`}>
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
      <footer className="max-w-7xl mx-auto mt-20 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
        <p>© {new Date().getFullYear()} Galeria de Jogos Educativos. Sistema Unificado.</p>
      </footer>
    </div>
  );
};

export default App;
