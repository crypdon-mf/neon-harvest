// Deterministic poses for the bounty screenshots: ?shot=start|play|combo|end
// with &seed=N. The game itself never reads these — they only arrange a
// real world state, so every screenshot is a genuine render of the code.
import { CONFIG, WIN_SPORES } from './config.js';
import { createWorld, startGame } from './world.js';

function scatterSpores(world, n, seed) {
  const rng = world.rng;
  for (let i = 0; i < n; i++) {
    world.spores.push({
      x: 60 + rng() * (CONFIG.width - 120),
      y: 90 + rng() * (CONFIG.height - 180),
      r: 9,
      ph: rng() * Math.PI * 2,
      drift: 10,
      kind: rng() < 0.15 ? 'gold' : 'spore',
    });
  }
}

function scatterWisps(world, n) {
  const rng = world.rng;
  for (let i = 0; i < n; i++) {
    world.wisps.push({
      x: 80 + rng() * (CONFIG.width - 160),
      y: 110 + rng() * (CONFIG.height - 200),
      r: 15, vx: 0, vy: 0,
      speed: 80,
      ph: rng() * Math.PI * 2,
      spikes: 9,
    });
  }
}

function burstAt(world, x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = world.rng() * Math.PI * 2;
    const s = 60 + world.rng() * 160;
    world.particles.push({
      x, y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 0.5 + world.rng() * 0.3, max: 0.8,
      r: 1.5 + world.rng() * 2,
      color,
    });
  }
}

export function applyShot(world, name, seed) {
  if (name === 'start') {
    world.state = 'title';
    return;
  }
  startGame(world);
  world.player.x = CONFIG.width * 0.42;
  world.player.y = CONFIG.height * 0.55;
  world.player.face = -0.4;

  if (name === 'play') {
    world.score = 1240;
    world.combo = 5;
    world.multiplier = 2;
    world.comboTimer = 2.1;
    world.level = 2;
    world.collected = 17;
    world.best = 3420;
    world.dashCooldown = 0;
    scatterSpores(world, 12);
    scatterWisps(world, 3);
    world.pickups.push({ kind: 'shield', x: 720, y: 180, r: 13, ph: 1, life: 8 });
    burstAt(world, 560, 300, CONFIG.colors.spore, 12);
    burstAt(world, 430, 380, '#ff4fd8', 8);
    world.floaters.push({ x: 560, y: 280, text: '+20', color: CONFIG.colors.spore, life: 0.8, big: false });
    world.floaters.push({ x: 430, y: 350, text: 'COMBO x2', color: '#ff4fd8', life: 0.9, big: true });
    world.banner = { text: 'LEVEL 2', sub: 'The meadow grows hungrier', life: 1.6 };
  } else if (name === 'combo') {
    world.score = 3420;
    world.combo = 16;
    world.multiplier = 5;
    world.comboTimer = 2.8;
    world.level = 3;
    world.collected = 31;
    world.best = 3420;
    world.starTimer = 6;
    world.shield = true;
    scatterSpores(world, 14);
    scatterWisps(world, 4);
    burstAt(world, 480, 300, '#ffc357', 26);
    burstAt(world, 380, 220, '#ff4fd8', 16);
    burstAt(world, 600, 380, '#35f2d0', 16);
    world.floaters.push({ x: 480, y: 270, text: '+50', color: '#ffc357', life: 0.9, big: true });
    world.floaters.push({ x: 480, y: 230, text: 'COMBO x5', color: '#ff4fd8', life: 0.9, big: true });
    world.floaters.push({ x: 600, y: 350, text: '+25', color: '#ff4f6d', life: 0.8, big: false });
  } else if (name === 'end') {
    world.state = 'over';
    world.banner = null;
    world.score = 2860;
    world.best = 3420;
    world.lives = 0;
    world.level = 3;
    world.collected = 29;
    world.combo = 0;
    scatterSpores(world, 6);
    scatterWisps(world, 2);
    burstAt(world, CONFIG.width * 0.42, CONFIG.height * 0.55, '#ff4f6d', 20);
  } else {
    world.state = 'title';
  }
}
