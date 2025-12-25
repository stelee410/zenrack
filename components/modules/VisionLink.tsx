
import React, { useRef, useEffect, useState } from 'react';
import ModuleTitle from '../ModuleTitle';
import { Knob } from '../Knob';

interface VisionLinkProps {
  onModulate: (motion: { x: number, y: number, intensity: number }) => void;
  active: boolean;
  onToggle: (state: boolean) => void;
}

const VisionLink: React.FC<VisionLinkProps> = ({ onModulate, active, onToggle }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [smoothing, setSmoothing] = useState(0.85);
  const [sensitivity, setSensitivity] = useState(0.5);

  const prevFrame = useRef<Uint8ClampedArray | null>(null);
  const smoothedValue = useRef({ x: 0.5, y: 0.5, intensity: 0 });

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
      }
      setHasPermission(true);
      onToggle(true);
    } catch (err) {
      console.error("Camera access denied", err);
      alert("Please allow camera access to use the Vision Link module.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setHasPermission(false);
    onToggle(false);
  };

  useEffect(() => {
    let animationId: number;
    const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true });

    const process = () => {
      if (!active || !videoRef.current || !ctx || !canvasRef.current) {
        animationId = requestAnimationFrame(process);
        return;
      }

      ctx.drawImage(videoRef.current, 0, 0, 80, 60);
      const frame = ctx.getImageData(0, 0, 80, 60);
      const data = frame.data;

      if (prevFrame.current) {
        let totalDiff = 0;
        let avgX = 0;
        let avgY = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 4) {
          const diff = Math.abs(data[i] - prevFrame.current[i]);
          if (diff > (1.0 - sensitivity) * 100) {
            totalDiff += diff;
            const px = (i / 4) % 80;
            const py = Math.floor((i / 4) / 80);
            avgX += px;
            avgY += py;
            count++;
          }
        }

        if (count > 0) {
          const intensity = Math.min(1, totalDiff / (80 * 60 * 50));
          const targetX = (avgX / count) / 80;
          const targetY = 1 - (avgY / count) / 60;

          // Apply smoothing (Leaky Integrator)
          smoothedValue.current.x = smoothedValue.current.x * smoothing + targetX * (1 - smoothing);
          smoothedValue.current.y = smoothedValue.current.y * smoothing + targetY * (1 - smoothing);
          smoothedValue.current.intensity = smoothedValue.current.intensity * smoothing + intensity * (1 - smoothing);

          onModulate(smoothedValue.current);
        } else {
          smoothedValue.current.intensity *= smoothing;
          onModulate(smoothedValue.current);
        }
      }

      prevFrame.current = new Uint8ClampedArray(data);
      animationId = requestAnimationFrame(process);
    };

    if (active) {
      animationId = requestAnimationFrame(process);
    }

    return () => cancelAnimationFrame(animationId);
  }, [active, sensitivity, smoothing]);

  return (
    <div className="rack-module p-3 flex flex-col relative overflow-hidden">
      <ModuleTitle icon="fas fa-eye" title="Vision Link" index={6} />
      
      <div className="flex-1 flex flex-col items-center justify-center gap-2 mt-2">
        <div className="relative w-24 h-24 rounded-full bg-black border-2 border-slate-800 shadow-inner overflow-hidden flex items-center justify-center group">
          {active ? (
            <>
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale scale-x-[-1]" />
              <canvas ref={canvasRef} width="80" height="60" className="hidden" />
              {/* Scanline Effect */}
              <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }}></div>
              {/* Pulse Ring */}
              <div 
                className="absolute inset-0 rounded-full border-2 border-sky-400/40 transition-transform duration-75"
                style={{ transform: `scale(${1 + smoothedValue.current.intensity * 0.5})`, opacity: smoothedValue.current.intensity }}
              />
            </>
          ) : (
            <div className="text-slate-700 flex flex-col items-center gap-1">
              <i className="fas fa-video-slash text-xl mb-1 opacity-20"></i>
              <span className="text-[6px] font-black uppercase tracking-widest">Awaiting Link</span>
            </div>
          )}
          
          <button 
            onClick={active ? stopCamera : startCamera}
            className="absolute bottom-1 px-2 py-0.5 bg-sky-500 text-white text-[7px] font-black rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            {active ? 'DISCONNECT' : 'CONNECT'}
          </button>
        </div>

        <div className="w-full bg-black/40 rounded p-1 border border-slate-800/50">
           <div className="flex justify-between text-[6px] font-black text-slate-500 uppercase px-1 mb-1">
              <span>Motion CV Out</span>
              <span className="text-sky-400">{Math.round(smoothedValue.current.intensity * 100)}%</span>
           </div>
           <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-sky-500 transition-all duration-75" 
                style={{ width: `${smoothedValue.current.intensity * 100}%` }}
              />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-800 mt-2 bg-black/10 p-1 rounded">
        <Knob label="SENS" min={0.1} max={0.9} value={sensitivity} onChange={setSensitivity} size="sm" />
        <Knob label="SMOOTH" min={0.5} max={0.99} value={smoothing} onChange={setSmoothing} size="sm" />
        <div className="flex flex-col items-center gap-1">
           <div className={`w-6 h-6 rounded flex items-center justify-center transition-all ${active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 led-emerald' : 'bg-slate-800 text-slate-600 border border-slate-700'}`}>
              <i className={`fas fa-link text-[8px] ${active ? 'animate-pulse' : ''}`} />
           </div>
           <span className="text-[6px] font-black text-slate-600 uppercase">CV LINK</span>
        </div>
      </div>
    </div>
  );
};

export default VisionLink;
