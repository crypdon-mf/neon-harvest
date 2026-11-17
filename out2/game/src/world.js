// The simulation: player, spores, wisps, pickups, particles and floating
// score text. It knows nothing about the DOM or the canvas — update() takes
// an input snapshot and a dt, and reports what happened through events[] so
// the shell can play sounds and the renderer can flash and shake.
import { CONFIG, WIN_SPORES } from './config.js';
import { mulberry32, range, pick, clamp, dist2 } from './random.js';

const PICKUP_KINDS = ['shield', 'magnet', 'star'];

export function createWorld(seed) {
  const rng = mulberry32(seed);
  const stars = [];
  for (let i = 0; i < 90; i++) {
    stars.push({
      x: rng() * CONFIG.width,
      y: rng() * CONFIG.height,
      r: range(rng, 0.6, 2.0),
      tw: range(rng, 0.5, 2.5),
      ph: range(rng, 0, Math.PI * 2),
    });
  }
  return {
    rng,
    time: 0,
    state: 'title', // title | play | over | win
    paused: false,
    score: 0,
    best: 0,
    combo: 0,
    comboTimer: 0,
    multiplier: 1,
    lives: CONFIG.lives,
    level: 1,
    collected: 0,
    shake: 0,
    flash: 0,
    dashCooldown: 0,
    dashTime: 0,
    invuln: 0,
    shield: false,
    magnetTimer: 0,
    starTimer: 0,
    pickupTimer: CONFIG.pickupEverySec,
    sporeTimer: 0,
    wispTimer: 2.5,
    endless: false,
    stars,
    player: {
      x: CONFIG.width / 2, y: CONFIG.height / 2,
      vx: 0, vy: 0, r: CONFIG.playerRadius,
      face: 0, trail: [],
    },
    spores: [],
    wisps: [],
    pickups: [],
    particles: [],
    floaters: [],
    events: [],
    banner: null,
  };
}

function burst(world, x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = world.rng() * Math.PI * 2;
    const s = range(world.rng, speed * 0.3, speed);
    world.particles.push({
      x, y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: range(world.rng, 0.35, 0.8), max: 0.8,
      r: range(world.rng, 1.5, 3.5),
      color,
    });
  }
}

function floater(world, x, y, text, color, big) {
  world.floaters.push({ x, y, text, color, life: 1.0, big: !!big });
}

function spawnSpore(world, x, y) {
  const m = 46;
  world.spores.push({
    x: x ?? range(world.rng, m, CONFIG.width - m),
    y: y ?? range(world.rng, m, CONFIG.height - m),
    r: 9,
    ph: range(world.rng, 0, Math.PI * 2),
    drift: range(world.rng, 6, 18),
    kind: world.rng() < 0.12 ? 'gold' : 'spore',
  });
}

function spawnWisp(world) {
  const edge = Math.floor(world.rng() * 4);
  let x, y;
  if (edge === 0) { x = -20; y = range(world.rng, 0, CONFIG.height); }
  else if (edge === 1) { x = CONFIG.width + 20; y = range(world.rng, 0, CONFIG.height); }
  else if (edge === 2) { x = range(world.rng, 0, CONFIG.width); y = -20; }
  else { x = range(world.rng, 0, CONFIG.width); y = CONFIG.height + 20; }
  world.wisps.push({
    x, y, r: 15,
    vx: 0, vy: 0,
    speed: 62 + world.level * 9 + range(world.rng, 0, 22),
    ph: range(world.rng, 0, Math.PI * 2),
    spikes: 8 + Math.floor(world.rng() * 3),
  });
}

function spawnPickup(world) {
  const kind = pick(world.rng, PICKUP_KINDS);
  const m = 60;
  world.pickups.push({
    kind,
    x: range(world.rng, m, CONFIG.width - m),
    y: range(world.rng, m, CONFIG.height - m),
    r: 13,
    ph: range(world.rng, 0, Math.PI * 2),
    life: 9,
  });
}

function startRun(world) {
  const keepBest = world.best;
  const fresh = createWorld((world.rng() * 1e9) | 0);
  Object.assign(world, fresh, { best: keepBest, state: 'play' });
  for (let i = 0; i < 8; i++) spawnSpore(world);
  world.banner = { text: 'HARVEST THE LIGHT', sub: 'Collect spores • Dodge the wisps', life: 2.2 };
  world.events.push({ type: 'start' });
}

export function startGame(world) {
  startRun(world);
}

