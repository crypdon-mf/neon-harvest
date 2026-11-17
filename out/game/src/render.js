// Everything the player sees: the neon meadow, the drone, spores, wisps,
// particles, the HUD and the title / pause / win / game-over screens.
// Drawing only — it never changes the world.
import { CONFIG, WIN_SPORES } from './config.js';

function glowCircle(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, world) {
  ctx.fillStyle = CONFIG.colors.bg;
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  const g = ctx.createRadialGradient(
    CONFIG.width / 2, CONFIG.height * 0.42, 60,
    CONFIG.width / 2, CONFIG.height * 0.42, 620,
  );
  g.addColorStop(0, CONFIG.colors.bgGlow);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

  ctx.strokeStyle = CONFIG.colors.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= CONFIG.width; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CONFIG.height); ctx.stroke();
  }
  for (let y = 0; y <= CONFIG.height; y += 60) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CONFIG.width, y); ctx.stroke();
  }

  for (const s of world.stars) {
    const a = 0.25 + 0.55 * Math.abs(Math.sin(world.time * s.tw + s.ph));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#cfe4ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawSpore(ctx, s) {
  const bob = Math.sin(s.ph) * 2;
  const gold = s.kind === 'gold';
  const color = gold ? '#ffe94f' : CONFIG.colors.spore;
  glowCircle(ctx, s.x, s.y + bob, 26, color, 0.35);
  ctx.fillStyle = gold ? CONFIG.colors.sporeCore : color;
  ctx.beginPath();
  ctx.arc(s.x, s.y + bob, gold ? 7 : 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(s.x, s.y + bob, s.r + 4 + Math.sin(s.ph * 2) * 1.5, 0, Math.PI * 2);
  ctx.stroke();
}

function drawWisp(ctx, w) {
  glowCircle(ctx, w.x, w.y, 44, CONFIG.colors.wisp, 0.3);
  ctx.fillStyle = CONFIG.colors.wispCore;
  ctx.strokeStyle = CONFIG.colors.wisp;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < w.spikes; i++) {
    const a = (i / w.spikes) * Math.PI * 2 + w.ph * 0.3;
    const r1 = w.r + Math.sin(w.ph * 2 + i) * 4;
    const r2 = w.r * 0.55;
    const a2 = a + Math.PI / w.spikes;
    ctx.lineTo(w.x + Math.cos(a) * r1, w.y + Math.sin(a) * r1);
    ctx.lineTo(w.x + Math.cos(a2) * r2, w.y + Math.sin(a2) * r2);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ff8ba0';
  ctx.beginPath();
  ctx.arc(w.x - 4, w.y - 3, 2.5, 0, Math.PI * 2);
  ctx.arc(w.x + 4, w.y - 3, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawPickup(ctx, pk) {
  const bob = Math.sin(pk.ph) * 3;
  const color = pk.kind === 'shield' ? CONFIG.colors.shield
    : pk.kind === 'magnet' ? CONFIG.colors.magnet : CONFIG.colors.star;
  const blink = pk.life < 3 ? (Math.sin(pk.ph * 6) > 0 ? 1 : 0.35) : 1;
  ctx.globalAlpha = blink;
  glowCircle(ctx, pk.x, pk.y + bob, 34, color, 0.4);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(pk.x, pk.y + bob, pk.r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const glyph = pk.kind === 'shield' ? '◈' : pk.kind === 'magnet' ? '◎' : '★';
  ctx.fillText(glyph, pk.x, pk.y + bob + 1);
  ctx.globalAlpha = 1;
}

function drawPlayer(ctx, world) {
  const p = world.player;
  const blink = world.invuln > 0 && Math.floor(world.time * 14) % 2 === 0;
  if (blink) return;
  for (let i = p.trail.length - 1; i >= 0; i--) {
    const t = p.trail[i];
    ctx.globalAlpha = 0.16 * (1 - i / p.trail.length);
    ctx.fillStyle = CONFIG.colors.player;
    ctx.beginPath();
    ctx.arc(t.x, t.y, p.r * (1 - i / (p.trail.length * 1.4)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  glowCircle(ctx, p.x, p.y, 46, CONFIG.colors.player, 0.55);
  if (world.shield) {
    ctx.strokeStyle = CONFIG.colors.shield;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 9 + Math.sin(world.time * 4) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = CONFIG.colors.player;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = CONFIG.colors.playerCore;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  // Direction nose.
  ctx.strokeStyle = CONFIG.colors.playerCore;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(p.face) * p.r * 0.6, p.y + Math.sin(p.face) * p.r * 0.6);
  ctx.lineTo(p.x + Math.cos(p.face) * (p.r + 8), p.y + Math.sin(p.face) * (p.r + 8));
  ctx.stroke();
}

function drawHud(ctx, world) {
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = CONFIG.colors.text;
  ctx.textAlign = 'left';
  ctx.font = '800 30px system-ui, sans-serif';
  ctx.fillText(String(world.score).padStart(5, '0'), 18, 40);
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillStyle = CONFIG.colors.dim;
  ctx.fillText('SCORE', 18, 58);

  ctx.textAlign = 'center';
  ctx.font = '800 20px system-ui, sans-serif';
  ctx.fillStyle = world.combo >= 8 ? '#ff4fd8' : CONFIG.colors.text;
  ctx.fillText(world.combo > 1 ? `COMBO x${world.multiplier}  (${world.combo})` : '—', CONFIG.width / 2, 36);
  if (world.combo > 1) {
    ctx.fillStyle = '#ff4fd8';
    ctx.fillRect(CONFIG.width / 2 - 60, 46, 120 * (world.comboTimer / CONFIG.comboWindow), 4);
  }
  ctx.fillStyle = CONFIG.colors.dim;
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText(`LEVEL ${world.level}   •   ${world.collected}/${WIN_SPORES} SPORES`, CONFIG.width / 2, 68);

  // Lives as drawn hearts (glyphs are font-dependent, paths always render).
  const heart = (x, y, s, fill) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.35);
    ctx.bezierCurveTo(x - s, y - s * 0.45, x - s * 0.45, y - s, x, y - s * 0.3);
    ctx.bezierCurveTo(x + s * 0.45, y - s, x + s, y - s * 0.45, x, y + s * 0.35);
    ctx.closePath();
    ctx.fill();
  };
  for (let i = 0; i < CONFIG.lives; i++) {
    heart(CONFIG.width - 30 - i * 26, 30, 9, i < world.lives ? '#ff5b7a' : 'rgba(255,255,255,0.18)');
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = CONFIG.colors.dim;
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText(`BEST ${Math.max(world.best, world.score)}`, CONFIG.width - 18, 58);

  // Dash meter, bottom left.
  const dw = 130;
  const frac = 1 - Math.max(0, world.dashCooldown) / CONFIG.dashCooldown;
  ctx.textAlign = 'left';
  ctx.fillStyle = CONFIG.colors.dim;
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText('DASH  [SPACE / CLICK]', 18, CONFIG.height - 34);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  roundRect(ctx, 18, CONFIG.height - 26, dw, 8, 4);
  ctx.fill();
  ctx.fillStyle = frac >= 1 ? CONFIG.colors.player : '#5f7fb8';
  roundRect(ctx, 18, CONFIG.height - 26, dw * frac, 8, 4);
  ctx.fill();

  // Active power-up timers, bottom right.
  ctx.textAlign = 'right';
  ctx.font = '700 13px system-ui, sans-serif';
  let ty = CONFIG.height - 40;
  if (world.magnetTimer > 0) {
    ctx.fillStyle = CONFIG.colors.magnet;
    ctx.fillText(`MAGNET ${Math.ceil(world.magnetTimer)}s`, CONFIG.width - 18, ty);
    ty -= 20;
  }
  if (world.starTimer > 0) {
    ctx.fillStyle = CONFIG.colors.star;
    ctx.fillText(`DOUBLE SCORE ${Math.ceil(world.starTimer)}s`, CONFIG.width - 18, ty);
  }
}

function drawBanner(ctx, world) {
  if (!world.banner) return;
  const a = Math.min(1, world.banner.life * 2);
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.fillStyle = CONFIG.colors.text;
  ctx.font = '800 34px system-ui, sans-serif';
  ctx.fillText(world.banner.text, CONFIG.width / 2, 150);
  ctx.fillStyle = CONFIG.colors.dim;
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillText(world.banner.sub, CONFIG.width / 2, 178);
  ctx.globalAlpha = 1;
}

function overlay(ctx, title, lines, accent, footer) {
  ctx.fillStyle = 'rgba(4, 7, 16, 0.72)';
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = '800 52px system-ui, sans-serif';
  ctx.fillText(title, CONFIG.width / 2, 210);
  ctx.fillStyle = CONFIG.colors.text;
  ctx.font = '400 18px system-ui, sans-serif';
  let y = 258;
  for (const line of lines) {
    ctx.fillText(line, CONFIG.width / 2, y);
    y += 30;
  }
  if (footer) {
    ctx.fillStyle = CONFIG.colors.dim;
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText(footer, CONFIG.width / 2, y + 34);
  }
}

export function drawWorld(ctx, world) {
  ctx.save();
  if (world.shake > 0) {
    const s = world.shake * 9;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  drawBackground(ctx, world);

  for (const pk of world.pickups) drawPickup(ctx, pk);
  for (const s of world.spores) drawSpore(ctx, s);
  for (const w of world.wisps) drawWisp(ctx, w);

  if (world.state === 'play' || world.state === 'win' || world.state === 'over') {
    drawPlayer(ctx, world);
  }

  for (const pt of world.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.fillStyle = f.color;
    ctx.font = f.big ? '800 22px system-ui, sans-serif' : '700 16px system-ui, sans-serif';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  if (world.state === 'play' || world.state === 'win' || world.state === 'over') {
    drawHud(ctx, world);
    drawBanner(ctx, world);
  }

  if (world.flash > 0) {
    ctx.fillStyle = `rgba(255, 60, 90, ${world.flash * 0.28})`;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  }
  ctx.restore();

  if (world.state === 'title') {
    overlay(ctx, 'NEON HARVEST', [
      'Pilot your drone through the night meadow.',
      'Collect glowing spores — chain them for combos.',
      'Dash through wisps to shred them. One touch costs a life.',
      'Gather 60 spores to complete the harvest. 3 lives.',
      '',
      'Move: WASD / arrows or mouse  •  Dash: SPACE or click',
      'Pause: P  •  Mute: M',
    ], CONFIG.colors.player, 'Press ENTER or click to play');
  } else if (world.paused && world.state === 'play') {
    overlay(ctx, 'PAUSED', ['Take a breath. The meadow waits.'], CONFIG.colors.text, 'Press P or click to resume');
  } else if (world.state === 'over') {
    overlay(ctx, 'THE MEADOW WINS', [
      `Score  ${world.score}`,
      `Best  ${world.best}`,
      `Spores gathered  ${world.collected}   •   Level ${world.level}`,
    ], CONFIG.colors.danger, 'Press R or click to harvest again');
  } else if (world.state === 'win') {
    overlay(ctx, 'HARVEST COMPLETE!', [
      `Score  ${world.score}`,
      `You gathered all ${WIN_SPORES} spores — the meadow glows for you.`,
      'Keep playing endless, or restart for a better score.',
    ], CONFIG.colors.star, 'Press C to keep going endless  •  R to restart');
  }
}
