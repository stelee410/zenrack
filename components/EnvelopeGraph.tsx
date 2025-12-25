
import React from 'react';
import { ADSRConfig } from '../types';

const EnvelopeGraph: React.FC<{ adsr: ADSRConfig }> = React.memo(({ adsr }) => {
  const { attack, decay, sustain, release } = adsr;
  const aW = (attack / 2) * 25;
  const dW = (decay / 2) * 25;
  const rW = (release / 4) * 25;
  const sH = 30 - (sustain * 20 + 5); 
  const path = `M 0 28 L ${aW} 5 L ${aW + dW} ${sH} L ${75} ${sH} L ${75 + rW} 28`;

  return (
    <div className="w-full h-full bg-black/40 rounded border border-slate-800/50 relative overflow-hidden">
      <svg viewBox="0 0 100 30" className="w-full h-full" preserveAspectRatio="none">
        <path d={path} fill="none" stroke="#38bdf8" strokeWidth="0.8" strokeLinejoin="round" className="drop-shadow-[0_0_1px_rgba(56,189,248,0.5)]" />
        <line x1="0" y1="28" x2="100" y2="28" stroke="#1e293b" strokeWidth="0.5" />
      </svg>
    </div>
  );
});

export default EnvelopeGraph;
