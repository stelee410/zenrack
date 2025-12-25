import React, { useState, useEffect, useRef } from 'react';

interface KnobProps {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (val: number) => void;
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
  valueDisplay?: (val: number) => string;
}

export const Knob: React.FC<KnobProps> = ({ label, min, max, value, onChange, unit = '', size = 'md', valueDisplay }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const startY = useRef(0);
  const startValue = useRef(0);
  const knobRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sizeClass = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-14 h-14' : 'w-10 h-10';
  
  // Calculate rotation (from -135 to 135 degrees)
  const rotation = ((value - min) / (max - min)) * 270 - 135;

  // Use a passive: false listener for the wheel to ensure e.preventDefault() works
  useEffect(() => {
    const el = knobRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (isEditing) return;
      e.preventDefault();
      
      const range = max - min;
      // Adjust sensitivity based on range size to ensure discrete knobs (like 1-3) feel responsive
      const sensitivity = range < 10 ? 20 : 100;
      const step = range / sensitivity;
      const direction = e.deltaY < 0 ? 1 : -1;
      
      const newValue = Math.min(max, Math.max(min, value + direction * step));
      if (newValue !== value) {
        onChange(newValue);
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [value, min, max, onChange, isEditing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    setIsDragging(true);
    startY.current = e.clientY;
    startValue.current = value;
    e.preventDefault();
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
    if (unit === 'Hz' && min === 0 && max === 1) {
      const freq = Math.pow(10, value * Math.log10(20000 / 20)) * 20;
      setInputValue(Math.round(freq).toString());
    } else {
      setInputValue(value.toFixed(2).replace(/\.?0+$/, ''));
    }
  };

  const commitValue = () => {
    let parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      if (unit === 'Hz' && min === 0 && max === 1) {
        const logVal = Math.log10(Math.max(20, Math.min(20000, parsed)) / 20) / Math.log10(20000 / 20);
        onChange(logVal);
      } else {
        const clamped = Math.min(max, Math.max(min, parsed));
        onChange(clamped);
      }
    }
    setIsEditing(false);
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaPx = startY.current - e.clientY;
      const range = max - min;
      // Higher sensitivity for small ranges to avoid "stuck" feeling due to rounding
      const sensitivity = range < 10 ? 100 : 200; 
      const newValue = Math.min(max, Math.max(min, startValue.current + (deltaPx / sensitivity) * range));
      onChange(newValue);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
    } else {
      document.body.style.cursor = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isDragging, min, max, onChange]);

  const getDisplayValue = () => {
    if (valueDisplay) return valueDisplay(value);
    if (unit === 'Hz' && min === 0 && max === 1) {
      const freq = Math.pow(10, value * Math.log10(20000 / 20)) * 20;
      return freq > 1000 ? (freq / 1000).toFixed(1) + 'k' : Math.round(freq);
    }
    return max > 10 ? Math.round(value).toString() : (Math.round(value * 10) / 10).toString();
  };

  return (
    <div className="flex flex-col items-center select-none group" onDoubleClick={handleDoubleClick}>
      <div 
        ref={knobRef}
        className={`${sizeClass} rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-600 relative cursor-pointer active:cursor-ns-resize shadow-lg flex items-center justify-center transition-shadow hover:shadow-sky-500/10`}
        onMouseDown={handleMouseDown}
      >
        <div 
          className="absolute w-0.5 h-1/2 bg-sky-400 rounded-full origin-bottom bottom-1/2 transition-transform duration-75"
          style={{ transform: `rotate(${rotation}deg)`, visibility: isEditing ? 'hidden' : 'visible' }}
        />
        <div className="w-3/4 h-3/4 bg-slate-800 rounded-full shadow-inner border border-slate-700/50 flex items-center justify-center">
           {isEditing ? (
             <input
               ref={inputRef}
               type="text"
               value={inputValue}
               onChange={(e) => setInputValue(e.target.value)}
               onBlur={commitValue}
               onKeyDown={(e) => {
                 if (e.key === 'Enter') commitValue();
                 if (e.key === 'Escape') setIsEditing(false);
               }}
               className="w-full bg-transparent text-center text-[8px] font-mono font-bold text-sky-400 outline-none"
             />
           ) : (
             <div className="w-1 h-1 bg-slate-900 rounded-full opacity-50" />
           )}
        </div>
      </div>
      
      <div className="mt-1 flex flex-col items-center leading-none">
        <span className="text-[8px] uppercase font-black text-slate-500 tracking-tighter mb-0.5 whitespace-nowrap">{label}</span>
        <span className="text-[8px] text-sky-400/80 font-mono font-bold h-3">
          {!isEditing && (
            <>
              {getDisplayValue()}{!valueDisplay ? unit : ''}
            </>
          )}
        </span>
      </div>
    </div>
  );
};
