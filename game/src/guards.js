// guards.js — the patrolling guards. A guard walks a fixed waypoint loop,
// pauses at each corner, and watches a vision cone in front of him. When the
// thief is inside the cone with a clear line of sight, the guard is alerted:
// he stops, turns to face the thief and the alarm climbs. A thrown coin pulls
// him off his route to investigate the spot it landed on.

import {
  angleDifference,
  angleTo,
  clamp,
  distance,
  lineOfSightBlocked,
  moveCircleWithCollision,
  pointInVisionCone,
} from './geometry.js';

export const GUARD_RADIUS = 14;
export const GUARD_CONE_RANGE = 190;
export const GUARD_CONE_HALF_ANGLE = 0.65; // about 37 degrees each side
export const GUARD_PAUSE_SECONDS = 1.2;
export const GUARD_INVESTIGATE_SECONDS = 3.0;

/** Build a guard from a level definition entry. */
export function createGuard(def) {
  return {
    path: def.path.map(([x, y]) => ({ x, y })),
    speed: def.speed,
    x: def.path[0][0],
    y: def.path[0][1],
    waypoint: 1 % def.path.length,
    pauseLeft: 0,
    angle: Math.PI / 2,
    alerted: false,
    alertFlash: 0,
    investigating: null, // {x, y, waitLeft} while walking to a coin
    state: 'patrol', // 'patrol' | 'alert' | 'investigate'
  };
}

/** Point the guard at a coin landing spot and send him to look at it. */
export function distractGuard(guard, x, y) {
  guard.investigating = { x, y, waitLeft: GUARD_INVESTIGATE_SECONDS };
  guard.state = 'investigate';
  guard.alerted = false;
}

/** Advance one guard by `dt` seconds. Returns whether he currently sees the thief. */
export function updateGuard(guard, dt, thief, blockers, bounds) {
  const seesThief = guardSeesThief(guard, thief, blockers);
  if (seesThief) {
    guard.alerted = true;
    guard.alertFlash = 0.4;
    guard.state = 'alert';
    guard.pauseLeft = 0.9; // stare at the spot a moment after losing sight
    guard.angle = angleTo(guard.x, guard.y, thief.x, thief.y);
    return true;
  }
  guard.alertFlash = Math.max(0, guard.alertFlash - dt);

  if (guard.state === 'alert') {
    // Lost sight: look around briefly, then resume the patrol.
    guard.pauseLeft -= dt;
    if (guard.pauseLeft <= 0) {
      guard.state = guard.investigating ? 'investigate' : 'patrol';
      guard.alerted = false;
    }
    return false;
  }

  if (guard.state === 'investigate' && guard.investigating) {
    const target = guard.investigating;
    const arrived = walkToward(guard, target.x, target.y, dt, blockers, bounds);
    if (arrived) {
      target.waitLeft -= dt;
      guard.angle += dt * 1.5; // scan the spot
      if (target.waitLeft <= 0) {
        guard.investigating = null;
        guard.state = 'patrol';
      }
    }
    return false;
  }

  // Patrol: walk to the next waypoint, pause at each corner.
  if (guard.pauseLeft > 0) {
    guard.pauseLeft -= dt;
    return false;
  }
  const target = guard.path[guard.waypoint];
  const arrived = walkToward(guard, target.x, target.y, dt, blockers, bounds);
  if (arrived) {
    guard.waypoint = (guard.waypoint + 1) % guard.path.length;
    guard.pauseLeft = GUARD_PAUSE_SECONDS;
  }
  return false;
}

/** Walk the guard toward (tx, ty) at his patrol speed. True when arrived. */
function walkToward(guard, tx, ty, dt, blockers, bounds) {
  const d = distance(guard.x, guard.y, tx, ty);
  if (d < 2) return true;
  const step = Math.min(d, guard.speed * dt);
  const nx = guard.x + ((tx - guard.x) / d) * step;
  const ny = guard.y + ((ty - guard.y) / d) * step;
  guard.angle = angleTo(guard.x, guard.y, nx, ny);
  const moved = moveCircleWithCollision(guard.x, guard.y, GUARD_RADIUS, nx - guard.x, ny - guard.y, blockers, bounds);
  guard.x = moved.x;
  guard.y = moved.y;
  return distance(guard.x, guard.y, tx, ty) < 3;
}

/**
 * Whether the guard can see the thief right now: inside the cone, in range,
 * with no wall or crate between them. A sneaking thief is harder to spot:
 * the cone's effective reach shrinks.
 */
export function guardSeesThief(guard, thief, blockers) {
  const reach = thief.sneaking ? GUARD_CONE_RANGE * 0.72 : GUARD_CONE_RANGE;
  if (!pointInVisionCone(thief.x, thief.y, guard.x, guard.y, guard.angle, GUARD_CONE_HALF_ANGLE, reach)) return false;
  return !lineOfSightBlocked(guard.x, guard.y, thief.x, thief.y, blockers);
}

/** How strongly the guard sees the thief, 0 to 1 (nearer = stronger). */
export function guardSightStrength(guard, thief) {
  const d = distance(guard.x, guard.y, thief.x, thief.y);
  return clamp(1 - (d / GUARD_CONE_RANGE) * 0.4, 0.55, 1);
}

/** Whether the guard is currently suspicious enough to show "!" over his head. */
export function guardIsSuspicious(guard) {
  return guard.alerted || guard.alertFlash > 0;
}
