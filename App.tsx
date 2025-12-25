
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { audioEngine } from './services/AudioEngine';
import { generateHealingChords, generateSynthConfig } from './services/geminiService';
import { GeneratorParams, PadPreset, DrumParams, ChordDuration, ArpSpeed } from './types';
import { CHORD_MAP, ENV_SOUNDS, CHORD_DURATION_STEPS, MODULE_NAMES } from './data/constants';

// Imported Components
import Header from './components/Header';
import RhythmCore from './components/modules/RhythmCore';
import AstralPads from './components/modules/AstralPads';
import ZenEditor from './components/modules/ZenEditor';
import BiomesModule from './components/modules/BiomesModule';
import GeneratorModule from './components/modules/GeneratorModule';
import MixerPanel from './components/MixerPanel';

type RecordingFormat = 'webm' | 'wav';

const App: React.FC = () => {
  const [isStarted, setIsStarted] = useState(false);
  const [bpm, setBpm] = useState(80);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recFormat, setRecFormat] = useState<RecordingFormat>('wav');
  const [isEncoding, setIsEncoding] = useState(false);
  const [viewMode, setViewMode] = useState<'rack' | 'editor'>('rack');
  const [zenText, setZenText] = useState('');
  
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [globalAiPrompt, setGlobalAiPrompt] = useState('');
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [isChordAiLoading, setIsChordAiLoading] = useState(false);
  const [autoPlayOnAi, setAutoPlayOnAi] = useState(true);

  // Module States
  const [drumSeq, setDrumSeq] = useState<boolean[][]>(Array(4).fill(0).map(() => Array(16).fill(false)));
  const [selectedDrumIdx, setSelectedDrumIdx] = useState(0);
  const [drumSettings, setDrumSettings] = useState<DrumParams[]>(Array(4).fill(0).map(() => ({ p1: 0.5, p2: 0.5, p3: 0.5, volume: 0.6 })));
  const [drumEffects, setDrumEffects] = useState({ reverb: 0.2, echo: 0.1 });

  const [padPreset, setPadPreset] = useState<PadPreset>('Universe');
  const [chords, setChords] = useState<string[]>(['Cmaj7', 'Fmaj7', 'G7', 'Am7']);
  const [chordIsPlaying, setChordIsPlaying] = useState(false);
  const [chordDuration, setChordDuration] = useState<ChordDuration>('1');
  const [arpSpeed, setArpSpeed] = useState<ArpSpeed>('1/16');
  const [chordRange, setChordRange] = useState(2);
  const [chordIsTriplet, setChordIsTriplet] = useState(false);
  const [padParams, setPadParams] = useState({ reverb: 0.4, echo: 0.3, lpf: 20000, reso: 1 });

  const [envType, setEnvType] = useState<'Forest' | 'Ocean' | 'Street' | 'White' | 'Pink' | 'None'>('None');
  const [envIsPlaying, setEnvIsPlaying] = useState(false);
  const [envParams, setEnvParams] = useState({ level: 0.5, reverb: 0.3, echo: 0.2 });
  const [envUrlInput, setEnvUrlInput] = useState('');
  const [isEnvLoading, setIsEnvLoading] = useState(false);

  const [genParams, setGenParams] = useState<GeneratorParams[]>(Array(3).fill(null).map(() => ({
    waveform: 'sine', frequency: 100, baseFrequency: 100,
    volume: 0.5,
    adsr: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.5 },
    lfo: { waveform: 'sine', rate: 1, depth: 10, active: false, isSynced: false },
    gateDuration: '1', binauralBeat: 5, harmonicsIntensity: 0, active: false
  })));
  const [genEffects, setGenEffects] = useState(Array(3).fill(null).map(() => ({ reverb: 0.2, echo: 0.1 })));
  const [genActiveTab, setGenActiveTab] = useState<('OSC' | 'LFO' | 'ENV')[]>(['OSC', 'OSC', 'OSC']);


  const [mixerVolumes, setMixerVolumes] = useState<number[]>([1, 1, 1, 1, 1, 1]); 
  const [mixerPanning, setMixerPanning] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [mixerMute, setMixerMute] = useState<boolean[]>(Array(6).fill(false));
  const [mixerSolo, setMixerSolo] = useState<boolean[]>(Array(6).fill(false));
  const [masterReverb, setMasterReverb] = useState(0.5);
  const [masterVolume, setMasterVolume] = useState(0.8);

  const drumSeqRef = useRef(drumSeq);
  const drumSettingsRef = useRef(drumSettings);
  const genParamsRef = useRef(genParams);
  const chordsRef = useRef(chords);
  const bpmRef = useRef(bpm);
  const totalStepsRef = useRef(totalSteps);

  useEffect(() => { drumSeqRef.current = drumSeq; }, [drumSeq]);
  useEffect(() => { drumSettingsRef.current = drumSettings; }, [drumSettings]);
  useEffect(() => { genParamsRef.current = genParams; }, [genParams]);
  useEffect(() => { chordsRef.current = chords; }, [chords]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { totalStepsRef.current = totalSteps; }, [totalSteps]);

  const startAudio = async () => { await audioEngine.init(); setIsStarted(true); };
  
  const handlePanic = () => {
    setIsPlaying(false); setChordIsPlaying(false); setEnvIsPlaying(false);
    setGenParams(prev => prev.map(g => ({ ...g, active: false })));
    audioEngine.panic();
  };

  const exportPatch = () => {
    const state = { bpm, drumSeq, drumSettings, drumEffects, padPreset, chords, chordDuration, arpSpeed, chordRange, chordIsTriplet, padParams, envType, envParams, genParams, genEffects, mixerVolumes, mixerPanning, mixerMute, mixerSolo, masterReverb, masterVolume };
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `zenrack_patch_${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
  };

  const importPatch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const p = JSON.parse(ev.target?.result as string);
        setBpm(p.bpm); setDrumSeq(p.drumSeq); setDrumSettings(p.drumSettings); setDrumEffects(p.drumEffects);
        setPadPreset(p.padPreset); setChords(p.chords); setChordDuration(p.chordDuration); setArpSpeed(p.arpSpeed);
        setChordRange(p.chordRange || 2); setChordIsTriplet(p.chordIsTriplet || false);
        setPadParams(p.padParams || { reverb: 0.4, echo: 0.3, lpf: 20000, reso: 1 });
        setEnvType(p.envType); setEnvParams(p.envParams);
        const gens = p.genParams.map((g: any) => ({ ...g, baseFrequency: g.baseFrequency || g.frequency }));
        setGenParams(gens); 
        setGenEffects(p.genEffects); setMixerVolumes(p.mixerVolumes);
        setMixerPanning(p.mixerPanning); setMixerMute(p.mixerMute); setMixerSolo(p.mixerSolo);
        setMasterReverb(p.masterReverb); setMasterVolume(p.masterVolume);
      } catch (err) { alert("Invalid patch file."); }
    };
    reader.readAsText(file);
  };

  const handleToggleRecord = async () => {
    if (!isRecording) {
      audioEngine.startRecording(recFormat);
      setIsRecording(true);
    } else {
      setIsEncoding(true);
      const blob = await audioEngine.stopRecording(recFormat);
      setIsRecording(false);
      setIsEncoding(false);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `zenrack_rec_${new Date().getTime()}.${recFormat}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTotalSteps(s => s + 1);
      setCurrentStep(s => (s + 1) % 16);
    }, (60000 / bpm) / 4);
    return () => clearInterval(interval);
  }, [isPlaying, bpm]);

  useEffect(() => {
    if (!isStarted || !isPlaying) return;
    const step = currentStep;
    const total = totalStepsRef.current;
    const currentBpm = bpmRef.current;
    const DRUM_TYPES: ('kick' | 'snare' | 'hat' | 'openhat')[] = ['kick', 'snare', 'hat', 'openhat'];
    DRUM_TYPES.forEach((type, idx) => {
      if (drumSeqRef.current[idx][step]) {
        audioEngine.trigger808(type, drumSettingsRef.current[idx].volume, drumSettingsRef.current[idx]);
      }
    });
    genParamsRef.current.forEach((gen, idx) => {
      if (!gen.active) return;
      const stepsMap: Record<string, number> = { '1/2': 8, '1': 16, '2': 32, '4': 64, 'infinite': -1 };
      const steps = stepsMap[gen.gateDuration];
      if (steps !== -1 && total % steps === 0) {
        audioEngine.triggerOsc(idx, gen, currentBpm);
      } else if (steps === -1 && total === 0) {
         audioEngine.triggerOsc(idx, gen, currentBpm);
      }
    });
    const durationMap: Record<ChordDuration, number> = { '1/4': 4, '1/2': 8, '1': 16, '2': 32, '4': 64 };
    const stepsPerChord = durationMap[chordDuration];
    if (chordIsPlaying && chordsRef.current.length > 0 && total % stepsPerChord === 0) {
      const chordIdx = Math.floor(total / stepsPerChord) % chordsRef.current.length;
      audioEngine.triggerChord(
        CHORD_MAP[chordsRef.current[chordIdx]] || CHORD_MAP['Cmaj7'], 
        padPreset, 
        (60/currentBpm)*(stepsPerChord/4), 
        currentBpm, 
        arpSpeed,
        chordRange,
        chordIsTriplet
      );
    }
  }, [currentStep, isPlaying, isStarted, chordIsPlaying, chordDuration, padPreset, arpSpeed, chordRange, chordIsTriplet]);

  useEffect(() => {
    if (!isStarted) return;
    audioEngine.setDrumEffects(drumEffects.reverb, drumEffects.echo);
    audioEngine.setChordEffects(padParams.reverb, padParams.echo);
    audioEngine.setChordFilter(padParams.lpf, padParams.reso);
    audioEngine.setEnvEffects(envParams.level, envParams.reverb, envParams.echo);
    genEffects.forEach((ef, idx) => audioEngine.setGenEffects(idx, ef.reverb, ef.echo));
    audioEngine.setMasterReverb(masterReverb);
    audioEngine.setMasterVolume(masterVolume);
    const isAnySoloed = mixerSolo.some(s => s);
    MODULE_NAMES.forEach((module, i) => {
      let vol = mixerVolumes[i];
      if (mixerMute[i]) vol = 0;
      else if (isAnySoloed && !mixerSolo[i]) vol = 0;
      audioEngine.setBusVolume(module, vol);
      audioEngine.setBusPanning(module, mixerPanning[i]);
    });
  }, [drumEffects, padParams, envParams, genEffects, masterReverb, masterVolume, mixerVolumes, mixerPanning, mixerMute, mixerSolo, isStarted]);

  useEffect(() => {
    if (isStarted) {
      if (envIsPlaying) {
        if (['White', 'Pink'].includes(envType)) {
          audioEngine.playSynthesizedEnvironment(envType.toLowerCase() as any);
        } else if (ENV_SOUNDS[envType as keyof typeof ENV_SOUNDS]) {
          setIsEnvLoading(true);
          audioEngine.loadEnvSound(ENV_SOUNDS[envType as keyof typeof ENV_SOUNDS]).finally(() => setIsEnvLoading(false));
        } else if (envType === 'None' && audioEngine.lastEnvBuffer) {
           audioEngine.playEnvLoop(audioEngine.lastEnvBuffer);
        }
      } else {
        audioEngine.stopEnvSound();
      }
    }
  }, [envType, envIsPlaying, isStarted]);

  const toggleGen = useCallback((idx: number) => {
    setGenParams(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], active: !next[idx].active };
      if (!next[idx].active) audioEngine.stopOsc(idx, next[idx].adsr.release);
      else if (isPlaying) audioEngine.triggerOsc(idx, next[idx], bpm);
      return next;
    });
  }, [isPlaying, bpm]);

  const updateGen = useCallback((idx: number, patch: Partial<GeneratorParams>) => {
    setGenParams(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      if (next[idx].active) audioEngine.updateOscLive(idx, next[idx]);
      return next;
    });
  }, []);

  const handleGlobalAiGenerate = async () => {
    if (!globalAiPrompt || isGlobalLoading) return;
    setIsGlobalLoading(true);
    const config = await generateSynthConfig(globalAiPrompt);
    if (config) {
      await audioEngine.init();
      setBpm(config.bpm); 
      setDrumSeq(config.drumSeq); 
      setChords(config.chords);
      setTotalSteps(0);
      setCurrentStep(0);
      setGenParams(prev => prev.map((p, i) => ({ 
        ...p, 
        ...config.generators[i],
        baseFrequency: config.generators[i].frequency
      })));
      
      if (autoPlayOnAi) {
        setIsPlaying(true); 
        setChordIsPlaying(true); 
        setEnvIsPlaying(true);
        if (envType === 'None') setEnvType('Ocean');
        config.generators.forEach((gen: any, i: number) => {
          if (gen.active) {
              audioEngine.triggerOsc(i, { ...genParams[i], ...gen }, config.bpm);
          }
        });
      }
    }
    setIsGlobalLoading(false);
  };

  const handleMagicChords = async () => {
    if (isChordAiLoading) return;
    setIsChordAiLoading(true);
    const mood = globalAiPrompt || "deep relaxation with emotional fluctuation";
    const newChords = await generateHealingChords(mood);
    setChords(newChords);
    
    if (isPlaying || autoPlayOnAi) {
        setTotalSteps(0);
        setCurrentStep(0);
        if (autoPlayOnAi && !isPlaying) {
          setIsPlaying(true);
          setChordIsPlaying(true);
        }
    }
    setIsChordAiLoading(false);
  };


  const toggleViewMode = () => {
    setViewMode(v => v === 'rack' ? 'editor' : 'rack');
  };

  if (!isStarted) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
      <h1 className="text-6xl font-black italic tracking-tighter text-white mb-8 uppercase">ZenRack</h1>
      <button onClick={startAudio} className="px-10 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded shadow-2xl transition-all uppercase tracking-widest">Connect Rack</button>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-[#020617] p-2 gap-2 overflow-hidden text-slate-400">
      <Header 
        toggleViewMode={toggleViewMode} isPlaying={isPlaying} setIsPlaying={setIsPlaying}
        handleToggleRecord={handleToggleRecord} isRecording={isRecording} isEncoding={isEncoding}
        recFormat={recFormat} setRecFormat={setRecFormat} handlePanic={handlePanic}
        importPatch={importPatch} exportPatch={exportPatch} bpm={bpm} setBpm={setBpm}
        globalAiPrompt={globalAiPrompt} setGlobalAiPrompt={setGlobalAiPrompt}
        handleGlobalAiGenerate={handleGlobalAiGenerate} autoPlayOnAi={autoPlayOnAi}
        setAutoPlayOnAi={setAutoPlayOnAi} isGlobalLoading={isGlobalLoading}
      />

      <div className="flex-1 grid grid-cols-3 grid-rows-2 gap-2 min-h-0 overflow-hidden transition-all duration-500">
        {viewMode === 'rack' ? (
          <>
            <RhythmCore 
              drumSeq={drumSeq} setDrumSeq={setDrumSeq} 
              selectedDrumIdx={selectedDrumIdx} setSelectedDrumIdx={setSelectedDrumIdx}
              drumSettings={drumSettings} setDrumSettings={setDrumSettings}
              drumEffects={drumEffects} setDrumEffects={setDrumEffects}
              currentStep={currentStep}
            />

            <AstralPads 
              padPreset={padPreset} setPadPreset={setPadPreset}
              chords={chords} setChords={setChords}
              chordIsPlaying={chordIsPlaying} setChordIsPlaying={setChordIsPlaying}
              chordDuration={chordDuration} setChordDuration={setChordDuration}
              arpSpeed={arpSpeed} setArpSpeed={setArpSpeed}
              chordRange={chordRange} setChordRange={setChordRange}
              chordIsTriplet={chordIsTriplet} setChordIsTriplet={setChordIsTriplet}
              padParams={padParams} setPadParams={setPadParams}
              isPlaying={isPlaying} totalSteps={totalSteps}
              handleMagicChords={handleMagicChords} isChordAiLoading={isChordAiLoading}
            />
          </>
        ) : (
          <ZenEditor zenText={zenText} bpm={bpm} isPlaying={isPlaying} />
        )}

        <BiomesModule 
          envType={envType} setEnvType={setEnvType}
          envIsPlaying={envIsPlaying} setEnvIsPlaying={setEnvIsPlaying}
          envParams={envParams} setEnvParams={setEnvParams}
          envUrlInput={envUrlInput} setEnvUrlInput={setEnvUrlInput}
          isEnvLoading={isEnvLoading} setIsEnvLoading={setIsEnvLoading}
        />

        {[0, 1, 2].map(idx => (
           <GeneratorModule 
             key={idx} 
             idx={idx} 
             params={genParams[idx]} 
             effects={genEffects[idx]} 
             activeTab={genActiveTab[idx]}
             onToggle={() => toggleGen(idx)}
             onUpdate={(patch) => updateGen(idx, patch)}
             onSetTab={(tab) => { const n = [...genActiveTab]; n[idx] = tab; setGenActiveTab(n); }}
             onUpdateEffects={(patch) => { const n = [...genEffects]; n[idx] = { ...n[idx], ...patch }; setGenEffects(n); }}
           />
        ))}
      </div>

      <MixerPanel 
        mixerVolumes={mixerVolumes} 
        mixerPanning={mixerPanning} 
        mixerMute={mixerMute} 
        mixerSolo={mixerSolo}
        masterVolume={masterVolume}
        masterReverb={masterReverb}
        isPlaying={isPlaying}
        genParams={genParams}
        viewMode={viewMode}
        updateVol={(i, v) => { const n = [...mixerVolumes]; n[i] = v; setMixerVolumes(n); }}
        updatePan={(i, v) => { const n = [...mixerPanning]; n[i] = v; setMixerPanning(n); }}
        toggleMute={(i) => { const n = [...mixerMute]; n[i] = !n[i]; setMixerMute(n); }}
        toggleSolo={(i) => { const n = [...mixerSolo]; n[i] = !n[i]; setMixerSolo(n); }}
        setMasterVolume={setMasterVolume}
        setMasterReverb={setMasterReverb}
      />
    </div>
  );
};

export default App;
