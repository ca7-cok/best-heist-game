// alarm.js — the alarm meter, the game's central tension. Being seen by a
// guard or a camera drives it up fast; slipping out of sight lets it fall
// slowly. At 100 the heist is blown and the thief is caught. The meter is
// the fair part of being caught: it is always visible, and it always gives
// the player time to break line of sight.

export const ALARM_MAX = 100;
export const ALARM_GUARD_RATE = 50; // points per second while a guard sees you
export const ALARM_CAMERA_RATE = 38; // points per second while a camera sees you
export const ALARM_DECAY_RATE = 9; // points per second while unseen

/** Build a fresh alarm meter. */
export function createAlarm() {
  return { value: 0, rising: false, peak: 0 };
}

/**
 * Advance the meter by `dt` seconds. `guardExposure` and `cameraExposure`
 * are each 0 when unseen and up to about 1 when seen up close; sneaking
 * halves how fast exposure builds the meter. A lone guard fills the meter
 * in about four seconds, a lone camera in about five — always enough time
 * to break line of sight.
 */
export function updateAlarm(alarm, dt, guardExposure, cameraExposure, sneaking) {
  const seen = guardExposure > 0 || cameraExposure > 0;
  if (seen) {
    const build = (guardExposure * ALARM_GUARD_RATE + cameraExposure * ALARM_CAMERA_RATE) * (sneaking ? 0.5 : 1);
    alarm.value += build * dt;
    alarm.rising = true;
  } else {
    alarm.value -= ALARM_DECAY_RATE * dt;
    alarm.rising = false;
  }
  if (alarm.value < 0) alarm.value = 0;
  if (alarm.value > ALARM_MAX) alarm.value = ALARM_MAX;
  if (alarm.value > alarm.peak) alarm.peak = alarm.value;
}

/** Whether the meter has hit the top: the thief is caught. */
export function alarmTripped(alarm) {
  return alarm.value >= ALARM_MAX;
}

/** Alarm danger band: 'calm' | 'warm' | 'hot' | 'critical'. */
export function alarmBand(alarm) {
  if (alarm.value >= 80) return 'critical';
  if (alarm.value >= 55) return 'hot';
  if (alarm.value >= 25) return 'warm';
  return 'calm';
}
