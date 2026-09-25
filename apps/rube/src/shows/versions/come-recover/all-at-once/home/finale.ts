import type { Pt, Seg } from '../../../../../parts'
import { box, carried, frame, part, type Company, type PartShot } from '../kit'
import { LIGHTS, lightAt, penOf, STREET, type Glow } from './set'
import { APPEAR, E_IN, END, evelynAt, FLASH, joyAt, LIGHTS_OUT, PIECES, PORT, STRIKES, waymondAt, windowLight } from './finale-plan'
import { drawCamera, drawFlash, drawSwitch, drawWasher, drawWasherDoor, drawWindowGlow, fireworkLight, fireworks, lightColor } from './finale-draw'

/**
 * HOME: through the washer's window, the family, the last hits, the lights out, and the credits over the dark
 * (264.144 to the end).
 *
 * The bagel's hole, grown small and full of light, is the window of the washer by the front door: the one Evelyn
 * started the morning at, where Joy waited for her mother and was not seen. The drum turns them gently, the door
 * swings open, and they drop out onto the floor, and Waymond, who has been waiting by the counter with the camera
 * he set up, hops the washer's lever and is with them: the family, touching, Joy between her parents.
 *
 * The last machine is small. Evelyn rolls to the party lights' foot switch by the door and presses it on 286.2: the
 * lanterns on the string over the counter light one a beat, and the camera on the counter wakes, its self-timer
 * blinking faster and faster while she comes back to her place beside Joy. 290.99: the flash, the family portrait,
 * and over the street in the window, fireworks. 295.01: the lights go out, the far tubes first and last of all the
 * two over the counter, the first two that came on in the show's first second; the neon in the window with them.
 * The three of them are left in the glow of the washer's window, and the credits come up over the dark.
 *
 * Its washer is the laundromat part's, where that part left it (walked 0.12 towards its lever): this part draws it
 * whole, over that one, from a moment before the jump. See `finale-plan.ts` for every time.
 */

/** This leg's entry cell in the laundromat's cells: Evelyn at the bottom of the washer's window, at (-0.5, 0). */
export const FINALE_AT: Pt = [E_IN[0] + 0.5, E_IN[1]]

const O = FINALE_AT
const toPart = ([x, y]: Pt): Pt => [x - O[0], y - O[1]]

/** Every strike this part makes, in show seconds. */
export const FINALE_HITS: number[] = STRIKES

/* ------------------------------------------------------------------ the room's lights, set at load */

type Tagged<F> = F & { homeB?: string }
function install<F>(list: Tagged<F>[], tag: string, fn: F): void {
  // Replaced, not added again, when the module is reloaded.
  for (let i = list.length - 1; i >= 0; i--) if (list[i].homeB === tag) list.splice(i, 1)
  const tagged = fn as Tagged<F>
  tagged.homeB = tag
  list.push(tagged)
}

install(LIGHTS.glows, 'finale-window', (t: number): Glow[] => {
  const light = windowLight(t)
  if (light.a <= 0) return []
  const col = lightColor(light.warm)
  const out: Glow[] = [
    { x: PORT[0], y: PORT[1] + 0.25, r: 2.1, a: 0.85 * light.a, color: col },
  ]
  const fw = fireworkLight(t)
  if (fw.a > 0.01) out.push({ x: -6.3, y: -2.2, r: 3.6, a: 0.45 * fw.a, color: fw.color })
  return out
})
install(STREET, 'finale-fireworks', fireworks)
LIGHTS.neonOff = LIGHTS_OUT

/* ------------------------------------------------------------------ the part */

interface FinaleState {
  begin: number
}

export const finale = part<FinaleState>(
  {
    name: 'finale',
    draw: (p, s, c) => {
      const t = c.t + s.begin
      if (t < APPEAR) return
      const pen = penOf(p, c)
      p.push()
      p.translate(-O[0] * c.k, -O[1] * c.k)
      drawSwitch(pen, t)
      drawWasher(pen, t)
      drawCamera(pen, t)
      p.pop()
    },
    over: (p, s, c) => {
      const t = c.t + s.begin
      if (t < APPEAR) return
      const pen = penOf(p, c)
      const { k } = c
      p.push()
      p.translate(-O[0] * k, -O[1] * k)
      drawWasherDoor(pen, t)
      drawWindowGlow(pen, t, 1 - lightAt(PORT[0], PORT[1], t))
      const f = frame(p, k)
      drawFlash(pen, t, f)
      p.pop()
    },
  },
  (slot) => {
    const segs: Seg[] = []
    const at = (t: number) => toPart(evelynAt(t))
    for (const piece of PIECES) {
      const a = Math.max(piece.a, slot.begin)
      const b = Math.min(piece.b, slot.end)
      if (b <= a) continue
      if (piece.still) segs.push({ from: at(a), to: at(a), dur: b - a })
      else segs.push(...carried(at, a, b, Math.max(1, Math.ceil((b - a) * 60))))
    }
    const end = at(slot.end)
    const company: Company[] = [
      {
        who: 'joy',
        from: APPEAR,
        to: END + 1,
        at: (t) => {
          const [x, y] = toPart(joyAt(t))
          return { x, y }
        },
      },
      {
        who: 'waymond',
        from: APPEAR,
        to: END + 1,
        at: (t) => {
          const [x, y] = toPart(waymondAt(t))
          return { x, y }
        },
      },
    ]
    return {
      cells: box(-9.5 - O[0], -4.9 - O[1], 3 - O[0], 0.8 - O[1]),
      exit: [end[0] + 0.5, end[1]],
      lane: { segs, fire: 264.545 - slot.begin },
      state: { begin: slot.begin },
      company,
    }
  },
  (slot) => {
    const H = (x: number, y: number): Pt => toPart([x, y])
    const shots: PartShot[] = [
      // Close on the window, as the peak left it: the drum turns them.
      { t: slot.begin + 0.6, cells: 2.4, hold: H(PORT[0], PORT[1] + 0.02), w: 1 },
      { t: 268.2, cells: 2.55, hold: H(PORT[0] + 0.04, PORT[1] + 0.08), w: 1 },
      // The door, the drop, and back to take in Waymond coming.
      { t: 269.7, cells: 3.1, hold: H(-2.05, -0.5), w: 1 },
      { t: 271.7, cells: 3.8, hold: H(-1.95, -0.72), w: 1 },
      { t: 275.2, cells: 4.3, hold: H(-2.1, -1.0), w: 1 },
      // With her to the switch; back to see the lanterns come on over the counter.
      { t: 282.2, cells: 4.7, hold: H(-2.4, -1.2), w: 1 },
      { t: 285.9, cells: 5.6, hold: H(-1.0, -1.72), w: 1 },
      { t: 288.3, cells: 5.8, hold: H(-0.85, -1.78), w: 1 },
      // The portrait: the family, the camera, the window onto the street.
      { t: 290.45, cells: 6.0, hold: H(-2.9, -1.7), w: 1 },
      { t: FLASH + 0.6, cells: 6.0, hold: H(-3.0, -1.7), w: 1 },
      // After it the camera leaves the camera behind, and holds on the family by the window.
      { t: 294.6, cells: 5.15, hold: H(-4.62, -1.52), w: 1 },
      // The rest: drawing back, very slowly, over the dark.
      { t: END - 0.05, cells: 5.45, hold: H(-4.9, -1.66), w: 1 },
    ]
    return shots.filter((k) => k.t > slot.begin + 0.39 && k.t <= slot.end + 1e-6)
  },
)
