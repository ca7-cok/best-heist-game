// main.js — the heist game's bootstrap, state machine and frame loop.
// Screens: title → playing ⇄ paused → caught / levelClear → victory /
// gameOver. The loop is fixed-step in spirit: dt is clamped, patrols and
// camera sweeps run on fixed periods, and nothing reads the clock or a
// random source, so the game plays the same every run.

import { LEVELS, LOOT_VALUES, ROOM } from './levels.js';
import { createGuard, distractGuard, guardSeesThief, guardSightStrength, updateGuard } from './guards.js';
import { cameraSeesThief, cameraSightStrength, createCamera, jamAllCameras, updateCamera } from './cameras.js';
import { createThief, throwCoin, useJammer, updateThief, JAMMER_SECONDS } from './thief.js';
import { alarmTripped, createAlarm, updateAlarm, alarmBand } from './alarm.js';
import {
  ensureAudio,
  playAlarmPulse,
  playCaught,
  playClick,
  playCoin,
  playFootstep,
  playGetaway,
  playJammer,
  playPickup,
  playSpotted,
  toggleMute,
} from './audio.js';
import { attachKeyboard, clearPressed, createInput, takePressed } from './input.js';
import { CANVAS_HEIGHT, CANVAS_WIDTH, drawFrame } from './render.js';
import { applyShot } from './shots.js';
import { distance } from './geometry.js';

const LOOT_PICKUP_RADIUS = 28;
const COIN_FLIGHT_SECONDS = 0.45;
const COIN_DISTRACT_RADIUS = 280;
const ALARM_PULSE_INTERVAL = 0.7;

/** All rectangles that block movement and sight in the current room. */
function roomBlockers(level) {
  return [...level.walls, ...level.cover];
}

/** Start a fresh run from the title screen. */
function startRun(game) {
  game.score = 0;
  game.elapsed = 0;
  game.peakAlarm = 0;
  loadLevel(game, 0);
  game.screen = 'playing';
}

/** Load room `index`, resetting the thief, guards, cameras and alarm.
 * `attemptsLeft` carries over on a retry after being caught; a fresh room
 * (or a fresh run) starts with 3. */
function loadLevel(game, index, attemptsLeft = 3) {
  const level = LEVELS[index];
  game.levelIndex = index;
  game.level = level;
  for (const piece of level.loot) piece.taken = false; // a fresh room, loot back on the walls
  game.guards = level.guards.map(createGuard);
  game.cameras = level.cameras.map(createCamera);
  game.thief = createThief(level.spawn);
  game.thief.coins = level.coins;
  game.thief.jammers = level.jammers;
  game.alarm = createAlarm();
  game.blockers = roomBlockers(level);
  game.lootTaken = 0;
  game.attemptsLeft = attemptsLeft;
  game.coin = null;
  game.wasSeen = false;
  game.alarmPulseLeft = 0;
  game.lastClearBonus = 0;
  game.screen = 'playing';
}

/** Retry the current room after being caught, keeping the attempts left. */
function retryLevel(game) {
  loadLevel(game, game.levelIndex, game.attemptsLeft);
}

/** The room-clear bonus: quieter alarms pay better, floor 100. */
function clearBonus(alarm) {
  return Math.max(100, 500 - Math.round(alarm.peak * 2));
}

/** Build the live game object. */
function createGame(canvas) {
  const game = {
    canvas,
    ctx: canvas.getContext('2d'),
    input: createInput(),
    screen: 'title',
    levelIndex: 0,
    level: LEVELS[0],
    levelCount: LEVELS.length,
    guards: LEVELS[0].guards.map(createGuard),
    cameras: LEVELS[0].cameras.map(createCamera),
    thief: createThief(LEVELS[0].spawn),
    alarm: createAlarm(),
    blockers: roomBlockers(LEVELS[0]),
    lootTaken: 0,
    attemptsLeft: 3,
    coin: null,
    score: 0,
    elapsed: 0,
    peakAlarm: 0,
    time: 0,
    lastFrameTime: null,
    frozen: false,
    bestScore: 0,
    wasSeen: false,
    alarmPulseLeft: 0,
    lastClearBonus: 0,
    lastStepMark: 0,
  };
  game.thief.coins = LEVELS[0].coins;
  game.thief.jammers = LEVELS[0].jammers;
  return game;
}

