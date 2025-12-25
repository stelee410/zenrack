
import React, { useState, useEffect } from 'react';

const LedMeter: React.FC<{ isActive: boolean, volume: number }> = React.memo(({ isActive, volume }) => {
  const segments = 10;
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setActiveCount(0);
      return;
    }
    const interval = setInterval(() => {
      const base = Math.min(10, volume * 10);
      const jitter = (Math.random() - 0.5) * 2;
      setActiveCount(Math.max(0, Math.min(10, Math.floor(base + jitter))));
    }, 80);
    return () => clearInterval(interval);
  }, [isActive, volume]);
  
  return (
    <div className="flex flex-col gap-[2px] w-1.5 h-full justify-end py-0.5">
      {Array.from({ length: segments }).map((_, i) => {
        const index = segments - 1 - i;
        const isOn = index < activeCount;
        let colorClass = "bg-slate-900/50";
        if (isOn) {
          if (index > 8) colorClass = "bg-rose-500 led-rose";
          else if (index > 7) colorClass = "bg-amber-400 led-amber";
          else colorClass = "bg-emerald-500 led-emerald";
        }
        return <div key={i} className={`w-full flex-1 rounded-[1px] transition-colors duration-100 ${colorClass}`} />;
      })}
    </div>
  );
});

export default LedMeter;
