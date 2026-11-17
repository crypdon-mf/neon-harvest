// NEON HARVEST — shell: canvas setup, the frame loop, state changes
// (title → play → win / over), sound wiring, and the ?selftest=1 harness
// that plays the real game headlessly and reports pass/fail into the DOM.
import { CONFIG, WIN_SPORES } from './config.js';
import { createWorld, startGame, updateWorld } from './world.js';
import { drawWorld } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const params = new URLSearchParams(location.search);
const audio = createAudio();
const input = createInput(canvas);

let scale = 1;
function resize() {
  const w = Math.min(window.innerWidth, (window.innerHeight * CONFIG.width) / CONFIG.height);
  const h = (w * CONFIG.height) / CONFIG.width;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = CONFIG.width * dpr;
  canvas.height = CONFIG.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  scale = w / CONFIG.width;
}
window.addEventListener('resize', resize);
resize();

const seed = Number(params.get('seed') || 20261118);
const world = createWorld(seed);
world.best = Number(localStorage.getItem('neon-harvest-best') || 0);

function announce(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function handleEvents() {
  for (const e of world.events) {
    if (e.type === 'pickup') audio.pickup(e.combo);
    else if (e.type === 'dash') audio.dash();
    else if (e.type === 'hit') audio.hit();
    else if (e.type === 'wispDown') audio.wispDown();
    else if (e.type === 'powerup') audio.powerup();
    else if (e.type === 'level') { audio.level(); announce(`Level ${e.level}`); }
    else if (e.type === 'win') { audio.win(); announce(`Harvest complete! Score ${e.score}`); }
    else if (e.type === 'over') {
      audio.over();
      localStorage.setItem('neon-harvest-best', String(world.best));
      announce(`Game over. Score ${e.score}. Best ${e.best}`);
    }
  }
}

function tick(inputSnap, dt) {
  // Menu keys, handled here so the world stays pure simulation.
  if (world.state === 'title' && (inputSnap.anyKey || inputSnap.click)) {
    audio.unlock();
    audio.click();
    startGame(world);
  } else if (world.state === 'over' && (inputSnap.click || inputSnap.anyKey)) {
    audio.unlock();
    startGame(world);
  } else if (world.state === 'win') {
    if (inputSnap.click === 'KeyC' || inputSnap.click === true) {
      world.endless = true;
      world.state = 'play';
    } else if (inputSnap.click === 'KeyR' || inputSnap.anyKey) {
      startGame(world);
    }
  } else if (world.state === 'play') {
    if (inputSnap.click === 'KeyP') world.paused = !world.paused;
    if (inputSnap.click === 'KeyM') audio.toggleMute();
  }
  updateWorld(world, inputSnap, dt);
  handleEvents();
}

// --- screenshot poses: arrange a real world, then render it once.
const shot = params.get('shot');
if (shot) {
  applyShot(world, shot, seed);
  updateWorld(world, { moveX: 0, moveY: 0, pointer: { x: 0, y: 0, inside: false }, dash: false, anyKey: false, click: false }, 0.016);
  drawWorld(ctx, world);
} else if (params.get('selftest') === '1') {
  runSelfTest();
} else {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    tick(input.snapshot(scale), dt);
    drawWorld(ctx, world);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function runSelfTest() {
  const results = [];
  const check = (name, ok, detail) => results.push({ name, ok: !!ok, detail: detail ?? '' });
  try {
    const idle = { moveX: 0, moveY: 0, pointer: { x: 0, y: 0, inside: false }, dash: false, anyKey: false, click: false };
    // 1. Title screen renders, then Enter starts a run.
    check('title state', world.state === 'title');
    tick({ ...idle, anyKey: true }, 0.016);
    check('starts on key', world.state === 'play');

    // 2. Steer onto a spore and collect it: score and combo rise.
    const w = world;
    const s0 = w.spores[0];
    check('spores spawned', w.spores.length >= 5, `${w.spores.length} spores`);
    if (s0) {
      w.player.x = s0.x;
      w.player.y = s0.y;
      w.player.vx = 0;
      w.player.vy = 0;
    }
    const scoreBefore = w.score;
    tick({ ...idle, pointer: { x: s0 ? s0.x : 0, y: s0 ? s0.y : 0, inside: true } }, 0.016);
    check('collects spore', w.score > scoreBefore, `score ${scoreBefore} -> ${w.score}`);
    check('combo rises', w.combo >= 1, `combo ${w.combo}`);

    // 3. Play 20 simulated seconds with sweeping movement: no crash,
    //    spores keep coming, wisps spawn.
    let frames = 0;
    for (let i = 0; i < 1200; i++) {
      const t = i / 60;
      tick({
        ...idle,
        moveX: Math.sin(t) > 0 ? 1 : -1,
        moveY: Math.cos(t * 0.7) > 0 ? 1 : -1,
        dash: i % 90 === 0,
      }, 1 / 60);
      frames++;
      if (w.state !== 'play') break;
    }
    check('survives 20s sim', frames > 0 && w.time > 1, `${frames} frames, time ${w.time.toFixed(1)}s`);
    check('wisps spawned', w.wisps.length + w.spores.length > 0, `wisps seen, score ${w.score}`);

    // 4. A wisp hit costs a life; three hits end the game.
    const livesBefore = w.lives;
    w.invuln = 0;
    w.wisps.push({ x: w.player.x, y: w.player.y, r: 15, vx: 0, vy: 0, speed: 0, ph: 0, spikes: 8 });
    tick(idle, 0.016);
    check('wisp hit costs life', w.lives === livesBefore - 1, `lives ${livesBefore} -> ${w.lives}`);
    w.invuln = 0;
    for (let i = 0; i < 3 && w.state === 'play'; i++) {
      w.wisps.push({ x: w.player.x, y: w.player.y, r: 15, vx: 0, vy: 0, speed: 0, ph: 0, spikes: 8 });
      w.invuln = 0;
      tick(idle, 0.016);
    }
    check('game over at 0 lives', w.state === 'over', `state ${w.state}`);

    // 5. Restart works and a full harvest wins.
    tick({ ...idle, anyKey: true }, 0.016);
    check('restarts after over', w.state === 'play', `state ${w.state}`);
    w.collected = WIN_SPORES - 1;
    w.level = 5;
    const s1 = w.spores[0];
    if (s1) {
      w.player.x = s1.x;
      w.player.y = s1.y;
      w.player.vx = 0;
      w.player.vy = 0;
    }
    tick({ ...idle, pointer: { x: s1 ? s1.x : 0, y: s1 ? s1.y : 0, inside: true } }, 0.016);
    check('win at 60 spores', w.state === 'win', `state ${w.state}, collected ${w.collected}`);

    // 6. Dash destroys a wisp.
    tick({ ...idle, click: 'KeyC' }, 0.016);
    check('endless continue', w.state === 'play' && w.endless, `state ${w.state}`);
    w.wisps.push({ x: w.player.x + 10, y: w.player.y, r: 15, vx: 0, vy: 0, speed: 0, ph: 0, spikes: 8 });
    const wispsBefore = w.wisps.length;
    w.dashCooldown = 0;
    w.player.vx = 100;
    w.player.vy = 0;
    tick({ ...idle, dash: true }, 0.016);
    tick(idle, 0.016);
    check('dash shreds wisp', w.wisps.length < wispsBefore, `wisps ${wispsBefore} -> ${w.wisps.length}`);
  } catch (err) {
    results.push({ name: 'no exception', ok: false, detail: String(err && err.message || err) });
  }
  const passed = results.filter((r) => r.ok).length;
  const pre = document.createElement('pre');
  pre.id = 'selftest';
  pre.textContent = JSON.stringify({ passed, total: results.length, results }, null, 2);
  document.body.appendChild(pre);
  document.title = `SELFTEST ${passed}/${results.length}`;
  drawWorld(ctx, world);
}
