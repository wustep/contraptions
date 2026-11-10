import type { Strike } from './engine'
import { CELL, SLOPE, VX, cellos, contacts, knocks } from './layout'

/**
 * The machine's contacts as the notes the engine plays: nothing is in the soundtrack that is not a ball landing on a
 * part, the bow's hair coming to a string, or a latch letting a ball go.
 *
 * What the engine is told is the physics of each contact: how fast the ball landed (a tine, a bellows), how fast the
 * hammer it threw met its string (the crank's felt end is 1.6 times as far from the pin as the pad the ball lands on),
 * how fast the bow is moving and for how long its hair is on the string.
 */

/** The hammer's speed for the ball's. */
const LEVER = 1.6
/** How long a bellows goes on giving its puff: the board is still going down a little after the ball has left it. */
const PUFF = 0.17
/** The last pipe: as long as the ball's weight takes to empty its bellows. */
const LAST_BREATH = 6

/** How loud each kind sits, and where across the room: hammers and the cellos to the left, pipes to the right. */
const LEVEL = { tine: 1, piano: 1.5, pipe: 0.5, bow: 0.6, knock: 0.3 }
const PAN = { tine: 0.1, piano: -0.4, pipe: 0.45, bow: -0.22, knock: 0 }

function gains(kind: keyof typeof LEVEL, lean = 0): { gl: number; gr: number } {
  const pan = Math.max(-0.8, Math.min(0.8, PAN[kind] + lean))
  const angle = ((pan + 1) * Math.PI) / 4
  return { gl: Math.cos(angle) * LEVEL[kind], gr: Math.sin(angle) * LEVEL[kind] }
}

export function strikes(): Strike[] {
  const out: Strike[] = []
  for (const c of contacts) {
    if (c.kind === 'tine') out.push({ t: c.sound, kind: 'tine', hz: c.hz, v: c.vin * CELL, dur: 0, sag: false, ...gains('tine', (c.midi - 67) / 70) })
    else if (c.kind === 'piano') out.push({ t: c.sound, kind: 'piano', hz: c.hz, v: c.vin * CELL * LEVER, dur: 0, sag: false, ...gains('piano', (c.midi - 48) / 90) })
    else {
      const last = c.vout === 0
      out.push({ t: c.sound, kind: 'pipe', hz: c.hz, v: c.vin * CELL, dur: last ? LAST_BREATH : PUFF, sag: last, ...gains('pipe', (c.midi - 62) / 90) })
    }
  }
  const speed = Math.hypot(1, SLOPE) * VX * CELL
  for (const c of cellos) out.push({ t: c.t0, kind: 'bow', hz: c.hz, v: speed, dur: c.t1 - c.t0, sag: c.last, ...gains('bow') })
  for (const k of knocks) out.push({ t: k.t, kind: 'knock', hz: 0, v: k.v, dur: 0, sag: false, ...gains('knock') })
  return out.sort((a, b) => a.t - b.t)
}
