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

  // 同步BPM到代码中的setcps
  const handleSyncBpm = useCallback(() => {
    if (!iframeRef.current) return;

    try {
      let currentHash = '';
      
      // 尝试从iframe的location获取hash
      try {
        const iframeWindow = iframeRef.current.contentWindow;
        if (iframeWindow && iframeWindow.location) {
          currentHash = iframeWindow.location.hash || '';
        }
      } catch (e) {
        // 如果无法访问iframe location（跨域限制），从src属性中提取
        const src = iframeRef.current.src;
        const hashIndex = src.indexOf('#');
        if (hashIndex !== -1) {
          currentHash = src.substring(hashIndex);
        }
      }
      
      // 解码base64代码
      let code = '';
      if (currentHash && currentHash.length > 1) {
        // 去掉#号，然后URL解码再base64解码
        const encoded = currentHash.substring(1); // 去掉#
        try {
          const urlDecoded = decodeURIComponent(encoded);
          code = atob(urlDecoded);
        } catch (e) {
          // 如果URL解码失败，直接尝试base64解码
          try {
            code = atob(encoded);
          } catch (e2) {
            console.error('Failed to decode code from URL:', e2);
            // 如果解码失败，使用空代码
            code = '';
          }
        }
      }

      // 计算新的CPS值
      const cps = (bpm / 240).toFixed(4);
      const setcpsRegex = /setcps\s*\(\s*[^)]+\s*\)/gi;
      
      // 处理代码
      let updatedCode: string;
      if (code.trim()) {
        if (setcpsRegex.test(code)) {
          // 如果存在setcps，替换它
          updatedCode = code.replace(setcpsRegex, `setcps(${cps})`);
        } else {
          // 如果不存在，在代码开头添加setcps
          updatedCode = `setcps(${cps})\n\n${code.trim()}`;
        }
      } else {
        // 如果代码为空，创建一个包含setcps的默认代码
        updatedCode = `setcps(${cps})`;
      }

      // base64编码并URL编码
      const base64Encoded = btoa(updatedCode);
      const urlEncoded = encodeURIComponent(base64Encoded);
      
      // 更新iframe的src
      const currentSrc = iframeRef.current.src;
      const baseUrl = currentSrc.split('#')[0]; // 获取基础URL（去掉hash）
      const newSrc = `${baseUrl}#${urlEncoded}`;
      
      // 更新iframe的src
      iframeRef.current.src = newSrc;
    } catch (error) {
      console.error('Error syncing BPM:', error);
    }
  }, [bpm]);

  // 监听来自 iframe 的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 安全检查：可以添加 origin 检查
      // if (event.origin !== window.location.origin) return;

      const { type, playing } = event.data;

      switch (type) {
        case 'strudel-ready':
          setIsReady(true);
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
  }, []);

  return (
    <div className="col-span-2 rack-module p-0 flex flex-col relative animate-in fade-in slide-in-from-top-4 duration-500 overflow-hidden">
      <div className="flex justify-between items-center px-4 py-2 border-b border-slate-700/30 bg-slate-900/40">
        <ModuleTitle icon="fas fa-code" title="Strudel Live Engine" index={0} />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-black/40 border border-slate-800">
             <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Global Sync</span>
             <span className="text-[9px] font-mono text-sky-400 font-bold">{bpm} BPM</span>
             <button 
                onClick={handleSyncBpm}
                className="ml-2 w-4 h-4 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 hover:bg-sky-500 hover:text-white transition-all border border-sky-500/30"
                title="Sync BPM to Code (setcps)"
              >
               <i className="fas fa-sync-alt text-[7px]"></i>
             </button>
          </div>
          <div className="flex gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${isPlaying ? 'bg-emerald-500 led-emerald animate-pulse' : 'bg-slate-700'}`}></div>
            <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${isReady ? 'bg-sky-500 led shadow-[0_0_5px_rgba(56,189,248,0.5)]' : 'bg-slate-700'}`}></div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 bg-black relative overflow-hidden zen-editor-iframe-container" style={{ minHeight: 0 }}>
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
        <div className="flex gap-4 items-center">
          <span className="text-[7px] font-bold text-slate-600 uppercase flex items-center gap-1">
            <i className="fas fa-microchip text-[6px] opacity-40"></i>
            DSP: {isReady ? 'ACTIVE' : 'LOADING'}
          </span>
          <div className="flex items-center gap-2 px-2 py-1 rounded bg-sky-500/20 border border-sky-500/40 shadow-[0_0_8px_rgba(56,189,248,0.3)]">
            <i className="fas fa-clock text-[8px] text-sky-400"></i>
            <span className="text-[11px] font-mono font-bold text-sky-300 tracking-wider">
              CPS: {(bpm/240).toFixed(3)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZenEditor;
