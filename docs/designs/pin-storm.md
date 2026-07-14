# Pin Storm — Game Design Spec

**Folder**: `games/pin-storm` · **Package**: `@minimalgames/pin-storm` · **Vite port**: 3005

## Concept
Throw glowing pins into a spinning neon wheel. Hit an existing pin → game over. Land all required pins → level clear. Rotation patterns (not just speed) make levels feel distinct. Knife-hit style, level-based progression.

## Layout
- Wheel: circle radius `WHEEL_RADIUS = 110`, center at `(200, 210)`. Drawn with Phaser Graphics: filled dark disc `0x1e2230`, 3px rim stroke in accent, small hub circle.
- Waiting pin: at `(200, 620)`, pointing up. A pin = 4px-wide × 42px-tall rounded rect (Graphics or thin rectangle) with a small circular head at its bottom end.
- Pins remaining indicator: column of small dots on the left edge, one removed per throw.
- HUD: level top-center ("LEVEL N"), score top-left, coins top-right.

## Core Loop (GameScene)
1. Wheel rotates per the level's pattern (below). Stuck pins and gold studs are child positions rotated with the wheel (store each as an angle; recompute x/y each frame from wheel rotation + angle — simplest: keep an array `{angle}` and redraw/reposition Rectangle objects each update).
2. Tap → waiting pin flies straight up at `PIN_SPEED = 1400` px/s.
3. When pin tip reaches wheel edge distance (`pinY <= wheelCenterY + WHEEL_RADIUS`): compute impact angle = `atan2` of contact point relative to wheel center MINUS current wheel rotation → normalized stick angle.
   - **Collision**: if any existing stuck pin's angle is within `MIN_PIN_GAP = 11°` of impact angle → FAIL: pin bounces off (tween: fly down-right with spin, alpha out), camera shake, 700ms → GameOverScene.
   - **Gold stud hit**: if a gold stud's angle is within 8° → `engine.currency.earn(5)`, gold flash + floating "+5 💰", stud removed. Pin still sticks.
   - Otherwise pin sticks: add angle to stuck array, +1 score, spawn next waiting pin (if pins remain).
4. All pins thrown & stuck → LEVEL CLEAR: +25 score, wheel "shatter" (tween all pin rects + wheel graphics: scale up, alpha 0, slight random rotations), 900ms → next level starts in-place (re-init wheel state, `level+1` saved via `engine.storage.set('level', n)`).

## Rotation Patterns
Wheel angular velocity `ω(t)` in deg/s, `base` = level rpm × 6:
- `constant`: `ω = base`
- `pulse`: `ω = base * (0.35 + 0.65 * |sin(t * 1.6)|)`
- `reverse`: `ω = base * sign(sin(t * 0.9))` (direction flips ~every 3.5s)
- `stutter`: repeating cycle 1.1s at `base`, 0.45s at 0 (use elapsed-time modulo, NOT a TimerEvent)

## Level Table (config.ts) — levels 1–20
```
{ pins, rpm, pattern, preplaced }   // preplaced = count of pins already on wheel at random non-overlapping angles
L1 :{5, 6,constant,0}  L2 :{6, 7,constant,0}  L3 :{6, 8,constant,2}  L4 :{7, 8,pulse,   0}  L5 :{7, 9,pulse,   2}
L6 :{8, 9,reverse, 0}  L7 :{8,10,reverse, 2}  L8 :{9,10,pulse,   3}  L9 :{9,11,stutter, 0}  L10:{10,11,stutter,2}
L11:{10,12,reverse,3}  L12:{11,12,pulse,  3}  L13:{11,13,stutter,3}  L14:{12,13,reverse,4}  L15:{12,14,pulse,  4}
L16:{13,14,stutter,4}  L17:{13,15,reverse,5}  L18:{14,15,stutter,5}  L19:{14,16,pulse,  5}  L20:{15,16,stutter,6}
```
Beyond 20 (procedural): `pins = 15`, `rpm = min(16 + (n-20)*0.5, 24)`, pattern cycles `[pulse,reverse,stutter]`, `preplaced = min(6 + floor((n-20)/2), 10)`.
Gold studs: from level 3, spawn `1 + (level >= 8 ? 1 : 0)` studs at random free angles (≥15° from preplaced pins). Stud visual: small gold (`0xffd700`) circle on the wheel rim.

