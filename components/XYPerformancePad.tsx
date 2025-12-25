
import React, { useEffect, useRef, useState } from 'react';
import { GeneratorParams } from '../types';

const XYPerformancePad: React.FC<{
  isOpen: boolean,
  onClose: () => void,
  onUpdate: (patch: Partial<GeneratorParams>) => void,
  params: GeneratorParams,
  title: string
}> = ({ isOpen, onClose, onUpdate, params, title }) => {
  if (!isOpen) return null;

  const padRef = useRef<HTMLDivElement>(null);
  const [isCtrlMode, setIsCtrlMode] = useState(false);
  const initialParamsRef = useRef<{ frequency: number; volume: number; harmonicsIntensity: number } | null>(null);
  const ctrlKeyPressedRef = useRef(false); // 防止重复触发

  // 保存打开 pad 时的初始参数
  useEffect(() => {
    if (isOpen && initialParamsRef.current === null) {
      initialParamsRef.current = {
        frequency: params.frequency,
        volume: params.volume,
        harmonicsIntensity: params.harmonicsIntensity
      };
    }
    // 当 pad 关闭时，重置初始参数引用
    if (!isOpen) {
      initialParamsRef.current = null;
    }
  }, [isOpen, params.frequency, params.volume, params.harmonicsIntensity]);

  // 处理 Ctrl 键切换模式
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      
      // 检测 Ctrl 键按下（防止重复触发）
      if ((e.key === 'Control' || e.ctrlKey) && !ctrlKeyPressedRef.current) {
        ctrlKeyPressedRef.current = true;
        
        // 切换 Ctrl 模式
        if (!isCtrlMode) {
          // 激活 Ctrl 模式：鼠标移动即可控制
          setIsCtrlMode(true);
        } else {
          // 关闭 Ctrl 模式：重置到初始值
          setIsCtrlMode(false);
          
          // 恢复初始位置
          if (initialParamsRef.current) {
            onUpdate({
              frequency: initialParamsRef.current.frequency,
              volume: initialParamsRef.current.volume,
              harmonicsIntensity: initialParamsRef.current.harmonicsIntensity
            });
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // 重置 Ctrl 键状态，允许下次按下时触发
      if (e.key === 'Control' || !e.ctrlKey) {
        ctrlKeyPressedRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onClose, onUpdate, isCtrlMode]);

  const handleInteraction = (clientX: number, clientY: number) => {
    if (!padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    
    let x = (clientX - rect.left) / rect.width;
    let y = 1 - (clientY - rect.top) / rect.height; // Invert Y

    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));

    // Map X to Pitch (log range 40Hz - 2000Hz)
    const minF = 40;
    const maxF = 2000;
    const freq = Math.pow(10, x * Math.log10(maxF / minF)) * minF;
    
    onUpdate({
      frequency: freq,
      volume: y,
      harmonicsIntensity: y * 0.75 
    });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    // 如果 Ctrl 模式激活，鼠标移动即可控制（不需要按下）
    if (isCtrlMode) {
      handleInteraction(e.clientX, e.clientY);
    } else if (e.buttons === 1) {
      // 普通模式：需要按住左键
      handleInteraction(e.clientX, e.clientY);
    }
  };

  const onMouseDown = (e: React.MouseEvent) => handleInteraction(e.clientX, e.clientY);

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.cancelable) e.preventDefault();
    handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
  };

  // Re-calculate X position for cursor
  const cursorX = (Math.log10(params.frequency / 40) / Math.log10(2000 / 40)) * 100;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4 sm:p-8 select-none overflow-hidden">
      <div className="w-full max-w-lg bg-slate-900 border border-sky-500/30 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <i className="fas fa-crosshairs animate-pulse text-lg"></i>
             </div>
             <div>
               <h2 className="text-sky-400 font-black tracking-[0.25em] uppercase text-xs leading-none">{title} PRECISION PAD</h2>
               <p className="text-[7px] text-slate-500 uppercase font-black mt-1.5 tracking-widest flex items-center gap-2">
                 <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                 {isCtrlMode ? 'FREE MOVE MODE' : 'ACTIVE EXPRESSION MODE'}
               </p>
             </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-800 text-slate-400 hover:bg-rose-500 hover:text-white transition-all group border border-slate-700 hover:border-rose-400"
            title="Close Pad (ESC)"
          >
            <i className="fas fa-times text-sm group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
        
        {/* Core Square Interaction Area */}
        <div className="p-4 bg-black/40">
          <div 
            ref={padRef}
            onMouseMove={onMouseMove}
            onMouseDown={onMouseDown}
            onTouchMove={onTouchMove}
            className="aspect-square w-full cursor-crosshair relative overflow-hidden bg-slate-950 border-2 border-slate-800 rounded-lg shadow-inner ring-1 ring-white/5"
            style={{ touchAction: 'none' }}
          >
            {/* Precision Grid System */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(90deg, #38bdf8 1px, transparent 1px)', backgroundSize: '5% 5%' }}></div>
            <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(90deg, #38bdf8 1px, transparent 1px)', backgroundSize: '20% 20%' }}></div>
            
            {/* Axis Centroids */}
            <div className="absolute top-1/2 w-full h-[1px] bg-sky-500/15 pointer-events-none"></div>
            <div className="absolute left-1/2 h-full w-[1px] bg-sky-500/15 pointer-events-none"></div>
            
            {/* Corner Crosshairs */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-sky-500/40 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-sky-500/40 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-sky-500/40 pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-sky-500/40 pointer-events-none"></div>

            {/* Coordinate Readout Top-Right */}
            <div className="absolute top-3 right-3 text-[7px] font-mono text-sky-500/40 uppercase tracking-tighter text-right pointer-events-none">
              <div>X_POS: {(cursorX/100).toFixed(4)}</div>
              <div>Y_POS: {params.volume.toFixed(4)}</div>
            </div>

            {/* Visual Cursor with Weighted Effect */}
            <div 
              className="absolute w-14 h-14 -ml-7 -mt-7 flex items-center justify-center pointer-events-none transition-all duration-150 ease-out"
              style={{ 
                left: `${cursorX}%`,
                bottom: `${params.volume * 100}%`,
              }}
            >
               {/* Pulse Core */}
               <div className="absolute inset-0 border border-sky-400/30 rounded-full animate-ping"></div>
               <div className="absolute inset-2 border-2 border-sky-400 rounded-full shadow-[0_0_25px_rgba(56,189,248,0.7)] bg-sky-500/10"></div>
               <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_12px_white] z-10"></div>
               
               {/* Precision Labels */}
               <div className="absolute top-full mt-6 flex flex-col items-center whitespace-nowrap bg-black/80 px-2 py-1 rounded border border-sky-500/20 backdrop-blur-sm shadow-xl">
                  <span className="text-[11px] font-mono font-black text-white drop-shadow-md">{Math.round(params.frequency)}<span className="text-[8px] ml-0.5 text-sky-400">Hz</span></span>
                  <div className="flex gap-2 mt-0.5">
                    <span className="text-[6px] font-mono text-slate-500 uppercase tracking-tighter">GAIN: {Math.round(params.volume * 100)}%</span>
                  </div>
               </div>
            </div>

            <div className="absolute bottom-3 left-3 pointer-events-none opacity-50 uppercase text-[7px] font-black tracking-widest text-slate-600 flex flex-col gap-0.5">
               <span>PITCH_X [40 - 2000Hz]</span>
               <span>GAIN_Y [0.0 - 1.0]</span>
            </div>

            {/* Ctrl 模式激活指示器 */}
            {isCtrlMode && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-sky-500/20 border border-sky-500/50 px-3 py-1.5 rounded backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></div>
                <span className="text-[7px] font-mono text-sky-400 uppercase tracking-wider">FREE MOVE</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6 bg-slate-900 flex justify-center border-t border-slate-800">
            <button 
              onClick={onClose}
              className="px-10 py-3 bg-slate-800 border border-slate-700 rounded-lg text-[9px] font-black tracking-[0.3em] text-slate-400 hover:text-sky-400 hover:border-sky-500/50 hover:bg-sky-500/5 transition-all uppercase flex items-center gap-3 group"
            >
              <i className="fas fa-sign-out-alt opacity-50 group-hover:translate-x-1 transition-transform" />
              Return to Rack
            </button>
        </div>
      </div>
    </div>
  );
};

export default XYPerformancePad;
