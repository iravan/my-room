// All sound is synthesized once at start-up (ports of the Unity build's Synth.cs, tag unity-final): no audio files.
// The context starts on the first click or key press (browsers block audio before a gesture).
import { rng } from "./paint";

const RATE = 22050;
type Sample = (t: number) => number;

// Render `seconds` of audio; loops get their extra tail crossfaded into the head so the seam is inaudible.
function render(seconds: number, loop: boolean, sample: Sample) {
  const n = Math.floor(RATE * seconds), fade = loop ? RATE / 10 : 0;
  const d = new Float32Array(n + fade);
  for (let i = 0; i < d.length; i++) d[i] = sample(i / RATE);
  for (let i = 0; i < fade; i++) d[i] = d[n + i] + (d[i] - d[n + i]) * (i / fade);
  return d.subarray(0, n);
}

const noise = (seed: number) => { const r = rng(seed); return () => r() * 2 - 1; };
const TAU = 2 * Math.PI;

// Mains hum + motor whine; whole cycles in 1 s.
function hum() { const w = noise(2); return render(1, true, (t) => Math.sin(TAU * 50 * t) * 0.5 + Math.sin(TAU * 100 * t) * 0.2 + w() * 0.025); }
function click() { const w = noise(3); return render(0.06, false, (t) => Math.exp(-t * 120) * (w() * 0.6 + Math.sin(TAU * 1800 * t) * 0.4)); }
// Cardboard-on-vinyl swish: band-passed noise under a soft envelope.
function slide() {
  const w = noise(4); let lo = 0, lower = 0;
  return render(0.45, false, (t) => { lo += (w() - lo) * 0.3; lower += (lo - lower) * 0.05; return (lo - lower) * Math.sin((Math.PI * t) / 0.45) * 0.8; });
}

// ---------- playback ----------

type Engine = { ctx: AudioContext; master: GainNode; hum: GainNode; sfx: Record<"click" | "slide", AudioBuffer> };
let engine: Engine | null = null;
let level = 0.8; // volume × !muted, applied when the engine starts

const buffer = (ctx: AudioContext, d: Float32Array) => {
  const b = ctx.createBuffer(1, d.length, RATE);
  b.copyToChannel(d as Float32Array<ArrayBuffer>, 0);
  return b;
};
function loop(ctx: AudioContext, d: Float32Array, out: AudioNode, gain: number) {
  const src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = buffer(ctx, d);
  src.loop = true;
  g.gain.value = gain;
  src.connect(g).connect(out);
  src.start();
  return g;
}
export function startAudio() {
  if (engine) { if (engine.ctx.state === "suspended") engine.ctx.resume(); return; }
  const ctx = new AudioContext(), master = ctx.createGain();
  master.gain.value = level;
  master.connect(ctx.destination);
  const humGain = loop(ctx, hum(), master, 0);
  engine = { ctx, master, hum: humGain, sfx: { click: buffer(ctx, click()), slide: buffer(ctx, slide()) } };
}

export function setLevel(v: number) {
  level = v;
  if (engine) engine.master.gain.setTargetAtTime(v, engine.ctx.currentTime, 0.02);
}

export function sfx(name: "click" | "slide", gain: number) {
  if (!engine) return;
  const src = engine.ctx.createBufferSource(), g = engine.ctx.createGain();
  src.buffer = engine.sfx[name];
  g.gain.value = gain;
  src.connect(g).connect(engine.master);
  src.start();
}

// Platter hum follows the spin speed (0..1 of 45 rpm).
export function setHum(k: number) {
  if (engine) engine.hum.gain.value = k * 0.3;
}

