// cameras.js — the wall-mounted security cameras. Each camera sweeps its
// cone back and forth around a fixed base angle on a fixed period, so its
// rhythm can be read and timed. A camera that is jammed stops sweeping and
// sees nothing until the jammer wears off.

import { clamp, distance, lineOfSightBlocked, pointInVisionCone } from './geometry.js';

export const CAMERA_CONE_RANGE = 230;
export const CAMERA_CONE_HALF_ANGLE = 0.34; // about 19 degrees each side

/** Build a camera from a level definition entry. */
export function createCamera(def) {
  return {
    x: def.x,
    y: def.y,
    baseAngle: def.baseAngle,
    sweep: def.sweep,
    range: def.range,
    period: def.period,
    phase: 0, // seconds into the sweep cycle; deterministic from level start
    jammedLeft: 0,
  };
}

/** The camera's current facing angle, from its sweep cycle. */
export function cameraAngle(camera) {
  const t = (camera.phase % camera.period) / camera.period;
  // Triangle wave: sweep out and back, so the motion reads as a patrol.
  const tri = t < 0.5 ? t * 2 : 2 - t * 2;
  return camera.baseAngle + (tri - 0.5) * camera.sweep;
}

/** Advance the camera's sweep by `dt` seconds (frozen while jammed). */
export function updateCamera(camera, dt) {
  if (camera.jammedLeft > 0) {
    camera.jammedLeft = Math.max(0, camera.jammedLeft - dt);
    return;
  }
  camera.phase += dt;
}

/** Whether the camera is currently jammed and blind. */
export function cameraIsJammed(camera) {
  return camera.jammedLeft > 0;
}

/** Jam every camera in `cameras` for `seconds`. */
export function jamAllCameras(cameras, seconds) {
  for (const camera of cameras) camera.jammedLeft = seconds;
}

/**
 * Whether the camera can see the thief right now: inside its sweeping cone,
 * in range, with a clear line of sight. A sneaking thief is harder to spot.
 */
export function cameraSeesThief(camera, thief, blockers) {
  if (cameraIsJammed(camera)) return false;
  const reach = thief.sneaking ? camera.range * 0.72 : camera.range;
  if (!pointInVisionCone(thief.x, thief.y, camera.x, camera.y, cameraAngle(camera), CAMERA_CONE_HALF_ANGLE, reach)) return false;
  return !lineOfSightBlocked(camera.x, camera.y, thief.x, thief.y, blockers);
}

/** How strongly the camera sees the thief, 0 to 1 (nearer = stronger). */
export function cameraSightStrength(camera, thief) {
  const d = distance(camera.x, camera.y, thief.x, thief.y);
  return clamp(1 - (d / camera.range) * 0.4, 0.55, 1);
}
