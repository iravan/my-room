// Headless-Chrome check: screenshots of every view, a camera drag scanned for flashes and 64-px tile artifacts, FPS.
// No dependencies: Chrome DevTools Protocol over the built-in WebSocket, PNGs decoded with zlib.
//   node --experimental-websocket scripts/check.mjs [url] [outdir]       (Node 22+ needs no flag)
//   node scripts/check.mjs --analyze a.png b.png ...                     (score saved frames)
// Exit 1 on page errors or artifacts. CHROME=/path overrides the browser.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

function decodePng(buf) {
  let p = 8, w = 0, h = 0, type = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), kind = buf.toString("ascii", p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (kind === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); type = data[9]; if (data[8] !== 8 || data[12]) throw new Error("only 8-bit non-interlaced PNG"); }
    if (kind === "IDAT") idat.push(data);
    p += 12 + len;
  }
  const bpp = type === 6 ? 4 : type === 2 ? 3 : 0;
  if (!bpp) throw new Error("only RGB/RGBA PNG");
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp, px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, row = y * stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? px[row + i - bpp] : 0, b = y ? px[row - stride + i] : 0, c = i >= bpp && y ? px[row - stride + i - bpp] : 0;
      let v = raw[src + i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[row + i] = v;
    }
  }
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = (px[i * bpp] + px[i * bpp + 1] + px[i * bpp + 2]) / 3;
  return { w, h, lum };
}

// Tile artifacts are hard steps on a 64-px grid with flat pixels either side. Count such steps on grid lines
// against the average off-grid line: a clean image scores ~1, the Unity WebGL bug scores far higher.
export function tileScore({ w, h, lum }, T = 64) {
  const at = (x, y) => lum[y * w + x];
  const steps = (n, len, get, onGrid) => {
    const out = new Float64Array(n);
    for (let i = 4; i < n - 3; i++) {
      let c = 0;
      for (let j = 0; j < len; j += 2) {
        // step across i-2..i+1 (screenshots soften edges over ~3 px), flat on both sides
        const d = Math.abs(get(i + 1, j) - get(i - 2, j));
        if (d > 2 && d < 40 && Math.abs(get(i - 2, j) - get(i - 4, j)) < d / 3 && Math.abs(get(i + 3, j) - get(i + 1, j)) < d / 3) c++;
      }
      out[i] = c;
    }
    const grid = [];
    let off = 0, on = 0;
    for (let i = 4; i < n - 3; i++) if (onGrid(i)) grid.push(out[i]); else { off += out[i]; on++; }
    // drop the two strongest grid lines: a real wall corner can sit on one, a tile bug spans many
    grid.sort((a, b) => a - b).splice(-2);
    return (grid.reduce((a, b) => a + b, 0) / Math.max(grid.length, 1) + 1) / (off / Math.max(on, 1) + 1);
  };
  // GL's origin is bottom-left, so tile rows line up from the bottom of the canvas.
  return Math.max(steps(w, h, (x, y) => at(x, y), (x) => x % T === 0), steps(h, w, (y, x) => at(x, y), (y) => (h - y) % T === 0));
}

const mean = ({ lum }) => lum.reduce((s, v) => s + v, 0) / lum.length;

if (process.argv[2] === "--analyze") {
  for (const f of process.argv.slice(3)) { const img = decodePng(fs.readFileSync(f)); console.log(path.basename(f), "tile", tileScore(img).toFixed(2), "mean", mean(img).toFixed(1)); }
  process.exit(0);
}

const url = process.argv[2] || "http://127.0.0.1:3100/";
const out = process.argv[3] || path.join(os.tmpdir(), "room-check");
fs.mkdirSync(out, { recursive: true });
const port = 9400 + Math.floor(Math.random() * 400);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "room-chrome-"));
const chrome = spawn(process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", `--remote-debugging-port=${port}`, "--remote-allow-origins=*",
  `--user-data-dir=${profile}`, "--window-size=1280,720", "--autoplay-policy=no-user-gesture-required", "about:blank",
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const quit = (code) => { chrome.kill(); fs.rmSync(profile, { recursive: true, force: true }); process.exit(code); };

let tabs;
for (let i = 0; i < 50 && !tabs; i++) { await sleep(200); tabs = await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json()).catch(() => null); }
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = {}, errors = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending[m.id]) { pending[m.id](m.result); delete pending[m.id]; }
  if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(m.params.args.map((a) => a.value ?? a.description).join(" "));
};
const send = (method, params = {}) => new Promise((r) => { pending[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
const grab = async () => Buffer.from((await send("Page.captureScreenshot", { format: "png" })).data, "base64");
const key = async (k) => {
  const code = /\d/.test(k) ? `Digit${k}` : k;
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: k === "Escape" ? 27 : k.charCodeAt(0) });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code });
};
const mouse = (type, x, y) => send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mouseReleased" ? 0 : 1, clickCount: 1 });

await send("Runtime.enable");
await send("Page.navigate", { url });
await sleep(5000);
await mouse("mousePressed", 640, 360); await mouse("mouseReleased", 640, 360); // dismisses a title screen, unlocks audio
await sleep(1500);

const report = { url, views: [], drag: {}, fps: 0, errors: [] };
for (const [k, name] of [["2", "turntable"], ["3", "crate"], ["4", "shelf"], ["1", "room"]]) {
  await key(k); await sleep(2000);
  const png = await grab();
  fs.writeFileSync(path.join(out, `view-${name}.png`), png);
  report.views.push({ name, tile: +tileScore(decodePng(png)).toFixed(2) });
}

// Turn the camera in small steps, one frame each way, scanning every frame.
const frames = [];
await mouse("mousePressed", 300, 360);
for (let i = 0; i < 60; i++) {
  await mouse("mouseMoved", 300 + (i < 30 ? i : 60 - i) * 14, 360);
  const png = await grab(), img = decodePng(png);
  frames.push({ i, tile: tileScore(img), mean: mean(img), png });
}
await mouse("mouseReleased", 300, 360);
const flagged = frames.filter((f, i) => {
  const flash = i > 0 && i < frames.length - 1 && Math.abs(f.mean - (frames[i - 1].mean + frames[i + 1].mean) / 2) > 6;
  return f.tile > 1.6 || flash;
});
for (const f of flagged) fs.writeFileSync(path.join(out, `drag-${String(f.i).padStart(2, "0")}.png`), f.png);
report.drag = { frames: frames.length, worstTile: +Math.max(...frames.map((f) => f.tile)).toFixed(2), flagged: flagged.map((f) => f.i) };

const fps = await send("Runtime.evaluate", {
  expression: "new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; performance.now() - t0 < 3000 ? requestAnimationFrame(f) : r(n / 3); }; requestAnimationFrame(f); })",
  awaitPromise: true, returnByValue: true,
});
report.fps = Math.round(fps.result.value);

report.errors = [...new Set(errors)].slice(0, 10);
console.log(JSON.stringify(report, null, 1));
console.log(`screenshots: ${out}`);
quit(errors.length || flagged.length ? 1 : 0);
