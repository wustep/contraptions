import type p5 from 'p5'
import { mixHex, type Pt, type Seg } from '../../../../../parts'
import { alpha, box, carried, hash, part, smooth, type PartShot } from '../kit'
import { TOWN, WITCH } from '../worlds'
import { CURSE_AT, DISPLAY, DISPLAY_BRAKE, DISPLAY_FOLD, DISPLAY_ON, LAUGH, LOOM, TOWN_AT, displayPedal, glow, soft } from './town'
import { curve, ring, step } from './shop-kit'
import { drawWitch } from './witch'

/**
 * Night in the hat shop, and the curse (85.8 → 107.9): the town builder's.
 *
 * Closing (85.8 → 94.6, the waltz soft). Sophie is home, at the counter, the shop lamp-lit. She steps onto the
 * pedal of the display carousel by the counter (88.33): a step on each of three downbeats brakes it (89.10, 90.18,
 * 91.31) and it folds its arms down for the night (92.42). Out in the street, unseen by her, a huge dark shape comes
 * slowly along to the door, a heavy step on each of those beats. She goes to lock the door.
 *
 * The Witch (94.6 → 101.3). On w41 (94.645) the bell over the door swings and the door opens by itself. The Witch of
 * the Waste heaves her bulk in through it in three shoves on the downbeats (95.74, 96.88, 98.01), squashed in the
 * doorway and spreading out inside until she fills the shop; Sophie backs away before her to the counter. On the
 * accents (99.45 → 100.96) she leans in over her, the lamp gutters, the hats jump on their shelves.
 *
 * The curse (101.309, the strongest note of the waltz): her gloved hand goes out and a soft dark gust goes through
 * Sophie and knocks her back. On each accent after it (102.01 → 106.81) Sophie greys a step (`age.ts`): the Witch
 * laughs, heaving, and backs out through the door the way she came, and goes; the lamp gutters on every one.
 * Sophie follows slowly to the door, and stops at the mirror beside it (106.43): a glance, a pause, the last step of
 * grey (106.81). Then she walks out of the open door, slowly, 0.45 c/s at 107.9.
 */

/* ------------------------------------------------------------------ the clock (show seconds) */

/** The bell over the door, and the door opening by itself (w41). */
const BELL = 94.645
/** The Witch's heavy steps along the street to the door, and her three shoves through it. */
const STEPS = [91.307, 92.415, 93.547]
const SHOVES = [95.742, 96.879, 98.006]
/** The curse. */
const CURSE = 101.309
/** At the mirror: the glance, and the last step of grey. */
const GLANCE = 106.429
const LAST = 106.812

/** Every strike of this part, in show seconds. */
export const CURSE_HITS: number[] = [DISPLAY_ON, ...DISPLAY_BRAKE, DISPLAY_FOLD, BELL, ...SHOVES, ...LOOM, ...LAUGH].sort((a, b) => a - b)

/* ------------------------------------------------------------------ where things are (town cells) */

const O = CURSE_AT
const FLOOR = TOWN_AT.ground
const [W0, W1] = TOWN_AT.wall
const DOOR_TOP = TOWN_AT.doorTop
const [LAMP_X, LAMP_Y] = TOWN_AT.lamp
/** The display's pedal: its pivot at the floor, its reach to the left, its tilt at rest. */
const PEDAL_X = DISPLAY.x - 0.2
const PEDAL_L = 0.46
const PEDAL_TILT = 0.12

/* ------------------------------------------------------------------ Sophie */

