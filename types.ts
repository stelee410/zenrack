
export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface ADSRConfig {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface LFOConfig {
  waveform: WaveformType;
  rate: number;
  depth: number;
  active: boolean;
  isSynced: boolean;
}

export interface ModuleEffect {
  reverb: number;
  delay: number;
  gain: number;
}

export type PadPreset = 'Universe' | 'Ocean' | 'Desert' | 'Harp' | 'Piano';
export type ChordDuration = '1/4' | '1/2' | '1' | '2' | '4';
// Fix: Expanded ArpSpeed to include all valid values used in the app to resolve Record key errors in AudioEngine.ts
export type ArpSpeed = '1/1' | '1/2' | '1/4' | '1/8' | '1/16' | '1/32';

export interface ChordProgression {
  chords: string[];
}

export type GateDuration = '1/2' | '1' | '2' | '4' | 'infinite';

export interface GeneratorParams {
  waveform: WaveformType;
  frequency: number;
  baseFrequency: number; // The "patch" frequency used for reset
  volume: number;
  adsr: ADSRConfig;
  lfo: LFOConfig;
  gateDuration: GateDuration; 
  binauralBeat: number;
  harmonicsIntensity: number;
  multiSaw: boolean; // 是否使用multi-saw（仅sawtooth时有效）
  pulseWidth: number; // 脉冲宽度 0-1（仅square时有效）
  fifthIntensity: number; // 五度音强度 0-1
  octaveIntensity: number; // 八度音强度 0-1
  active: boolean;
}

export interface DrumParams {
  p1: number;
  p2: number;
  p3: number;
  volume: number;
}

export interface DrumStep {
  active: boolean;
  velocity: number;
}

export interface DrumSequencerState {
  kick: DrumStep[];
  snare: DrumStep[];
  hihat: DrumStep[];
  openhat: DrumStep[];
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'strudel-editor': any;
    }
  }
}