/** One update tick while playing. */
function updatePlaying(game, dt) {
  const { thief, level } = game;
  game.elapsed += dt;
  game.time += dt;

  // Movement and footsteps.
  const walked = updateThief(thief, dt, game.input, game.blockers, ROOM);
  if (walked > 0 && thief.stepPhase - game.lastStepMark > 30) {
    game.lastStepMark = thief.stepPhase;
    playFootstep();
  }

  // Tools.
  if (takePressed(game.input, 'KeyQ')) {
    const spot = throwCoin(thief);
    if (spot) {
      game.coin = { fromX: thief.x, fromY: thief.y, toX: spot.x, toY: spot.y, timeLeft: COIN_FLIGHT_SECONDS, duration: COIN_FLIGHT_SECONDS };
      playCoin();
    }
  }
  if (takePressed(game.input, 'KeyE')) {
    if (useJammer(thief)) {
      jamAllCameras(game.cameras, JAMMER_SECONDS);
      playJammer();
    }
  }
  if (takePressed(game.input, 'KeyM')) toggleMute();

  // Flying coin: on landing, the nearest guard in earshot investigates.
  if (game.coin) {
    game.coin.timeLeft -= dt;
    if (game.coin.timeLeft <= 0) {
      let nearest = null;
      let nearestDist = COIN_DISTRACT_RADIUS;
      for (const guard of game.guards) {
        const d = distance(guard.x, guard.y, game.coin.toX, game.coin.toY);
        if (d < nearestDist) {
          nearest = guard;
          nearestDist = d;
        }
      }
      if (nearest) distractGuard(nearest, game.coin.toX, game.coin.toY);
      game.coin = null;
    }
  }

  // Guards and cameras.
  let guardExposure = 0;
  let seenNow = false;
  for (const guard of game.guards) {
    updateGuard(guard, dt, thief, game.blockers, ROOM);
    if (guardSeesThief(guard, thief, game.blockers)) {
      guardExposure = Math.max(guardExposure, guardSightStrength(guard, thief));
      seenNow = true;
    }
  }
  let cameraExposure = 0;
  for (const camera of game.cameras) {
    updateCamera(camera, dt);
    if (cameraSeesThief(camera, thief, game.blockers)) {
      cameraExposure = Math.max(cameraExposure, cameraSightStrength(camera, thief));
      seenNow = true;
    }
  }
  if (seenNow && !game.wasSeen) playSpotted();
  game.wasSeen = seenNow;

  // Alarm.
  updateAlarm(game.alarm, dt, guardExposure, cameraExposure, thief.sneaking);
  if (game.alarm.value > game.peakAlarm) game.peakAlarm = game.alarm.value;
  if (alarmBand(game.alarm) === 'critical') {
    game.alarmPulseLeft -= dt;
    if (game.alarmPulseLeft <= 0) {
      playAlarmPulse();
      game.alarmPulseLeft = ALARM_PULSE_INTERVAL;
    }
  }
  if (alarmTripped(game.alarm)) {
    game.attemptsLeft -= 1;
    game.screen = 'caught';
    playCaught();
    clearPressed(game.input);
    return;
  }

  // Loot pickup.
  for (const piece of level.loot) {
    if (piece.taken) continue;
    if (distance(thief.x, thief.y, piece.x, piece.y) < LOOT_PICKUP_RADIUS) {
      piece.taken = true;
      game.lootTaken += 1;
      game.score += LOOT_VALUES[piece.kind];
      thief.coins += 1; // every lift buys back a coin
      playPickup();
    }
  }

  // Exit: only open once every piece is lifted.
  if (game.lootTaken >= level.loot.length) {
    const exit = level.exit;
    const inside =
      thief.x > exit.x - 6 && thief.x < exit.x + exit.w + 6 && thief.y > exit.y - 6 && thief.y < exit.y + exit.h + 6;
    if (inside) {
      game.lastClearBonus = clearBonus(game.alarm);
      game.score += game.lastClearBonus;
      game.screen = 'levelClear';
      playGetaway();
      clearPressed(game.input);
    }
  }

  // Pause.
  if (takePressed(game.input, 'KeyP') || takePressed(game.input, 'Escape')) {
    game.screen = 'paused';
    clearPressed(game.input);
  }
}

