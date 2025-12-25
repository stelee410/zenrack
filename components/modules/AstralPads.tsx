
import React from 'react';
import { PadPreset, ChordDuration, ArpSpeed } from '../../types';
import { Knob } from '../Knob';
import ModuleTitle from '../ModuleTitle';
import { CHORD_MAP, CHORD_DURATION_STEPS, logToFreq, freqToLog } from '../../data/constants';

interface AstralPadsProps {
  padPreset: PadPreset;
  setPadPreset: React.Dispatch<React.SetStateAction<PadPreset>>;
  chords: string[];
  setChords: React.Dispatch<React.SetStateAction<string[]>>;
  chordIsPlaying: boolean;
  setChordIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  chordDuration: ChordDuration;
  setChordDuration: React.Dispatch<React.SetStateAction<ChordDuration>>;
  arpSpeed: ArpSpeed;
  setArpSpeed: React.Dispatch<React.SetStateAction<ArpSpeed>>;
  chordRange: number;
  setChordRange: React.Dispatch<React.SetStateAction<number>>;
  chordIsTriplet: boolean;
  setChordIsTriplet: React.Dispatch<React.SetStateAction<boolean>>;
  padParams: { reverb: number; echo: number; lpf: number; reso: number };
  setPadParams: React.Dispatch<React.SetStateAction<{ reverb: number; echo: number; lpf: number; reso: number }>>;
  isPlaying: boolean;
  totalSteps: number;
  handleMagicChords: () => void;
  isChordAiLoading: boolean;
}

const AstralPads: React.FC<AstralPadsProps> = ({
  padPreset, setPadPreset, chords, setChords, chordIsPlaying, setChordIsPlaying,
  chordDuration, setChordDuration, arpSpeed, setArpSpeed, chordRange, setChordRange,
  chordIsTriplet, setChordIsTriplet, padParams, setPadParams, isPlaying, totalSteps,
  handleMagicChords, isChordAiLoading
}) => {
  const arpRateValues: ArpSpeed[] = ['1/1', '1/2', '1/4', '1/8', '1/16', '1/32'];

  return (
    <div className="rack-module p-3 flex flex-col">
      <ModuleTitle icon="fas fa-wave-square" title="Astral Pads" index={2} />
      <div className="flex flex-wrap gap-1 mb-2">
          {['Universe', 'Ocean', 'Desert', 'Harp', 'Piano'].map(p => <button key={p} onClick={() => setPadPreset(p as any)} className={`px-2 py-0.5 rounded text-[8px] font-black ${padPreset === p ? 'bg-sky-500 text-white led' : 'bg-slate-800'}`}>{p.toUpperCase()}</button>)}
      </div>
      <div className="flex gap-2 mb-2 items-center">
        <button onClick={() => setChordIsPlaying(!chordIsPlaying)} className={`flex-1 h-7 rounded text-[10px] font-black transition-colors ${chordIsPlaying ? 'bg-emerald-500 text-white led' : 'bg-slate-800'}`}>PROGRESSION</button>
        <select value={chordDuration} onChange={(e) => setChordDuration(e.target.value as any)} className="bg-slate-800 text-sky-400 text-[9px] rounded px-1 h-5 outline-none">{['1/4', '1/2', '1', '2', '4'].map(d => <option key={d} value={d}>{d} Lps</option>)}</select>
        <button onClick={handleMagicChords} disabled={isChordAiLoading} className={`w-7 h-7 rounded flex items-center justify-center bg-sky-600 text-white hover:bg-sky-500 transition-colors ${isChordAiLoading ? 'animate-spin opacity-50' : ''}`} title="Regenerate Fluctuating Chords"><i className="fas fa-wand-magic-sparkles text-[10px]"/></button>
      </div>
      <div className="flex-1 bg-black/30 p-1.5 rounded min-h-[60px] flex flex-col overflow-hidden border border-slate-800/50">
          <div className="flex-1 overflow-y-auto pr-1 flex flex-wrap content-start gap-1">
            {chords.map((c, i) => (
              <div key={i} className={`flex items-center bg-slate-800 rounded px-1 py-0.5 border border-slate-700 group/chord transition-all ${isPlaying && chordIsPlaying && (Math.floor(totalSteps / CHORD_DURATION_STEPS[chordDuration]) % chords.length === i) ? 'ring-1 ring-sky-500 bg-sky-900/20' : ''}`}>
                <select value={c} onChange={(e) => { const n = [...chords]; n[i] = e.target.value; setChords(n); }} className="bg-transparent text-[9px] text-sky-400 font-mono outline-none cursor-pointer">{Object.keys(CHORD_MAP).map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                <button onClick={() => { const n = [...chords]; n.splice(i, 1); setChords(n); }} className="ml-1 opacity-0 group-hover/chord:opacity-100 text-rose-500 hover:text-rose-400"><i className="fas fa-times text-[8px]" /></button>
              </div>
            ))}
            <button onClick={() => setChords([...chords, 'Cmaj7'])} className="w-8 h-6 flex items-center justify-center bg-sky-500/20 text-sky-400 rounded border border-dashed border-sky-500/50 transition-colors"><i className="fas fa-plus text-[8px]" /></button>
          </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mt-2 border-t border-slate-800 pt-3 px-1 bg-black/10 rounded-b pb-1 items-center">
          <Knob label="LPF" min={0} max={1} value={freqToLog(padParams.lpf)} onChange={(v) => setPadParams(p => ({...p, lpf: logToFreq(v)}))} unit="Hz" size="sm" />
          <Knob label="Reso" min={0.1} max={20} value={padParams.reso} onChange={(v) => setPadParams(p => ({...p, reso: v}))} size="sm" />
          
          <Knob label="RANGE" min={1} max={3} value={chordRange} onChange={(v) => setChordRange(Math.round(v))} size="sm" valueDisplay={(v) => `${Math.round(v)} Oct`} />
          <Knob label="RATE" min={0} max={5} value={arpRateValues.indexOf(arpSpeed)} onChange={(v) => setArpSpeed(arpRateValues[Math.round(v)])} size="sm" valueDisplay={(v) => chordIsTriplet ? `${arpRateValues[Math.round(v)]}T` : arpRateValues[Math.round(v)]} />
          
          <Knob label="Rev" min={0} max={1} value={padParams.reverb} onChange={(v) => setPadParams(p => ({...p, reverb: v}))} size="sm" />
          <Knob label="Echo" min={0} max={1} value={padParams.echo} onChange={(v) => setPadParams(p => ({...p, echo: v}))} size="sm" />
          
          <div className="flex flex-col items-center gap-1">
            <button onClick={() => setChordIsTriplet(!chordIsTriplet)} className={`w-5 h-5 rounded-full border transition-all flex items-center justify-center ${chordIsTriplet ? 'bg-sky-500 border-sky-400 led shadow-[0_0_5px_rgba(56,189,248,0.6)]' : 'bg-slate-800 border-slate-700 text-slate-600'}`} title="Triplet Timing Mode (2/3 Length)"><i className="fas fa-layer-group text-[8px] text-white" /></button>
            <span className="text-[6px] font-black text-slate-500 uppercase">TRP</span>
          </div>
      </div>
    </div>
  );
};

export default AstralPads;
