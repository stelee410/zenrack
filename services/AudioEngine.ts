import { ADSRConfig, LFOConfig, WaveformType, DrumParams, PadPreset, GeneratorParams, ArpSpeed, GateDuration } from '../types';

interface OscGroup {
  oscL: OscillatorNode;
  oscR: OscillatorNode;
  gain: GainNode;
}

class AudioEngine {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  compressor: DynamicsCompressorNode | null = null;
  reverbNode: ConvolverNode | null = null;
  reverbReturn: GainNode | null = null; 
  
  // Recording
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private dest: MediaStreamAudioDestinationNode | null = null;
  
  // High-quality PCM Recording
  private isCapturingPCM = false;
  private pcmDataL: Float32Array[] = [];
  private pcmDataR: Float32Array[] = [];
  private scriptProcessor: ScriptProcessorNode | null = null;

  drumBus: GainNode | null = null;
  drumPan: StereoPannerNode | null = null;
  drumDelayOutput: GainNode | null = null;
  drumReverbSend: GainNode | null = null;

  chordBus: GainNode | null = null;
  chordPan: StereoPannerNode | null = null;
  chordFilter: BiquadFilterNode | null = null;
  chordDelayOutput: GainNode | null = null;
  chordReverbSend: GainNode | null = null;

  envBus: GainNode | null = null;
  envPan: StereoPannerNode | null = null;
  envDelayOutput: GainNode | null = null;
  envReverbSend: GainNode | null = null;
  envSource: AudioBufferSourceNode | null = null;
  lastEnvBuffer: AudioBuffer | null = null;
  
  private envAbortController: AbortController | null = null;

  genBuses: (GainNode | null)[] = [null, null, null];
  genPans: (StereoPannerNode | null)[] = [null, null, null];
  genReverbSends: (GainNode | null)[] = [null, null, null];
  genDelayOutputs: (GainNode | null)[] = [null, null, null];

  oscNodes: Map<number, { 
    fundamental: OscGroup,
    harmonics: OscGroup[],
    lfoNode?: OscillatorNode,
    lfoGain?: GainNode,
    params: GeneratorParams
  }> = new Map();
  
  activeChords: { osc: OscillatorNode, gain: GainNode }[] = [];

