// audio.js — all sound is synthesized with WebAudio: short oscillator blips
// and filtered noise, no audio files. The synth starts on the first user
// gesture (browsers require that) and stays silent until then.

let audioContext = null;
let muted = false;

/** Create (or reuse) the audio context, on a user gesture. */
export function ensureAudio() {
  if (audioContext === null) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioContext = new AC();
  }
  if (audioContext.state === 'suspended') void audioContext.resume();
  return audioContext;
}

/** Toggle the mute; returns the new muted state. */
export function toggleMute() {
  muted = !muted;
  return muted;
}

/** Whether sound is currently muted. */
export function isMuted() {
  return muted;
}

/** One short tone: `freq` Hz, `seconds` long, `type` waveform, `gain` loudness. */
function tone(freq, seconds, type, gain, delay = 0, slideTo = null) {
  if (muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
  amp.gain.setValueAtTime(0, start);
  amp.gain.linearRampToValueAtTime(gain, start + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  osc.connect(amp).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + seconds + 0.05);
}

/** A soft footstep tick. */
export function playFootstep() {
  tone(140, 0.05, 'triangle', 0.05);
}

/** The two-note chime when loot is picked up. */
export function playPickup() {
  tone(660, 0.12, 'sine', 0.12);
  tone(990, 0.18, 'sine', 0.12, 0.08);
}

/** The bright clink of a thrown coin. */
export function playCoin() {
  tone(1560, 0.1, 'square', 0.06);
  tone(2093, 0.14, 'square', 0.05, 0.06);
}

/** The guard's "!" — a sharp two-tone alert when he spots the thief. */
export function playSpotted() {
  tone(440, 0.1, 'sawtooth', 0.1);
  tone(587, 0.16, 'sawtooth', 0.1, 0.09);
}

/** The jammer's electric buzz. */
export function playJammer() {
  tone(220, 0.3, 'sawtooth', 0.08, 0, 90);
}

/** A low pulsing beep while the alarm is critical. */
export function playAlarmPulse() {
  tone(196, 0.18, 'square', 0.07);
}

/** The descending sting of being caught. */
export function playCaught() {
  tone(392, 0.25, 'sawtooth', 0.12);
  tone(311, 0.3, 'sawtooth', 0.12, 0.2);
  tone(233, 0.5, 'sawtooth', 0.12, 0.42);
}

/** The rising arpeggio of a clean getaway. */
export function playGetaway() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => tone(freq, 0.22, 'sine', 0.12, i * 0.11));
}

/** The click of a menu key. */
export function playClick() {
  tone(880, 0.05, 'sine', 0.08);
}
