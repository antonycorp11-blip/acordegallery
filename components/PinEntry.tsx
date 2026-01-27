
import React from 'react';

interface PinEntryProps {
  pin: string;
  setPin: (pin: string) => void;
}

const PinEntry: React.FC<PinEntryProps> = ({ pin, setPin }) => {
  return (
    <div className="max-w-md mx-auto mb-16 relative group">
      {/* Glow Effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-amber-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>

      <div className="relative bg-stone-900 p-8 rounded-2xl border border-stone-800 shadow-2xl">
        <label htmlFor="pin-input" className="block text-orange-500 text-xs font-bold mb-4 text-center uppercase tracking-[0.3em]">
          Identificação do Aluno
        </label>

        <div className="relative flex justify-center">
          <input
            id="pin-input"
            type="text"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="0000"
            className="w-full bg-black border-2 border-stone-800 focus:border-orange-500 text-white text-center text-5xl font-mono py-6 rounded-xl outline-none transition-all placeholder:text-stone-800 shadow-inner"
          />

          <div className="absolute inset-y-0 right-6 flex items-center pointer-events-none">
            {pin.length >= 4 ? (
              <div className="bg-green-500/20 p-2 rounded-full">
                <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="flex gap-1">
                <div className="h-2 w-2 rounded-full bg-orange-500/50 animate-pulse delay-75"></div>
                <div className="h-2 w-2 rounded-full bg-orange-500/50 animate-pulse delay-150"></div>
                <div className="h-2 w-2 rounded-full bg-orange-500/50 animate-pulse delay-300"></div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center text-xs text-stone-500">
          <span>Acesso Seguro</span>
          <span className="flex items-center gap-1">
            <div className={`h-2 w-2 rounded-full ${pin.length >= 4 ? 'bg-green-500' : 'bg-red-500'}`}></div>
            {pin.length >= 4 ? 'Conectado' : 'Aguardando'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PinEntry;
