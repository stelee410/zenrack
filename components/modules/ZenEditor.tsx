import React, { useState, useEffect, useCallback, useRef } from 'react';
import ModuleTitle from '../ModuleTitle';

// Fix: Extending the global JSX namespace to include the custom 'strudel-editor' element.
// We target both JSX and React.JSX to ensure compatibility across different TypeScript configurations.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'strudel-editor': any;
    }
  }
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'strudel-editor': any;
      }
    }
  }
}

interface ZenEditorProps {
  zenText: string;
  bpm: number;
  isPlaying: boolean;
}

const ZenEditor: React.FC<ZenEditorProps> = ({ bpm, isPlaying }) => {
  const [currentCode, setCurrentCode] = useState('');
  const editorRef = useRef<any>(null);

  const generateDefaultCode = useCallback((currentBpm: number) => {
    const cps = (currentBpm / 240).toFixed(4);
    return `// ZENRACK REBIRTH ENGINE
setcps(${cps})

stack(
  s("bd(3,8)").bank("RolandTR808").velocity(0.8),
  s("~ sd").bank("RolandTR808").gain(0.7).room(0.2),
  s("hh*8").bank("RolandTR808").gain(0.5).decay(0.1),
  s("[~ rim]*2").bank("RolandTR808").gain(0.6).room(0.5)
).room(0.3)`;
  }, []);

  useEffect(() => {
    const code = generateDefaultCode(bpm);
    setCurrentCode(code);
  }, [bpm, generateDefaultCode]);

  // 当外部播放状态改变时，尝试同步 Strudel
  useEffect(() => {
    if (editorRef.current) {
      if (isPlaying) {
        // Strudel editor handles its own internal play state, 
        // but we can ensure it has the latest code.
      }
    }
  }, [isPlaying]);

  return (
    <div className="col-span-2 rack-module p-0 flex flex-col relative animate-in fade-in slide-in-from-top-4 duration-500 overflow-hidden">
      <div className="flex justify-between items-center px-4 py-2 border-b border-slate-700/30 bg-slate-900/40">
        <ModuleTitle icon="fas fa-code" title="Strudel Live Engine" index={0} />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-black/40 border border-slate-800">
             <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Global Sync</span>
             <span className="text-[9px] font-mono text-sky-400 font-bold">{bpm} BPM</span>
             <button 
                onClick={() => setCurrentCode(generateDefaultCode(bpm))}
                className="ml-2 w-4 h-4 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 hover:bg-sky-500 hover:text-white transition-all border border-sky-500/30"
                title="Reset Code & Sync"
              >
               <i className="fas fa-sync-alt text-[7px]"></i>
             </button>
          </div>
          <div className="flex gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${isPlaying ? 'bg-emerald-500 led-emerald animate-pulse' : 'bg-slate-700'}`}></div>
            <div className="w-1.5 h-1.5 rounded-full bg-sky-500 led shadow-[0_0_5px_rgba(56,189,248,0.5)]"></div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 bg-black relative">
        <strudel-editor 
          ref={editorRef}
          code={currentCode}
          className="w-full h-full"
        />
        
        {/* Decorative Grid Overlays */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
        <div className="absolute inset-0 border border-white/5 pointer-events-none" />
      </div>
      
      <div className="px-4 py-1.5 bg-slate-900/60 border-t border-slate-800 flex justify-between items-center">
        <span className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em]">External Sequence Node</span>
        <div className="flex gap-4">
          <span className="text-[7px] font-bold text-slate-600 uppercase flex items-center gap-1">
            <i className="fas fa-microchip text-[6px] opacity-40"></i>
            DSP: ACTIVE
          </span>
          <span className="text-[7px] font-bold text-slate-600 uppercase flex items-center gap-1">
            <i className="fas fa-clock text-[6px] opacity-40"></i>
            CPS: {(bpm/240).toFixed(3)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ZenEditor;