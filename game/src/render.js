// render.js — everything the player sees, drawn on one canvas. The palette
// is a night museum: dark blue floor, warm stone walls, amber guard cones,
// red camera cones, gold loot and a teal thief, so safe cover, danger and
// loot are obvious at a glance. The HUD strip sits above the room; title,
// pause, caught, level-clear and victory screens are drawn over the room.

import { ROOM } from './levels.js';
import { GUARD_CONE_HALF_ANGLE, GUARD_CONE_RANGE, guardIsSuspicious } from './guards.js';
import { CAMERA_CONE_HALF_ANGLE, cameraAngle, cameraIsJammed } from './cameras.js';
import { alarmBand } from './alarm.js';

export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 720;
const HUD_HEIGHT = 72;

const FONT_TITLE = 'bold 44px system-ui, sans-serif';
const FONT_HEADING = 'bold 26px system-ui, sans-serif';
const FONT_BODY = '15px system-ui, sans-serif';
const FONT_SMALL = 'bold 13px system-ui, sans-serif';
const FONT_HUD = 'bold 15px system-ui, sans-serif';

/** Draw one frame of the whole game. `view` carries the live game state. */
export function drawFrame(ctx, view) {
  drawRoom(ctx, view);
  drawHud(ctx, view);
  if (view.screen === 'title') drawTitleScreen(ctx, view);
  else if (view.screen === 'paused') drawPausedScreen(ctx, view);
  else if (view.screen === 'caught') drawCaughtScreen(ctx, view);
  else if (view.screen === 'levelClear') drawLevelClearScreen(ctx, view);
  else if (view.screen === 'victory') drawVictoryScreen(ctx, view);
  else if (view.screen === 'gameOver') drawGameOverScreen(ctx, view);
}

// ---------------------------------------------------------------- the room

function drawRoom(ctx, view) {
  const { level } = view;
  // Floor: dark tiles with a faint checker.
  ctx.fillStyle = '#161d2e';
  ctx.fillRect(ROOM.x, ROOM.y, ROOM.w, ROOM.h);
  const tile = 46;
  for (let ty = ROOM.y; ty < ROOM.y + ROOM.h; ty += tile) {
    for (let tx = ROOM.x; tx < ROOM.x + ROOM.w; tx += tile) {
      const even = ((tx - ROOM.x) / tile + (ty - ROOM.y) / tile) % 2 === 0;
      ctx.fillStyle = even ? '#1a2236' : '#182031';
      ctx.fillRect(tx, ty, Math.min(tile, ROOM.x + ROOM.w - tx), Math.min(tile, ROOM.y + ROOM.h - ty));
    }
  }
  // Room border.
  ctx.strokeStyle = '#3a2f22';
  ctx.lineWidth = 6;
  ctx.strokeRect(ROOM.x - 3, ROOM.y - 3, ROOM.w + 6, ROOM.h + 6);

  drawExit(ctx, view);
  for (const piece of level.loot) drawLoot(ctx, piece, view.time);
  for (const crate of level.cover) drawCover(ctx, crate);
  for (const wall of level.walls) drawWall(ctx, wall);
  for (const camera of view.cameras) drawCameraCone(ctx, camera);
  for (const guard of view.guards) drawGuardCone(ctx, guard);
  for (const camera of view.cameras) drawCamera(ctx, camera);
  for (const guard of view.guards) drawGuard(ctx, guard);
  if (view.coin) drawCoinFlight(ctx, view.coin);
  drawThief(ctx, view.thief, view.time);
}

function drawWall(ctx, wall) {
  ctx.fillStyle = '#5d4a33';
  ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
  ctx.fillStyle = '#7a6248';
  ctx.fillRect(wall.x, wall.y, wall.w, 4);
  ctx.strokeStyle = '#3a2f22';
  ctx.lineWidth = 2;
  ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
}

function drawCover(ctx, crate) {
  // A wooden crate: cover that blocks sight and movement.
  ctx.fillStyle = '#6e5232';
  ctx.fillRect(crate.x, crate.y, crate.w, crate.h);
  ctx.strokeStyle = '#4a3520';
  ctx.lineWidth = 2;
  ctx.strokeRect(crate.x + 2, crate.y + 2, crate.w - 4, crate.h - 4);
  ctx.beginPath();
  ctx.moveTo(crate.x + 4, crate.y + 4);
  ctx.lineTo(crate.x + crate.w - 4, crate.y + crate.h - 4);
  ctx.moveTo(crate.x + crate.w - 4, crate.y + 4);
  ctx.lineTo(crate.x + 4, crate.y + crate.h - 4);
  ctx.stroke();
  ctx.fillStyle = '#8a6a42';
  ctx.fillRect(crate.x + crate.w / 2 - 3, crate.y + 4, 6, crate.h - 8);
}