/** Her x before the curse: to the pedal, on it, off toward the door, stopped by the bell, backing away. */
const before = curve([
  [85.8, O[0] - 0.5, 0],
  [86.7, O[0] - 0.5, 0],
  [DISPLAY_ON, PEDAL_X - 0.24, 0.18],
  [DISPLAY_ON + 0.45, PEDAL_X - 0.21, 0],
  [DISPLAY_FOLD + 0.05, PEDAL_X - 0.21, 0],
  [93.3, 7.25, 0.5],
  [94.4, 7.7, 0],
  [95.3, 7.7, 0],
  [98.3, 6.2, 0],
  [CURSE, 6.2, 0],
])
/** And after: knocked back by the gust, still, then after the Witch to the door, a glance at the mirror, out. */
const after = curve([
  [CURSE, 6.2, -1.4],
  [CURSE + 0.55, 5.97, 0],
  [103.7, 5.97, 0],
  [105.3, 7.05, 0.62],
  [GLANCE, 7.88, 0.08],
  [GLANCE + 0.2, 7.85, 0],
  [LAST, 7.9, 0.2],
  [107.9, W0 + 0.08, 0.45],
])
const sophieX = (t: number): number => (t < CURSE ? before(t) : after(t))
/** Up on the display's pedal while she is on it. */
function sophieY(t: number, x: number): number {
  const from = PEDAL_X - PEDAL_L
  if (x < from - 0.1 || x > PEDAL_X + 0.1) return 0
  const tilt = PEDAL_TILT * (1 - displayPedal(t))
  const on = smooth(x, from - 0.1, from + 0.05) * (1 - smooth(x, PEDAL_X - 0.02, PEDAL_X + 0.1))
  return -on * (0.04 + Math.max(0, PEDAL_X - x) * Math.sin(tilt))
}
const sophie = (t: number): Pt => {
  const x = sophieX(t)
  return [x - O[0], sophieY(t, x) - O[1]]
}

/* ------------------------------------------------------------------ the Witch */

/** A shove: 0 before, easing up to 1 over `d` seconds, a little overshoot settling. */
const shove = (s: number, d = 0.5): number => (s <= 0 ? 0 : s >= d ? 1 + ring(s - d, 0.05, 12, 0.2) : 1 - Math.pow(1 - s / d, 3))

/** Her hem's middle along the street and in through the door: slow steps to it, three shoves in, backing out, gone. */
function witchX(t: number): number {
  if (t < BELL) return curve([[90.6, 13.9, 0], [94.3, 10.3, -0.45], [BELL, 10.25, 0]])(t)
  if (t < 99.4) return 10.25 - 0.95 * (shove(t - SHOVES[0]) + shove(t - SHOVES[1]) + shove(t - SHOVES[2]))
  return curve([[99.4, 7.4, 0], [102.35, 7.4, 0], [105.2, 10.2, 1.2], [107.0, 14.8, 2.0]])(t)
}
/** How squashed she is: most in the doorway's grip, and on every shove. */
function witchSquash(t: number, x: number): number {
  const grip = Math.exp(-Math.pow((x - (W0 + W1) / 2) / 0.9, 2))
  let pulse = 0
  for (const at of SHOVES) pulse += 0.25 * Math.exp(-Math.max(0, t - at) / 0.3) * (t > at ? 1 : 0)
  return Math.min(1, grip + pulse)
}
/** Her heave: her steps, the shoves, the loom's lurches and the laugh. */
function witchHeave(t: number): number {
  let h = 0
  for (const at of [...STEPS, ...SHOVES, ...LOOM, ...LAUGH]) {
    const s = t - at
    if (s < 0 || s > 1.2) continue
    h += Math.exp(-s / 0.18) * (1 - Math.exp(-s / 0.03))
  }
  return Math.min(1.2, h)
}
/** Her lean toward Sophie as she looms, a step nearer on each accent. */
function witchLean(t: number): number {
  let lean = 0
  LOOM.forEach((at, i) => {
    lean -= 0.035 * step(t - at, 0.08) * (i < 5 ? 1 : 0)
  })
  return lean * (1 - smooth(t, CURSE + 0.3, 102.4))
}
/** Her mouth: open in the laugh. */
function witchMouth(t: number): number {
  let m = 0
  for (const at of LAUGH) {
    const s = t - at
    if (s >= 0 && s < 0.6) m = Math.max(m, Math.exp(-s / 0.22) * (1 - Math.exp(-s / 0.04)))
  }
  return Math.min(1, m * 1.3) * (1 - smooth(t, 105.8, 106.6))
}
/** Her hand, out for the curse. */
const witchHand = (t: number): number => smooth(t, LOOM[4], CURSE) * (1 - smooth(t, CURSE + 0.4, CURSE + 1.2))
/** She faces into the shop, and turns to go once she is out of the door. */
const witchFace = (t: number): number => -1 + 2 * smooth(t, 104.9, 105.35)

/* ------------------------------------------------------------------ the lamp */

