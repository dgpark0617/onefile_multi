/** 마리오풍 칩튠 BGM — Intro / A / A' / B / Bridge / Return (약 13초 루프) */
let ctx = null;
let master = null;
let timer = null;
let started = false;
let muted = false;

const TEMPO = 150;
const BEAT = 60 / TEMPO;
const LOOP_BEATS = 32;

const C3 = 130.81, D3 = 146.83, E3 = 164.81, F3 = 174.61, G3 = 196.0, A3 = 220.0;
const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.0, A4 = 440.0, B4 = 493.88;
const C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99, A5 = 880.0, B5 = 987.77;
const C6 = 1046.5, D6 = 1174.66;

/** [startBeat, durBeats, freq] — 오리지널(SMB 멜로디 복제 아님) */
const MELODY = [
  // Intro
  [0.0, 0.25, E5], [0.25, 0.25, E5], [0.5, 0.25, E5],
  [1.0, 0.35, C5], [1.5, 0.35, E5],
  [2.0, 0.7, G5],
  [3.0, 0.4, G4],

  // Theme A
  [4.0, 0.35, C5], [4.5, 0.2, G4], [5.0, 0.2, E4],
  [5.5, 0.35, A4], [6.0, 0.2, B4], [6.5, 0.35, A4],
  [7.0, 0.3, G4], [7.5, 0.2, E5], [8.0, 0.2, G5], [8.5, 0.45, A5],
  [9.0, 0.2, F5], [9.5, 0.2, G5], [10.0, 0.45, E5],
  [10.75, 0.2, C5], [11.0, 0.2, D5], [11.5, 0.45, B4],

  // Theme A'
  [12.0, 0.35, C6], [12.5, 0.2, G5], [13.0, 0.2, E5],
  [13.5, 0.35, A5], [14.0, 0.2, B5], [14.5, 0.35, A5],
  [15.0, 0.75, G5],

  // Theme B
  [16.0, 0.3, F5], [16.5, 0.2, F5], [17.0, 0.35, F5],
  [17.5, 0.2, E5], [18.0, 0.35, D5],
  [18.5, 0.35, E5], [19.0, 0.35, C5], [19.5, 0.35, A4],
  [20.0, 0.3, G4], [20.5, 0.2, A4], [21.0, 0.2, B4],
  [21.5, 0.4, C5], [22.25, 0.2, D5], [22.5, 0.2, E5],
  [23.0, 0.7, F5],

  // Bridge arpeggio
  [24.0, 0.18, C5], [24.25, 0.18, E5], [24.5, 0.18, G5], [24.75, 0.18, C6],
  [25.0, 0.18, G5], [25.25, 0.18, E5], [25.5, 0.18, C5], [25.75, 0.18, E5],
  [26.0, 0.18, D5], [26.25, 0.18, F5], [26.5, 0.18, A5], [26.75, 0.18, D6],
  [27.0, 0.18, A5], [27.25, 0.18, F5], [27.5, 0.4, D5],

  // Return
  [28.0, 0.22, E5], [28.25, 0.22, G5], [28.5, 0.4, C6],
  [29.0, 0.22, B5], [29.35, 0.22, A5], [29.7, 0.35, G5],
  [30.2, 0.2, E5], [30.5, 0.2, G5], [31.0, 0.75, C6],
];

const HARMONY = [
  [4.0, 0.35, E4], [5.5, 0.35, E4], [7.0, 0.35, C4], [8.5, 0.4, E5],
  [10.0, 0.4, C5], [11.5, 0.4, G4],
  [12.0, 0.35, E5], [13.5, 0.35, E5], [15.0, 0.65, E5],
  [16.0, 0.35, A4], [18.5, 0.35, A4], [20.0, 0.35, E4], [21.5, 0.4, E4],
  [23.0, 0.6, A4],
  [28.5, 0.35, E5], [29.7, 0.35, E5], [31.0, 0.65, G5],
];

