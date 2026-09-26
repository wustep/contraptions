import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import type { Seg } from '../../../../../parts'
import { alpha, box, carried, frame, hash, knock, part, smooth, type Companion, type Ctx } from '../kit'
import { CUT } from '../music'
import { CHURCH, HOME, INK } from '../worlds'
import { ALTAR_CARL, ALTAR_ELLIE, box2, CH, CHURCH_BOX, drawPetals, ease, lift, pchip, poly, WED } from './church'

/**
 * The wedding (0 to 21.577): the show opens on the photograph.
 *
 * The first frame is sepia: the two of them at the altar, posed, the photographer's camera on its tripod in the
 * front row, its flash tray up. 0.441: the powder fires, the frame goes white, and the white fades onto the living
 * church in colour. The organ plays the Wedding March, jazzed: its ranks of pipes light and breathe on the march's
 * onsets, its bellows drawn down by every note and pumped back up by a crank on the beat. Carl's family, grey and few
 * in the front pew, do not move; Ellie's, bright and many in the two behind, bob on every beat. Ellie can't keep
 * still: she hops on the big accents, and Carl, stiff, hops once when she lands beside him, once on his own, and once
 * when she bumps him (12.202). The march slows; they turn to each other; he leans in.
 *
 * 17.757, waltz bar 1: the kiss. The organ's great chord (every rank, the bellows all but emptied), the photographer's
 * second flash, the east window's light full on the two of them, her family's arms in the air. The bell is pulled off
 * and peals on bars 2, 3 and 4, petals thrown up over the aisle; she spins away and he follows, and they run down the
 * aisle, the photographer's camera turning after them; she hits the doors on 21.223 and they fly open on the morning;
 * at 21.577 they are through them, running level to the right at 1.6 cells a second, she a step ahead: the cut
 * (`CUTS.house`).
 *
 * The part's frame is the church world's, shifted by `WEDDING_AT` (Carl at the altar is its (-0.5, 0)).
 */

/** Where this part's entry cell is, in its world's cells (the score starts its leg here). */
export const WEDDING_AT: Pt = [ALTAR_CARL + 0.5, 0]

/* ------------------------------------------------------------------ the clock */

const FLASH = WED.flash
const KISS = WED.kiss
/** Carl's hops: [take-off, landing], each on an onset: startled when she lands, once on his own, bumped. */
const CARL_HOPS: [number, number][] = [
  [3.448, 3.686],
  [9.613, 9.874],
  [12.202, 12.504],
]
/** Ellie's hops on the march's big accents. */
const ELLIE_HOPS: [number, number][] = [
  [1.771, 2.078],
  [3.106, 3.448],
  [4.093, 4.429],
  [8.214, 8.499],
  [8.649, 8.969],
]
/** She bumps him on the march's strongest onset. */
const BUMP = 12.202
/** She spins away on bar 1's second beat; he follows. She hits the doors on bar 4's second beat. */
const HER_RUN = 18.123
const HIS_RUN = 18.3
const DOORS = 21.223
/** Where the two are at the cut, world x, running 1.6 cells a second: he in the doorway, she out on the landing. */
const CUT_CARL = CH.tower[1] - CH.wall / 2
const CUT_ELLIE = CUT_CARL + 0.36
const SPEED = 1.6

/* ------------------------------------------------------------------ the two of them, as functions of show time (world cells) */

const carlRun = pchip([HIS_RUN, 18.95, CUT.house], [ALTAR_CARL, ALTAR_CARL + 0.55, CUT_CARL], 0, SPEED)
const ellieRun = pchip([HER_RUN, 18.75, CUT.house], [ALTAR_ELLIE - 0.08, ALTAR_ELLIE + 0.36, CUT_ELLIE], 0, SPEED)

function carl(T: number): Pt {
  if (T >= HIS_RUN) return [carlRun(T), 0]
  // Pushed a little way along by her bump, and back to his place.
  const x = ALTAR_CARL - 0.06 * ease(T, BUMP, CARL_HOPS[2][1]) + 0.06 * ease(T, 13.3, 14.6)
  let y = 0
  for (const [a, b] of CARL_HOPS) y -= lift(T, a, b)
  return [x, y]
}