  async init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }

    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    this.compressor = this.ctx.createDynamicsCompressor();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;
    
    this.dest = this.ctx.createMediaStreamDestination();
    
    this.compressor.connect(this.ctx.destination);
    this.compressor.connect(this.dest); 
    this.masterGain.connect(this.compressor);

    // Setup ScriptProcessor for PCM capture
    this.scriptProcessor = this.ctx.createScriptProcessor(4096, 2, 2);
    this.scriptProcessor.onaudioprocess = (e) => {
      if (!this.isCapturingPCM) return;
      this.pcmDataL.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      this.pcmDataR.push(new Float32Array(e.inputBuffer.getChannelData(1)));
    };
    this.compressor.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.ctx.destination);
    
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = await this.createReverbBuffer();
    this.reverbReturn = this.ctx.createGain();
    this.reverbNode.connect(this.reverbReturn);
    this.reverbReturn.connect(this.masterGain);

    this.drumBus = this.initModuleChain('drum');
    this.chordBus = this.initModuleChain('chord');
    this.envBus = this.initModuleChain('env');
    this.genBuses[0] = this.initModuleChain('gen0');
    this.genBuses[1] = this.initModuleChain('gen1');
    this.genBuses[2] = this.initModuleChain('gen2');
  }

  // --- Recording Methods ---
  startRecording(format: 'webm' | 'wav') {
    if (!this.dest || !this.ctx) return;
    
    this.isCapturingPCM = true;
    this.pcmDataL = [];
    this.pcmDataR = [];

    if (format === 'webm') {
      this.chunks = [];
      this.recorder = new MediaRecorder(this.dest.stream);
      this.recorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };
      this.recorder.start();
    }
  }

  async stopRecording(format: 'webm' | 'wav'): Promise<Blob | null> {
    this.isCapturingPCM = false;

    if (format === 'webm' && this.recorder) {
      return new Promise((resolve) => {
        this.recorder!.onstop = () => {
          const blob = new Blob(this.chunks, { type: 'audio/webm;codecs=opus' });
          this.chunks = [];
          resolve(blob);
        };
        this.recorder!.stop();
      });
    }

    const samplesL = this.flattenPCM(this.pcmDataL);
    const samplesR = this.flattenPCM(this.pcmDataR);
    
    if (samplesL.length === 0) return null;

    if (format === 'wav') {
      return this.encodeWAV(samplesL, samplesR);
    }

    return null;
  }

  private flattenPCM(chunks: Float32Array[]): Float32Array {
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }

  private encodeWAV(samplesL: Float32Array, samplesR: Float32Array): Blob {
    const buffer = new ArrayBuffer(44 + samplesL.length * 2 * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 32 + samplesL.length * 4, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 2, true); // Stereo
    view.setUint32(24, this.ctx!.sampleRate, true);
    view.setUint32(28, this.ctx!.sampleRate * 4, true);
    view.setUint16(32, 4, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samplesL.length * 4, true);

    let offset = 44;
    for (let i = 0; i < samplesL.length; i++) {
      let sL = Math.max(-1, Math.min(1, samplesL[i]));
      view.setInt16(offset, sL < 0 ? sL * 0x8000 : sL * 0x7FFF, true);
      offset += 2;
      let sR = Math.max(-1, Math.min(1, samplesR[i]));
      view.setInt16(offset, sR < 0 ? sR * 0x8000 : sR * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  private initModuleChain(prefix: string): GainNode {
    const ctx = this.ctx!;
    const bus = ctx.createGain();
    const panNode = ctx.createStereoPanner();
    const delay = ctx.createDelay(1.0);
    const feedback = ctx.createGain();
    const delayOut = ctx.createGain();
    const revSend = ctx.createGain();

    delay.delayTime.value = 0.4;
    feedback.gain.value = 0.4;
    delayOut.gain.value = 0;
    revSend.gain.value = 0;

    bus.connect(panNode);

    if (prefix === 'chord') {
      this.chordFilter = ctx.createBiquadFilter();
      this.chordFilter.type = 'lowpass';
      this.chordFilter.frequency.value = 20000;
      this.chordFilter.Q.value = 0.5;
      panNode.connect(this.chordFilter);
      this.chordFilter.connect(this.masterGain!);
      this.chordFilter.connect(delay);
      this.chordFilter.connect(revSend);
    } else {
      panNode.connect(this.masterGain!);
      panNode.connect(delay);
      panNode.connect(revSend);
    }

    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(delayOut);
    delayOut.connect(this.masterGain!);
    revSend.connect(this.reverbNode!);

    if (prefix === 'drum') { this.drumPan = panNode; this.drumDelayOutput = delayOut; this.drumReverbSend = revSend; }
    else if (prefix === 'chord') { this.chordPan = panNode; this.chordDelayOutput = delayOut; this.chordReverbSend = revSend; }
    else if (prefix === 'env') { this.envPan = panNode; this.envDelayOutput = delayOut; this.envReverbSend = revSend; }
    else {
      const idx = parseInt(prefix.replace('gen', ''));
      this.genPans[idx] = panNode;
      this.genDelayOutputs[idx] = delayOut;
      this.genReverbSends[idx] = revSend;
    }

    return bus;
  }

  setBusVolume(module: string, val: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    let target: GainNode | null = null;
    if (module === 'drum') target = this.drumBus;
    else if (module === 'chord') target = this.chordBus;
    else if (module === 'env') target = this.envBus;
    else if (module.startsWith('gen')) {
      const idx = parseInt(module.replace('gen', ''));
      target = this.genBuses[idx];
    }
    if (target) target.gain.setTargetAtTime(val, now, 0.05);
  }

  setBusPanning(module: string, val: number) {
    if (!this.ctx) return;
    let target: StereoPannerNode | null = null;
    if (module === 'drum') target = this.drumPan;
    else if (module === 'chord') target = this.chordPan;
    else if (module === 'env') target = this.envPan;
    else if (module.startsWith('gen')) {
      const idx = parseInt(module.replace('gen', ''));
      target = this.genPans[idx];
    }
    if (target) target.pan.setTargetAtTime(val, this.ctx.currentTime, 0.05);
  }

  async createReverbBuffer() {
    const sampleRate = this.ctx!.sampleRate;
    const length = sampleRate * 3;
    const buffer = this.ctx!.createBuffer(2, length, sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
      }
    }
    return buffer;
  }

  setMasterVolume(val: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.05);
    }
  }

  setMasterReverb(val: number) {
    if (this.reverbReturn && this.ctx) this.reverbReturn.gain.setTargetAtTime(val, this.ctx.currentTime, 0.05);
  }

  setDrumEffects(reverb: number, echo: number) {
    if (!this.drumReverbSend || !this.drumDelayOutput) return;
    this.drumReverbSend.gain.setTargetAtTime(reverb, this.ctx!.currentTime, 0.05);
    this.drumDelayOutput.gain.setTargetAtTime(echo, this.ctx!.currentTime, 0.05);
  }

  setChordEffects(reverb: number, echo: number) {
    if (!this.chordReverbSend || !this.chordDelayOutput) return;
    this.chordReverbSend.gain.setTargetAtTime(reverb, this.ctx!.currentTime, 0.05);
    this.chordDelayOutput.gain.setTargetAtTime(echo, this.ctx!.currentTime, 0.05);
  }

  setChordFilter(freq: number, q: number) {
    if (!this.chordFilter || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.chordFilter.frequency.setTargetAtTime(freq, now, 0.02);
    this.chordFilter.Q.setTargetAtTime(q, now, 0.02);
  }

  setEnvEffects(level: number, reverb: number, echo: number) {
    if (!this.envBus || !this.envReverbSend || !this.envDelayOutput) return;
    this.envBus.gain.setTargetAtTime(level, this.ctx!.currentTime, 0.05);
    this.envReverbSend.gain.setTargetAtTime(reverb, this.ctx!.currentTime, 0.05);
    this.envDelayOutput.gain.setTargetAtTime(echo, this.ctx!.currentTime, 0.05);
  }

  setGenEffects(idx: number, reverb: number, echo: number) {
    const rSend = this.genReverbSends[idx];
    const dOut = this.genDelayOutputs[idx];
    if (rSend && dOut) {
      rSend.gain.setTargetAtTime(reverb, this.ctx!.currentTime, 0.05);
      dOut.gain.setTargetAtTime(echo, this.ctx!.currentTime, 0.05);
    }
  }

  async loadEnvSound(url: string | File) {
    if (!this.ctx) return;
    if (this.envAbortController) this.envAbortController.abort();
    this.envAbortController = new AbortController();
    
    try {
      let arrayBuffer: ArrayBuffer;
      if (url instanceof File) {
        arrayBuffer = await url.arrayBuffer();
      } else {
        const response = await fetch(url, { mode: 'cors', signal: this.envAbortController.signal });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        arrayBuffer = await response.arrayBuffer();
      }
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.lastEnvBuffer = audioBuffer;
      this.playEnvLoop(audioBuffer);
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.error("Env sound load failed:", e);
      this.playSynthesizedEnvironment('pink');
    } finally {
      this.envAbortController = null;
    }
  }

  stopEnvSound() {
    if (this.envSource) {
      try { 
        this.envSource.stop(); 
        this.envSource.disconnect(); 
      } catch(e) {}
      this.envSource = null;
    }
  }

  playSynthesizedEnvironment(type: 'white' | 'pink') {
    if (!this.ctx || !this.envBus) return;
    this.stopEnvSound(); 
    const bufferSize = this.ctx.sampleRate * 4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.05;
    } else {
      let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + white * 0.5362) * 0.015;
      }
    }
    this.lastEnvBuffer = buffer;
    this.playEnvLoop(buffer);
  }

  playEnvLoop(buffer: AudioBuffer) {
    if (!this.ctx || !this.envBus) return;
    this.stopEnvSound();
    this.envSource = this.ctx.createBufferSource();
    this.envSource.buffer = buffer;
    this.envSource.loop = true;
    this.envSource.connect(this.envBus);
    this.envSource.start();
  }

  triggerChord(notes: number[], preset: PadPreset, durationSeconds: number, bpm: number, arpSpeed: ArpSpeed, range: number = 2, isTriplet: boolean = false) {
    if (!this.ctx || !this.chordBus || !this.chordFilter) return;
    const now = this.ctx.currentTime;
    this.activeChords.forEach(node => {
      node.gain.gain.cancelScheduledValues(now);
      node.gain.gain.setTargetAtTime(0, now, 0.1);
      setTimeout(() => { try { node.osc.stop(); } catch(e) {} }, 500);
    });
    this.activeChords = [];
    const isPlucked = preset === 'Harp' || preset === 'Piano';
    
    if (isPlucked) {
      const beatDuration = 60 / bpm;
      const speedMap: Record<ArpSpeed, number> = { '1/1': 1, '1/2': 0.5, '1/4': 0.25, '1/8': 0.125, '1/16': 0.0625, '1/32': 0.03125 };
      let speedFactor = speedMap[arpSpeed];
      
      // Implement Triplet timing: a triplet note is 2/3 the length of a standard note
      if (isTriplet) {
        speedFactor *= (2 / 3);
      }
      
      const interval = beatDuration * (4 * speedFactor);
      
      // Build octave pool based on range
      let octavePool: number[] = [];
      for(let r = 0; r < range; r++) {
        const factor = Math.pow(2, r);
        octavePool = [...octavePool, ...notes.map(n => n * factor)];
      }

      const noteCount = Math.floor(durationSeconds / interval);
      for (let i = 0; i < noteCount; i++) {
        const noteTime = now + i * interval;
        const f = octavePool[Math.floor(Math.random() * octavePool.length)];
        
        const osc = this.ctx!.createOscillator();
        const gainNode = this.ctx!.createGain();
        osc.type = preset === 'Piano' ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(f, noteTime);
        
        const vol = 0.25;
        gainNode.gain.setValueAtTime(0, noteTime);
        gainNode.gain.setTargetAtTime(vol, noteTime, 0.005);
        gainNode.gain.setTargetAtTime(0, noteTime + 0.02, 0.15);
        
        osc.connect(gainNode);
        gainNode.connect(this.chordBus!);
        osc.start(noteTime);
        osc.stop(noteTime + 0.8);
      }
    } else {
      // Pad chords: Triplet timing doesn't strictly apply to sustain, 
      // but we could stack voices for "Triple" feel if wanted, 
      // though user specifies Rate meaning, so we focus on Arp timing above.
      notes.forEach(f => {
        const osc = this.ctx!.createOscillator();
        const gainNode = this.ctx!.createGain();
        osc.type = preset === 'Universe' ? 'sine' : preset === 'Ocean' ? 'triangle' : 'sawtooth';
        osc.frequency.setValueAtTime(f, now);
        
        const vol = 0.15;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.setTargetAtTime(vol, now, durationSeconds * 0.2);
        gainNode.gain.setTargetAtTime(0, now + durationSeconds * 0.7, durationSeconds * 0.2);
        
        osc.connect(gainNode);
        gainNode.connect(this.chordBus!);
        osc.start(now);
        osc.stop(now + durationSeconds + 0.5);
        this.activeChords.push({ osc, gain: gainNode });
      });
    }
  }

  trigger808(type: 'kick' | 'snare' | 'hat' | 'openhat', gain: number, params: DrumParams) {
    if (!this.ctx || !this.drumBus) return;
    const now = this.ctx.currentTime;
    const out = this.ctx.createGain();
    out.connect(this.drumBus);
    const masterDrumGain = 1.6;
    const effectiveGain = gain * masterDrumGain;

    if (type === 'kick') {
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40 + params.p1 * 60, now + 0.1);
      env.gain.setValueAtTime(effectiveGain, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.1 + params.p2);
      osc.connect(env); env.connect(out);
      osc.start(now); osc.stop(now + 0.5 + params.p2);
    } else if (type === 'snare') {
      const noise = this.ctx.createBufferSource();
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for(let i=0; i<data.length; i++) data[i] = Math.random() * 2 - 1;
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1000 + params.p1 * 1000, now);
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(effectiveGain * params.p2, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1 + params.p3);
      noise.connect(filter); filter.connect(nGain); nGain.connect(out);
      noise.start(now);
    } else {
      const noise = this.ctx.createBufferSource();
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for(let i=0; i<data.length; i++) data[i] = Math.random() * 2 - 1;
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass'; 
      filter.frequency.value = 5000 + params.p1 * 5000;
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(effectiveGain, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + (type === 'hat' ? 0.05 : 0.3) + params.p2);
      noise.connect(filter); filter.connect(nGain); nGain.connect(out);
      noise.start(now);
    }
  }

  private createOscGroup(id: number, freq: number, binauralOffset: number, vol: number, adsr: ADSRConfig, isInfinite: boolean): OscGroup {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const oscL = ctx.createOscillator();
    const oscR = ctx.createOscillator();
    const panL = ctx.createStereoPanner();
    const panR = ctx.createStereoPanner();
    const gainNode = ctx.createGain();
    oscL.frequency.setValueAtTime(freq, now);
    oscR.frequency.setValueAtTime(freq + binauralOffset, now);
    panL.pan.value = -1; panR.pan.value = 1;
    oscL.connect(panL); oscR.connect(panR);
    panL.connect(gainNode); panR.connect(gainNode);
    gainNode.connect(this.genBuses[id]!);
    gainNode.gain.setValueAtTime(0, now);
    if (isInfinite) {
        gainNode.gain.setTargetAtTime(vol, now, 0.05);
    } else {
        gainNode.gain.setTargetAtTime(vol, now, Math.max(0.01, adsr.attack));
        const sustainStart = now + adsr.attack + adsr.decay;
        gainNode.gain.setTargetAtTime(vol * adsr.sustain, sustainStart, 0.1);
    }
    return { oscL, oscR, gain: gainNode };
  }

  triggerOsc(id: number, params: GeneratorParams, bpm: number) {
    if (!this.ctx || !this.genBuses[id]) return;
    const isInfinite = params.gateDuration === 'infinite';
    if (isInfinite && this.oscNodes.has(id)) return;
    this.stopOsc(id, 0.01);
    const now = this.ctx.currentTime;
    const fundamental = this.createOscGroup(id, params.frequency, params.binauralBeat, params.volume, params.adsr, isInfinite);
    fundamental.oscL.type = params.waveform;
    fundamental.oscR.type = params.waveform;
    const harmonics: OscGroup[] = [];
    if (params.harmonicsIntensity > 0) {
      for (let n = 2; n <= 4; n++) {
        const hVol = params.volume * params.harmonicsIntensity * (1 / (n * 1.5));
        const hGroup = this.createOscGroup(id, params.frequency * n, params.binauralBeat * (n/2), hVol, params.adsr, isInfinite);
        hGroup.oscL.type = 'sine';
        hGroup.oscR.type = 'sine';
        hGroup.oscL.start(); hGroup.oscR.start();
        harmonics.push(hGroup);
      }
    }
    let lfoNode: OscillatorNode | undefined;
    let lfoGain: GainNode | undefined;
    if (params.lfo.active) {
      lfoNode = this.ctx.createOscillator();
      lfoGain = this.ctx.createGain();
      lfoNode.type = params.lfo.waveform;
      let rate = params.lfo.isSynced ? (bpm / 60) * params.lfo.rate : params.lfo.rate;
      lfoNode.frequency.setTargetAtTime(rate, now, 0.01);
      lfoGain.gain.setTargetAtTime(params.lfo.depth, now, 0.01);
      lfoNode.connect(lfoGain);
      lfoGain.connect(fundamental.oscL.frequency);
      lfoGain.connect(fundamental.oscR.frequency);
      harmonics.forEach(h => {
        lfoGain!.connect(h.oscL.frequency);
        lfoGain!.connect(h.oscR.frequency);
      });
      lfoNode.start();
    }
    fundamental.oscL.start(); fundamental.oscR.start();
    this.oscNodes.set(id, { fundamental, harmonics, lfoNode, lfoGain, params });
  }

  updateOscLive(id: number, params: GeneratorParams) {
    const nodes = this.oscNodes.get(id);
    if (!nodes || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (nodes.params.gateDuration !== params.gateDuration) {
        this.triggerOsc(id, params, 80); 
        return;
    }
    nodes.params = params;
    const isInfinite = params.gateDuration === 'infinite';
    const targetVol = isInfinite ? params.volume : params.volume * params.adsr.sustain;
    nodes.fundamental.oscL.frequency.setTargetAtTime(params.frequency, now, 0.05);
    nodes.fundamental.oscR.frequency.setTargetAtTime(params.frequency + params.binauralBeat, now, 0.05);
    nodes.fundamental.gain.gain.setTargetAtTime(targetVol, now, 0.05);
    nodes.harmonics.forEach((h, i) => {
      const n = i + 2;
      const hVol = params.volume * params.harmonicsIntensity * (1 / (n * 1.5));
      const hTargetVol = isInfinite ? hVol : hVol * params.adsr.sustain;
      h.oscL.frequency.setTargetAtTime(params.frequency * n, now, 0.05);
      h.oscR.frequency.setTargetAtTime(params.frequency * n + params.binauralBeat * (n/2), now, 0.05);
      h.gain.gain.setTargetAtTime(hTargetVol, now, 0.05);
    });
    if (nodes.lfoNode && nodes.lfoGain) {
      nodes.lfoNode.type = params.lfo.waveform;
      let rate = params.lfo.isSynced ? (80 / 60) * params.lfo.rate : params.lfo.rate; 
      nodes.lfoNode.frequency.setTargetAtTime(rate, now, 0.05);
      nodes.lfoGain.gain.setTargetAtTime(params.lfo.depth, now, 0.05);
    }
  }

  stopOsc(id: number, release: number = 0.5) {
    const nodes = this.oscNodes.get(id);
    if (!nodes || !this.ctx) return;
    const now = this.ctx.currentTime;
    const isInfinite = nodes.params.gateDuration === 'infinite';
    const effectiveRelease = isInfinite ? 0.2 : release;
    const groups = [nodes.fundamental, ...nodes.harmonics];
    groups.forEach((g, i) => {
      const actualRelease = i === 0 ? effectiveRelease : effectiveRelease * (1 + nodes.params.harmonicsIntensity * 2);
      g.gain.gain.cancelScheduledValues(now);
      g.gain.gain.setTargetAtTime(0, now, Math.max(0.01, actualRelease / 3));
      setTimeout(() => {
        try { 
          g.oscL.stop(); g.oscR.stop();
          g.oscL.disconnect(); g.oscR.disconnect(); g.gain.disconnect();
        } catch(e) {}
      }, Math.max(10, actualRelease * 1000 + 50));
    });
    if (nodes.lfoNode) { try { nodes.lfoNode.stop(); nodes.lfoNode.disconnect(); nodes.lfoGain?.disconnect(); } catch(e) {} }
    this.oscNodes.delete(id);
  }

  panic() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.stopEnvSound();
    this.activeChords.forEach(node => {
      try { node.gain.gain.cancelScheduledValues(now); node.gain.gain.setTargetAtTime(0, now, 0.01); node.osc.stop(now + 0.1); } catch(e) {}
    });
    this.activeChords = [];
    this.oscNodes.forEach((nodes) => {
      const groups = [nodes.fundamental, ...nodes.harmonics];
      groups.forEach(g => {
        try { g.gain.gain.cancelScheduledValues(now); g.gain.gain.setTargetAtTime(0, now, 0.01); g.oscL.stop(now + 0.1); g.oscR.stop(now + 0.1); } catch(e) {}
      });
    });
    this.oscNodes.clear();
  }
}
export const audioEngine = new AudioEngine();