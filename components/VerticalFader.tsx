
import React from 'react';

const VerticalFader: React.FC<{
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  height?: string;
  color?: string;
  disabled?: boolean;
}> = React.memo(({ label, min, max, value, onChange, height = "h-16", color = "sky", disabled = false }) => (
  <div className={`flex flex-col items-center gap-0.5 group w-4 ${height} ${disabled ? 'opacity-20' : ''}`}>
    <div className={`relative flex-1 w-3 bg-[#0a0f1d] rounded-sm border border-slate-800 shadow-inner flex flex-col items-center py-1 overflow-hidden`}>
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="adsr-fader"
        style={{ WebkitAppearance: 'slider-vertical', height: '100%' } as any}
      />
    </div>
    <span className={`text-[6px] font-black text-slate-600 uppercase mt-0.5`}>{label}</span>
  </div>
));

export default VerticalFader;