const BASS = [
  [0, 0.45, C3], [1, 0.45, G3], [2, 0.45, C3], [3, 0.45, G3],
  [4, 0.4, C3], [4.5, 0.4, G3], [5, 0.4, C3], [5.5, 0.4, G3],
  [6, 0.4, A3], [6.5, 0.4, E3], [7, 0.4, A3], [7.5, 0.4, E3],
  [8, 0.4, F3], [8.5, 0.4, C3], [9, 0.4, F3], [9.5, 0.4, C3],
  [10, 0.4, G3], [10.5, 0.4, D3], [11, 0.4, G3], [11.5, 0.4, D3],
  [12, 0.4, C3], [12.5, 0.4, G3], [13, 0.4, C3], [13.5, 0.4, G3],
  [14, 0.4, A3], [14.5, 0.4, E3], [15, 0.45, G3], [15.5, 0.4, G3],
  [16, 0.4, F3], [16.5, 0.4, C3], [17, 0.4, F3], [17.5, 0.4, C3],
  [18, 0.4, C3], [18.5, 0.4, G3], [19, 0.4, A3], [19.5, 0.4, E3],
  [20, 0.4, F3], [20.5, 0.4, C3], [21, 0.4, G3], [21.5, 0.4, D3],
  [22, 0.4, A3], [22.5, 0.4, E3], [23, 0.45, F3], [23.5, 0.4, F3],
  [24, 0.4, C3], [24.5, 0.4, E3], [25, 0.4, G3], [25.5, 0.4, C4],
  [26, 0.4, D3], [26.5, 0.4, F3], [27, 0.4, A3], [27.5, 0.4, D4],
  [28, 0.4, C3], [28.5, 0.4, G3], [29, 0.4, A3], [29.5, 0.4, G3],
  [30, 0.4, F3], [30.5, 0.4, G3], [31, 0.7, C3],
];

function ensure() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.13;
  master.connect(ctx.destination);
}

function beep(freq, start, dur, type = "square", vol = 0.35) {
  if (!ctx || !master || muted || ctx.state !== "running" || !freq) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = Math.max(start, ctx.currentTime + 0.005);
  const d = Math.max(0.04, dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(g);
  g.connect(master);
  o.start(t0);
  o.stop(t0 + d + 0.02);
}

function playTrack(notes, t0, type, vol) {
  for (const [b, d, f] of notes) {
    beep(f, t0 + b * BEAT, d * BEAT * 0.92, type, vol);
  }
}

function playDrum(t0) {
  for (let i = 0; i < LOOP_BEATS * 2; i++) {
    beep(2100 + (i % 3) * 80, t0 + i * (BEAT / 2), 0.028, "square", i % 2 === 0 ? 0.038 : 0.022);
  }
  for (let i = 0; i < LOOP_BEATS; i++) {
    const t = t0 + i * BEAT;
    if (i % 2 === 0) beep(95, t, 0.07, "triangle", 0.2);
    if (i % 4 === 2) beep(190, t, 0.055, "square", 0.075);
  }
}

function scheduleLoop(when) {
  if (!ctx || muted || !started) return;
  const t = Math.max(when, ctx.currentTime + 0.03);
  playTrack(MELODY, t, "square", 0.29);
  playTrack(HARMONY, t, "square", 0.1);
  playTrack(BASS, t, "triangle", 0.3);
  playDrum(t);

  const waitMs = Math.max(80, LOOP_BEATS * BEAT * 1000 - 40);
  timer = setTimeout(() => {
    if (started && !muted) scheduleLoop(ctx.currentTime + 0.02);
  }, waitMs);
}

export function startBgm() {
  ensure();
  if (!ctx) return;
  muted = false;
  if (master) master.gain.setValueAtTime(0.13, ctx.currentTime);

  const kick = () => {
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume()
        .then(() => {
          if (!started) {
            started = true;
            scheduleLoop(ctx.currentTime + 0.05);
          }
        })
        .catch(() => {});
      return;
    }
    if (!started) {
      started = true;
      scheduleLoop(ctx.currentTime + 0.05);
    }
  };

  kick();
  const onGesture = () => {
    kick();
    window.removeEventListener("pointerdown", onGesture);
    window.removeEventListener("keydown", onGesture);
  };
  window.addEventListener("pointerdown", onGesture);
  window.addEventListener("keydown", onGesture);
}

export function stopBgm() {
  started = false;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (master && ctx) {
    try {
      master.gain.setValueAtTime(0.0001, ctx.currentTime);
    } catch {
      /* ignore */
    }
  }
}

export function toggleBgmMute() {
  muted = !muted;
  if (master && ctx) master.gain.setValueAtTime(muted ? 0.0001 : 0.13, ctx.currentTime);
  if (!muted && started && ctx?.state === "running") {
    if (timer) clearTimeout(timer);
    scheduleLoop(ctx.currentTime + 0.05);
  }
  return muted;
}
