# Hue Jump — Game Design Spec

**Folder**: `games/hue-jump` · **Package**: `@minimalgames/hue-jump` · **Vite port**: 3006

## Concept
A glowing orb climbs an endless neon tower. Tap to hop upward (flappy impulse). Rotating color-gate obstacles block the path — the orb may only pass through the segment matching its own color. Color-swap pickups randomize the orb's color after each obstacle. Color-switch mechanic, vertical endless climber.

## The 4 Colors
`COLORS = [0xff3366, 0xffcc00, 0x33ddff, 0x66ff66]` (rose, gold, cyan, green). Orb always holds exactly one.

## Physics & Camera (implement manually in update(), no arcade physics needed)
- Orb: circle radius 12 at fixed screen-x 200. World-space y position.
- Gravity `GRAVITY = 1150` px/s² down; tap → `vy = -420` (instant set, not additive). Terminal fall speed cap 700.
- Camera: track a `cameraY` value = min ever reached of `orbWorldY - 420` (camera only moves UP as the orb climbs; never down). Render everything at `screenY = worldY - cameraY`.
- Death: (a) orb screenY > 700 + 30 (fell below view), or (b) color collision (below).
- Simplest implementation: keep all world objects in arrays with worldY; reposition their Phaser objects every frame. Do NOT use Phaser's camera scroll (keeps HUD simple).

## Obstacles (spawned every `OBSTACLE_GAP_Y = 320` px of height, starting at worldY = -200)
Each obstacle has 4 segments, one per color, and spins. Orb collision vs obstacle: when orb is within the obstacle's band, determine which segment occupies the orb's position; if segment color ≠ orb color → death. If orb passes fully above the obstacle → +1 obstacle passed, `engine.xp.addXP(3)`, score handled by height.
Three types (cycle with variety by index, weighted random after 10 obstacles):
1. **Ring**: circle outline radius 95 centered on x=200 at its worldY, drawn as 4 arc quarters (Graphics, `lineStyle(14, color)`, arcs of 90° each), rotating at `rotSpeed`. Orb passes through the ring band (distance from ring center within [95-14, 95+14]) → check the arc quadrant at the orb's polar angle (minus current rotation).
2. **Bar line**: horizontal band height 14, full width, at worldY, composed of 4 colored segments of 100px each, scrolling horizontally (segments shift x at `barSpeed`, wrapping at 400). Orb crossing the band's y-range → check segment at orb x.
3. **Cross**: two 14px bars (horizontal + vertical, each 220 long, centered x=200) forming a plus, rotating; 4 arms colored differently. Orb within an arm's rectangle (account rotation via polar angle bands ±20° around each arm axis at radius ≤110) → check arm color.
   (If cross collision proves fiddly: acceptable simplification — treat cross as a ring of radius 60 with 4 quadrants, thickness 14. Prefer shipping correct-feeling gameplay over geometric purity.)
- `rotSpeed`: 60 + min(passedCount * 6, 120) deg/s, direction alternates per obstacle. `barSpeed`: 70 + min(passedCount*5, 110) px/s.
- **Color-swap pickup**: small 16px spinning square (tween angle), placed 140px above each obstacle, cycles hue visually (alternate fill each 200ms among the 4 colors via elapsed-time check in update). On overlap (distance < 22): orb color set to a RANDOM color ≠ current, brief flash ring effect. Pickup consumed.
- **Star**: 10px gold circle placed 60px above each obstacle at random x in [80, 320]. On overlap: `engine.currency.earn(1)`, +1 star counter, floating "+⭐".

## Scoring & HUD
- Score = height meters: `max(0, floor((START_Y - minWorldYReached) / 40))`. START_Y = orb spawn worldY (600).
- HUD (depth 20): "N m" top-center big, ⭐ count top-right, best-height ghost line: a faint horizontal dashed line + "BEST" label at the world position of the stored best height (only if > 0 and within view).
- Near-miss detection (for achievement): passing an obstacle where at any frame the orb was in the band and the segment boundary was within 12° / 12px → count once per obstacle.

