import type { Pt } from '../../../../../parts'
import { box, part, route, scenery, type PartShot, type Way } from '../kit'
import { G } from '../physics'
import { tentDraw, CALL_X, hopFor, KEYS, ON_KEY } from './tent'
import { CALL_HITS, CALL_KEY, DARK_HITS, FALLS as FELL, NUMBER, PRESSES, RISES as ROSE } from './timeline'

/**
 * The command tent at night (the TWELVE builder's): the ring of twelve screens, one for every shell on Earth, each
 * joined to the next by a lit link. When the bass drops out the links let go one after another round the ring and the
 * screens go over dark like dominoes, until only Montana is lit. At the call Louise dials the number Shang gave her,
 * and as she speaks the ring stands again in the order it fell, backwards, and closes on the loudest bar.
 *
 * `ring.ts` is the ring, `tent.ts` the tent and the sat phone, `timeline.ts` the clock they all read.
 */

export const TENT_CELLS: Pt[] = box(-16, -15, 17, 4)

export const tentSet = scenery<null>({
  name: 'tent-set',
  draw: (p, _s, c) => tentDraw(p, c.k, c.t),
})

/** Where each leg's part stands in the tent (she comes in at (-0.5, 0) from it): the table, under Montana. */
export const DARK_AT: Pt = [-0.4, 0]
export const CALL_AT: Pt = [0.5, 0]

/** A camera key in the tent's own cells, handed to a part standing at `at`. */
const key = (at: Pt, t: number, cells: number, hold: Pt, extra: Partial<PartShot> = {}): PartShot => ({ t, cells, hold: [hold[0] - at[0], hold[1] - at[1]], w: 1, ...extra })
/** A key that puts her at `s` on the screen (a share of the frame's height from its middle), `cells` tall. */
const on = (at: Pt, t: number, cells: number, her: Pt, s: Pt): PartShot => key(at, t, cells, [her[0] - s[0] * cells, her[1] - s[1] * cells])

/** How close the camera comes on her and the phone's keys as she dials. */
const CLOSE = 3

/** The whole ring and the table under it: she is low in the frame, but inside the Zoom's. */
const WIDE: [number, Pt] = [14, [0.3, -4.1]]

/**
 * The dark (200.626 → 214.657). Louise and Ian at rest on the table under the ring, Ian on her left; the world breaks
 * over their heads: link 0 lets go of Montana, screen 1 slips back a notch a beat and goes over, and then one a beat
 * clockwise round, up the left side, over the top, down the right, to screen 11 beside Montana. The camera draws back
 * from the two of them as the fall climbs away and comes back down to them as it returns.
 */
export const dark = part<{ begin: number }>(
  { name: 'dark', draw: () => {} },
  (slot) => {
    const dur = slot.end - slot.begin
    return {
      cells: box(-3, -3, 2, 1),
      exit: [0, 0] as Pt,
      lane: { segs: route([{ at: 0, p: [-0.5, 0] }, { at: dur, p: [-0.5, 0] }]), fire: 0 },
      state: { begin: slot.begin },
      company: [{ who: 'ian', from: slot.begin, to: slot.end, at: () => ({ x: -0.92, y: 0 }) }],
    }
  },
  (slot) => {
    const at = DARK_AT
    const her: Pt = [at[0] - 0.5, 0]
    const seam: Pt = [-0.85 / 4.2, 0.7 / 4.2]
    return [
      // Close on the two of them as the first link lets go over their heads and screen 1 slips back a notch a beat,
      on(at, slot.begin + 0.7, 4.3, her, [-0.18, 0.19]),
      on(at, 202.25, 5.1, her, [-0.14, 0.24]),
      // back as it goes over and the fall climbs away round the ring, to the whole of it,
      on(at, 204.0, 8.4, her, [-0.1, 0.28]),
      key(at, 205.9, WIDE[0], WIDE[1]),
      key(at, 209.9, 13.4, [0.45, -3.95]),
      // and down to them again as it comes back down the right side to Montana.
      on(at, 212.2, 7.5, her, [-0.16, 0.27]),
      on(at, slot.end - 0.45, 4.2, her, seam),
      on(at, slot.end, 4.2, her, seam),
    ]
  },
)

