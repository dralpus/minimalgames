# Orbit Hop — Game Design Spec

**Folder**: `games/orbit-hop` · **Package**: `@minimalgames/orbit-hop` · **Vite port**: 3004

## Concept
A spark of light orbits planets in deep space. Tap to release from orbit and fly straight (tangent direction). Latch onto the next planet's orbit ring. Miss everything and drift off-screen → death. Zen, hypnotic, pure timing.

## Core Loop (GameScene)
1. Spark auto-orbits current planet: angle advances at planet's `orbitSpeed` (deg/s) in planet's `orbitDir` (+1/-1), at radius `ringRadius`. Position = planet center + polar offset.
2. On tap (pointerdown anywhere): spark detaches. Velocity = tangent to orbit at current angle (perpendicular to radius vector, in direction of travel), speed `FLIGHT_SPEED = 340` px/s. Straight-line flight, no gravity.
3. Each frame in flight: check distance to every other planet. If distance to a planet's center is within `[ringRadius - LATCH_TOLERANCE, ringRadius + LATCH_TOLERANCE]` (`LATCH_TOLERANCE = 18`), latch: spark snaps onto that ring at the angle of its entry point, orbiting resumes with the NEW planet's speed/dir.
4. **Perfect latch**: at latch moment, if the spark's distance from the ideal ring radius is ≤ 6px → "PERFECT" (floating text, +combo). Otherwise normal latch.
5. If spark's x/y leaves screen bounds by 40px → death.
6. The previous planet + its ring fade out and are destroyed after a successful hop. A new planet spawns ahead (see spawning).

## Planet Spawning
- Always exactly 2–3 planets alive: the current one and 1–2 ahead.
- New planet position: random, at distance 180–280px from current planet, positioned generally "onward" (any direction is fine but must be fully on-screen with its ring: clamp centers to `[ringRadius+20, W-ringRadius-20]` × `[ringRadius+80, H-ringRadius-80]`, and ≥ 160px from other alive planets).
- Planet visual: filled circle radius 14–22 (random), color alternating `0x7c6cf0` / `0x40e0d0`; ring: stroked circle at `ringRadius`, 2px, same color at 0.5 alpha; add a subtle pulsing glow ring (tween alpha 0.15↔0.05).

## Difficulty Curve (by hop count `n`)
- `ringRadius = clamp(70 - n * 1.2, 40, 70)`
- `orbitSpeed = clamp(90 + n * 4, 90, 220)` deg/s
- `orbitDir`: random ±1 per planet
- From n ≥ 15: planets drift slowly (velocity 8–14 px/s in a random direction, bounce off the clamp bounds).

## Scoring & Economy
- +10 per hop. Perfect latch: combo counter +1 (resets on non-perfect latch); score bonus = `10 * min(combo, 5)` extra; +5 coins per perfect (via `engine.currency.earn(5)`).
- HUD (Phaser texts, depth 20): score top-left, combo (`xN 🔥` when ≥2) top-center, coins top-right.
- XP: `engine.xp.addXP(2)` per hop; on `leveledUp` show floating "LEVEL UP!" text.

## Death & GameOver
- On death: camera shake 250ms/0.015, spark flashes red, 600ms delay → GameOverScene with `{ engine, score, hops }`.
- GameOverScene: score display, best-score persistence (`storage.get/set('bestScore')`), "NEW BEST" pulse when beaten, XP grant `floor(score/10)`, `leaderboard.submitScore(score)`.
- **Rescue (once per run)**: button "🛟 RESCUE (watch ad)" — only shown if `data.rescued !== true`. Calls `engine.showRewardedAd(cb)`; cb restarts GameScene with `{ engine, resumeScore: score, resumeHops: hops, rescued: true }`. GameScene init must accept these and resume score/difficulty.
- PLAY AGAIN + MENU buttons as in neon-dodge.

## MenuScene
- Star parallax background (60 static alpha-varied dots), title "ORBIT" (`#7c6cf0`) / "HOP" (`#40e0d0`) stacked, animated demo: a small circle orbiting a ring (tween-driven), best score, coins `💎 N`, pulsing PLAY button, 🏆 leaderboard modal (copy the `showLeaderboard` pattern from neon-dodge MenuScene verbatim, collection `orbit-hop-scores`).

## Achievements (register in main.ts)
`hops_10` First Steps / `hops_25` Orbit Runner / `hops_50` Star Voyager / `perfect_5` Sharpshooter (5 perfects in one run) / `perfect_15` Sniper (15 in one run) / `combo_x5` Combo Master (combo ≥5). Check inside GameScene.

## Config (config.ts)
Copy the `GAME_CONFIG` shape from `games/neon-dodge/src/config.ts` exactly (same `import.meta.env` fallbacks). Overrides: `gameId: 'orbit-hop'`, `displayName: 'Orbit Hop'`, theme `{ primary:'#7c6cf0', secondary:'#40e0d0', background:'#0a0e1a', accent:'#ff8c42', fontFamily:'"Exo 2","Trebuchet MS",sans-serif', borderRadius:'10px' }`, `appId` fallback `'1:000:web:003'`, `leaderboardCollection: 'orbit-hop-scores'`. Export gameplay constants listed above. `GAME_WIDTH=400, GAME_HEIGHT=700`.

## Required Files (mirror games/neon-dodge exactly)
`package.json` (name @minimalgames/orbit-hop, same scripts/deps as neon-dodge incl. vitest+jsdom devDeps), `tsconfig.json` (with `"types": ["vite/client"]`), `vite.config.ts` (`base: '/minimalgames/orbit-hop/'`, port 3004), `vitest.config.ts` (copy from neon-dodge), `index.html` (copy neon-dodge's, title "Orbit Hop", 🪐 emoji favicon, bg `#0a0e1a`), `.env.example` (copy), `src/config.ts`, `src/main.ts`, `src/scenes/MenuScene.ts`, `src/scenes/GameScene.ts`, `src/scenes/GameOverScene.ts`, `tests/page.test.ts` (copy neon-dodge's test, replace names/title with "Orbit Hop"/orbit-hop).

## HARD RULES (violations = rejected)
1. In main.ts: `engine.init().then(() => engine.auth.getCurrentUser() || engine.auth.loginAnonymously()).catch(() => {});` — never `await engine.init()` before creating the Phaser game.
2. `game.registry.set('engine', engine)` right after `new Phaser.Game(...)`; every scene `init(data)` does `this.engine = data.engine ?? this.game.registry.get('engine');`.
3. Never assign to `TimerEvent.delay` — use `timer.reset({...})` if delay must change.
4. No `borderRadius` property in Phaser text styles.
5. 100% procedural graphics — zero asset files, no `this.load.image/audio`.
6. Do not modify ANY file outside `games/orbit-hop/`.
7. Must pass before you finish: `pnpm turbo run build test --filter=@minimalgames/orbit-hop` (run `pnpm install` at repo root first).
