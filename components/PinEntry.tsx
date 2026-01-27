
import React from 'react';

interface PinEntryProps {
  pin: string;
  setPin: (pin: string) => void;
}

const PinEntry: React.FC<PinEntryProps> = ({ pin, setPin }) => {
  return (
    <div className="max-w-xl mx-auto mb-10 px-2 relative">
      <div className="bg-stone-900/50 backdrop-blur-xl p-8 md:p-12 rounded-[2rem] border border-stone-800 shadow-2xl flex flex-col items-center">
        <label htmlFor="pin-input" className="block text-stone-600 text-[8px] md:text-[10px] font-black mb-6 md:mb-8 uppercase tracking-[0.4em] text-center">
          Autorização de Segurança Necessária
        </label>

        <div className="relative group w-full max-w-[280px] md:max-w-sm">
          <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-orange-400 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>

          <input
            id="pin-input"
            type="text"
            pattern="[0-9]*"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="— — — —"
            className="relative w-full bg-black border border-stone-800 group-hover:border-stone-700 text-white text-center text-4xl md:text-5xl font-black py-4 md:py-6 rounded-2xl outline-none transition-all placeholder:text-stone-900 tracking-[0.2em] shadow-inner"
          />
        </div>

        <div className="mt-8 flex gap-8 items-center">
          <div className="flex flex-col items-center">
            <span className="text-[7px] text-stone-600 font-black uppercase tracking-widest mb-1">Status</span>
            <div className="flex items-center gap-1.5">
              <div className={`h-1.5 w-1.5 rounded-full ${pin.length >= 4 ? 'bg-orange-600 shadow-[0_0_8px_#f97316]' : 'bg-stone-800'}`}></div>
              <span className="text-[9px] text-stone-500 font-black uppercase">{pin.length >= 4 ? 'Válido' : 'Aguardando'}</span>
            </div>
          </div>
          <div className="w-px h-6 bg-stone-800/50"></div>
          <div className="flex flex-col items-center">
            <span className="text-[7px] text-stone-600 font-black uppercase tracking-widest mb-1">Conexão</span>
            <span className="text-[9px] text-stone-500 font-black uppercase text-center">Criptografada</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PinEntry;
