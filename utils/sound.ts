/// <reference lib="dom" />


// Singleton AudioContext
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

// Music System State
const MusicManager = {
  isPlaying: false,
  nextNoteTime: 0,
  current16thNote: 0,
  tempo: 115,
  lookahead: 25.0, // ms
  scheduleAheadTime: 0.1, // s
  timerID: null as number | null,
  
  // Retro Synthwave Pattern
  // Bassline (C Minor/Dorian feel)
  bassPattern: [
    'C2', null, 'C2', null, 'Eb2', null, 'C2', null,
    'F2', null, 'F2', null, 'Eb2', null, 'Bb1', null
  ],
  // Arpeggio Lead
  leadPattern: [
    'G4', 'C5', 'Eb5', 'C5', 'G4', 'Bb4', 'D5', 'Bb4',
    'F4', 'A4', 'C5', 'A4', 'F4', 'Ab4', 'C5', 'Ab4'
  ]
};

const NOTE_FREQS: Record<string, number> = {
  'Bb1': 58.27, 'C2': 65.41, 'Eb2': 77.78, 'F2': 87.31, 'G2': 98.00,
  'F4': 349.23, 'G4': 392.00, 'Ab4': 415.30, 'A4': 440.00, 'Bb4': 466.16,
  'C5': 523.25, 'D5': 587.33, 'Eb5': 622.25
};

export const initAudio = () => {
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (Ctx) {
        audioCtx = new Ctx();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.3; // Master volume
        masterGain.connect(audioCtx.destination);
    }
  }
  // Resume context if suspended (browser policy)
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(e => console.warn("Audio resume failed", e));
  }
};

// --- Music Sequencer Logic ---

const nextNote = () => {
  const secondsPerBeat = 60.0 / MusicManager.tempo;
  const secondsPer16th = secondsPerBeat * 0.25;
  
  MusicManager.nextNoteTime += secondsPer16th;
  MusicManager.current16thNote++;
  if (MusicManager.current16thNote === 16) {
    MusicManager.current16thNote = 0;
  }
};

const scheduleNote = (beatNumber: number, time: number) => {
    if (!audioCtx || !masterGain) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(masterGain);

    // 1. Kick Drum (Every 4th beat - 4 on the floor)
    if (beatNumber % 4 === 0) {
        const kickOsc = audioCtx.createOscillator();
        const kickGain = audioCtx.createGain();
        kickOsc.connect(kickGain);
        kickGain.connect(masterGain);
        
        kickOsc.frequency.setValueAtTime(150, time);
        kickOsc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        
        kickGain.gain.setValueAtTime(0.8, time);
        kickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        
        kickOsc.start(time);
        kickOsc.stop(time + 0.5);
    }

    // 2. Hi-Hat (Off beats)
    if (beatNumber % 2 !== 0) {
         // Create buffer for noise
         const bufferSize = audioCtx.sampleRate * 0.05; // 50ms
         const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
         const data = buffer.getChannelData(0);
         for (let i = 0; i < bufferSize; i++) {
             data[i] = Math.random() * 2 - 1;
         }
         const noise = audioCtx.createBufferSource();
         noise.buffer = buffer;
         const noiseGain = audioCtx.createGain();
         noise.connect(noiseGain);
         noiseGain.connect(masterGain);
         
         // High pass filter approximation by volume env
         noiseGain.gain.setValueAtTime(0.05, time);
         noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
         
         noise.start(time);
    }

    // 3. Bass
    const bassNote = MusicManager.bassPattern[beatNumber];
    if (bassNote && NOTE_FREQS[bassNote]) {
        osc.type = 'sawtooth';
        osc.frequency.value = NOTE_FREQS[bassNote];
        
        // Low pass filter simulation via gain envelope
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.setTargetAtTime(0, time, 0.1);
        
        osc.start(time);
        osc.stop(time + 0.2);
    }

    // 4. Lead Arp
    const leadNote = MusicManager.leadPattern[beatNumber];
    if (leadNote && NOTE_FREQS[leadNote]) {
        const leadOsc = audioCtx.createOscillator();
        const leadGain = audioCtx.createGain();
        leadOsc.connect(leadGain);
        leadGain.connect(masterGain);

        leadOsc.type = 'square';
        leadOsc.frequency.value = NOTE_FREQS[leadNote];
        
        leadGain.gain.setValueAtTime(0.03, time);
        leadGain.gain.setTargetAtTime(0, time, 0.1);

        leadOsc.start(time);
        leadOsc.stop(time + 0.2);
    }
};

const scheduler = () => {
  if (!MusicManager.isPlaying || !audioCtx) return;

  // While there are notes that will need to play before the next interval, schedule them
  while (MusicManager.nextNoteTime < audioCtx.currentTime + MusicManager.scheduleAheadTime) {
      scheduleNote(MusicManager.current16thNote, MusicManager.nextNoteTime);
      nextNote();
  }
  MusicManager.timerID = window.setTimeout(scheduler, MusicManager.lookahead);
};

