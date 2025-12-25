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

  // 尝试直接操作 iframe 内的编辑器（通过 #code 容器）
  const tryDirectEditorUpdate = useCallback((setcpsLine: string): boolean => {
    if (!iframeRef.current) return false;

    try {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

      if (!iframeDoc) {
        return false;
      }

      // 通过 #code 容器查找编辑器
      const codeContainer = iframeDoc.querySelector('#code') as HTMLElement;
      if (!codeContainer) {
        return false;
      }

      // 尝试通过 .cm-editor 访问 CodeMirror view
      const cmEditor = codeContainer.querySelector('.cm-editor') as HTMLElement;
      if (cmEditor) {
        // 尝试多种方式访问 CodeMirror view
        const cmView = (cmEditor as any).cmView || 
                     (cmEditor as any).__cm_view ||
                     (cmEditor as any).view ||
                     (cmEditor as any).cm?.view ||
                     (cmEditor.parentElement as any)?.cmView ||
                     (codeContainer as any).cmView;
        
        if (cmView && cmView.state && cmView.dispatch) {
          const doc = cmView.state.doc;
          const currentCode = doc.toString();
          
          // 从 setcpsLine 中提取新值（格式：setcps(0.1234)）
          const newValueMatch = setcpsLine.match(/setcps\s*\(\s*([^)]+)\s*\)/);
          if (!newValueMatch) return false;
          const newValue = newValueMatch[1];
          
          // 查找 setcps 的位置，只替换括号内的值
          const setcpsRegex = /setcps\s*\(\s*([^)]+)\s*\)/gi;
          const match = setcpsRegex.exec(currentCode);
          
          if (match) {
            // 找到 setcps，只替换括号内的值
            const fullMatch = match[0]; // 完整的 setcps(...)
            const oldValue = match[1]; // 括号内的旧值
            const matchStart = match.index;
            
            // 计算括号内值的精确位置
            const valueStart = matchStart + fullMatch.indexOf('(') + 1;
            const valueEnd = valueStart + oldValue.length;
            
            // 只替换括号内的值，保持括号和格式不变
            cmView.dispatch({
              changes: {
                from: valueStart,
                to: valueEnd,
                insert: newValue
              }
            });
            return true;
          } else {
            // 如果没有找到 setcps，在开头插入
            cmView.dispatch({
              changes: {
                from: 0,
                to: 0,
                insert: `${setcpsLine}\n\n`
              }
            });
            return true;
          }
        }
        
        // 如果找不到 view，尝试直接操作 contenteditable 元素
        const cmContent = codeContainer.querySelector('.cm-content') as HTMLElement;
        if (cmContent && cmContent.contentEditable === 'true') {
          const currentCode = cmContent.innerText || cmContent.textContent || '';
          
          // 从 setcpsLine 中提取新值
          const newValueMatch = setcpsLine.match(/setcps\s*\(\s*([^)]+)\s*\)/);
          if (!newValueMatch) return false;
          const newValue = newValueMatch[1];
          
          // 查找 setcps 的位置，只替换括号内的值
          const setcpsRegex = /setcps\s*\(\s*([^)]+)\s*\)/gi;
          const match = setcpsRegex.exec(currentCode);
          
          if (match) {
            // 找到 setcps，只替换括号内的值
            const fullMatch = match[0];
            const oldValue = match[1];
            const matchStart = match.index;
            
            // 计算括号内值的精确位置
            const valueStart = matchStart + fullMatch.indexOf('(') + 1;
            const valueEnd = valueStart + oldValue.length;
            
            // 只替换括号内的值，保持其他内容不变
            const beforeValue = currentCode.substring(0, valueStart);
            const afterValue = currentCode.substring(valueEnd);
            const updatedCode = beforeValue + newValue + afterValue;
            cmContent.textContent = updatedCode;
            cmContent.innerText = updatedCode;
            
            // 触发输入事件，让 CodeMirror 知道内容变化
            ['input', 'change', 'keyup', 'paste'].forEach(eventType => {
              cmContent.dispatchEvent(new Event(eventType, { bubbles: true }));
            });
            
            return true;
          } else {
            // 如果没有找到 setcps，在开头插入
            const updatedCode = `${setcpsLine}\n\n${currentCode}`;
            cmContent.textContent = updatedCode;
            cmContent.innerText = updatedCode;
            
            ['input', 'change', 'keyup', 'paste'].forEach(eventType => {
              cmContent.dispatchEvent(new Event(eventType, { bubbles: true }));
            });
            
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }, []);

  // 同步BPM到代码中的setcps
  const handleSyncBpm = useCallback(() => {
    if (!iframeRef.current) {
      console.warn('Strudel iframe not ready');
      return;
    }

    try {
      const cps = (bpm / 240).toFixed(4);
      const setcpsLine = `setcps(${cps})`;
      // 首先尝试直接操作编辑器
      if (tryDirectEditorUpdate(setcpsLine)) {
        return;
      }

      // 如果直接操作失败，回退到 URL 方法
      
      const src = iframeRef.current.src;
      const hashIndex = src.indexOf('#');
      let code = '';
      
      if (hashIndex !== -1) {
        const hash = src.substring(hashIndex + 1);
        try {
          const urlDecoded = decodeURIComponent(hash);
          code = atob(urlDecoded);
        } catch (e) {
          try {
            code = atob(hash);
          } catch (e2) {
            console.warn('Failed to decode code, using empty code');
            code = '';
          }
        }
      }

      // 更新或插入 setcps（只替换括号内的值）
      const setcpsRegex = /setcps\s*\(\s*([^)]+)\s*\)/gi;
      let updatedCode: string;
      
      if (code.trim()) {
        const match = setcpsRegex.exec(code);
        if (match) {
          // 找到 setcps，只替换括号内的值
          const fullMatch = match[0];
          const oldValue = match[1];
          const matchStart = match.index;
          
          // 计算括号内值的精确位置
          const valueStart = matchStart + fullMatch.indexOf('(') + 1;
          const valueEnd = valueStart + oldValue.length;
          
          // 只替换括号内的值，保持其他内容不变
          updatedCode = code.substring(0, valueStart) + cps + code.substring(valueEnd);
        } else {
          // 如果没有找到 setcps，在开头插入
          updatedCode = `${setcpsLine}\n\n${code.trim()}`;
        }
      } else {
        updatedCode = setcpsLine;
      }

      // 编码并更新 URL
      const base64Encoded = btoa(updatedCode);
      const urlEncoded = encodeURIComponent(base64Encoded);
      const baseUrl = src.split('#')[0];
      const newSrc = `${baseUrl}#${urlEncoded}`;
      
      // 更新 iframe src（这会触发 Strudel 重新加载代码）
      if (iframeRef.current) {
        iframeRef.current.src = '';
        setTimeout(() => {
          if (iframeRef.current) {
            iframeRef.current.src = newSrc;
          }
        }, 0);
      }
      
    } catch (error) {
      console.error('Error syncing BPM:', error);
    }
  }, [bpm, tryDirectEditorUpdate]);

  // 监听来自 iframe 的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 安全检查：可以添加 origin 检查
      // if (event.origin !== window.location.origin) return;

      const { type, playing, code } = event.data;

      switch (type) {
        case 'strudel-ready':
          setIsReady(true);
          break;

        case 'strudel-playing':
          setIsStrudelPlaying(playing === true);
          break;

        // 处理代码响应（如果 Strudel 支持）
        case 'code-response':
          // 这个会在 handleSyncBpm 中处理
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
