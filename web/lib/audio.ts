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
const clamp = (v: number) => Math.min(1, Math.max(-1, v));
const TAU = 2 * Math.PI;

// Rain hiss + low room rumble + the odd droplet.
function rain() {
  const w = noise(1); let hiss = 0, rumble = 0, drop = 0;
  return render(6, true, () => {
    const x = w();
    hiss += (x - hiss) * 0.25;
    rumble = clamp(rumble + x * 0.02) * 0.998;
    drop = Math.abs(x) > 0.9996 ? 1 : drop * 0.995;
    return hiss * 0.25 + rumble * 0.3 + drop * x * 0.2;
  });
}
// Mains hum + motor whine; whole cycles in 1 s.
function hum() { const w = noise(2); return render(1, true, (t) => Math.sin(TAU * 50 * t) * 0.5 + Math.sin(TAU * 100 * t) * 0.2 + w() * 0.025); }
// Gaming-PC fan: airy low-passed noise plus a soft blade tone.
function fan() {
  const w = noise(5); let air = 0;
  return render(2, true, (t) => { air += (w() - air) * 0.08; return air * 0.5 + Math.sin(TAU * 180 * t) * 0.05 + Math.sin(TAU * 360 * t) * 0.02; });
}
// The city far below: rumble, tyre hiss, three cars swelling past per 12 s.
function traffic() {
  const w = noise(6); let rumble = 0, hiss = 0, hissLow = 0;
  return render(12, true, (t) => {
    const x = w();
    rumble = clamp(rumble + x * 0.01) * 0.999;
    hiss += (x - hiss) * 0.2;
    hissLow += (hiss - hissLow) * 0.02;
    const pass = [2.5, 6.8, 10.1].reduce((s, c) => s + Math.exp(-(((t - c) / 0.9) ** 2)), 0);
    return rumble * 0.5 + (hiss - hissLow) * (0.08 + 0.35 * pass);
  });
}
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
// A looping sound placed in the room: linear fade from 0.5 m to maxDistance, panned by direction.
function placed(ctx: AudioContext, d: Float32Array, out: AudioNode, gain: number, [x, y, z]: number[], maxDistance: number) {
  const p = new PannerNode(ctx, { panningModel: "equalpower", distanceModel: "linear", refDistance: 0.5, maxDistance, rolloffFactor: 1, positionX: x, positionY: y, positionZ: z });
  loop(ctx, d, p, gain);
  p.connect(out);
}

export function startAudio() {
  if (engine) { if (engine.ctx.state === "suspended") engine.ctx.resume(); return; }
  const ctx = new AudioContext(), master = ctx.createGain();
  master.gain.value = level;
  master.connect(ctx.destination);
  loop(ctx, rain(), master, 0.25);
  const humGain = loop(ctx, hum(), master, 0);
  placed(ctx, fan(), master, 0.35, [-1.7, 0.3, 0.95], 4); // gaming PC under the desk (three coords: Unity z negated)
  placed(ctx, traffic(), master, 0.5, [-0.3, 1.5, -2.3], 7); // the city, outside the window
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

// Ears = camera.
export function setListener(p: { x: number; y: number; z: number }, fwd: { x: number; y: number; z: number }, up: { x: number; y: number; z: number }) {
  if (!engine) return;
  const l = engine.ctx.listener;
  if (l.positionX) {
    l.positionX.value = p.x; l.positionY.value = p.y; l.positionZ.value = p.z;
    l.forwardX.value = fwd.x; l.forwardY.value = fwd.y; l.forwardZ.value = fwd.z;
    l.upX.value = up.x; l.upY.value = up.y; l.upZ.value = up.z;
  } else {
    l.setPosition(p.x, p.y, p.z);
    l.setOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z);
  }
}
