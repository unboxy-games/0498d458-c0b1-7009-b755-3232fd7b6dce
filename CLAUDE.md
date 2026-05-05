# Candy Match — Match-3 Puzzle Game

## Game overview
- **Title**: Candy Match
- **Genre**: Puzzle match-3 (Bejeweled / Candy Crush style)
- **Core mechanic**: Swap two adjacent gems to form a line of 3+ same-colored candies; matched gems disappear, gems above fall, new gems drop in.
- **Theme**: Bright, candy-like — 6 candy colors (red, blue, green, yellow, purple, orange)
- **Win/lose**: Clear a target number of gems within a move limit (puzzle levels)

## Features implemented
- Full Bejeweled swap-match-fall-fill engine via `phaser3-rex-plugins`
- 6 candy gem types drawn with Phaser Graphics (rounded rect + gloss highlight + sparkle)
- 5 progressive levels with escalating targets and move limits
- Score tracking (10pts/gem, bonus for 4+/5+ matches)
- Move counter; turns red when ≤ 5 moves left
- Cleared-gems counter vs target
- Selection ring highlight on clicked gem
- Particle pop effect on gem elimination (8 colored dots per gem)
- Level Complete overlay with "Next Level →" button
- Game Over overlay with "Try Again ↺" button
- Gradient purple/indigo background with scattered sparkle dots
- Right-side stats panel (Level, Cleared/Target, Score, Moves Left)
- Board frame with subtle grid lines

## Key implementation details
- **Engine**: `Bejeweled` from `phaser3-rex-plugins/templates/bejeweled/Bejeweled.js`
- **Plugin**: `BoardPlugin` registered in `createUnboxyGame` as `mapping: 'rexBoard'`
- **Grid**: 8×8, cell size 60px, top-left at (80, 120)
- **Gem visuals**: Graphics objects using `changedata-symbol` event for color changes
- **Level state**: `levelIndex` persists on scene instance across `scene.restart()` calls
- **Type declarations**: `src/types/rex-plugins.d.ts` shims the JS module imports

## Level definitions
| Level | Target gems | Moves |
|-------|-------------|-------|
| 1     | 15          | 20    |
| 2     | 25          | 22    |
| 3     | 40          | 25    |
| 4     | 55          | 28    |
| 5     | 75          | 30    |

## Controls
- Click a gem to select it (yellow ring appears)
- Click an adjacent gem to swap (if the swap makes a match, it executes)
- Drag is also supported by the engine

## Files changed this turn
- `package.json` — added `phaser3-rex-plugins@^1.1.84`
- `src/main.ts` — registered `BoardPlugin` scene plugin
- `src/scenes/GameScene.ts` — full game implementation
- `src/scenes/UIScene.ts` — stripped to minimal stub (HUD in GameScene)
- `src/types/rex-plugins.d.ts` — TypeScript declarations for JS plugin imports
