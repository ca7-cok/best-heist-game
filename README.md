# The Midnight Gallery — a heist game

[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![rank](https://make.fun/ca7-cok/best-heist-game/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![reward](https://make.fun/ca7-cok/best-heist-game/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

A top-down stealth heist game that runs offline in a desktop browser from
static files. You are the thief in a night museum: three rooms, patrolling
guards with vision cones, sweeping security cameras, loot on the walls, and
one alarm meter between you and the getaway.

## How to play

- **WASD / arrow keys** — move the thief
- **Shift** — sneak (slower, harder for guards and cameras to spot)
- **Q** — throw a coin: the nearest guard walks over to investigate the spot
- **E** — fire the jammer: all cameras go blind for 6 seconds
- **P** — pause, **M** — mute

Steal every piece in the room, then reach the green EXIT. Being seen by a
guard or a camera drives the **ALARM** meter up; break line of sight and it
falls again. At 100 the heist is blown. A quiet room pays a bigger getaway
bonus than a loud one.

## The three rooms

1. **The Gallery** — three pieces, two guards, one camera.
2. **The Vault Hall** — four pieces, three guards, two cameras.
3. **The Grand Vault** — the Star Diamond, three guards, three cameras.

## Structure

- `game/index.html` — the page; `game/src/main.js` — bootstrap and loop
- `game/src/levels.js` — the three rooms as fixed data (no randomness)
- `game/src/guards.js` — patrols, vision cones, coin distractions
- `game/src/cameras.js` — sweeping camera cones and jamming
- `game/src/thief.js` — movement, sneaking, tools
- `game/src/alarm.js` — the alarm meter
- `game/src/render.js` — all canvas drawing, HUD and screens
- `game/src/audio.js` — synthesized WebAudio sounds, no audio files
- `game/src/input.js` — keyboard state
- `game/src/shots.js` — deterministic scenes for the screenshots
- `game/src/geometry.js` — angles, cones and line-of-sight

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/`
to the output directory and writes `dossier.json` with the vendored
`vendor/makefun-game.ts`. Serve `game/` with any static server and open
`index.html` to play.

## License

MIT — see `LICENSE`.
