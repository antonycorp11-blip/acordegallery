
import React from 'react';

interface PinEntryProps {
  pin: string;
  setPin: (pin: string) => void;
}

const PinEntry: React.FC<PinEntryProps> = ({ pin, setPin }) => {
  return (
    <div className="max-w-md mx-auto mb-12">
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
        <label htmlFor="pin-input" className="block text-slate-400 text-sm font-medium mb-3 text-center uppercase tracking-widest">
          Insira seu PIN de Aluno
        </label>
        <div className="relative">
          <input
            id="pin-input"
            type="text"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="0000"
            className="w-full bg-slate-900 border-2 border-slate-700 focus:border-blue-500 text-white text-center text-4xl font-mono py-4 rounded-xl outline-none transition-all placeholder:text-slate-800"
          />
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
             {pin.length >= 4 ? (
               <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
             ) : (
               <div className="h-2 w-2 rounded-full bg-slate-700 animate-pulse"></div>
             )}
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-500 text-center">
          Este PIN será usado para acompanhar seu progresso em todos os jogos.
        </p>
      </div>
    </div>
  );
};

export default PinEntry;
