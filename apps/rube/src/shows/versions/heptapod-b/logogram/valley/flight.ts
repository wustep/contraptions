import type { Pt } from '../../../../../parts'
import { box, carried, frame, part, type PartShot } from '../kit'
import { onset, pulse, SEAM } from '../music'
import { SEAMS } from '../seams'
import { drawHeli, drawHeliDoor, drawWash, heliAt, heliPoint, IAN_SEAT, SEAT } from './heli'
import { drawBankFront, REVEAL } from './set'

/**
 * The flight (8.911 → 22.059), the valley builder's: out of the cloud, over the ridge, the shell, down to the pad.
 *
 * On the first great pulse the lake house's window-light goes to white and the white is cloud: the helicopter hangs
 * in it, the two of them on the cabin's bench seen through the door's window (Ian on her right). As the white clears
 * it lurches off (the onset 9.741), the cloud streaming past; on 11.099 it comes out of the cloud's front into clear
 * air (a cut to the outside: the helicopter pushing out of the bank piled on the near ridge). Then the long unhurried
 * pull: the camera draws back and back as it flies on over the ridge, until on 16.283 it crosses the crest (its nose
 * dips) and the valley is open below: the fog pouring over the far ridges, and the shell, whole, hanging over the
 * meadow, the helicopter a speck against it. It holds there. On 18.013 the nose comes up for the descent (a cut in to
 * it), and the camera comes in as it comes down onto the helideck at the camp, the rotor's wash blowing the mist off
 * the matting; the skids touch on 22.059 and the struts take it.
 *
 * Louise and Ian ride the bench (carried: the helicopter's own motion). The frame's origin is FLIGHT_AT, where she
 * sits at the cut, less half a cell; PAD_AT is where she sits at touchdown (the base's origin).
 */

interface FlightState {
  begin: number
}

const T0 = SEAM.flight
const LAND = SEAM.base
const GO = onset(9.741, 0.8)
const OUT = pulse(46)
const CREST = pulse(68)
const FLARE = pulse(75)

/** Louise on the bench, and Ian, in the world, at show time `t`. */
export const seatAt = (t: number): Pt => heliPoint(heliAt(t), SEAT[0], SEAT[1])
const ianAt = (t: number): Pt => heliPoint(heliAt(t), IAN_SEAT[0], IAN_SEAT[1])

const at0 = seatAt(T0)
const at1 = seatAt(LAND)
/** The flight's origin: where she sits at the cut, plus half a cell (she comes in at (-0.5, 0)). */
export const FLIGHT_AT: Pt = [at0[0] + 0.5, at0[1]]
/** The base's origin: where the flight's lane ends (the ball in the cabin, the helicopter on the pad), plus half a cell. */
export const PAD_AT: Pt = [at1[0] + 0.5, at1[1]]

/** Every strike: off, out of the cloud, over the crest, the nose up, touchdown. */
export const FLIGHT_HITS: number[] = [GO, OUT, CREST, FLARE, LAND]

const local = (p: Pt): Pt => [p[0] - FLIGHT_AT[0], p[1] - FLIGHT_AT[1]]

export const flight = part<FlightState>(
  {
    name: 'flight',
    flight: true,
    draw: (p, s, c) => {
      const t = c.t + s.begin
      const h = heliAt(t)
      const f = frame(p, c.k)
      const [x, y] = local([h.x, h.y])
      if (x + 9 < f.x0 || x - 9 > f.x1 || y + 8 < f.y0 || y - 6 > f.y1) return
      drawWash(p, c.k, t, FLIGHT_AT)
      drawHeli(p, c.k, h, { ink: c.ink, weight: c.weight, t }, FLIGHT_AT)
    },
    over: (p, s, c) => {
      const t = c.t + s.begin
      const h = heliAt(t)
      const f = frame(p, c.k)
      const [x, y] = local([h.x, h.y])
      if (x + 9 < f.x0 || x - 9 > f.x1 || y + 8 < f.y0 || y - 6 > f.y1) return
      drawHeliDoor(p, c.k, h, { ink: c.ink, weight: c.weight, t }, FLIGHT_AT)
      // While it is in the cloud, the cloud's near wisps stream past in front of it.
      if (t < OUT + 1.5) drawBankFront(p, c.k, t, FLIGHT_AT)
    },
  },
  (slot) => {
    const dur = slot.end - slot.begin
    const lane = carried((t) => local(seatAt(slot.begin + t)), 0, dur, Math.ceil(dur * 40))
    // The path it flies, and the pad: what the stage must draw it for, whenever any of it is in view.
    const cells = box(-136 - FLIGHT_AT[0], -60 - FLIGHT_AT[1], -16 - FLIGHT_AT[0], 1 - FLIGHT_AT[1], 3)
    return {
      cells,
      exit: [PAD_AT[0] - FLIGHT_AT[0], PAD_AT[1] - FLIGHT_AT[1]],
      lane: { segs: lane, fire: GO - slot.begin },
      state: { begin: slot.begin },
      company: [{ who: 'ian', from: slot.begin, to: slot.end, at: (t: number) => { const [x, y] = local(ianAt(t)); return { x, y } } }],
    }
  },
  (slot) => shotsFor(slot.begin, slot.end),
)