/**
 * The call (277.647 → 311.293). Louise on the table, the sat phone on her right where Shang was. It wakes on the
 * chord; she hops along its keys, one a beat, the number he gave her (the camera in close on the keys, and cut away on
 * 283.458 to the ring dead but for Montana, and back on 285.495), and on 288.554 lands on the call key: the call goes
 * up the cable into Montana, and the ring stands again, backwards, round to the loudest bar. She stays on the key, the
 * line open, while the signal goes round the closed ring.
 */
export const call = part<{ begin: number }>(
  { name: 'call', draw: () => {} },
  (slot) => {
    const dur = slot.end - slot.begin
    const at = CALL_AT
    const local = (x: number, y: number): Pt => [x - at[0], y - at[1]]
    const ways: Way[] = [{ at: 0, p: [-0.5, 0] }]
    const hopTo = (land: number, p: Pt, T: number) => {
      const prev = ways[ways.length - 1]
      const off = land - slot.begin - T
      if (off > prev.at + 1e-6) ways.push({ at: off, p: prev.p })
      ways.push({ at: land - slot.begin, p, arc: (G * T * T) / 8 })
    }
    PRESSES.forEach((t, n) => hopTo(t, local(KEYS[NUMBER[n]], ON_KEY), hopFor(n)))
    hopTo(CALL_KEY, local(CALL_X, ON_KEY), hopFor(PRESSES.length))
    const end = ways[ways.length - 1].p
    ways.push({ at: dur, p: end })
    return {
      cells: box(-2, -2, 3, 1),
      exit: [end[0] + 0.5, end[1]] as Pt,
      lane: { segs: route(ways), fire: CALL_KEY - slot.begin },
      state: { begin: slot.begin },
    }
  },
  (slot) => {
    const at = CALL_AT
    const onCall: Pt = [CALL_X, ON_KEY]
    const seam: Pt = [-0.8 / 4.4, 0.8 / 4.4]
    // Her and the keys low in the frame, Montana whole above them, the cable between.
    const keys: Pt = [KEYS[2] + 0.2, -1.2]
    return [
      // In close on her and the keys, so each hop reads as a key pressed, the one lit screen over her;
      key(at, slot.begin + 1.6, CLOSE, keys),
      key(at, PRESSES[5] - 0.25, CLOSE, [keys[0] + 0.08, keys[1]]),
      // on the chord, a cut to what she is calling for: the ring dead, only Montana lit; held a beat,
      key(at, PRESSES[5], 14, [0.3, -4.2], { cut: true }),
      // and then in to her, all the way, as she dials the last of the number, arriving on the call key: lowering as it
      // comes, so she stays in even Zoom's tighter frame. (It cut back to her two seconds after the cut out: close,
      // wide, close, the busiest cutting in the piece.)
      key(at, PRESSES[7], 10, [(0.3 + keys[0]) / 2, -2.9]),
      key(at, CALL_KEY, CLOSE, [keys[0] + 0.42, keys[1]]),
      // On the call, close still: her at the phone, Montana, China's screen coming up red and standing, the next
      // coming up the right side; opening out as the ring stands again round it,
      on(at, 290.3, 4.6, onCall, [0.18, 0.22]),
      on(at, 292.6, 6.6, onCall, [0.08, 0.29]),
      on(at, 295.0, 9.2, onCall, [0.11, 0.3]),
      // to the whole ring by the time the last screen is hauled home and it closes on the loudest bar;
      key(at, 300.4, 14.6, [0.3, -4.3]),
      key(at, 303.827, 14.3, [0.3, -4.25]),
      // held while the signal goes round it, then in to her at the phone.
      key(at, 306.4, 13.8, [0.35, -4.1]),
      on(at, 309.2, 8, onCall, [-0.06, 0.27]),
      on(at, slot.end, 4.4, onCall, seam),
    ]
  },
)

/** The links, as the check reads them: each screen but Montana's in the order it went dark, and the order it came back. */
export const FALLS: { screen: number; t: number }[] = FELL
export const RISES: { screen: number; t: number }[] = ROSE

export const TWELVE_HITS: number[] = [...DARK_HITS, ...CALL_HITS]
