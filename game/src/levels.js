// levels.js — the three rooms of the heist, as fixed data. Every wall, crate,
// patrol route, camera sweep and loot spot is written out here, so the game
// is fully deterministic: the same room every time, no random placement.
//
// The playfield is the canvas area below the HUD: x from 16 to 944,
// y from 80 to 704. Walls and cover block movement and sight; guards walk
// their waypoint loops; cameras sweep back and forth from their mount.

/** The bounds of the walkable room, inside the canvas. */
export const ROOM = { x: 16, y: 80, w: 928, h: 624 };

/** Loot values by kind. */
export const LOOT_VALUES = { painting: 100, gold: 150, diamond: 300, star: 500 };

/** The three rooms, in order. */
export const LEVELS = [
  {
    name: 'Room 1 — The Gallery',
    brief: 'Three pieces on the walls. Cross the floor, mind the patrols.',
    spawn: { x: 64, y: 656 },
    exit: { x: 896, y: 96, w: 44, h: 44 },
    coins: 3,
    jammers: 2,
    walls: [
      { x: 320, y: 80, w: 24, h: 220 },
      { x: 320, y: 440, w: 24, h: 264 },
      { x: 640, y: 80, w: 24, h: 180 },
      { x: 640, y: 420, w: 24, h: 284 },
    ],
    cover: [
      { x: 100, y: 150, w: 56, h: 56 },
      { x: 450, y: 320, w: 56, h: 56 },
      { x: 760, y: 520, w: 56, h: 56 },
      { x: 150, y: 580, w: 56, h: 56 },
      { x: 760, y: 140, w: 56, h: 56 },
    ],
    guards: [
      { path: [[200, 140], [200, 640]], speed: 55 },
      { path: [[720, 140], [880, 140], [880, 640], [720, 640]], speed: 60 },
    ],
    cameras: [
      { x: 480, y: 88, baseAngle: Math.PI / 2, sweep: 0.96, range: 240, period: 5.0 },
    ],
    loot: [
      { x: 120, y: 112, kind: 'painting' },
      { x: 900, y: 330, kind: 'gold' },
      { x: 520, y: 660, kind: 'diamond' },
    ],
  },
  {
    name: 'Room 2 — The Vault Hall',
    brief: 'Four pieces, two cameras, three guards. The hall has no safe lane.',
    spawn: { x: 64, y: 656 },
    exit: { x: 896, y: 96, w: 44, h: 44 },
    coins: 3,
    jammers: 2,
    walls: [
      { x: 240, y: 80, w: 24, h: 200 },
      { x: 240, y: 430, w: 24, h: 274 },
      { x: 480, y: 80, w: 24, h: 160 },
      { x: 480, y: 380, w: 24, h: 324 },
      { x: 720, y: 80, w: 24, h: 200 },
      { x: 720, y: 430, w: 24, h: 274 },
    ],
    cover: [
      { x: 90, y: 300, w: 56, h: 56 },
      { x: 330, y: 560, w: 56, h: 56 },
      { x: 560, y: 180, w: 56, h: 56 },
      { x: 820, y: 330, w: 56, h: 56 },
      { x: 380, y: 120, w: 56, h: 56 },
      { x: 640, y: 600, w: 56, h: 56 },
    ],
    guards: [
      { path: [[130, 140], [130, 640]], speed: 60 },
      { path: [[360, 640], [360, 140], [600, 140], [600, 640]], speed: 65 },
      { path: [[830, 140], [830, 640]], speed: 60 },
    ],
    cameras: [
      { x: 360, y: 88, baseAngle: Math.PI / 2, sweep: 0.9, range: 230, period: 4.4 },
      { x: 840, y: 696, baseAngle: -Math.PI / 2, sweep: 0.9, range: 230, period: 5.2 },
    ],
    loot: [
      { x: 110, y: 112, kind: 'painting' },
      { x: 360, y: 330, kind: 'gold' },
      { x: 600, y: 560, kind: 'gold' },
      { x: 900, y: 660, kind: 'diamond' },
    ],
  },
  {
    name: 'Room 3 — The Grand Vault',
    brief: 'The Star Diamond sits in the vault. Three cameras, three guards, no mercy.',
    spawn: { x: 64, y: 656 },
    exit: { x: 896, y: 96, w: 44, h: 44 },
    coins: 4,
    jammers: 2,
    walls: [
      { x: 200, y: 80, w: 24, h: 180 },
      { x: 200, y: 420, w: 24, h: 284 },
      { x: 760, y: 80, w: 24, h: 180 },
      { x: 760, y: 420, w: 24, h: 284 },
      // The vault itself: open at the bottom, the Star Diamond inside.
      { x: 420, y: 280, w: 144, h: 24 },
      { x: 420, y: 280, w: 24, h: 140 },
      { x: 540, y: 280, w: 24, h: 140 },
    ],
    cover: [
      { x: 100, y: 320, w: 56, h: 56 },
      { x: 330, y: 600, w: 56, h: 56 },
      { x: 620, y: 600, w: 56, h: 56 },
      { x: 850, y: 320, w: 56, h: 56 },
      { x: 330, y: 140, w: 56, h: 56 },
      { x: 620, y: 140, w: 56, h: 56 },
    ],
    guards: [
      { path: [[130, 140], [130, 640]], speed: 70 },
      { path: [[330, 140], [630, 140], [630, 640], [330, 640]], speed: 70 },
      { path: [[830, 140], [830, 640]], speed: 70 },
    ],
    cameras: [
      { x: 492, y: 88, baseAngle: Math.PI / 2, sweep: 0.8, range: 240, period: 4.0 },
      { x: 180, y: 696, baseAngle: -Math.PI / 2, sweep: 0.9, range: 220, period: 4.8 },
      { x: 780, y: 696, baseAngle: -Math.PI / 2, sweep: 0.9, range: 220, period: 5.6 },
    ],
    loot: [
      { x: 110, y: 112, kind: 'painting' },
      { x: 330, y: 330, kind: 'gold' },
      { x: 492, y: 344, kind: 'star' },
      { x: 640, y: 560, kind: 'gold' },
      { x: 900, y: 112, kind: 'painting' },
    ],
  },
];

/** Total loot value of a level, for the score tally. */
export function levelLootTotal(level) {
  return level.loot.reduce((sum, piece) => sum + LOOT_VALUES[piece.kind], 0);
}