/** A smooth 0 → 1 with no speed at either end (smootherstep). */
const S = (u: number) => {
  const v = Math.max(0, Math.min(1, u))
  return v * v * v * (v * (6 * v - 15) + 10)
}

/**
 * The camera. In the cloud: close on the window (the seam's framing), following as it goes. The cut to the outside
 * on 11.099: the helicopter pushing out of the bank, and from there the long pull, even in scale (never faster than
 * half a scale a second), from following it to the great wide of the valley, which it reaches as it crosses the crest.
 * The cut in on the flare, 18.013: with it as it comes down, closing in to the seam's framing at touchdown.
 */
function shotsFor(begin: number, end: number): PartShot[] {
  const keys: PartShot[] = []
  const her = (t: number) => local(seatAt(t))
  const seam = SEAMS.flight
  // In the cloud: hold the seam's framing while it hangs there, then follow as it goes.
  const h0 = her(begin)
  keys.push({ t: begin + 0.5, cells: seam.cells * 1.02, hold: [h0[0] + seam.frame[0], h0[1] + seam.frame[1]], w: 1 })
  keys.push({ t: 10.35, cells: 3.7, off: [0.4, -0.3], w: 0 })
  keys.push({ t: 11.0, cells: 4.3, off: [0.55, -0.3], w: 0 })
  // Out of the cloud: the long pull, as a run of held framings (so the move is exactly this curve): from ahead of it,
  // out to the great wide, which it settles into as it crosses the crest, and drifts in, very slowly, after.
  const wide = local(REVEAL.at)
  const z0 = Math.log(30)
  const z1 = Math.log(REVEAL.cells)
  const P0 = OUT
  const P1 = 17.45
  for (let t = P0; t <= FLARE - 0.05; t += 0.3) {
    const u = S((t - P0) / (P1 - P0))
    const z = z0 + (z1 - z0) * u + (t > P1 ? -0.03 * (t - P1) : 0)
    const b = her(t)
    const lead: Pt = [b[0] + 8, b[1] + 3]
    const w = S((t - P0 - 0.3) / (P1 - P0 - 0.6))
    keys.push({ t, cells: Math.exp(z), hold: [lead[0] + (wide[0] - lead[0]) * w, lead[1] + (wide[1] - lead[1]) * w], w: 1, cut: t === P0 })
  }
  // The flare, and down: from ahead of it and below (the camp coming into the frame) to the seam's framing on her.
  const base = SEAMS.base
  const Q0 = FLARE
  // The last of it the camera waits for: it settles on where the cabin will be, and the helicopter comes down into it.
  const e = her(end)
  const last: Pt = [e[0] + base.frame[0], e[1] + base.frame[1]]
  for (let t = Q0; t <= end + 1e-6; t += 0.25) {
    const tt = Math.min(t, end)
    const u = S((tt - Q0) / (end - Q0))
    const b = her(tt)
    const off: Pt = [7 + (base.frame[0] - 7) * u, 5.5 + (base.frame[1] - 5.5) * u]
    const settle = S((tt - 19.9) / (21.5 - 19.9))
    const at: Pt = [b[0] + off[0] + (last[0] - b[0] - off[0]) * settle, b[1] + off[1] + (last[1] - b[1] - off[1]) * settle]
    keys.push({ t: tt, cells: Math.exp(Math.log(20) + (Math.log(base.cells) - Math.log(20)) * u), hold: at, w: 1, cut: t === Q0 })
    if (tt === end) break
  }
  if (keys[keys.length - 1].t < end - 1e-6) {
    const b = her(end)
    keys.push({ t: end, cells: base.cells, hold: [b[0] + base.frame[0], b[1] + base.frame[1]], w: 1 })
  }
  return keys
}
