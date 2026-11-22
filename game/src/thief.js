// thief.js — the player character. WASD or arrow keys move him; holding Shift
// sneaks (slower, harder to spot). Q throws a coin in the facing direction to
// pull a guard away; E fires the jammer to blind the cameras for a few
// seconds. Both tools cost a limited stock, and loot refills coins.

import { clamp, moveCircleWithCollision } from './geometry.js';

export const THIEF_RADIUS = 13;
export const THIEF_WALK_SPEED = 165; // pixels per second
export const THIEF_SNEAK_SPEED = 82;
export const THIEF_COIN_RANGE = 170; // how far a thrown coin flies
export const JAMMER_SECONDS = 6;

export const TOOL_COIN = 'coin';
export const TOOL_JAMMER = 'jammer';

/** Build the thief at the level's spawn point. */
export function createThief(spawn) {
  return {
    x: spawn.x,
    y: spawn.y,
    radius: THIEF_RADIUS,
    angle: -Math.PI / 2, // facing up the room
    moving: false,
    sneaking: false,
    coins: 0,
    jammers: 0,
    stepPhase: 0, // drives the walk bob and footstep ticks
  };
}

/**
 * Move the thief by one frame from the held keys. `keys` is the input state
 * ({up, down, left, right, sneak} booleans). Returns the distance walked,
 * for footstep sounds.
 */
export function updateThief(thief, dt, keys, blockers, bounds) {
  let dx = 0;
  let dy = 0;
  if (keys.left) dx -= 1;
  if (keys.right) dx += 1;
  if (keys.up) dy -= 1;
  if (keys.down) dy += 1;
  thief.moving = dx !== 0 || dy !== 0;
  thief.sneaking = keys.sneak && thief.moving;
  if (!thief.moving) return 0;
  const len = Math.hypot(dx, dy);
  const speed = thief.sneaking ? THIEF_SNEAK_SPEED : THIEF_WALK_SPEED;
  const stepX = (dx / len) * speed * dt;
  const stepY = (dy / len) * speed * dt;
  thief.angle = Math.atan2(stepY, stepX);
  const moved = moveCircleWithCollision(thief.x, thief.y, thief.radius, stepX, stepY, blockers, bounds);
  const walked = Math.hypot(moved.x - thief.x, moved.y - thief.y);
  thief.x = moved.x;
  thief.y = moved.y;
  thief.stepPhase += walked;
  return walked;
}

/** Where a thrown coin lands, in the direction the thief faces. */
export function coinLandingSpot(thief) {
  return {
    x: clamp(thief.x + Math.cos(thief.angle) * THIEF_COIN_RANGE, 16 + 8, 944 - 8),
    y: clamp(thief.y + Math.sin(thief.angle) * THIEF_COIN_RANGE, 80 + 8, 704 - 8),
  };
}

/** Spend one coin; returns the landing spot, or null when out of coins. */
export function throwCoin(thief) {
  if (thief.coins <= 0) return null;
  thief.coins -= 1;
  return coinLandingSpot(thief);
}

/** Fire the jammer; returns true when one was spent. */
export function useJammer(thief) {
  if (thief.jammers <= 0) return false;
  thief.jammers -= 1;
  return true;
}
