import type p5 from 'p5'
import { FLOOR, mixHex, type Pt, type Seg } from '../../../../../parts'
import { box, carried, frame, part, type Company, type PartShot } from '../kit'
import { LIGHTS, lightAt, penOf, shade, STREET, type Glow } from './set'
import { APPEAR, E_IN, END, evelynAt, FLASH, joyAt, LIGHTS_OUT, PIECES, PORT, STRIKES, waymondAt, windowLight } from './finale-plan'
import { HOME } from '../worlds'
import { drawCamera, drawContactShadows, drawFlash, drawFlashShadows, drawLanternString, drawPhoto, drawSwitch, drawTripodFront, drawWasher, drawWasherDoor, drawWindowGlow, fireworkFloor, fireworkLight, fireworks, lightColor, stringGlows } from './finale-draw'

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
  for (const g of stringGlows(t)) if (g.a > 0.01) out.push({ x: g.x, y: g.y, r: 1.3, a: 0.55 * g.a, color: HOME.gold })
  const fw = fireworkLight(t)
  if (fw.a > 0.01) out.push({ x: -6.3, y: -2.2, r: 3.6, a: 0.45 * fw.a, color: fw.color })
  return out
})
install(STREET, 'finale-fireworks', fireworks)

/*
 * Under the credits, the night goes on outside: twice a car goes by in the street, right to left, and its
 * headlights sweep across the shop through the glass. Between the tail's two accents, not on them.
 */
