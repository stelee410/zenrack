
import React from 'react';
import { GeneratorParams } from '../types';
import VerticalFader from './VerticalFader';
import LedMeter from './LedMeter';
import { Knob } from './Knob';

interface MixerPanelProps {
  mixerVolumes: number[];
  mixerPanning: number[];
  mixerMute: boolean[];
  mixerSolo: boolean[];
  masterVolume: number;
  masterReverb: number;
  isPlaying: boolean;
  genParams: GeneratorParams[];
  viewMode: 'rack' | 'editor';
  updateVol: (i: number, v: number) => void;
  updatePan: (i: number, v: number) => void;
  toggleMute: (i: number) => void;
  toggleSolo: (i: number) => void;
  setMasterVolume: (v: number) => void;
  setMasterReverb: (v: number) => void;
}

const MixerPanel: React.FC<MixerPanelProps> = React.memo(({ mixerVolumes, mixerPanning, mixerMute, mixerSolo, masterVolume, masterReverb, isPlaying, genParams, viewMode, updateVol, updatePan, toggleMute, toggleSolo, setMasterVolume, setMasterReverb }) => {
  const channelLabels = ['RHYTHM', 'PADS', 'BIOMES', 'DRONE-1', 'BINAUR-2', 'VISION'];

  return (
    <footer className="h-32 shrink-0 rack-module border-none !bg-slate-950/70 p-1 flex gap-1.5 shadow-[0_-8px_20px_rgba(0,0,0,0.4)]">
      <div className="flex-1 flex gap-1 items-stretch transition-all duration-500">
        {channelLabels.map((label, i) => {
          // Hide PADS channel (index 1) in editor mode
          if (viewMode === 'editor' && i === 1) return null;
          
          const isActive = isPlaying && (i < 3 ? true : (i < 5 ? genParams[i-3].active : true));
          const isMuted = mixerMute[i];
          const isSoloed = mixerSolo[i];
          return (
            <div key={i} className="flex-1 panel-inset rounded p-1.5 flex flex-row items-center gap-2 border border-slate-800/40 overflow-hidden relative animate-in zoom-in duration-300">
              <div className="flex items-center gap-1.5 h-full border-r border-slate-800/50 pr-1.5">
                <VerticalFader label="" min={0} max={1.5} value={mixerVolumes[i]} onChange={(v) => updateVol(i, v)} height="h-24" color={i < 3 ? "sky" : "emerald"} />
                <LedMeter isActive={isActive && !isMuted} volume={mixerVolumes[i]} />
              </div>
              <div className="flex flex-col items-center justify-between h-full flex-1 py-0.5 min-w-0">
                <span className="text-[6px] font-black text-slate-500 uppercase tracking-tighter truncate w-full text-center mb-0.5 border-b border-slate-800/50 pb-0.5">{label}</span>
                <Knob label="PAN" min={-1} max={1} value={mixerPanning[i]} onChange={(v) => updatePan(i, v)} size="sm" />
                <div className="flex flex-col gap-1 w-full mt-1 px-0.5">
                  <button onClick={() => toggleSolo(i)} className={`w-full text-[7px] font-black py-0.5 rounded transition-all border ${isSoloed ? 'bg-amber-500 border-amber-400 text-black led-amber' : 'bg-slate-900 border-slate-800 text-slate-600 hover:text-slate-400'}`}>S</button>
                  <button onClick={() => toggleMute(i)} className={`w-full text-[7px] font-black py-0.5 rounded transition-all border ${isMuted ? 'bg-rose-600 border-rose-500 text-white led-rose' : 'bg-slate-900 border-slate-800 text-slate-600 hover:text-slate-400'}`}>M</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 items-center pr-3 border-l border-slate-800/50 pl-3 shrink-0">
        <div className="flex flex-col items-center justify-center gap-1.5 bg-black/20 p-2 rounded-md border border-white/5">
          <Knob label="MASTER" min={0} max={1.5} value={masterVolume} onChange={setMasterVolume} size="sm" />
          <Knob label="REVERB" min={0} max={1} value={masterReverb} onChange={setMasterReverb} size="sm" />
        </div>
        <div className="w-12 h-full panel-inset rounded p-1.5 flex flex-col items-center justify-between border border-slate-700/30">
          <div className="flex gap-1.5 h-full items-stretch">
            <LedMeter isActive={isPlaying} volume={masterVolume} />
            <LedMeter isActive={isPlaying} volume={masterVolume} />
          </div>
          <span className="text-[6px] font-black text-slate-400 uppercase mt-1">MAIN</span>
        </div>
        <div className="flex flex-col h-full justify-center">
          <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3rem] rotate-90 origin-center whitespace-nowrap">OUT</span>
        </div>
      </div>
    </footer>
  );
});

export default MixerPanel;
