// shots.js — deterministic scenes for the entry's screenshots. Each shot is
// a fixed setup of the live game (no randomness, no clock): the title, a
// mid-heist moment with every element in one frame, the caught moment, and
// the victory screen. The game freezes on the shot scene, so a screenshot
// taken at any moment shows exactly this frame.

import { angleTo } from './geometry.js';
import { LEVELS } from './levels.js';
import { createGuard } from './guards.js';
import { createCamera } from './cameras.js';

/**
 * Put the game into a screenshot scene. `name` is 'start', 'play', 'caught'
 * or 'end'. After this call the game is frozen: it renders but does not
 * advance, so the shot is identical every time.
 */
export function applyShot(game, name) {
  game.frozen = true;
  game.time = 1.2; // fixed, so bobbing loot and pulsing glows sit still
  if (name === 'start') {
    game.screen = 'title';
    game.bestScore = 0;
    return;
  }
  if (name === 'play') {
    game.screen = 'playing';
    // Thief mid-room, half-hidden by the central crate.
    game.thief.x = 452;
    game.thief.y = 400;
    game.thief.angle = -Math.PI / 2;
    game.thief.coins = 3;
    game.thief.jammers = 2;
    // First guard's cone sweeps right across the thief's lane.
    const guardA = game.guards[0];
    guardA.x = 200;
    guardA.y = 300;
    guardA.angle = angleTo(guardA.x, guardA.y, game.thief.x, game.thief.y);
    guardA.state = 'patrol';
    // Second guard patrols the right wing, cone pointing down the room.
    const guardB = game.guards[1];
    guardB.x = 760;
    guardB.y = 220;
    guardB.angle = Math.PI / 2;
    guardB.state = 'patrol';
    // Camera cone points straight down the middle of the room.
    game.cameras[0].phase = game.cameras[0].period * 0.25;
    game.cameras[0].jammedLeft = 0;
    // One piece already lifted, the alarm half-raised: a heist in progress.
    game.level.loot[0].taken = true;
    game.lootTaken = 1;
    game.alarm.value = 42;
    game.alarm.peak = 42;
    game.score = 250;
    game.elapsed = 58;
    return;
  }
  if (name === 'caught') {
    game.screen = 'caught';
    game.thief.x = 260;
    game.thief.y = 320;
    const guardA = game.guards[0];
    guardA.x = 200;
    guardA.y = 300;
    guardA.angle = angleTo(guardA.x, guardA.y, game.thief.x, game.thief.y);
    guardA.state = 'alert';
    guardA.alerted = true;
    game.alarm.value = 100;
    game.alarm.peak = 100;
    game.attemptsLeft = 2;
    game.score = 350;
    game.elapsed = 96;
    return;
  }
  if (name === 'end') {
    game.screen = 'victory';
    // Show the final room behind the overlay: every piece lifted in the Grand Vault.
    game.levelIndex = 2;
    game.level = LEVELS[2];
    game.guards = LEVELS[2].guards.map(createGuard);
    game.cameras = LEVELS[2].cameras.map(createCamera);
    game.lootTaken = LEVELS[2].loot.length;
    game.score = 2840;
    game.elapsed = 243;
    game.peakAlarm = 61;
    game.alarm.peak = 61;
    return;
  }
}