function drawExit(ctx, view) {
  const exit = view.level.exit;
  const open = view.lootTaken >= view.level.loot.length;
  const cx = exit.x + exit.w / 2;
  const cy = exit.y + exit.h / 2;
  if (open) {
    const pulse = 0.5 + 0.3 * Math.sin(view.time * 3);
    ctx.fillStyle = `rgba(46, 204, 113, ${0.25 + pulse * 0.2})`;
    ctx.fillRect(exit.x - 10, exit.y - 10, exit.w + 20, exit.h + 20);
  }
  ctx.fillStyle = open ? '#2ecc71' : '#5a6b7a';
  ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
  ctx.strokeStyle = open ? '#a9f0c6' : '#8a9aa8';
  ctx.lineWidth = 2;
  ctx.strokeRect(exit.x, exit.y, exit.w, exit.h);
  ctx.fillStyle = '#0d1320';
  ctx.font = FONT_SMALL;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', cx, cy);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawLoot(ctx, piece, time) {
  if (piece.taken) return;
  const bob = Math.sin(time * 2 + piece.x) * 2;
  const x = piece.x;
  const y = piece.y + bob;
  // Glow so loot reads from across the room.
  const glow = ctx.createRadialGradient(x, y, 2, x, y, 34);
  glow.addColorStop(0, 'rgba(255, 215, 90, 0.35)');
  glow.addColorStop(1, 'rgba(255, 215, 90, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 34, 0, Math.PI * 2);
  ctx.fill();
  if (piece.kind === 'painting') {
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(x - 18, y - 13, 36, 26);
    ctx.fillStyle = '#274b63';
    ctx.fillRect(x - 14, y - 9, 28, 18);
    ctx.fillStyle = '#e8c85a';
    ctx.beginPath();
    ctx.arc(x - 4, y - 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3f7a4e';
    ctx.fillRect(x - 14, y + 3, 28, 6);
  } else if (piece.kind === 'gold') {
    ctx.fillStyle = '#f1c40f';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(x - 14 + i * 10, y + 8 - i * 6, 12, 6);
    }
    ctx.fillStyle = '#ffe27a';
    ctx.fillRect(x - 14, y + 2, 12, 3);
  } else {
    // Diamond, and a bigger star diamond for the final room.
    const big = piece.kind === 'star';
    const r = big ? 20 : 14;
    ctx.fillStyle = big ? '#7df9ff' : '#4dd7e8';
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.8, y - r * 0.25);
    ctx.lineTo(x + r * 0.6, y + r * 0.7);
    ctx.lineTo(x - r * 0.6, y + r * 0.7);
    ctx.lineTo(x - r * 0.8, y - r * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(x - r * 0.25, y - r * 0.35, 2.5, 0, Math.PI * 2);
    ctx.fill();
    if (big) {
      ctx.fillStyle = '#eafcff';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', x, y - r - 8);
      ctx.textAlign = 'left';
    }
  }
}

// ---------------------------------------------------------------- cones and people

function drawConeWedge(ctx, x, y, angle, halfAngle, range, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fill();
}

function drawGuardCone(ctx, guard) {
  const alerted = guard.alerted || guard.state === 'alert';
  const fill = alerted ? 'rgba(255, 60, 60, 0.28)' : 'rgba(255, 190, 60, 0.18)';
  drawConeWedge(ctx, guard.x, guard.y, guard.angle, GUARD_CONE_HALF_ANGLE, GUARD_CONE_RANGE, fill);
}

function drawGuard(ctx, guard) {
  const alerted = guard.alerted || guard.state === 'alert';
  // Body: navy uniform with a gold-trimmed cap.
  ctx.fillStyle = '#2b3a55';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = alerted ? '#ff5a5a' : '#c9a227';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Facing wedge: a small nose so the direction reads.
  ctx.fillStyle = '#dfe8f5';
  ctx.beginPath();
  ctx.arc(guard.x + Math.cos(guard.angle) * 7, guard.y + Math.sin(guard.angle) * 7, 4, 0, Math.PI * 2);
  ctx.fill();
  // Cap brim.
  ctx.fillStyle = '#1c2940';
  ctx.beginPath();
  ctx.arc(guard.x - Math.cos(guard.angle) * 4, guard.y - Math.sin(guard.angle) * 4, 6, 0, Math.PI * 2);
  ctx.fill();
  if (guardIsSuspicious(guard)) {
    ctx.fillStyle = '#ff5a5a';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', guard.x, guard.y - 22);
    ctx.textAlign = 'left';
  } else if (guard.state === 'investigate') {
    ctx.fillStyle = '#ffd75e';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', guard.x, guard.y - 22);
    ctx.textAlign = 'left';
  }
}

function drawCameraCone(ctx, camera) {
  if (cameraIsJammed(camera)) return;
  drawConeWedge(ctx, camera.x, camera.y, cameraAngle(camera), CAMERA_CONE_HALF_ANGLE, camera.range, 'rgba(255, 80, 80, 0.15)');
}

function drawCamera(ctx, camera) {
  const jammed = cameraIsJammed(camera);
  const angle = cameraAngle(camera);
  // Mount on the wall edge.
  ctx.fillStyle = jammed ? '#5a6b7a' : '#39424f';
  ctx.beginPath();
  ctx.arc(camera.x, camera.y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = jammed ? '#8a9aa8' : '#ff5a5a';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Lens dot pointing along the cone.
  ctx.fillStyle = jammed ? '#8a9aa8' : '#ff5a5a';
  ctx.beginPath();
  ctx.arc(camera.x + Math.cos(angle) * 6, camera.y + Math.sin(angle) * 6, 3, 0, Math.PI * 2);
  ctx.fill();
  if (jammed) {
    ctx.fillStyle = '#aeb9c4';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OFF', camera.x, camera.y - 14);
    ctx.textAlign = 'left';
  }
}

function drawCoinFlight(ctx, coin) {
  const progress = 1 - coin.timeLeft / coin.duration;
  const x = coin.fromX + (coin.toX - coin.fromX) * progress;
  const y = coin.fromY + (coin.toY - coin.fromY) * progress - Math.sin(progress * Math.PI) * 26;
  ctx.fillStyle = '#ffd75e';
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#a67c00';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // The landing mark, so the player sees where the guard is headed.
  ctx.strokeStyle = 'rgba(255, 215, 94, 0.7)';
  ctx.beginPath();
  ctx.arc(coin.toX, coin.toY, 10 + Math.sin(progress * 8) * 2, 0, Math.PI * 2);
  ctx.stroke();
}

function drawThief(ctx, thief, time) {
  const bob = thief.moving ? Math.sin(thief.stepPhase * 0.12) * 1.5 : Math.sin(time * 2) * 0.8;
  const x = thief.x;
  const y = thief.y + bob;
  // Hooded figure in teal, with a dark mask and a direction nose.
  ctx.fillStyle = '#14b8a6';
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f766e';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#0d2b28';
  ctx.beginPath();
  ctx.arc(x + Math.cos(thief.angle) * 5, y + Math.sin(thief.angle) * 5, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e6fffa';
  ctx.beginPath();
  ctx.arc(x + Math.cos(thief.angle) * 7, y + Math.sin(thief.angle) * 7, 2, 0, Math.PI * 2);
  ctx.fill();
  if (thief.sneaking) {
    ctx.fillStyle = 'rgba(45, 212, 191, 0.9)';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SNEAK', x, y - 20);
    ctx.textAlign = 'left';
  }
}

// ---------------------------------------------------------------- the HUD

function drawHud(ctx, view) {
  ctx.fillStyle = '#0d1320';
  ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_HEIGHT);
  ctx.fillStyle = '#22304a';
  ctx.fillRect(0, HUD_HEIGHT - 2, CANVAS_WIDTH, 2);

  ctx.fillStyle = '#e6edf7';
  ctx.font = FONT_HUD;
  ctx.textBaseline = 'middle';
  ctx.fillText(view.level.name, 16, 20);

  // Alarm meter.
  const band = alarmBand(view.alarm);
  const barX = 92;
  const barY = 34;
  const barW = 300;
  const barH = 18;
  ctx.fillStyle = band === 'critical' && Math.sin(view.time * 10) > 0 ? '#ff5a5a' : '#e6edf7';
  ctx.font = FONT_SMALL;
  ctx.fillText('ALARM', 16, barY + barH / 2);
  ctx.fillStyle = '#1c2940';
  ctx.fillRect(barX, barY, barW, barH);
  const fillW = (barW * view.alarm.value) / 100;
  const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  grad.addColorStop(0, '#2ecc71');
  grad.addColorStop(0.5, '#f1c40f');
  grad.addColorStop(1, '#e74c3c');
  ctx.fillStyle = grad;
  if (fillW > 0) ctx.fillRect(barX, barY, fillW, barH);
  ctx.strokeStyle = '#3a4a63';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(barX, barY, barW, barH);
  ctx.fillStyle = '#e6edf7';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(`${Math.round(view.alarm.value)}`, barX + barW + 8, barY + barH / 2);

  // Loot, tools, score, time.
  const lootText = `◆ ${view.lootTaken}/${view.level.loot.length}`;
  ctx.fillStyle = '#ffd75e';
  ctx.font = FONT_HUD;
  ctx.fillText(lootText, 450, 43);
  ctx.fillStyle = '#e6edf7';
  ctx.fillText(`● ${view.thief.coins} coins`, 540, 43);
  ctx.fillText(`⚡ ${view.thief.jammers} jam`, 660, 43);
  ctx.textAlign = 'right';
  ctx.fillText(`SCORE ${view.score}`, 944, 20);
  ctx.fillStyle = '#8a9aa8';
  ctx.fillText(formatTime(view.elapsed), 944, 43);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

/** Format seconds as MM:SS. */
function formatTime(seconds) {
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- screens

function drawOverlayPanel(ctx, title, lines, hint) {
  ctx.fillStyle = 'rgba(8, 12, 24, 0.82)';
  ctx.fillRect(ROOM.x, ROOM.y, ROOM.w, ROOM.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e6edf7';
  ctx.font = FONT_TITLE;
  ctx.fillText(title, CANVAS_WIDTH / 2, 250);
  ctx.font = FONT_BODY;
  ctx.fillStyle = '#b9c4d6';
  let y = 310;
  for (const line of lines) {
    ctx.fillText(line, CANVAS_WIDTH / 2, y);
    y += 26;
  }
  if (hint) {
    ctx.font = FONT_HEADING;
    ctx.fillStyle = '#ffd75e';
    ctx.fillText(hint, CANVAS_WIDTH / 2, y + 34);
  }
  ctx.textAlign = 'left';
}

function drawTitleScreen(ctx, view) {
  drawOverlayPanel(
    ctx,
    'THE MIDNIGHT GALLERY',
    [
      'A three-room heist. Steal every piece, slip past the patrols, reach the EXIT.',
      '',
      'WASD / arrows — move      Shift — sneak (slower, harder to spot)',
      'Q — throw a coin to pull a guard away      E — jam the cameras (6 s)',
      'M — mute      P — pause',
      '',
      'Guards and cameras raise the ALARM when they see you.',
      'At 100, the heist is blown. Break line of sight and it falls again.',
      '',
      `Best score: ${view.bestScore}`,
    ],
    'Press ENTER to begin',
  );
}

function drawPausedScreen(ctx) {
  drawOverlayPanel(ctx, 'PAUSED', ['Take a breath. The guards wait for no one — except now.'], 'Press P to resume');
}

function drawCaughtScreen(ctx, view) {
  drawOverlayPanel(
    ctx,
    'CAUGHT!',
    [`The alarm hit 100 in ${view.level.name}.`, `Attempts left: ${view.attemptsLeft}`, `Score so far: ${view.score}`],
    view.attemptsLeft > 0 ? 'Press R to try the room again' : 'Press ENTER for the title screen',
  );
}

function drawLevelClearScreen(ctx, view) {
  const bonus = view.lastClearBonus;
  drawOverlayPanel(
    ctx,
    'CLEAN GETAWAY',
    [
      `${view.level.name} cleared — every piece lifted.`,
      `Room bonus: +${bonus}   (quieter alarms pay better)`,
      `Total score: ${view.score}`,
    ],
    view.levelIndex + 1 < view.levelCount ? 'Press ENTER for the next room' : 'Press ENTER for the vault',
  );
}

function drawVictoryScreen(ctx, view) {
  const stars = view.score >= 2600 ? '★★★' : view.score >= 2000 ? '★★☆' : '★☆☆';
  drawOverlayPanel(
    ctx,
    'THE PERFECT HEIST',
    [
      'Three rooms, every piece lifted, and the Star Diamond is yours.',
      '',
      `Final score: ${view.score}      Time: ${formatTime(view.elapsed)}`,
      `Peak alarm: ${Math.round(view.peakAlarm)}      Rating: ${stars}`,
      '',
      'The gallery never knew you were there.',
    ],
    'Press ENTER to play again',
  );
}

function drawGameOverScreen(ctx, view) {
  drawOverlayPanel(
    ctx,
    'THE CREW WALKS AWAY',
    ['Three attempts, three alarms. The gallery keeps its gold tonight.', `Score: ${view.score}`],
    'Press ENTER for the title screen',
  );
}
