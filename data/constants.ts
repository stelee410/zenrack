
// Base frequencies for 4th octave
const NOTE_FREQS: Record<string, number> = {
  'C': 261.63, 'C#': 277.18, 'Db': 277.18,
  'D': 293.66, 'D#': 311.13, 'Eb': 311.13,
  'E': 329.63,
  'F': 349.23, 'F#': 369.99, 'Gb': 369.99,
  'G': 392.00, 'G#': 415.30, 'Ab': 415.30,
  'A': 440.00, 'A#': 466.16, 'Bb': 466.16,
  'B': 493.88
};

// Interval definitions (semitones)
const CHORD_QUALITIES: Record<string, number[]> = {
  '': [0, 4, 7],         // Major
  'm': [0, 3, 7],        // Minor
  'maj7': [0, 4, 7, 11],
  'maj9': [0, 4, 7, 11, 14],
  'maj7#11': [0, 4, 7, 11, 14, 18],
  'm7': [0, 3, 7, 10],
  'm9': [0, 3, 7, 10, 14],
  'm11': [0, 3, 7, 10, 14, 17],
  'm6': [0, 3, 7, 9],
  '7': [0, 4, 7, 10],
  '9': [0, 4, 7, 10, 14],
  '11': [0, 4, 7, 10, 14, 17],
  '13': [0, 4, 7, 10, 14, 21],
  'sus2': [0, 2, 7],
  'sus4': [0, 5, 7],
  '7sus4': [0, 5, 7, 10],
  '13sus4': [0, 5, 7, 10, 14, 21],
  '6/9': [0, 4, 7, 9, 14],
  'add9': [0, 4, 7, 14],
  'dim7': [0, 3, 6, 9],
  'aug': [0, 4, 8]
};

export const CHORD_MAP: Record<string, number[]> = {};

Object.keys(NOTE_FREQS).forEach(root => {
  const rootFreq = NOTE_FREQS[root];
  Object.keys(CHORD_QUALITIES).forEach(quality => {
    const chordName = `${root}${quality}`;
    const intervals = CHORD_QUALITIES[quality];
    CHORD_MAP[chordName] = intervals.map(semitones => {
      // Calculate frequency: f = f0 * 2^(n/12)
      return rootFreq * Math.pow(2, semitones / 12);
    });
  });
});

export const ENV_SOUNDS = {
  'Forest': 'https://raw.githubusercontent.com/stelee410/StayFocused/refs/heads/main/public/sounds/forest-night.mp3',
  'Ocean': 'https://raw.githubusercontent.com/stelee410/StayFocused/refs/heads/main/public/sounds/waves.mp3',
  'Street': 'https://raw.githubusercontent.com/stelee410/StayFocused/refs/heads/main/public/sounds/city-traffic.mp3',
};

export const PRESETS = [
  { label: 'Deep Sleep', icon: 'fa-moon', prompt: 'I need deep sleep' },
  { label: 'Focus', icon: 'fa-brain', prompt: 'Help me stay focused' },
  { label: 'Anxiety', icon: 'fa-heart', prompt: 'Relieve my anxiety' },
  { label: 'Manifest', icon: 'fa-bolt', prompt: 'Connect to the universe, manifest my dreams' },
  { label: 'Zen', icon: 'fa-leaf', prompt: 'Mindfulness meditation' }
];

export const MODULE_NAMES = ['drum', 'chord', 'env', 'gen0', 'gen1', 'gen2'];
export const CHORD_DURATION_STEPS: Record<string, number> = { '1/4': 4, '1/2': 8, '1': 16, '2': 32, '4': 64 };

export const MIN_FREQ = 20;
export const MAX_FREQ = 20000;
export const logToFreq = (val: number) => Math.pow(10, val * Math.log10(MAX_FREQ / MIN_FREQ)) * MIN_FREQ;
export const freqToLog = (freq: number) => Math.log10(freq / MIN_FREQ) / Math.log10(MAX_FREQ / MIN_FREQ);
