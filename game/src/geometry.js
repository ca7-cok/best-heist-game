// geometry.js — small fixed math helpers for the heist game: angles, cones and
// line-of-sight against the room's rectangles. No randomness anywhere; every
// value the game uses is fixed data or derived from it.

export const TAU = Math.PI * 2;

/** Clamp a value into [low, high]. */
export function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

/** Distance between two points. */
export function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

/** Angle from (ax, ay) to (bx, by), in radians. */
export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

/** Smallest absolute difference between two angles, in radians. */
export function angleDifference(a, b) {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return Math.abs(d);
}

/**
 * Whether point (px, py) lies inside the vision cone rooted at (ox, oy),
 * facing `angle`, with half-angle `halfAngle` and reach `range`.
 */
export function pointInVisionCone(px, py, ox, oy, angle, halfAngle, range) {
  const d = distance(px, py, ox, oy);
  if (d > range) return false;
  if (d < 1) return true;
  return angleDifference(angleTo(ox, oy, px, py), angle) <= halfAngle;
}

/** Whether two line segments intersect (including touching). */
function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Whether the segment (x1,y1)-(x2,y2) touches rectangle `r` ({x,y,w,h}). */
export function segmentHitsRect(x1, y1, x2, y2, r) {
  if (x1 >= r.x && x1 <= r.x + r.w && y1 >= r.y && y1 <= r.y + r.h) return true;
  if (x2 >= r.x && x2 <= r.x + r.w && y2 >= r.y && y2 <= r.y + r.h) return true;
  const edges = [
    [r.x, r.y, r.x + r.w, r.y],
    [r.x + r.w, r.y, r.x + r.w, r.y + r.h],
    [r.x + r.w, r.y + r.h, r.x, r.y + r.h],
    [r.x, r.y + r.h, r.x, r.y],
  ];
  for (const [ex1, ey1, ex2, ey2] of edges) {
    if (segmentsCross(x1, y1, x2, y2, ex1, ey1, ex2, ey2)) return true;
  }
  return false;
}

/** Whether any rectangle in `blockers` stands between (x1,y1) and (x2,y2). */
export function lineOfSightBlocked(x1, y1, x2, y2, blockers) {
  for (const r of blockers) {
    if (segmentHitsRect(x1, y1, x2, y2, r)) return true;
  }
  return false;
}

/** Whether a circle at (cx, cy) with radius `r` overlaps rectangle `rect`. */
export function circleHitsRect(cx, cy, r, rect) {
  const nearX = clamp(cx, rect.x, rect.x + rect.w);
  const nearY = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - nearX;
  const dy = cy - nearY;
  return dx * dx + dy * dy < r * r;
}

/**
 * Move a circle by (dx, dy), sliding along rectangles instead of passing
 * through them, and clamp it inside `bounds` ({x, y, w, h}).
 * Returns the position actually reached.
 */
export function moveCircleWithCollision(x, y, radius, dx, dy, blockers, bounds) {
  let nx = x + dx;
  let ny = y + dy;
  nx = clamp(nx, bounds.x + radius, bounds.x + bounds.w - radius);
  ny = clamp(ny, bounds.y + radius, bounds.y + bounds.h - radius);
  for (const r of blockers) {
    if (circleHitsRect(nx, y, radius, r)) nx = x;
    if (circleHitsRect(nx, ny, radius, r)) ny = y;
  }
  // Second pass: if both axes were blocked together, keep the old spot.
  for (const r of blockers) {
    if (circleHitsRect(nx, ny, radius, r)) return { x, y };
  }
  return { x: nx, y: ny };
}
