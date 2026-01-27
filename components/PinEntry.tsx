
import React from 'react';

interface PinEntryProps {
  pin: string;
  setPin: (pin: string) => void;
}

const PinEntry: React.FC<PinEntryProps> = ({ pin, setPin }) => {
  return (
    <div className="max-w-2xl mx-auto mb-16 relative">
      <div className="bg-stone-900/40 backdrop-blur-xl p-12 rounded-[2rem] border border-stone-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center">
        <label htmlFor="pin-input" className="block text-stone-500 text-[10px] font-black mb-8 uppercase tracking-[0.5em] text-center">
          Secure Player Identification Required
        </label>

        <div className="relative group w-full max-w-sm">
          {/* Neon Glow Background */}
          <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-orange-400 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>

          <input
            id="pin-input"
            type="text"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="— — — —"
            className="relative w-full bg-black border border-stone-800 group-hover:border-orange-500/50 text-white text-center text-6xl font-black py-8 rounded-2xl outline-none transition-all placeholder:text-stone-900 tracking-[0.2em] shadow-inner"
          />
        </div>

        <div className="mt-10 flex gap-12">
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-stone-600 font-black uppercase tracking-widest mb-2">Sync Status</span>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${pin.length >= 4 ? 'bg-orange-500 shadow-[0_0_10px_#f97316]' : 'bg-stone-800'}`}></div>
              <span className="text-[10px] text-stone-400 font-bold uppercase">{pin.length >= 4 ? 'Ready' : 'Pending'}</span>
            </div>
          </div>
          <div className="w-px h-8 bg-stone-800"></div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-stone-600 font-black uppercase tracking-widest mb-2">Security Level</span>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PinEntry;
