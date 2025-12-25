
import React from 'react';
import { DrumParams } from '../../types';
import { Knob } from '../Knob';
import ModuleTitle from '../ModuleTitle';

interface RhythmCoreProps {
  drumSeq: boolean[][];
  setDrumSeq: React.Dispatch<React.SetStateAction<boolean[][]>>;
  selectedDrumIdx: number;
  setSelectedDrumIdx: React.Dispatch<React.SetStateAction<number>>;
  drumSettings: DrumParams[];
  setDrumSettings: React.Dispatch<React.SetStateAction<DrumParams[]>>;
  drumEffects: { reverb: number; echo: number };
  setDrumEffects: React.Dispatch<React.SetStateAction<{ reverb: number; echo: number }>>;
  currentStep: number;
}

const RhythmCore: React.FC<RhythmCoreProps> = ({
  drumSeq, setDrumSeq, selectedDrumIdx, setSelectedDrumIdx,
  drumSettings, setDrumSettings, drumEffects, setDrumEffects, currentStep
}) => {
  
  const getDrumParamLabel = (drumIdx: number, paramIdx: number) => {
    const labels: Record<number, string[]> = {
      0: ['TONE', 'DECAY', '-'],
      1: ['TONE', 'SNAPPY', 'DECAY'],
      2: ['TONE', 'DECAY', '-'],
      3: ['TONE', 'DECAY', '-'],
    };
    return labels[drumIdx]?.[paramIdx] || `P${paramIdx + 1}`;
  };

  return (
    <div className="rack-module p-3 flex flex-col">
      <ModuleTitle icon="fas fa-drum" title="Rhythm Core" index={1} />
      <div className="flex-1 flex flex-col justify-center gap-1">
        {['BD', 'SD', 'CH', 'OH'].map((l, i) => (
          <div key={l} className="flex items-center gap-1">
            <button onClick={() => setSelectedDrumIdx(i)} className={`w-5 h-5 rounded text-[8px] font-black ${selectedDrumIdx === i ? 'bg-sky-500 text-white led' : 'bg-slate-900 border border-slate-800'}`}>{l}</button>
            <div className="flex-1 grid grid-cols-16 gap-0.5">
              {drumSeq[i].map((active, s) => <button key={s} onClick={() => { const n = drumSeq.map(r => [...r]); n[i][s] = !n[i][s]; setDrumSeq(n); }} className={`h-4 rounded-[1px] transition-all ${active ? (s%4===0 ? 'bg-cyan-400 led' : 'bg-sky-500') : (s%4===0 ? 'bg-slate-700' : 'bg-slate-900')} ${currentStep === s ? 'ring-1 ring-white/70 opacity-100' : 'opacity-90'}`} />)}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-6 gap-1 pt-2 border-t border-slate-800 mt-2 bg-black/10 p-1 rounded">
        {[0, 1, 2].map(pIdx => (
          <Knob 
            key={pIdx} 
            label={getDrumParamLabel(selectedDrumIdx, pIdx)} 
            min={0} max={1} 
            value={(drumSettings[selectedDrumIdx] as any)[`p${pIdx+1}`]} 
            onChange={(v) => { setDrumSettings(prev => { const n = [...prev]; (n[selectedDrumIdx] as any)[`p${pIdx+1}`] = v; return n; }); }} 
            size="sm"
          />
        ))}
        <Knob label="GAIN" min={0} max={1} value={drumSettings[selectedDrumIdx].volume} onChange={(v) => { setDrumSettings(prev => { const n = [...prev]; n[selectedDrumIdx].volume = v; return n; }); }} size="sm" />
        <Knob label="REV" min={0} max={1} value={drumEffects.reverb} onChange={(v) => setDrumEffects(p => ({...p, reverb: v}))} size="sm" />
        <Knob label="ECHO" min={0} max={1} value={drumEffects.echo} onChange={(v) => setDrumEffects(p => ({...p, echo: v}))} size="sm" />
      </div>
    </div>
  );
};

export default RhythmCore;