## Progression, Economy, Death
- Current level persisted: `engine.storage.get('level', 1)`; GameScene starts at saved level.
- Score accumulates across levels within a run; on fail, run score is submitted: `engine.leaderboard.submitScore(level)` (leaderboard ranks by highest LEVEL reached, not score).
- XP: +3 per stuck pin, +10 per level clear (`engine.xp.addXP`).
- Fail streak counter (in-memory): every 4th fail → `engine.showInterstitialAd()` before GameOverScene renders buttons.
- **Rewarded rescue on GameOverScene**: "🧹 CLEAR 2 PINS (watch ad)" — restarts GameScene same level with `{ removeTwo: true }`; GameScene init, when `removeTwo`, removes 2 random preplaced pins for that attempt. Only offer if the level has ≥2 pins on the wheel at fail time (pass a flag from GameScene).
- Achievements: `level_5` Warming Up / `level_10` Pin Pro / `level_20` Storm Master / `gold_10` Gold Digger (10 lifetime gold studs — persist count in storage) / `no_miss_3` Flawless (3 level clears in one run without failing).

## MenuScene
Dark slate bg `#12141c`, decorative spinning wheel with a few pins (slow rotation via update or tween), title "PIN STORM" in `#ff6b35`, "LEVEL N" (saved progress) subtitle, coins display, PLAY button (pulsing), 🏆 leaderboard modal (copy neon-dodge `showLeaderboard` pattern; entries show "Level N" as score).

## GameOverScene
"WHEEL JAMMED!" title, level reached + run score, best-level persistence + NEW BEST pulse, XP grant `level*5`, rescue button (conditional, above), RETRY (same level), MENU.

## Config
Copy `GAME_CONFIG` shape from neon-dodge config.ts (same env fallbacks). Overrides: `gameId:'pin-storm'`, `displayName:'Pin Storm'`, theme `{ primary:'#ff6b35', secondary:'#00b4ff', background:'#12141c', accent:'#ffd700', fontFamily:'"Rajdhani","Arial Narrow",sans-serif', borderRadius:'8px' }`, appId fallback `'1:000:web:004'`, `leaderboardCollection:'pin-storm-scores'`. Export the level table + constants. `GAME_WIDTH=400, GAME_HEIGHT=700`.

## Required Files (mirror games/neon-dodge exactly)
`package.json` (name @minimalgames/pin-storm, same scripts/deps as neon-dodge incl. vitest+jsdom devDeps), `tsconfig.json` (with `"types": ["vite/client"]`), `vite.config.ts` (`base: '/minimalgames/pin-storm/'`, port 3005), `vitest.config.ts`, `index.html` (title "Pin Storm", 📌 emoji favicon, bg `#12141c`), `.env.example`, `src/config.ts`, `src/main.ts`, `src/scenes/MenuScene.ts`, `src/scenes/GameScene.ts`, `src/scenes/GameOverScene.ts`, `tests/page.test.ts` (copy neon-dodge's, replace names/title with "Pin Storm"/pin-storm).

## HARD RULES (violations = rejected)
1. In main.ts: `engine.init().then(() => engine.auth.getCurrentUser() || engine.auth.loginAnonymously()).catch(() => {});` — never `await engine.init()` before creating the Phaser game.
2. `game.registry.set('engine', engine)` right after `new Phaser.Game(...)`; every scene `init(data)` does `this.engine = data.engine ?? this.game.registry.get('engine');`.
3. Never assign to `TimerEvent.delay` — use `timer.reset({...})` if delay must change. (Rotation patterns must be computed from elapsed time in `update()`, not timers.)
4. No `borderRadius` property in Phaser text styles.
5. 100% procedural graphics — zero asset files, no `this.load.image/audio`.
6. Do not modify ANY file outside `games/pin-storm/`.
7. Must pass before you finish: `pnpm turbo run build test --filter=@minimalgames/pin-storm` (run `pnpm install` at repo root first).