## Death, Revive, GameOver
- Death: camera shake, orb burst (scale+fade tween), 600ms → GameOverScene `{ engine, height, stars, revived }`.
- **Revive (once per run)**: GameOverScene button "⚡ REVIVE (watch ad)" if `revived !== true` → `engine.showRewardedAd(cb)`; cb restarts GameScene with `{ resumeHeight: height, revived: true }`: orb respawns at the death height on a safe spot (no obstacle within 200px below/above — shift spawn if needed), score continues from resumeHeight.
- GameOverScene: height display "N m", best persistence `storage 'bestHeight'` + NEW BEST pulse, stars earned, XP grant `floor(height/5) + stars`, `leaderboard.submitScore(height)`, PLAY AGAIN, MENU.
- Achievements: `height_50` Getting High / `height_150` Tower Climber / `height_300` Sky Breaker / `stars_25` Star Collector (25 lifetime stars — persist in storage) / `near_miss_10` Daredevil (10 near-misses in one run).

## MenuScene
Deep violet bg `#16121f`, vertical gradient (Graphics fillGradientStyle), floating decorative color dots drifting upward (recycled tweens), title "HUE" (rose)/"JUMP" (cyan) stacked, an animated demo orb bouncing (yoyo tween) that cycles colors every 700ms, best height "BEST: N m", stars count, pulsing PLAY, 🏆 leaderboard modal (copy neon-dodge `showLeaderboard`, entries show "N m").

## Config
Copy `GAME_CONFIG` shape from neon-dodge config.ts (same env fallbacks). Overrides: `gameId:'hue-jump'`, `displayName:'Hue Jump'`, theme `{ primary:'#ff3366', secondary:'#33ddff', background:'#16121f', accent:'#ffcc00', fontFamily:'"Nunito","Arial Rounded MT Bold",sans-serif', borderRadius:'14px' }`, appId fallback `'1:000:web:005'`, `leaderboardCollection:'hue-jump-scores'`. Export COLORS + constants. `GAME_WIDTH=400, GAME_HEIGHT=700`.

## Required Files (mirror games/neon-dodge exactly)
`package.json` (name @minimalgames/hue-jump, same scripts/deps as neon-dodge incl. vitest+jsdom devDeps), `tsconfig.json` (with `"types": ["vite/client"]`), `vite.config.ts` (`base: '/minimalgames/hue-jump/'`, port 3006), `vitest.config.ts`, `index.html` (title "Hue Jump", 🔮 emoji favicon, bg `#16121f`), `.env.example`, `src/config.ts`, `src/main.ts`, `src/scenes/MenuScene.ts`, `src/scenes/GameScene.ts`, `src/scenes/GameOverScene.ts`, `tests/page.test.ts` (copy neon-dodge's, replace names/title with "Hue Jump"/hue-jump).

## HARD RULES (violations = rejected)
1. In main.ts: `engine.init().then(() => engine.auth.getCurrentUser() || engine.auth.loginAnonymously()).catch(() => {});` — never `await engine.init()` before creating the Phaser game.
2. `game.registry.set('engine', engine)` right after `new Phaser.Game(...)`; every scene `init(data)` does `this.engine = data.engine ?? this.game.registry.get('engine');`.
3. Never assign to `TimerEvent.delay` — use `timer.reset({...})`. (All motion/timing must be computed from delta/elapsed time in `update()`.)
4. No `borderRadius` property in Phaser text styles.
5. 100% procedural graphics — zero asset files, no `this.load.image/audio`.
6. Do not modify ANY file outside `games/hue-jump/`.
7. Must pass before you finish: `pnpm turbo run build test --filter=@minimalgames/hue-jump` (run `pnpm install` at repo root first).