export const playMusic = (isMuted: boolean) => {
    if (isMuted || MusicManager.isPlaying) return;
    initAudio();
    if (!audioCtx) return;

    MusicManager.isPlaying = true;
    MusicManager.current16thNote = 0;
    MusicManager.nextNoteTime = audioCtx.currentTime + 0.1;
    scheduler();
};

export const stopMusic = () => {
    MusicManager.isPlaying = false;
    if (MusicManager.timerID) {
        window.clearTimeout(MusicManager.timerID);
        MusicManager.timerID = null;
    }
};

// Helper to play a specific frequency
const playTone = (ctx: AudioContext, freq: number, type: OscillatorType, duration: number, delay: number = 0, vol: number = 0.1) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(masterGain || ctx.destination); // Connect to master

    const t = ctx.currentTime + delay;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.start(t);
    osc.stop(t + duration + 0.1);
};

export const playSound = (type: 'score' | 'gameover' | 'rotate' | 'heavy' | 'pop' | 'whir' | 'shoot' | 'achievement' | 'levelUp' | 'streak' | 'ui', isMuted: boolean) => {
  if (isMuted) return;

  if (!audioCtx) initAudio();
  if (!audioCtx) return;

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {}); 
  }

  try {
    const ctx = audioCtx;
    const t = ctx.currentTime;

    // Use masterGain if available, else destination
    const dest = masterGain || ctx.destination;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(dest);

    switch (type) {
        case 'ui':
            // Short, crisp blip
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, t);
            osc.frequency.exponentialRampToValueAtTime(400, t + 0.05);
            gain.gain.setValueAtTime(0.05, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.05);
            osc.start(t);
            osc.stop(t + 0.05);
            break;

        case 'shoot':
            // Retro "Pew" - fast pitch drop + bit of noise
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, t);
            osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            osc.start(t);
            osc.stop(t + 0.15);
            break;

        case 'score':
            // Satisfying high "Ding"
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, t); // A5
            osc.frequency.exponentialRampToValueAtTime(1760, t + 0.05);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            osc.start(t);
            osc.stop(t + 0.15);
            break;
        
        case 'streak':
            // Resonant, very high crystal ping
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1200, t);
            osc.frequency.linearRampToValueAtTime(1200, t + 0.3); 
            gain.gain.setValueAtTime(0.05, t);
            gain.gain.linearRampToValueAtTime(0.1, t + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
            osc.start(t);
            osc.stop(t + 0.5);
            break;

        case 'rotate':
            // Subtle mechanical click
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, t);
            gain.gain.setValueAtTime(0.02, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.03);
            osc.start(t);
            osc.stop(t + 0.03);
            break;

        case 'gameover':
            // Sad failure drop
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, t);
            osc.frequency.exponentialRampToValueAtTime(30, t + 0.8);
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.linearRampToValueAtTime(0.01, t + 0.8);
            osc.start(t);
            osc.stop(t + 0.8);
            break;

        case 'heavy':
            // Low punch for armor
            osc.type = 'square';
            osc.frequency.setValueAtTime(100, t);
            osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            osc.start(t);
            osc.stop(t + 0.15);
            break;

        case 'pop':
            // Sharp split sound
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600, t);
            osc.frequency.linearRampToValueAtTime(1200, t + 0.1);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.linearRampToValueAtTime(0.01, t + 0.1);
            osc.start(t);
            osc.stop(t + 0.1);
            break;

        case 'whir':
            // Sci-fi modulation
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, t);
            osc.frequency.linearRampToValueAtTime(400, t + 0.1);
            osc.frequency.linearRampToValueAtTime(200, t + 0.2);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.linearRampToValueAtTime(0.01, t + 0.2);
            osc.start(t);
            osc.stop(t + 0.2);
            break;

        case 'levelUp':
            // Rising power up sweep
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(220, t);
            osc.frequency.exponentialRampToValueAtTime(880, t + 0.4);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.linearRampToValueAtTime(0.2, t + 0.3);
            gain.gain.linearRampToValueAtTime(0.01, t + 0.6);
            osc.start(t);
            osc.stop(t + 0.6);
            // Add a sparkle layer
            playTone(ctx, 1100, 'sine', 0.4, 0.1, 0.05);
            break;

        case 'achievement':
            // Major Triad (C Major Arpeggio) - C5, E5, G5
            osc.disconnect(); 
            gain.disconnect();
            
            playTone(ctx, 523.25, 'sine', 0.4, 0.0, 0.2); // C5
            playTone(ctx, 659.25, 'sine', 0.4, 0.1, 0.2); // E5
            playTone(ctx, 783.99, 'sine', 0.8, 0.2, 0.2); // G5
            break;
    }
  } catch (e) {
    console.error('Audio play failed', e);
  }
};