export function updateWorld(world, input, dt) {
  world.time += dt;
  world.events.length = 0;
  const p = world.player;

  // Timers that tick in every state.
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 2.2);
  if (world.flash > 0) world.flash = Math.max(0, world.flash - dt * 2.5);
  if (world.banner) {
    world.banner.life -= dt;
    if (world.banner.life <= 0) world.banner = null;
  }
  for (const pt of world.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.96;
    pt.vy *= 0.96;
    pt.life -= dt;
  }
  world.particles = world.particles.filter((pt) => pt.life > 0);
  for (const f of world.floaters) {
    f.y -= 34 * dt;
    f.life -= dt * 0.9;
  }
  world.floaters = world.floaters.filter((f) => f.life > 0);

  if (world.state !== 'play' || world.paused) return;

  if (world.invuln > 0) world.invuln -= dt;
  if (world.dashCooldown > 0) world.dashCooldown -= dt;
  if (world.magnetTimer > 0) world.magnetTimer -= dt;
  if (world.starTimer > 0) world.starTimer -= dt;
  if (world.comboTimer > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) {
      world.combo = 0;
      world.multiplier = 1;
    }
  }

  // --- player movement: keys accelerate, mouse steers toward the pointer.
  let ax = input.moveX * CONFIG.playerAccel;
  let ay = input.moveY * CONFIG.playerAccel;
  if (input.moveX === 0 && input.moveY === 0 && input.pointer.inside) {
    const dx = input.pointer.x - p.x;
    const dy = input.pointer.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > 6) {
      ax = (dx / d) * CONFIG.playerAccel * 0.9;
      ay = (dy / d) * CONFIG.playerAccel * 0.9;
    }
  }
  p.vx += ax * dt;
  p.vy += ay * dt;
  const sp = Math.hypot(p.vx, p.vy);
  const max = world.dashTime > 0 ? CONFIG.dashSpeed : CONFIG.playerMaxSpeed;
  if (sp > max) {
    p.vx = (p.vx / sp) * max;
    p.vy = (p.vy / sp) * max;
  }
  if (ax === 0 && ay === 0) {
    p.vx *= Math.pow(CONFIG.playerFriction, dt * 60);
    p.vy *= Math.pow(CONFIG.playerFriction, dt * 60);
  }
  p.x = clamp(p.x + p.vx * dt, p.r, CONFIG.width - p.r);
  p.y = clamp(p.y + p.vy * dt, p.r, CONFIG.height - p.r);
  if (sp > 20) p.face = Math.atan2(p.vy, p.vx);
  p.trail.unshift({ x: p.x, y: p.y });
  if (p.trail.length > 14) p.trail.pop();

  // --- dash: burst of speed, brief invulnerability, destroys wisps touched.
  if (input.dash && world.dashCooldown <= 0) {
    const dir = sp > 30 ? Math.atan2(p.vy, p.vx) : p.face;
    p.vx = Math.cos(dir) * CONFIG.dashSpeed;
    p.vy = Math.sin(dir) * CONFIG.dashSpeed;
    world.dashTime = CONFIG.dashTime;
    world.dashCooldown = CONFIG.dashCooldown;
    world.invuln = Math.max(world.invuln, 0.28);
    burst(world, p.x, p.y, CONFIG.colors.player, 10, 160);
    world.events.push({ type: 'dash' });
  }
  if (world.dashTime > 0) world.dashTime -= dt;

  // --- spawning.
  world.sporeTimer -= dt;
  if (world.sporeTimer <= 0 && world.spores.length < CONFIG.sporeTarget) {
    spawnSpore(world);
    world.sporeTimer = Math.max(0.35, 1.15 - world.level * 0.07);
  }
  world.wispTimer -= dt;
  const wispCap = Math.min(2 + world.level, CONFIG.wispCapBase + world.level + 1);
  if (world.wispTimer <= 0 && world.wisps.length < wispCap) {
    spawnWisp(world);
    world.wispTimer = Math.max(1.4, 3.6 - world.level * 0.28);
  }
  world.pickupTimer -= dt;
  if (world.pickupTimer <= 0) {
    spawnPickup(world);
    world.pickupTimer = CONFIG.pickupEverySec;
  }

  // --- spores drift, bob, and get collected (magnet pulls them in).
  for (const s of world.spores) {
    s.ph += dt * 2;
    s.x += Math.sin(s.ph * 0.6) * s.drift * dt * 0.4;
    s.y += Math.cos(s.ph * 0.5) * s.drift * dt * 0.4;
    if (world.magnetTimer > 0) {
      const dx = p.x - s.x;
      const dy = p.y - s.y;
      const d = Math.hypot(dx, dy);
      if (d < 220 && d > 1) {
        s.x += (dx / d) * 260 * dt;
        s.y += (dy / d) * 260 * dt;
      }
    }
  }
  for (let i = world.spores.length - 1; i >= 0; i--) {
    const s = world.spores[i];
    if (dist2(p.x, p.y, s.x, s.y) < (p.r + s.r) * (p.r + s.r)) {
      world.spores.splice(i, 1);
      world.combo += 1;
      world.comboTimer = CONFIG.comboWindow;
      world.multiplier = 1 + Math.floor(world.combo / 4);
      const base = CONFIG.sporeScore * (s.kind === 'gold' ? 3 : 1);
      const gained = base * world.multiplier * (world.starTimer > 0 ? 2 : 1);
      world.score += gained;
      world.collected += 1;
      burst(world, s.x, s.y, s.kind === 'gold' ? '#ffe94f' : CONFIG.colors.spore, s.kind === 'gold' ? 16 : 9, 150);
      floater(world, s.x, s.y - 10, `+${gained}`, s.kind === 'gold' ? '#ffe94f' : CONFIG.colors.spore, world.combo >= 8);
      if (world.combo > 0 && world.combo % 8 === 0) {
        floater(world, p.x, p.y - 26, `COMBO x${world.multiplier}`, '#ff4fd8', true);
      }
      world.events.push({ type: 'pickup', combo: world.combo });
      const newLevel = Math.floor(world.collected / CONFIG.sporesPerLevel) + 1;
      if (newLevel > world.level) {
        world.level = newLevel;
        world.banner = { text: `LEVEL ${world.level}`, sub: 'The meadow grows hungrier', life: 1.8 };
        world.events.push({ type: 'level', level: world.level });
      }
      if (!world.endless && world.collected >= WIN_SPORES) {
        world.state = 'win';
        world.events.push({ type: 'win', score: world.score });
      }
    }
  }

  // --- wisps chase the player; a dashing player shreds them.
  for (let i = world.wisps.length - 1; i >= 0; i--) {
    const w = world.wisps[i];
    w.ph += dt * 3;
    const dx = p.x - w.x;
    const dy = p.y - w.y;
    const d = Math.hypot(dx, dy) || 1;
    w.vx += (dx / d) * w.speed * 2.4 * dt;
    w.vy += (dy / d) * w.speed * 2.4 * dt;
    const ws = Math.hypot(w.vx, w.vy);
    if (ws > w.speed) {
      w.vx = (w.vx / ws) * w.speed;
      w.vy = (w.vy / ws) * w.speed;
    }
    w.x += w.vx * dt;
    w.y += w.vy * dt;
    const rr = (p.r + w.r) * (p.r + w.r);
    if (dist2(p.x, p.y, w.x, w.y) < rr) {
      if (world.dashTime > 0) {
        world.wisps.splice(i, 1);
        world.score += CONFIG.wispScore * world.multiplier;
        burst(world, w.x, w.y, CONFIG.colors.wisp, 22, 260);
        floater(world, w.x, w.y - 12, `+${CONFIG.wispScore * world.multiplier}`, CONFIG.colors.wisp, true);
        world.shake = 0.35;
        world.events.push({ type: 'wispDown' });
        continue;
      }
      if (world.invuln > 0) continue;
      world.wisps.splice(i, 1);
      if (world.shield) {
        world.shield = false;
        world.invuln = 1.2;
        world.shake = 0.6;
        world.flash = 0.5;
        burst(world, p.x, p.y, CONFIG.colors.shield, 24, 240);
        floater(world, p.x, p.y - 26, 'SHIELD SAVED YOU', CONFIG.colors.shield, true);
        world.events.push({ type: 'shieldBreak' });
      } else {
        world.lives -= 1;
        world.combo = 0;
        world.multiplier = 1;
        world.invuln = 1.6;
        world.shake = 0.9;
        world.flash = 0.7;
        burst(world, p.x, p.y, CONFIG.colors.wisp, 30, 320);
        world.events.push({ type: 'hit', lives: world.lives });
        if (world.lives <= 0) {
          world.state = 'over';
          if (world.score > world.best) world.best = world.score;
          world.events.push({ type: 'over', score: world.score, best: world.best });
        }
      }
    }
  }

  // --- pickups: shield, magnet, double-score star.
  for (let i = world.pickups.length - 1; i >= 0; i--) {
    const pk = world.pickups[i];
    pk.ph += dt * 2;
    pk.life -= dt;
    if (pk.life <= 0) {
      world.pickups.splice(i, 1);
      continue;
    }
    if (dist2(p.x, p.y, pk.x, pk.y) < (p.r + pk.r) * (p.r + pk.r)) {
      world.pickups.splice(i, 1);
      if (pk.kind === 'shield') {
        world.shield = true;
        floater(world, p.x, p.y - 26, 'SHIELD!', CONFIG.colors.shield, true);
      } else if (pk.kind === 'magnet') {
        world.magnetTimer = 8;
        floater(world, p.x, p.y - 26, 'MAGNET 8s', CONFIG.colors.magnet, true);
      } else {
        world.starTimer = 10;
        floater(world, p.x, p.y - 26, 'DOUBLE SCORE 10s', CONFIG.colors.star, true);
      }
      burst(world, pk.x, pk.y, '#ffffff', 14, 180);
      world.events.push({ type: 'powerup', kind: pk.kind });
    }
  }
}
