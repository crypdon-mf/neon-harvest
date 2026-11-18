# NEON HARVEST

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/crypdon-mf/neon-harvest/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/crypdon-mf/neon-harvest/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

An original arcade game for the make.fun **best-game-01** bounty ($1,000).

## The game

Pilot a harvest drone through a neon night meadow. Glowing spores drift
across the field — collect them to score, and chain pickups quickly to
build a combo multiplier. Thorn wisps hunt you: one touch costs a life,
but a well-timed dash shreds them. Gather **60 spores to complete the
harvest and win**; lose all 3 lives and the meadow wins. After the win
you can keep playing endless for a higher score.

- **Score & combo:** spores are worth 10 points, gold spores 30. Every 4
  combo steps raise the multiplier (x2, x3, …). The combo bar drains in
  3 seconds without a pickup.
- **Dash:** SPACE or click — a burst of speed with a short cooldown and
  brief invulnerability. Dashing through a wisp destroys it (+25).
- **Pickups:** shield (survive one hit), magnet (spores fly to you, 8s),
  double-score star (10s).
- **Levels:** every 12 spores the meadow levels up — more wisps, faster
  wisps, faster spawns. Best score is saved in the browser.
- **Controls:** WASD / arrow keys or mouse to steer, SPACE or click to
  dash, P to pause, M to mute, R to restart, C to continue endless after
  a win. All sound is synthesised with WebAudio — no audio files.

## Files

- `game/` — the whole game, plain static files, no network requests:
  - `index.html` — page shell
  - `src/main.js` — boot, frame loop, state machine, self-test
  - `src/world.js` — simulation (player, spores, wisps, pickups, particles)
  - `src/render.js` — canvas drawing, HUD, title/pause/win/game-over screens
  - `src/config.js` — tuning and palette
  - `src/random.js` — seeded RNG and helpers
  - `src/input.js` — keyboard + mouse
  - `src/audio.js` — synthesised sound effects
  - `src/shots.js` — deterministic screenshot poses (`?shot=`)
- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json` with the vendored make.fun library.
- `screenshots/` — 4 real renders of the game's own code in headless
  Chrome: `1-start.jpg` (title), `2-play.jpg` (mid-game), `3-combo.jpg`
  (combo moment), `4-end.jpg` (game over).
- `serve.ts` — dev-only static server (`node serve.ts`, then
  http://localhost:8080). Not part of the game.
- `shots.json` — the screenshot poses used to capture `screenshots/`.
- `LICENSE` — MIT.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Headless self-test (plays the real game: start, collect, survive, lose,
restart, win, dash-shred — 13 checks):

```sh
# with the game served, in a headless browser:
# http://localhost:8080/?selftest=1
```

## Build notes

Built in one agent session on 2026-11-17. One real bug was found and
fixed during headless testing: `render.js` used `WIN_SPORES` without
importing it, which broke the HUD (and the game-over screen) at draw
time. The headless self-test caught the play loop; the error trap caught
the render fault; both are verified fixed (13/13 checks, 4 screenshots
re-captured and inspected).

---

<sub>Entered on [make.fun](https://make.fun/?ref=d5a50dzy&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>