function ellie(T: number): Pt {
  if (T >= HER_RUN) return [ellieRun(T), 0]
  let x = ALTAR_ELLIE
  // The bump: she rolls in, gathering, touches him on the onset, rolls back off him and settles.
  if (T >= 11.72 && T < BUMP) {
    const u = (T - 11.72) / (BUMP - 11.72)
    x = ALTAR_ELLIE - 0.1 * u * u
  } else if (T >= BUMP && T < 12.8) {
    const u = (T - BUMP) / (12.8 - BUMP)
    x = ALTAR_ELLIE - 0.1 + 0.15 * (1 - (1 - u) * (1 - u))
  } else if (T >= 12.8) {
    x = ALTAR_ELLIE + 0.05 - 0.05 * ease(T, 12.8, 13.7)
    // Turned to him: a little closer as the march slows, and in to the touch on the kiss.
    x -= 0.03 * ease(T, 14.25, 15.4) + 0.05 * ease(T, 16.811, KISS)
  }
  let y = 0
  for (const [a, b] of ELLIE_HOPS) y -= lift(T, a, b)
  return [x, y]
}

/** How he holds himself: a flinch at the flash, a squash on each landing, a glance at the pews, the lean into the kiss. */
function carlPose(T: number): { tilt: number; squash: number } {
  let squash = 0.1 * knock(T - FLASH, 0.14) * (T >= FLASH ? Math.min(1, (T - FLASH) / 0.03) : 0)
  for (const [, b] of CARL_HOPS) squash += 0.09 * knock(T - b, 0.13)
  const glance = 0.07 * smooth(T, 5.9, 6.5) * (1 - smooth(T, 7.3, 8.0))
  // A nervous nod on the march's last phrase: a small bow and back, slow.
  const nod = 0.08 * ease(T, 15.412, 15.75) * (1 - ease(T, 15.95, 16.6))
  const lean = 0.15 * ease(T, 16.811, KISS) * (1 - ease(T, 18.05, HIS_RUN + 0.35))
  return { tilt: glance + nod + lean, squash }
}

/* ------------------------------------------------------------------ the photographer */

/** The camera on its tripod, in front of the back pew: its lens on the two of them, its flash tray on a rod. */
const CAM: Pt = [3.78, 0.46]
/** The flash tray's height: raised for the photograph and the kiss, lowered out of their way as they run. */
const trayY = (T: number): number => -0.42 + 0.72 * ease(T, 18.25, 19.1)
const TRAY_X = CAM[0] + 0.12

function drawPhotographer(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  const [cx, cy] = CAM
  // The tripod: three legs down out of the frame.
  p.stroke(alpha(p, INK, 0.95))
  p.strokeWeight(weight * 0.9)
  p.line(cx * k, (cy + 0.1) * k, (cx - 0.3) * k, 2.2 * k)
  p.line(cx * k, (cy + 0.1) * k, (cx + 0.32) * k, 2.2 * k)
  p.line(cx * k, (cy + 0.1) * k, (cx + 0.04) * k, 2.2 * k)
  // The dark cloth over the camera's back, falling to the photographer hidden under it.
  p.noStroke()
  p.fill(mixHex(INK, CHURCH.pew, 0.35))
  p.beginShape()
  p.vertex((cx + 0.1) * k, (cy - 0.13) * k)
  p.bezierVertex((cx + 0.24) * k, (cy - 0.19) * k, (cx + 0.36) * k, (cy - 0.12) * k, (cx + 0.38) * k, (cy + 0.04) * k)
  p.bezierVertex((cx + 0.4) * k, (cy + 0.22) * k, (cx + 0.36) * k, (cy + 0.36) * k, (cx + 0.3) * k, (cy + 0.42) * k)
  p.vertex((cx + 0.16) * k, (cy + 0.4) * k)
  p.bezierVertex((cx + 0.18) * k, (cy + 0.28) * k, (cx + 0.14) * k, (cy + 0.12) * k, (cx + 0.1) * k, (cy + 0.1) * k)
  p.endShape(p.CLOSE)
  // The rod up to the flash tray, and the tray.
  const ty = trayY(T)
  p.stroke(alpha(p, INK, 0.95))
  p.strokeWeight(weight * 0.7)
  p.line(TRAY_X * k, (cy - 0.1) * k, TRAY_X * k, (ty + 0.02) * k)
  p.fill(mixHex(HOME.brass, INK, 0.25))
  poly(p, k, [
    [TRAY_X - 0.17, ty - 0.03],
    [TRAY_X + 0.17, ty - 0.03],
    [TRAY_X + 0.13, ty + 0.03],
    [TRAY_X - 0.13, ty + 0.03],
  ])
  // The camera: a box, its bellows drawn out toward the lens board, the brass lens aimed at the two of them, and
  // turning after them as they go (the photographer following them with it, a little behind).
  p.push()
  p.translate(cx * k, cy * k)
  p.rotate(aimAt(T))
  p.stroke(INK)
  p.strokeWeight(weight * 0.8)
  p.fill(mixHex(HOME.woodDark, INK, 0.2))
  box2(p, k, -0.06, -0.14, 0.2, 0.12, 0.02)
  p.fill(mixHex(INK, HOME.woodDark, 0.25))
  poly(p, k, [
    [-0.06, -0.12],
    [-0.28, -0.08],
    [-0.28, 0.07],
    [-0.06, 0.1],
  ])
  p.stroke(alpha(p, HOME.woodDark, 0.8))
  p.strokeWeight(weight * 0.4)
  for (let i = 1; i < 4; i++) {
    const x = -0.06 - 0.055 * i
    p.line(x * k, (-0.12 + 0.01 * i) * k, x * k, (0.1 - 0.008 * i) * k)
  }
  p.stroke(INK)
  p.strokeWeight(weight * 0.8)
  p.fill(mixHex(HOME.woodDark, INK, 0.1))
  box2(p, k, -0.32, -0.11, -0.27, 0.1, 0.01)
  p.fill(HOME.brass)
  box2(p, k, -0.43, -0.05, -0.32, 0.04, 0.01)
  p.pop()
}