/** The lamp's flame: steady, leaning and fluttering in the draught when the door opens, guttering on every accent. */
function flame(t: number): { h: number; lean: number; glow: number } {
  let gut = 0
  for (const at of [BELL, ...LOOM, ...LAUGH]) {
    const s = t - at
    if (s < 0 || s > 1.5) continue
    gut = Math.max(gut, Math.exp(-s / 0.35) * (1 - Math.exp(-s / 0.03)))
  }
  const draught = smooth(t, BELL, BELL + 0.3) * (1 - smooth(t, 106, 108)) * (0.5 + 0.5 * Math.sin(t * 7.3))
  const flicker = 0.04 * Math.sin(t * 13.1) + 0.03 * Math.sin(t * 21.7 + 1)
  return { h: 1 - 0.55 * gut + flicker, lean: 0.25 * draught + 0.15 * gut * Math.sin(t * 17), glow: 1 - 0.5 * gut + flicker * 0.6 }
}

/* ------------------------------------------------------------------ the part */

interface CurseState {
  begin: number
}

export const curse = part<CurseState>(
  {
    name: 'curse',
    draw: (p, s, c) => drawCurse(p, c, c.t + s.begin),
    over: (p, s, c) => drawOver(p, c, c.t + s.begin),
  },
  (slot) => {
    const segs: Seg[] = [...carried(sophie, slot.begin, CURSE, Math.ceil((CURSE - slot.begin) * 40)), ...carried(sophie, CURSE, slot.end, Math.ceil((slot.end - CURSE) * 60))]
    const end = sophie(slot.end)
    return {
      cells: box(-3.5, -4, 8, 1),
      exit: [end[0] + 0.5, end[1]],
      lane: { segs, fire: CURSE - slot.begin },
      state: { begin: slot.begin },
    }
  },
  (slot): PartShot[] => {
    const H = (x: number, y: number): Pt => [x - O[0], y - O[1]]
    return [
      // Home at the counter, the lamp lit; then the carousel by it, turned down for the night.
      { t: 86.4, cells: 3.7, hold: H(6.55, -0.62), w: 1 },
      { t: DISPLAY_ON, cells: 3.9, hold: H(6.75, -0.95), w: 1 },
      // Wider as she goes to the door: the dark shape coming along the street outside.
      { t: 92.0, cells: 4.5, hold: H(7.5, -1.2), w: 1 },
      { t: BELL, cells: 5.1, hold: H(8.1, -1.4), w: 1 },
      // The Witch fills the shop.
      { t: 97.6, cells: 5.4, hold: H(7.3, -1.45), w: 1 },
      { t: LOOM[0], cells: 4.9, hold: H(6.95, -1.25), w: 1 },
      // In for the curse.
      { t: CURSE, cells: 4.3, hold: H(6.55, -1.0), w: 1 },
      { t: 103.4, cells: 4.5, hold: H(7.05, -1.05), w: 1 },
      // The mirror, and out of the door.
      { t: GLANCE, cells: 4.2, hold: H(8.05, -0.9), w: 1 },
      { t: slot.end, cells: 4.5, hold: H(W0 + 0.08 + 0.9, -0.8), w: 1 },
    ]
  },
)

/* ------------------------------------------------------------------ drawing */

type Ctx = { k: number; ink: string; weight: number }

function drawCurse(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight: W } = c
  // Draw in the town's own cells.
  p.push()
  p.translate(-O[0] * k, -O[1] * k)
  // Only while the night leg has the shop (and a moment either side); the rest of the show the shop is others'.
  if (t > 84.5 && t < 109.5) {
    drawLamp(p, c, t)
    drawTheWitch(p, k, W, ink, t)
  }
  p.pop()
}

