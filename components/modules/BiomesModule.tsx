
import React from 'react';
import { Knob } from '../Knob';
import ModuleTitle from '../ModuleTitle';
import { audioEngine } from '../../services/AudioEngine';

interface BiomesModuleProps {
  envType: 'Forest' | 'Ocean' | 'Street' | 'White' | 'Pink' | 'None';
  setEnvType: React.Dispatch<React.SetStateAction<'Forest' | 'Ocean' | 'Street' | 'White' | 'Pink' | 'None'>>;
  envIsPlaying: boolean;
  setEnvIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  envParams: { level: number; reverb: number; echo: number };
  setEnvParams: React.Dispatch<React.SetStateAction<{ level: number; reverb: number; echo: number }>>;
  envUrlInput: string;
  setEnvUrlInput: React.Dispatch<React.SetStateAction<string>>;
  isEnvLoading: boolean;
  setIsEnvLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const BiomesModule: React.FC<BiomesModuleProps> = ({
  envType, setEnvType, envIsPlaying, setEnvIsPlaying,
  envParams, setEnvParams, envUrlInput, setEnvUrlInput,
  isEnvLoading, setIsEnvLoading
}) => {
  return (
    <div className="rack-module p-3 flex flex-col relative overflow-hidden">
      <ModuleTitle icon="fas fa-leaf" title="Biomes" index={3} />
      <div className="grid grid-cols-5 gap-1 mb-2">
          {['Forest', 'Ocean', 'Street', 'White', 'Pink'].map(t => (
            <button key={t} onClick={() => { setEnvType(t as any); setEnvIsPlaying(true); }} className={`py-1.5 rounded text-[7px] font-black flex flex-col items-center gap-1 border transition-all ${envType === t ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 led' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}><i className={`fas fa-${t === 'Forest' ? 'tree' : t === 'Ocean' ? 'water' : t === 'Street' ? 'city' : 'snowflake'} text-[8px]`} />{t.toUpperCase()}</button>
          ))}
      </div>
      <div className="flex-1 flex flex-col gap-2 overflow-hidden justify-center bg-black/30 p-2 rounded-md border border-slate-800/40 relative">
        {isEnvLoading && (<div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center z-10 backdrop-blur-[1px]"><div className="w-3 h-3 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" /></div>)}
        <button onClick={() => setEnvIsPlaying(!envIsPlaying)} className={`w-full py-1 rounded text-[9px] font-black transition-all ${envIsPlaying ? 'bg-emerald-500 text-white led' : 'bg-slate-800 text-slate-500'}`}>AMBIENCE {envIsPlaying ? 'STOP' : 'START'}</button>
        <div className="flex gap-1">
          <label className="flex-1 flex items-center justify-center h-6 rounded bg-slate-800 border border-slate-700 text-[7px] font-black cursor-pointer hover:bg-slate-700 transition-colors uppercase gap-1 px-1">FILE<input type="file" accept="audio/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setEnvType('None'); setEnvIsPlaying(true); setIsEnvLoading(true); audioEngine.loadEnvSound(file).finally(() => setIsEnvLoading(false)); } }} className="hidden" disabled={isEnvLoading} /></label>
          <form onSubmit={(e) => { e.preventDefault(); if (envUrlInput) { setEnvType('None'); setEnvIsPlaying(true); setIsEnvLoading(true); audioEngine.loadEnvSound(envUrlInput).catch(() => alert("URL Error")).finally(() => setIsEnvLoading(false)); } }} className="flex-[3] flex gap-1"><input type="text" value={envUrlInput} onChange={(e) => setEnvUrlInput(e.target.value)} placeholder="mp3/wav url..." className="flex-1 bg-black/60 border border-slate-800 text-slate-400 text-[8px] rounded px-2 font-mono outline-none focus:border-sky-500/50" disabled={isEnvLoading}/><button type="submit" disabled={isEnvLoading} className="w-6 h-6 flex items-center justify-center bg-slate-800 rounded border border-slate-700 text-sky-400 hover:text-sky-300"><i className="fas fa-link text-[8px]" /></button></form>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-800 mt-2">
          <Knob label="Level" min={0} max={1} value={envParams.level} onChange={(v) => setEnvParams(p => ({...p, level: v}))} size="sm" />
          <Knob label="Rev" min={0} max={1} value={envParams.reverb} onChange={(v) => setEnvParams(p => ({...p, reverb: v}))} size="sm" />
          <Knob label="Echo" min={0} max={1} value={envParams.echo} onChange={(v) => setEnvParams(p => ({...p, echo: v}))} size="sm" />
      </div>
    </div>
  );
};

export default BiomesModule;
