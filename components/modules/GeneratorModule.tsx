
import React, { useState } from 'react';
import { GeneratorParams, WaveformType, GateDuration } from '../../types';
import { Knob } from '../Knob';
import ModuleTitle from '../ModuleTitle';
import EnvelopeGraph from '../EnvelopeGraph';
import VerticalFader from '../VerticalFader';
import XYPerformancePad from '../XYPerformancePad';

interface GeneratorModuleProps {
  idx: number;
  params: GeneratorParams;
  effects: { reverb: number, echo: number };
  activeTab: 'OSC' | 'LFO' | 'ENV';
  onToggle: () => void;
  onUpdate: (patch: Partial<GeneratorParams>) => void;
  onSetTab: (tab: 'OSC' | 'LFO' | 'ENV') => void;
  onUpdateEffects: (patch: { reverb?: number, echo?: number }) => void;
}

const GeneratorModule: React.FC<GeneratorModuleProps> = React.memo(({ idx, params, effects, activeTab, onToggle, onUpdate, onSetTab, onUpdateEffects }) => {
  const isInfinite = params.gateDuration === 'infinite';
  const [isPerfOpen, setIsPerfOpen] = useState(false);

  const handleResetPitch = () => {
    onUpdate({ frequency: params.baseFrequency });
  };

  return (
    <div className="rack-module p-3 flex flex-col overflow-hidden">
      <div className="flex justify-between items-center h-6 mb-2 shrink-0">
        <div className="w-[45%]"><ModuleTitle icon="fas fa-bolt" title={`GEN-${idx+1}`} index={idx+4} /></div>
        <div className="flex bg-black/60 rounded-[3px] p-0.5 border border-slate-800/80 shadow-inner">
          {['OSC', 'LFO', 'ENV'].map(t => (
            <button key={t} onClick={() => onSetTab(t as any)} className={`px-1.5 h-3.5 rounded-[1.5px] text-[7px] font-bold transition-all ${activeTab === t ? 'bg-sky-500/80 text-white led' : 'text-slate-600 hover:text-slate-400'}`}>{t}</button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleResetPitch} className="w-5 h-4 rounded-[2px] bg-slate-800 text-sky-400/60 border border-slate-700 text-[6px] hover:text-sky-400 hover:border-sky-500/40 transition-all flex items-center justify-center" title="Reset Pitch to Patch Value"><i className="fas fa-rotate-left scale-90" /></button>
          <button onClick={() => setIsPerfOpen(true)} className="w-6 h-4 rounded-[2px] bg-slate-800 text-sky-400 border border-sky-500/30 text-[6px] font-black hover:bg-sky-500/10 transition-colors flex items-center justify-center" title="Performance Precision Pad"><i className="fas fa-fingerprint scale-75" /></button>
          <button onClick={onToggle} className={`w-8 h-4 rounded-[2px] text-[7px] font-black transition-all ${params.active ? 'bg-sky-500 text-white led shadow-sky-500/50' : 'bg-slate-800 text-slate-500'}`}>{params.active ? 'ON' : 'OFF'}</button>
        </div>
      </div>

      <div className="flex-1 panel-inset rounded-sm border border-slate-800/40 p-2 overflow-hidden flex flex-col min-h-0">
        {activeTab === 'OSC' && (
          <div className="flex flex-col gap-2 h-full">
            <div className="flex flex-row items-center justify-between gap-2">
              <div className="grid grid-cols-2 gap-1 w-20 shrink-0">
                {['sine', 'square', 'sawtooth', 'triangle'].map(w => (
                  <button key={w} onClick={() => onUpdate({ waveform: w as WaveformType })} className={`h-4 rounded-[1.5px] flex items-center justify-center border text-[6px] font-bold transition-all ${params.waveform === w ? 'bg-sky-500 border-sky-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-700 hover:text-slate-500'}`}>{w.slice(0,3).toUpperCase()}</button>
                ))}
              </div>
              {params.waveform === 'sawtooth' && (
                <button onClick={() => onUpdate({ multiSaw: !params.multiSaw })} className={`h-4 px-2 rounded-[1.5px] flex items-center justify-center border text-[6px] font-bold transition-all ${params.multiSaw ? 'bg-purple-500 border-purple-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-700 hover:text-slate-500'}`}>M-SAW</button>
              )}
            </div>
            <div className="flex-1 flex flex-row items-center justify-around flex-wrap gap-2">
              <Knob label="Pitch" min={20} max={1000} value={params.frequency} onChange={(v) => onUpdate({ frequency: v, baseFrequency: v })} unit="Hz" size="sm" />
              <Knob label="Bin" min={0} max={20} value={params.binauralBeat} onChange={(v) => onUpdate({ binauralBeat: v })} unit="Hz" size="sm" />
              <Knob label="Harmon" min={0} max={1} value={params.harmonicsIntensity} onChange={(v) => onUpdate({ harmonicsIntensity: v })} size="sm" />
              {params.waveform === 'square' && (
                <Knob label="PW" min={0} max={1} value={params.pulseWidth} onChange={(v) => onUpdate({ pulseWidth: v })} size="sm" />
              )}
              <Knob label="5th" min={0} max={1} value={params.fifthIntensity} onChange={(v) => onUpdate({ fifthIntensity: v })} size="sm" />
              <Knob label="8ve" min={0} max={1} value={params.octaveIntensity} onChange={(v) => onUpdate({ octaveIntensity: v })} size="sm" />
            </div>
          </div>
        )}

        {activeTab === 'LFO' && (
          <div className="flex flex-row items-center justify-between gap-2 h-full">
            <div className="flex flex-col gap-1 w-20 shrink-0">
              <div className="grid grid-cols-2 gap-0.5">
                {['sine', 'square', 'sawtooth', 'triangle'].map(w => (
                  <button key={w} onClick={() => onUpdate({ lfo: { ...params.lfo, waveform: w as WaveformType } })} className={`h-3.5 rounded-[1px] flex items-center justify-center border text-[5px] font-bold transition-all ${params.lfo.waveform === w ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-700'}`}>{w.slice(0,3).toUpperCase()}</button>
                ))}
              </div>
              <button onClick={() => onUpdate({ lfo: { ...params.lfo, active: !params.lfo.active } })} className={`w-full text-[6px] font-bold py-0.5 rounded border transition-all ${params.lfo.active ? 'bg-emerald-600/60 text-white' : 'bg-slate-800 border-slate-700 text-slate-600'}`}>{params.lfo.active ? 'ON' : 'OFF'}</button>
              <button onClick={() => onUpdate({ lfo: { ...params.lfo, isSynced: !params.lfo.isSynced } })} className={`w-full text-[6px] font-bold py-0.5 rounded border transition-all ${params.lfo.isSynced ? 'bg-sky-600/60 text-white' : 'bg-slate-800 border-slate-700 text-slate-600'}`}>{params.lfo.isSynced ? 'BPM' : 'Hz'}</button>
            </div>
            <div className="flex-1 flex flex-row items-center justify-around">
              <Knob label="Rate" min={0.01} max={params.lfo.isSynced ? 20 : 800} value={params.lfo.rate} onChange={(v) => onUpdate({ lfo: { ...params.lfo, rate: v } })} unit={params.lfo.isSynced ? "" : "Hz"} size="sm" />
              <Knob label="Depth" min={0} max={500} value={params.lfo.depth} onChange={(v) => onUpdate({ lfo: { ...params.lfo, depth: v } })} size="sm" />
            </div>
          </div>
        )}

        {activeTab === 'ENV' && (
          <div className="flex flex-row items-center justify-between gap-3 h-full overflow-hidden">
            <div className="flex-1 h-full py-1"><EnvelopeGraph adsr={params.adsr} /></div>
            <div className="flex gap-1 shrink-0 items-stretch h-full py-0.5">
              {['attack', 'decay', 'sustain', 'release'].map(key => (
                <VerticalFader key={key} label={key[0].toUpperCase()} min={0.01} max={key === 'release' ? 4 : 2} value={(params.adsr as any)[key]} onChange={(v) => onUpdate({ adsr: { ...params.adsr, [key]: v } })} height="h-full" disabled={isInfinite} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between h-14 shrink-0">
        <div className="flex flex-col gap-1">
          <span className="text-[7px] font-black text-slate-500 uppercase tracking-wider">Play Loop</span>
          <select value={params.gateDuration} onChange={(e) => onUpdate({ gateDuration: e.target.value as GateDuration })} className="bg-black/40 border border-slate-800 text-sky-400 text-[8px] rounded h-5 outline-none font-mono px-1">
            {['1/2', '1', '2', '4', 'infinite'].map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
          </select>
        </div>
        <div className="flex gap-10 shrink-0 px-2 items-center">
          <Knob label="Gain" min={0} max={1} value={params.volume} onChange={(v) => onUpdate({ volume: v })} size="sm" />
          <Knob label="Rev" min={0} max={1} value={effects.reverb} onChange={(v) => onUpdateEffects({ reverb: v })} size="sm" />
          <Knob label="Echo" min={0} max={1} value={effects.echo} onChange={(v) => onUpdateEffects({ echo: v })} size="sm" />
        </div>
      </div>

      <XYPerformancePad isOpen={isPerfOpen} onClose={() => setIsPerfOpen(false)} onUpdate={onUpdate} params={params} title={`GEN-${idx+1}`} />
    </div>
  );
});

export default GeneratorModule;
