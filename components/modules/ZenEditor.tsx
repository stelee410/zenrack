import React, { useState, useEffect, useCallback, useRef } from 'react';
import ModuleTitle from '../ModuleTitle';

interface ZenEditorProps {
  zenText: string;
  bpm: number;
  isPlaying: boolean;
}

const ZenEditor: React.FC<ZenEditorProps> = ({ bpm, isPlaying }) => {
  const [isStrudelPlaying, setIsStrudelPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  // 向 iframe 发送消息
  const sendMessage = useCallback((type: string, data?: any) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type, data }, '*');
    }
  }, []);

  // 监听来自 iframe 的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 安全检查：可以添加 origin 检查
      // if (event.origin !== window.location.origin) return;

      const { type, playing } = event.data;

      switch (type) {
        case 'strudel-ready':
          setIsReady(true);
          // 编辑器就绪后，同步代码和BPM
          sendMessage('set-bpm', { bpm });
          break;

        case 'strudel-playing':
          setIsStrudelPlaying(playing === true);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [bpm, sendMessage]);

  // 当 BPM 变化时，同步到 iframe
  useEffect(() => {
    if (isReady) {
      sendMessage('set-bpm', { bpm });
    }
  }, [bpm, isReady, sendMessage]);

  // 播放 Strudel REPL
  const handlePlay = useCallback(() => {
    if (isReady) {
      sendMessage('play');
    }
  }, [isReady, sendMessage]);

  // 停止 Strudel REPL
  const handleStop = useCallback(() => {
    if (isReady) {
      sendMessage('stop');
    }
  }, [isReady, sendMessage]);

  // 重置代码
  const handleReset = useCallback(() => {
    if (isReady) {
      sendMessage('reset');
      sendMessage('set-bpm', { bpm });
    }
  }, [bpm, isReady, sendMessage]);

  return (
    <div className="col-span-2 rack-module p-0 flex flex-col relative animate-in fade-in slide-in-from-top-4 duration-500 overflow-hidden">
      <div className="flex justify-between items-center px-4 py-2 border-b border-slate-700/30 bg-slate-900/40">
        <ModuleTitle icon="fas fa-code" title="Strudel Live Engine" index={0} />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-black/40 border border-slate-800">
             <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Global Sync</span>
             <span className="text-[9px] font-mono text-sky-400 font-bold">{bpm} BPM</span>
             <button 
                onClick={handleReset}
                className="ml-2 w-4 h-4 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 hover:bg-sky-500 hover:text-white transition-all border border-sky-500/30"
                title="Reset Code & Sync"
              >
               <i className="fas fa-sync-alt text-[7px]"></i>
             </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePlay}
              disabled={!isReady || isStrudelPlaying}
              className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wide transition-all border ${
                !isReady || isStrudelPlaying 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 cursor-not-allowed' 
                  : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white border-emerald-500/30 hover:border-emerald-500'
              }`}
              title="播放 Strudel REPL"
            >
              <i className="fas fa-play text-[7px] mr-1"></i>
              播放
            </button>
            <button
              onClick={handleStop}
              disabled={!isReady || !isStrudelPlaying}
              className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wide transition-all border ${
                !isReady || !isStrudelPlaying 
                  ? 'bg-red-500/20 text-red-400 border-red-500/30 cursor-not-allowed' 
                  : 'bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white border-red-500/30 hover:border-red-500'
              }`}
              title="停止 Strudel REPL"
            >
              <i className="fas fa-stop text-[7px] mr-1"></i>
              停止
            </button>
          </div>
          <div className="flex gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${isPlaying ? 'bg-emerald-500 led-emerald animate-pulse' : 'bg-slate-700'}`}></div>
            <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${isReady ? 'bg-sky-500 led shadow-[0_0_5px_rgba(56,189,248,0.5)]' : 'bg-slate-700'}`}></div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 bg-black relative overflow-hidden" style={{ minHeight: 0 }}>
        <iframe
          ref={iframeRef}
          src="/strudel/index.html"
          className="w-full h-full border-0"
          style={{ 
            display: 'block',
            backgroundColor: '#000'
          }}
          title="Strudel REPL Editor"
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
            DSP: {isReady ? 'ACTIVE' : 'LOADING'}
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
