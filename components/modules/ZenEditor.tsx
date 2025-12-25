import React, { useState, useEffect, useCallback, useRef } from 'react';
import ModuleTitle from '../ModuleTitle';
import { generateStrudelCode } from '../../services/geminiService';

interface ZenEditorProps {
  zenText: string;
  bpm: number;
  isPlaying: boolean;
}

const ZenEditor: React.FC<ZenEditorProps> = ({ bpm, isPlaying }) => {
  const [isStrudelPlaying, setIsStrudelPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);
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

  // 获取当前代码
  const getCurrentCode = useCallback((): string => {
    if (!iframeRef.current) return '';

    try {
      // 首先尝试从编辑器直接获取
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (iframeDoc) {
        const codeContainer = iframeDoc.querySelector('#code') as HTMLElement;
        if (codeContainer) {
          const cmEditor = codeContainer.querySelector('.cm-editor') as HTMLElement;
          if (cmEditor) {
            const cmView = (cmEditor as any).cmView || 
                         (cmEditor as any).__cm_view ||
                         (cmEditor as any).view ||
                         (cmEditor as any).cm?.view;
            
            if (cmView && cmView.state && cmView.state.doc) {
              return cmView.state.doc.toString();
            }
            
            const cmContent = codeContainer.querySelector('.cm-content') as HTMLElement;
            if (cmContent) {
              return cmContent.innerText || cmContent.textContent || '';
            }
          }
        }
      }

      // 如果直接获取失败，从 URL 获取
      const src = iframe.src;
      const hashIndex = src.indexOf('#');
      
      if (hashIndex !== -1) {
        const hash = src.substring(hashIndex + 1);
        try {
          const urlDecoded = decodeURIComponent(hash);
          return atob(urlDecoded);
        } catch (e) {
          try {
            return atob(hash);
          } catch (e2) {
            return '';
          }
        }
      }
      
      return '';
    } catch (error) {
      console.error('Error getting current code:', error);
      return '';
    }
  }, []);

  // 通过 URL 更新代码（回退方法）
  const updateCodeViaUrl = useCallback((code: string): boolean => {
    if (!iframeRef.current) return false;

    try {
      const src = iframeRef.current.src;
      const baseUrl = src.split('#')[0];
      const base64Encoded = btoa(code);
      const urlEncoded = encodeURIComponent(base64Encoded);
      const newSrc = `${baseUrl}#${urlEncoded}`;
      
      iframeRef.current.src = '';
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = newSrc;
        }
      }, 0);
      
      return true;
    } catch (error) {
      console.error('Error updating code via URL:', error);
      return false;
    }
  }, []);

  // 更新整个代码
  const updateFullCode = useCallback((newCode: string): boolean => {
    if (!iframeRef.current) return false;

    try {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

      if (!iframeDoc) {
        // 回退到 URL 方法
        return updateCodeViaUrl(newCode);
      }

      const codeContainer = iframeDoc.querySelector('#code') as HTMLElement;
      if (!codeContainer) {
        return updateCodeViaUrl(newCode);
      }

      const cmEditor = codeContainer.querySelector('.cm-editor') as HTMLElement;
      if (cmEditor) {
        const cmView = (cmEditor as any).cmView || 
                     (cmEditor as any).__cm_view ||
                     (cmEditor as any).view ||
                     (cmEditor as any).cm?.view;
        
        if (cmView && cmView.state && cmView.dispatch) {
          const doc = cmView.state.doc;
          // 替换整个文档
          cmView.dispatch({
            changes: {
              from: 0,
              to: doc.length,
              insert: newCode
            }
          });
          return true;
        }
        
        // 如果找不到 view，尝试直接操作 contenteditable 元素
        const cmContent = codeContainer.querySelector('.cm-content') as HTMLElement;
        if (cmContent) {
          cmContent.textContent = newCode;
          cmContent.innerText = newCode;
          
          ['input', 'change', 'keyup', 'paste'].forEach(eventType => {
            cmContent.dispatchEvent(new Event(eventType, { bubbles: true }));
          });
          
          return true;
        }
      }

      return updateCodeViaUrl(newCode);
    } catch (error) {
      console.error('Error updating code:', error);
      return updateCodeViaUrl(newCode);
    }
  }, [updateCodeViaUrl]);

  // AI 生成代码
  const handleAiGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    try {
      const currentCode = getCurrentCode();
      const newCode = await generateStrudelCode(currentCode, aiPrompt);
      
      if (newCode) {
        // 确保保留 setcps，如果没有则添加
        const cps = (bpm / 240).toFixed(4);
        let finalCode = newCode;
        
        if (!newCode.includes('setcps')) {
          finalCode = `setcps(${cps})\n\n${newCode}`;
        } else {
          // 如果已经有 setcps，确保它使用当前的 BPM
          finalCode = newCode.replace(/setcps\s*\(\s*[^)]+\s*\)/gi, `setcps(${cps})`);
        }
        
        updateFullCode(finalCode);
        setAiPrompt('');
        setShowAiInput(false);
      }
    } catch (error) {
      console.error('Error generating code with AI:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [aiPrompt, bpm, getCurrentCode, updateFullCode]);

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
      <div className="flex flex-col border-b border-slate-700/30 bg-slate-900/40">
        <div className="flex justify-between items-center px-4 py-2">
          <ModuleTitle icon="fas fa-code" title="Strudel Live Engine" index={0} />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAiInput(!showAiInput)}
              className={`px-2 py-1 rounded text-[8px] font-bold transition-all border ${
                showAiInput 
                  ? 'bg-purple-500/30 text-purple-300 border-purple-500/50' 
                  : 'bg-black/40 text-purple-400 border-slate-800 hover:bg-purple-500/20 hover:border-purple-500/30'
              }`}
              title="AI Code Generator"
            >
              <i className="fas fa-sparkles mr-1"></i>AI
            </button>
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
        {showAiInput && (
          <div className="px-4 pb-2 border-t border-slate-700/30 bg-slate-900/60">
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="输入你的需求，例如：添加一个复杂的鼓节奏..."
                className="flex-1 px-2 py-1.5 text-[10px] bg-black/60 border border-slate-700 rounded text-slate-300 placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                disabled={isGenerating}
              />
              <button
                onClick={handleAiGenerate}
                disabled={isGenerating || !aiPrompt.trim()}
                className={`px-3 py-1.5 rounded text-[9px] font-bold transition-all border flex items-center gap-1.5 ${
                  isGenerating || !aiPrompt.trim()
                    ? 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed'
                    : 'bg-purple-500/30 text-purple-300 border-purple-500/50 hover:bg-purple-500/40 hover:border-purple-500/70'
                }`}
              >
                {isGenerating ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-magic"></i>
                    <span>生成</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
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