/** Handle keys on the non-playing screens. */
function updateScreen(game) {
  const input = game.input;
  if (takePressed(input, 'KeyM')) toggleMute();
  if (game.screen === 'title') {
    if (takePressed(input, 'Enter') || takePressed(input, 'Space')) {
      ensureAudio();
      playClick();
      startRun(game);
    }
    return;
  }
  if (game.screen === 'paused') {
    if (takePressed(input, 'KeyP') || takePressed(input, 'Escape') || takePressed(input, 'Enter')) {
      game.screen = 'playing';
      playClick();
    }
    return;
  }
  if (game.screen === 'caught') {
    if (game.attemptsLeft > 0 && (takePressed(input, 'KeyR') || takePressed(input, 'Enter'))) {
      playClick();
      retryLevel(game);
    } else if (game.attemptsLeft <= 0 && takePressed(input, 'Enter')) {
      game.bestScore = Math.max(game.bestScore, game.score);
      game.screen = 'gameOver';
      playClick();
    }
    return;
  }
  if (game.screen === 'levelClear') {
    if (takePressed(input, 'Enter') || takePressed(input, 'Space')) {
      playClick();
      if (game.levelIndex + 1 < LEVELS.length) {
        loadLevel(game, game.levelIndex + 1);
      } else {
        game.bestScore = Math.max(game.bestScore, game.score);
        game.screen = 'victory';
      }
    }
    return;
  }
  if (game.screen === 'victory' || game.screen === 'gameOver') {
    if (takePressed(input, 'Enter') || takePressed(input, 'Space')) {
      playClick();
      // Fresh run, with the loot flags reset (shots may have set them).
      for (const level of LEVELS) for (const piece of level.loot) piece.taken = false;
      game.screen = 'title';
      game.levelIndex = 0;
      game.level = LEVELS[0];
      game.guards = LEVELS[0].guards.map(createGuard);
      game.cameras = LEVELS[0].cameras.map(createCamera);
      game.thief = createThief(LEVELS[0].spawn);
      game.thief.coins = LEVELS[0].coins;
      game.thief.jammers = LEVELS[0].jammers;
      game.alarm = createAlarm();
      game.blockers = roomBlockers(LEVELS[0]);
      game.lootTaken = 0;
      game.score = 0;
      game.elapsed = 0;
      game.peakAlarm = 0;
    }
  }
}

/** The frame loop: advance the game, then draw it. `now` is this frame's
 * animation timestamp; dt is measured against the previous frame's, so the
 * game runs at real speed on any display. */
function frameLoop(game, now) {
  const dt =
    game.lastFrameTime === null
      ? 0.016
      : Math.min(0.05, Math.max(0, (now - game.lastFrameTime) / 1000));
  game.lastFrameTime = now;
  if (!game.frozen) {
    if (game.screen === 'playing') updatePlaying(game, dt);
    else {
      game.time += dt;
      updateScreen(game);
    }
  }
  drawFrame(game.ctx, game);
  requestAnimationFrame((next) => frameLoop(game, next));
}

/** Boot the game when the page loads. */
function boot() {
  const canvas = document.getElementById('game');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const game = createGame(canvas);
  attachKeyboard(game.input);
  // Debug handle for automated play-testing (read-only inspection).
  window.__heist = game;
  canvas.addEventListener('click', () => {
    ensureAudio();
    if (game.screen === 'title') {
      playClick();
      startRun(game);
    }
  });
  const shot = new URLSearchParams(window.location.search).get('shot');
  if (shot) applyShot(game, shot);
  requestAnimationFrame((first) => frameLoop(game, first));
}

document.addEventListener('DOMContentLoaded', boot);