/** Where the lens points (radians, clockwise from pointing left): at the two of them, lagging them a little. */
function aimAt(T: number): number {
  let sum = 0
  let w = 0
  for (let i = 0; i <= 8; i++) {
    const s = Math.max(0, T - 0.35 - i * 0.05)
    const [cx, cy] = carl(s)
    const [ex, ey] = ellie(s)
    const dx = (cx + ex) / 2 - CAM[0]
    const dy = (cy + ey) / 2 - CAM[1]
    const wi = 1 - i / 9
    sum += Math.atan2(-dy, -dx) * wi
    w += wi
  }
  return Math.max(-0.2, Math.min(1.15, sum / w))
}

/** The flash powder burning on the tray: a flat white flare, and its smoke rising and thinning over a few seconds. */
function drawFlash(p: p5, c: Ctx, T: number): void {
  const { k } = c
  for (const [at, big] of [
    [FLASH, 1],
    [KISS, 0.7],
  ] as [number, number][]) {
    const age = T - at
    if (age < 0 || age > 4) continue
    const ty = trayY(at)
    // The flare: wide and low over the tray, gone in a tenth of a second.
    const flare = Math.exp(-age / 0.05) * Math.min(1, age / 0.012 + 0.4)
    if (flare > 0.02) {
      p.noStroke()
      p.fill(alpha(p, '#FFFFFF', 0.95 * flare))
      p.ellipse(TRAY_X * k, (ty - 0.08) * k, 0.62 * big * k, 0.2 * big * k)
      p.fill(alpha(p, CHURCH.candle, 0.7 * flare))
      p.ellipse(TRAY_X * k, (ty - 0.2) * k, 0.34 * big * k, 0.3 * big * k)
    }
    // The smoke: a few soft billows off the tray, rising, spreading, thinning.
    p.noStroke()
    for (let i = 0; i < 7; i++) {
      const u = Math.min(1, age / (2.6 + hash(i, 1) * 1.2))
      const a = 0.32 * big * Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - u)
      if (a < 0.01) continue
      const rise = (0.5 + hash(i, 2) * 0.6) * (1 - Math.exp(-age / 0.9)) * big
      const drift = (hash(i, 3) - 0.35) * 0.5 * u + 0.08 * Math.sin(age * 1.3 + i)
      const r = (0.1 + 0.26 * u) * big * (0.7 + 0.5 * hash(i, 4))
      p.fill(alpha(p, mixHex('#FFFFFF', CHURCH.stone, 0.25), a))
      p.ellipse((TRAY_X + drift) * k, (ty - 0.1 - rise) * k, r * 2.1 * k, r * 1.5 * k)
    }
  }
}

/* ------------------------------------------------------------------ the frame: the photograph, and the white */

/** The first frame is the photograph (sepia); the flash wipes it white, and the white fades onto the living church. */
function drawExposure(p: p5, c: Ctx, T: number): void {
  const { k } = c
  const f = frame(p, k)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const sepia = T < FLASH ? 0.88 : 0
  if (sepia > 0) {
    ctx.save()
    ctx.globalCompositeOperation = 'color'
    ctx.fillStyle = `rgba(150, 112, 74, ${sepia})`
    ctx.fillRect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
    ctx.restore()
    // A photograph's warm paper, and its corners darkening.
    ctx.save()
    const g = ctx.createRadialGradient(f.cx * k, f.cy * k, 0, f.cx * k, f.cy * k, Math.hypot(f.x1 - f.cx, f.y1 - f.cy) * k)
    g.addColorStop(0.55, 'rgba(80, 56, 36, 0)')
    g.addColorStop(1, 'rgba(80, 56, 36, 0.35)')
    ctx.fillStyle = g
    ctx.fillRect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
    ctx.restore()
  }
  const white = T >= FLASH ? 0.94 * knock(T - FLASH, 0.3) : 0
  if (white > 0.004) {
    p.noStroke()
    p.fill(alpha(p, '#FFFFFF', white))
    box2(p, k, f.x0, f.y0, f.x1, f.y1)
  }
  // The second photograph, on the kiss: a softer, warmer flash, lighter than air (it adds light; it does not grey).
  const warm = T >= KISS ? 0.34 * knock(T - KISS, 0.14) : 0
  if (warm > 0.004) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = `rgba(255, 244, 222, ${warm})`
    ctx.fillRect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
    ctx.restore()
  }
}