function drawOver(p: p5, c: Ctx, t: number): void {
  if (t < CURSE - 0.2 || t > CURSE + 1.6) return
  const { k } = c
  p.push()
  p.translate(-O[0] * k, -O[1] * k)
  // The curse: a soft dark gust out of her glove, round Sophie once, and up and away.
  const u = t - CURSE
  const hand: Pt = [witchX(t) - 1.4, -0.95]
  const her: Pt = [sophieX(t), 0]
  const col = mixHex(WITCH.fur, TOWN.blob, 0.4)
  for (let i = 0; i < 14; i++) {
    const s = u - i * 0.03
    if (s < -0.12) continue
    const go = Math.max(0, (s + 0.12) / 0.3)
    let x: number
    let y: number
    if (go <= 1) {
      // Out of the hand to her, arcing down.
      x = hand[0] + (her[0] + 0.25 - hand[0]) * go
      y = hand[1] + (her[1] - 0.2 - hand[1]) * Math.sin((go * Math.PI) / 2)
    } else {
      // Round her, and rising off her as it thins.
      const a = -Math.PI / 2 + (go - 1) * 3.6 + i * 0.05
      const r = 0.3 + (go - 1) * 0.12
      x = her[0] + Math.cos(a + Math.PI / 2) * r
      y = her[1] - 0.05 + Math.sin(a + Math.PI / 2) * r * 0.6 - (go - 1) * 0.35
    }
    const a = 0.42 * Math.exp(-Math.max(0, s) / 0.55) * smooth(s, -0.12, 0.02) * (1 - 0.35 * hash(i, 7))
    soft(p, k, x, y, 0.14 + 0.05 * Math.min(go, 2.5) + 0.05 * hash(i, 3), col, a)
  }
  p.pop()
}

/** The lamp over the counter: its flame under the shade and the warm pool it throws, guttering when the Witch is near. */
function drawLamp(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight: W } = c
  const X = (v: number) => v * k
  const f = flame(t)
  const on = smooth(t, 84.6, 85.2) * (1 - smooth(t, 108.2, 109.2))
  // The pool of light: on the counter, the wall, the floor.
  glow(p, k, LAMP_X, LAMP_Y + 0.8, 3.4, TOWN.glow, 0.34 * f.glow * on)
  glow(p, k, LAMP_X + 0.3, FLOOR - 0.3, 2.2, TOWN.gold, 0.14 * f.glow * on)
  // The glass chimney under the shade, and the flame in it: a small tongue, never a round core.
  const gx = LAMP_X
  const gy = LAMP_Y
  p.stroke(alpha(p, ink, 0.6))
  p.strokeWeight(W * 0.5)
  p.fill(alpha(p, TOWN.plaster, 0.35))
  p.rect(X(gx - 0.07), X(gy - 0.02), X(0.14), X(0.24), X(0.05))
  p.noStroke()
  p.fill(alpha(p, TOWN.fireHot, 0.95 * on))
  p.push()
  p.translate(X(gx), X(gy + 0.19))
  p.rotate(f.lean)
  const h = 0.13 * f.h
  p.beginShape()
  p.vertex(X(-0.028), 0)
  p.bezierVertex(X(-0.035), X(-h * 0.5), X(-0.01), X(-h * 0.8), 0, X(-h))
  p.bezierVertex(X(0.01), X(-h * 0.8), X(0.035), X(-h * 0.5), X(0.028), 0)
  p.endShape(p.CLOSE)
  p.pop()
  // The brass font under it.
  p.stroke(ink)
  p.strokeWeight(W * 0.6)
  p.fill(mixHex(TOWN.gold, TOWN.timberDark, 0.45))
  p.rect(X(gx - 0.09), X(gy + 0.21), X(0.18), X(0.06), X(0.03))
}

/** The Witch, clipped so the wall over the door stands in front of her as she squeezes through it. */
function drawTheWitch(p: p5, k: number, W: number, ink: string, t: number): void {
  const x = witchX(t)
  if (x > 15) return
  const X = (v: number) => v * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.push()
  ctx.save()
  ctx.beginPath()
  ctx.rect(X(-40), X(-40), X(40 + W0), X(80))
  ctx.rect(X(W0), X(DOOR_TOP), X(W1 - W0), X(4))
  ctx.rect(X(W1), X(-40), X(60), X(80))
  ctx.clip()
  p.translate(X(x), X(FLOOR - 0.12))
  drawWitch(p, k, W, ink, {
    t,
    face: witchFace(t),
    lean: witchLean(t),
    heave: witchHeave(t),
    squash: witchSquash(t, x),
    mouth: witchMouth(t),
    hand: witchHand(t),
    look: [-1, 0.8],
    dark: x > W1 + 0.3 ? 0.55 : 0.3,
  })
  ctx.restore()
  p.pop()
}