const CARS = [299.6, 317.4]
const CAR_CROSS = 2.6
/** The car's size against the far fronts. */
const CAR_SCALE = 1.5
const carAt = (t: number): { x: number; u: number } | null => {
  for (const at of CARS) {
    const u = (t - at) / CAR_CROSS
    if (u >= 0 && u <= 1) return { x: -1.8 - 8.4 * u, u }
  }
  return null
}
install(STREET, 'finale-cars', (p: p5, k: number, t: number) => {
  const car = carAt(t)
  if (!car) return
  const { x } = car
  const road = FLOOR - 0.62
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // The beam out ahead of it, low along the road.
  const nose = x - 0.55 * CAR_SCALE
  const g = ctx.createLinearGradient(nose * k, 0, (nose - 2.4) * k, 0)
  g.addColorStop(0, 'rgba(255, 244, 214, 0.55)')
  g.addColorStop(1, 'rgba(255, 244, 214, 0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(nose * k, (road - 0.27) * k)
  ctx.lineTo((nose - 2.4) * k, (road - 0.5) * k)
  ctx.lineTo((nose - 2.4) * k, (road + 0.02) * k)
  ctx.lineTo(nose * k, (road - 0.17) * k)
  ctx.fill()
  // The car: a dark shape against the far fronts, its cabin's glass, a wheel at each end, and its lamps. It is drawn
  // at the far fronts' own scale, a car's length to their doorways, not a toy's.
  const S = CAR_SCALE
  const X = (dx: number) => (x + dx * S) * k
  const Y = (dy: number) => (road + dy * S) * k
  const L = (v: number) => v * S * k
  p.noStroke()
  p.fill(mixHex(HOME.night, HOME.steelDark, 0.15))
  p.rect(X(0), Y(-0.17), L(1.1), L(0.24), L(0.07))
  p.rect(X(0.06), Y(-0.36), L(0.62), L(0.2), L(0.08), L(0.08), 0, 0)
  p.fill(mixHex(HOME.night, HOME.glassDeep, 0.35))
  p.rect(X(0.06), Y(-0.35), L(0.5), L(0.12), L(0.05))
  // The street's light along its roof.
  p.fill(mixHex(HOME.night, HOME.steel, 0.3))
  p.rect(X(0.06), Y(-0.455), L(0.5), L(0.02), L(0.01))
  p.fill(mixHex(HOME.night, HOME.steelDark, 0.05))
  for (const wx of [-0.33, 0.35]) p.circle(X(wx), Y(-0.04), L(0.18))
  p.fill('#FFF4D6')
  p.ellipse(X(-0.53), Y(-0.16), L(0.07), L(0.06))
  p.fill(HOME.red)
  p.rect(X(0.54), Y(-0.17), L(0.04), L(0.07))
})
install(LIGHTS.glows, 'finale-cars', (t: number): Glow[] => {
  const car = carAt(t)
  if (!car) return []
  // The headlights thrown in through the window, travelling across the floor and the washer the other way.
  const inside = -7.4 + 6.8 * car.u
  const a = Math.sin(Math.PI * car.u)
  return [{ x: inside, y: -0.9, r: 1.5, a: 0.32 * a, color: '#FFF1CF' }]
})
LIGHTS.neonOff = LIGHTS_OUT
LIGHTS.lanternsOff = LIGHTS_OUT

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
      drawContactShadows(pen, [evelynAt(t), joyAt(t), waymondAt(t)])
      drawFlashShadows(pen, t, [evelynAt(t), joyAt(t), waymondAt(t)])
      drawLanternString(pen, t)
      drawCamera(pen, t)
      drawPhoto(pen, t)
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
      drawTripodFront(pen, t, (hex, x, y) => shade(hex, x, y, t))
      drawWindowGlow(pen, t, 1 - lightAt(PORT[0], PORT[1], t))
      fireworkFloor(pen, t)
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
      // Close on the window, as the peak left it: the drum turns them. Then back a little, slowly, to take in
      // Waymond waiting by the lever, whole and not cut by the frame's edge, before he leaps it.
      { t: slot.begin + 0.6, cells: 2.4, hold: H(PORT[0], PORT[1] + 0.02), w: 1 },
      { t: slot.begin + 1.9, cells: 2.72, hold: H(PORT[0] + 0.04, PORT[1] + 0.02), w: 1 },
      { t: 268.2, cells: 2.78, hold: H(PORT[0] + 0.1, PORT[1] + 0.06), w: 1 },
      // The door, the drop, and back to take in Waymond coming.
      { t: 269.7, cells: 3.1, hold: H(-2.05, -0.5), w: 1 },
      { t: 271.7, cells: 3.8, hold: H(-1.95, -0.72), w: 1 },
      { t: 275.2, cells: 4.3, hold: H(-2.1, -1.3), w: 1 },
      // In, slowly, to the three of them together at the washer's foot, its window glowing behind them; and hold.
      // The string of lanterns is whole in the frame or out of it: the push goes under it in half a second, not
      // with their tassels hanging in at the top for two.
      { t: 276.3, cells: 3.95, hold: H(-2.08, -1.22), w: 1 },
      { t: 276.9, cells: 3.2, hold: H(-2.05, -0.7), w: 1 },
      { t: 279.0, cells: 2.6, hold: H(-2.03, -0.6), w: 1 },
      { t: 282.2, cells: 2.6, hold: H(-2.05, -0.6), w: 1 },
      // Out again with her, under the camera's tripod, to the switch under the window.
      // Her and the switch, and the whole string over the family as it lights a lantern a beat: its far end and
      // its anchor in the frame, not cut by the right edge, and less of the night glass on the left. Held low enough
      // that Zoom (the same middle, 1.5 times closer) keeps a strip of floor under them rather than its bottom edge on it.
      { t: 284.8, cells: 3.85, hold: H(-3.5, -0.95), w: 1 },
      { t: 286.2, cells: 3.85, hold: H(-3.45, -0.95), w: 1 },
      // She presses it: back and right, the string of lanterns lighting over the family one a beat.
      { t: 287.8, cells: 4.25, hold: H(-3.55, -1.1), w: 1 },
      // And settle on the portrait: the door's glass, the camera, the family under the lanterns.
      { t: 290.2, cells: 3.85, hold: H(-3.5, -0.95), w: 1 },
      { t: FLASH + 0.6, cells: 3.85, hold: H(-3.5, -0.95), w: 1 },
      { t: 293.2, cells: 3.9, hold: H(-3.45, -0.96), w: 1 },
      // Then back, towards the washer's glow, for the lights going out. Both stay inside the shop's end wall: the
      // storefront's glass is the frame's left edge, so the room is never seen cut off in the dark of the tail.
      { t: 294.6, cells: 5.15, hold: H(-3.4, -1.52), w: 1 },
      // The rest: drawing back, very slowly, over the dark.
      { t: END - 0.05, cells: 5.45, hold: H(-3.1, -1.66), w: 1 },
    ]
    return shots.filter((k) => k.t > slot.begin + 0.39 && k.t <= slot.end + 1e-6)
  },
)