/* ------------------------------------------------------------------ the part */

interface WeddingState {
  begin: number
}

/** Every strike of this part, in show seconds (check:shows holds each to the music). */
export const WEDDING_HITS: number[] = [
  ...new Set([
    FLASH,
    ...WED.march.map(([s]) => s),
    ...ELLIE_HOPS.flat(),
    ...CARL_HOPS.flat(),
    BUMP,
    KISS,
    WED.peal[0],
    WED.peal[1],
    WED.peal[2],
    DOORS,
  ]),
].sort((a, b) => a - b)

/** Sampled in short straight pieces, broken exactly at every strike, so a landing is where the music is. */
function lane(fn: (T: number) => Pt, begin: number, end: number, at: Pt): Seg[] {
  const marks = [begin, ...WEDDING_HITS.filter((s) => s > begin && s < end), HIS_RUN, HER_RUN, end].filter((s) => s >= begin && s <= end)
  const cuts = [...new Set(marks)].sort((a, b) => a - b)
  const segs: Seg[] = []
  const local = (T: number): Pt => {
    const [x, y] = fn(T)
    return [x - at[0], y - at[1]]
  }
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i]
    const b = cuts[i + 1]
    if (b - a < 1e-6) continue
    segs.push(...carried((t) => local(t + begin), a - begin, b - begin, Math.max(1, Math.ceil((b - a) / 0.02))))
  }
  return segs
}

export const wedding = part<WeddingState>(
  {
    name: 'wedding',
    draw: () => {},
    over: (p: p5, s: WeddingState, c: Ctx) => {
      const T = c.t + s.begin
      const { k } = c
      p.push()
      p.translate(-WEDDING_AT[0] * k, -WEDDING_AT[1] * k)
      if (T < 100) {
        drawPetals(p, k, T, true)
        drawPhotographer(p, c, T)
        drawFlash(p, c, T)
        drawExposure(p, c, T)
      }
      p.pop()
    },
  },
  (slot) => {
    const at = WEDDING_AT
    const segs = lane(carl, slot.begin, slot.end, at)
    const her = (T: number): Companion => {
      const [x, y] = ellie(T)
      return { x: x - at[0], y: y - at[1] }
    }
    const [bx0, by0, bx1, by1] = CHURCH_BOX
    return {
      cells: box(bx0 - at[0], by0 - at[1], bx1 - at[0], by1 - at[1]),
      exit: [CUT_CARL - at[0] + 0.5, 0],
      lane: { segs, fire: KISS - slot.begin },
      state: { begin: slot.begin },
      company: [{ from: slot.begin, to: slot.end, at: her }],
      pose: [{ from: slot.begin, to: slot.end, at: carlPose }],
    }
  },
  (slot) => {
    const at = WEDDING_AT
    const key = (t: number, cells: number, x: number, y: number) => ({ t, cells, hold: [x - at[0], y - at[1]] as Pt, w: 1 })
    return [
      // The photograph: the two of them left of centre, the camera and its tray at the right; a slow push.
      key(0.001, 3.1, 1.46, -0.5),
      key(1.9, 3.3, 1.3, -0.58),
      // Over to the organ as it plays, the two of them at the right of it.
      key(5.2, 4.6, -1.3, -1.2),
      // Out to the whole church: the families, the tower, the doors.
      key(8.0, 6.0, 0.9, -1.75),
      // In on the two of them for her hops and his, and closest for her bump; then on into the kiss.
      key(10.6, 4.2, 0.8, -0.95),
      key(12.2, 3.2, 0.5, -0.6),
      key(13.9, 4.0, 1.15, -0.86),
      key(16.9, 3.1, -0.15, -0.6),
      key(KISS, 2.65, -0.45, -0.55),
      key(18.5, 3.4, 0.3, -0.72),
      // Out on the swell to the bell pealing in its tower over the doors they run for; then in with them.
      key(19.9, 5.8, 2.6, -1.9),
      key(20.85, 5.2, 4.05, -1.2),
      // The cut (`CUTS.house`): 5 cells, Carl 0.9 left of centre and 0.9 below it.
      key(slot.end, 5, CUT_CARL + 0.9, -0.9),
    ].filter((s) => s.t >= slot.begin && s.t <= slot.end)
  },
)
