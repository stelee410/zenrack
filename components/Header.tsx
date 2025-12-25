
import React from 'react';
import { PRESETS } from '../data/constants';

interface HeaderProps {
  toggleViewMode: () => void;
  isPlaying: boolean;
  setIsPlaying: (val: boolean) => void;
  handleToggleRecord: () => void;
  isRecording: boolean;
  isEncoding: boolean;
  recFormat: 'webm' | 'wav';
  setRecFormat: (val: 'webm' | 'wav') => void;
  handlePanic: () => void;
  importPatch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  exportPatch: () => void;
  bpm: number;
  setBpm: (val: number) => void;
  globalAiPrompt: string;
  setGlobalAiPrompt: (val: string) => void;
  handleGlobalAiGenerate: () => void;
  autoPlayOnAi: boolean;
  setAutoPlayOnAi: (val: boolean) => void;
  isGlobalLoading: boolean;
}

const Header: React.FC<HeaderProps> = ({
  toggleViewMode, isPlaying, setIsPlaying, handleToggleRecord, isRecording, isEncoding,
  recFormat, setRecFormat, handlePanic, importPatch, exportPatch, bpm, setBpm,
  globalAiPrompt, setGlobalAiPrompt, handleGlobalAiGenerate, autoPlayOnAi, setAutoPlayOnAi, isGlobalLoading
}) => {
  return (
    <header className="h-10 shrink-0 flex items-center justify-between px-3 rack-module border-none !bg-slate-900/40">
      <div className="flex items-center gap-4">
        <h1 
          onDoubleClick={toggleViewMode} 
          className="font-black italic text-sky-400 text-sm tracking-tighter uppercase cursor-pointer select-none hover:text-sky-300 transition-colors"
          title="Double-click to Toggle Zen Editor"
        >
          ZenRack <span className="text-[8px] font-normal opacity-50 ml-1 lowercase tracking-normal">v5.6</span>
        </h1>
        <div className="flex items-center gap-1.5 border-r border-slate-700/50 pr-4">
          <button onClick={() => setIsPlaying(!isPlaying)} className={`w-8 h-6 rounded flex items-center justify-center transition-colors ${isPlaying ? 'bg-rose-500 text-white led' : 'bg-slate-700'}`} title="Play/Stop"><i className={`fas ${isPlaying ? 'fa-stop' : 'fa-play'} text-[10px]`}/></button>
          
          <div className="flex items-center gap-1 bg-slate-700 rounded pr-1 group">
             <button 
               onClick={handleToggleRecord} 
               disabled={isEncoding}
               className={`w-8 h-6 rounded flex items-center justify-center transition-all ${isRecording ? 'bg-rose-600 text-white led animate-pulse' : 'text-slate-400 hover:bg-slate-600'} ${isEncoding ? 'opacity-50 cursor-wait' : ''}`} 
               title={isEncoding ? "Encoding..." : `Record Output (${recFormat.toUpperCase()})`}
             >
               {isEncoding ? <i className="fas fa-spinner fa-spin text-[8px]"/> : <i className={`fas fa-circle text-[8px] ${isRecording ? 'text-white' : 'text-rose-500'}`}/>}
             </button>
             {!isRecording && (
               <select 
                 value={recFormat} 
                 onChange={(e) => setRecFormat(e.target.value as any)} 
                 className="bg-transparent text-[7px] font-black text-slate-400 outline-none cursor-pointer hover:text-white transition-colors uppercase"
               >
                 <option value="wav">WAV</option>
                 <option value="webm">WebM</option>
               </select>
             )}
          </div>

          <button onClick={handlePanic} className="w-8 h-6 rounded bg-orange-600 text-white flex items-center justify-center hover:bg-orange-500" title="Panic/Reset"><i className="fas fa-radiation text-[10px]"/></button>
        </div>
        
        <div className="flex items-center gap-2 border-r border-slate-700/50 pr-4">
          <label className="w-8 h-6 rounded bg-slate-800 text-slate-400 flex items-center justify-center cursor-pointer hover:bg-slate-700 transition-colors" title="Import Patch">
            <i className="fas fa-file-import text-[10px]"/><input type="file" accept=".json" onChange={importPatch} className="hidden" />
          </label>
          <button onClick={exportPatch} className="w-8 h-6 rounded bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-700 transition-colors" title="Export Patch"><i className="fas fa-file-export text-[10px]"/></button>
        </div>

        <div className="flex items-center gap-1.5 bg-black/40 px-2 rounded border border-slate-800 shrink-0">
           <span className="text-[10px] font-mono text-sky-500 w-8">{bpm}</span>
           <input type="range" min="40" max="220" value={bpm} onChange={(e) => setBpm(parseInt(e.target.value))} className="w-12 h-1 accent-sky-500" />
        </div>
      </div>

      <div className="flex items-center gap-2 h-full flex-1 justify-end ml-4 max-w-[850px]">
         <div className="flex items-center gap-1">
            {PRESETS.map((p) => (
              <button 
                key={p.label} 
                onClick={() => setGlobalAiPrompt(p.prompt)} 
                className="flex flex-col items-center justify-center w-[72px] h-8 rounded bg-slate-800/50 border border-slate-700 hover:border-sky-500 transition-all overflow-hidden group"
              >
                <i className={`fas ${p.icon} text-[8px] text-slate-500 group-hover:text-sky-400`}/>
                <span className="text-[6px] font-bold truncate w-full text-center px-0.5">{p.label}</span>
              </button>
            ))}
         </div>
         <input type="text" value={globalAiPrompt} onChange={(e) => setGlobalAiPrompt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleGlobalAiGenerate()} placeholder="AI Healing prompt..." className="flex-1 bg-black/60 border border-slate-700 text-sky-400 text-[10px] rounded px-3 py-1 outline-none font-mono" />
         
         <div className="flex items-center gap-1.5 ml-2">
           <button 
             onClick={() => setAutoPlayOnAi(!autoPlayOnAi)} 
             className={`w-7 h-7 rounded flex items-center justify-center transition-all ${autoPlayOnAi ? 'bg-sky-600/20 text-sky-400 border border-sky-500/50 shadow-[0_0_5px_rgba(56,189,248,0.3)]' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}
             title={autoPlayOnAi ? "AI Auto-Play ON" : "AI Auto-Play OFF"}
           >
             <i className={`fas ${autoPlayOnAi ? 'fa-play-circle' : 'fa-pause-circle'} text-[10px]`} />
           </button>
           <button onClick={() => handleGlobalAiGenerate()} disabled={isGlobalLoading} className={`px-3 h-7 rounded text-[9px] font-black transition-all ${isGlobalLoading ? 'bg-slate-800 text-slate-500' : 'bg-sky-600 text-white led'}`}>{isGlobalLoading ? 'GENERATING...' : 'AI PATCH'}</button>
         </div>
      </div>
    </header>
  );
};

export default Header;
