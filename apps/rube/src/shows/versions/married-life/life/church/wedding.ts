import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import type { Seg } from '../../../../../parts'
import { alpha, box, carried, frame, hash, knock, part, smooth, type Companion, type Ctx } from '../kit'
import { CUT } from '../music'
import { CHURCH, HOME, INK } from '../worlds'
import { ALTAR_CARL, ALTAR_ELLIE, bounce, box2, CH, CHURCH_BOX, drawPetals, ease, lift, paint, pchip, poly, rankLight, WED } from './church'

/**
 * The wedding (0 to 21.577): the show opens on the photograph.
 *
 * The first frame is sepia: the two of them at the altar, posed, the photographer's camera on its tripod in the
 * front row, its flash tray up. 0.441: the powder fires, the frame goes white, and the white fades onto the living
 * church in colour. Its job done, the tripod folds its legs and sinks out of the frame (gone by 2.5 s), and the camera
 * pulls out once to the whole church (a reveal under 2 s), then comes in on the organ playing the Wedding March,
 * jazzed: 3.5 cells, the organ whole at the left, the two of them at the right. Every note stretches its rank's pipes
 * up and puffs air from their mouths, its bellows drawn down and pumped back up by a crank on the beat. The camera
 * carries on right across the altar to the pews, Carl's family grey and still in the front one, Ellie's bright ones
 * bobbing behind, and comes back in on the two of them by 14 s. Ellie can't keep still: she bobs on the beat and hops
 * on the accents; Carl, stiff, edges away from her along the step and back, hops once when she lands beside him,
 * once on his own (9.613, and she hops as he lands), and once when she bumps him (12.202). The march slows; they turn
 * to each other; he leans in, and the camera pushes in to 2 cells on them under the east window.
 *
 * 17.757, waltz bar 1: the kiss, held still. The organ's great chord, the east window's light full on the two of
 * them, a warm second flash from the photographer out of frame (it is the photograph on the funeral's easel), her
 * family's arms in the air. The bell is pulled off and peals on bars 2, 3 and 4, petals thrown up over the aisle; she
 * spins away and he follows, and the camera pulls out as they run down the aisle; she hits the doors on 21.223 and
 * they fly open on the morning; at 21.577 they are through them, running level to the right at 1.6 cells a second,
 * she a step ahead: the cut (`CUTS.house`).
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
/**
 * Ellie's hops on the march's accents (each take-off and landing an onset): a skip that lands as he edges away
 * (5.306), one that lands as he edges back (7.848), and one taking off as he lands his own (9.874).
 */
const ELLIE_HOPS: [number, number][] = [
  [1.771, 2.078],
  [3.106, 3.448],
  [4.093, 4.429],
  [5.114, 5.306],
  [7.517, 7.848],
  [8.214, 8.499],
  [8.649, 8.969],
  [9.874, 10.246],
]
/** Her hops are livelier than his (a lighter gravity: higher for the same time in the air). */
const HER_G = 15
/** Between her hops she bobs on the beat, like her family: from the march's start until it slows and they turn. */
function restless(T: number): number {
  let gate = smooth(T, 1.2, 1.7) * (1 - smooth(T, 11.35, 11.7)) + smooth(T, 12.8, 13.2) * (1 - smooth(T, 14.0, 14.6))
  for (const [a, b] of ELLIE_HOPS) gate *= 1 - smooth(T, a - 0.16, a) * (1 - smooth(T, b, b + 0.16))
  return gate
}
/**
 * His nervous shuffle, step by step along the altar step ([from, to] each, ending on the march's onsets): two small
 * steps away from her on the phrase at 5.306, a look at the pews, and two back in beside her as she hops (8.214, 8.499).
 */
const SHUFFLE_OUT: [number, number][] = [
  [5.306, 5.666],
  [5.666, 6.031],
]
const SHUFFLE_BACK: [number, number][] = [
  [7.848, 8.214],
  [8.214, 8.499],
]
const STEP = 0.1
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
  // The shuffle away and back; then pushed a little way along by her bump, and back to his place.
  let x = ALTAR_CARL - 0.06 * ease(T, BUMP, CARL_HOPS[2][1]) + 0.06 * ease(T, 13.3, 14.6)
  for (const [a, b] of SHUFFLE_OUT) x -= STEP * ease(T, a, b)
  for (const [a, b] of SHUFFLE_BACK) x += STEP * ease(T, a, b)
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
  let y = -0.032 * bounce(T) * restless(T)
  for (const [a, b] of ELLIE_HOPS) y -= lift(T, a, b, HER_G)
  return [x, y]
}

/** How he holds himself: a flinch at the flash, a squash on each landing, his shuffle, a glance at the pews, the lean into the kiss. */
function carlPose(T: number): { tilt: number; squash: number } {
  let squash = 0.1 * knock(T - FLASH, 0.14) * (T >= FLASH ? Math.min(1, (T - FLASH) / 0.03) : 0)
  for (const [, b] of CARL_HOPS) squash += 0.09 * knock(T - b, 0.13)
  // Each shuffling step: a lean into it, and a small settle as it lands.
  let step = 0
  for (const [dir, steps] of [
    [-1, SHUFFLE_OUT],
    [1, SHUFFLE_BACK],
  ] as [number, [number, number][]][]) {
    for (const [a, b] of steps) {
      if (T > a && T < b) step += dir * 0.06 * Math.sin((Math.PI * (T - a)) / (b - a))
      squash += 0.035 * (T < b ? ease(T, b - 0.1, b) : knock(T - b, 0.14))
    }
  }
  // Stepped away, he looks back at the pews; he stops looking as he steps back in.
  const glance = 0.07 * smooth(T, 6.1, 6.6) * (1 - smooth(T, 7.3, 7.85))
  // A nervous nod on the march's last phrase: a small bow and back, slow.
  const nod = 0.08 * ease(T, 15.412, 15.75) * (1 - ease(T, 15.95, 16.6))
  const lean = 0.15 * ease(T, 16.811, KISS) * (1 - ease(T, 18.05, HIS_RUN + 0.35))
  return { tilt: step + glance + nod + lean, squash }
}

/* ------------------------------------------------------------------ the photographer */

/** The camera on its tripod, in front of the back pew: its lens on the two of them, its flash tray on a rod. */
const CAM: Pt = [3.78, 0.46]
/** The flash tray's height: raised for the photograph; once it has fired, the rod slides down into the camera. */
const trayY = (T: number): number => -0.42 + 0.66 * ease(T, 0.95, 1.5)
const TRAY_X = CAM[0] + 0.12
/**
 * One job, then gone: after the photograph the tripod's legs draw in and the whole rig sinks out of the bottom of
 * the frame, gone by 2.5 s (the camera is already pulling out, so nothing is left at its edge).
 */
const RIG_GONE = 2.5
const sink = (T: number): number => 2.6 * ease(T, 1.3, RIG_GONE)
const spread = (T: number): number => 1 - 0.8 * ease(T, 1.15, 2.0)

function drawPhotographer(p: p5, c: Ctx, T: number): void {
  if (T >= RIG_GONE) return
  const { k, weight } = c
  const cx = CAM[0]
  const cy = CAM[1] + sink(T)
  const sp = spread(T)
  // The tripod: three legs down out of the frame, drawing together as it is folded.
  p.stroke(alpha(p, INK, 0.95))
  p.strokeWeight(weight * 0.9)
  const foot = cy + 1.74
  p.line(cx * k, (cy + 0.1) * k, (cx - 0.3 * sp) * k, foot * k)
  p.line(cx * k, (cy + 0.1) * k, (cx + 0.32 * sp) * k, foot * k)
  p.line(cx * k, (cy + 0.1) * k, (cx + 0.04 * sp) * k, foot * k)
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
  const ty = trayY(T) + sink(T)
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
  // Tipped down as it is folded away.
  p.rotate(aimAt(T) - 0.35 * ease(T, 1.1, 1.8))
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
  for (const [at, big] of [[FLASH, 1]] as [number, number][]) {
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

/* ------------------------------------------------------------------ the organ, breathing */

/**
 * The notes the organ's pipes breathe on: the church's march (which also lights its ranks), and a few more of the
 * loud stretch's onsets the camera is close on (4 to 8 s), each with the ranks that speak.
 */
const EXTRA_BREATHS: [number, number[]][] = [
  [6.031, [4]],
  [6.983, [3]],
  [7.517, [1]],
]
const BREATHS: [number, number[]][] = [...WED.march, ...EXTRA_BREATHS].sort((a, b) => a[0] - b[0])
/** The façade's front row, as the church draws it: x, height, rank. */
const FRONT = [1.02, 1.16, 1.32, 1.5, 1.7, 1.9, 1.7, 1.5, 1.32, 1.16, 1.02].map((h, i) => ({
  x: -3.24 + 0.139 * i,
  h: h * 0.78,
  rank: [0, 0, 1, 1, 2, 2, 2, 3, 3, 4, 4][i],
}))
const PIPE_W = 0.112

/** How hard rank `r` is breathing at `T`: up at once on its note, and a long damped settle. 0 to about 1. */
function breath(r: number, T: number): number {
  let v = 0
  for (const [s, ranks] of BREATHS) {
    if (T < s || !ranks.includes(r)) continue
    const age = T - s
    v = Math.max(v, (ranks.length > 1 ? 1 : 0.8) * Math.min(1, age / 0.045) * Math.exp(-age / 0.32))
  }
  return v
}

/**
 * Over the church's organ: each speaking pipe drawn again stretched up and a little fuller, gold as it sounds, and air
 * puffing from its mouth (out to both sides and up), thinning in a second. Clipped between the case's posts.
 */
function drawBreath(p: p5, c: Ctx, T: number): void {
  if (T > 18.2) return
  const { k, weight } = c
  const pc = paint(T)
  const imp = CH.impost
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.rect(-3.21 * k, -4 * k, (-1.89 + 3.21) * k, (imp - 0.06 + 4) * k)
  ctx.clip()
  for (const pipe of FRONT) {
    const b = breath(pipe.rank, T)
    if (b < 0.004) continue
    const L = Math.min(1, rankLight(pipe.rank, T) + 0.35 * b)
    const w = PIPE_W * (1 + 0.1 * b)
    const top = imp - pipe.h - 0.1 * b * (0.55 + 0.45 * (pipe.h / 1.48))
    const mouth = imp - 0.2 - pipe.h * 0.04
    p.stroke(alpha(p, INK, 0.85))
    p.strokeWeight(weight * 0.65)
    p.fill(mixHex(pc.tin, CHURCH.candle, Math.min(1, L * 0.95)))
    box2(p, k, pipe.x - w / 2, top, pipe.x + w / 2, mouth, 0.012)
    poly(p, k, [
      [pipe.x - w / 2, mouth],
      [pipe.x + w / 2, mouth],
      [pipe.x + 0.016, imp],
      [pipe.x - 0.016, imp],
    ])
    p.noStroke()
    p.fill(alpha(p, '#FFFFFF', 0.28 + 0.3 * L))
    box2(p, k, pipe.x - w * 0.28, top + 0.05, pipe.x - w * 0.1, mouth - 0.04)
    p.fill(alpha(p, INK, 0.85))
    p.arc(pipe.x * k, (mouth - 0.005) * k, w * 0.62 * k, (0.1 + 0.03 * b) * k, Math.PI, 2 * Math.PI, p.CHORD)
    p.fill(alpha(p, CHURCH.flame, 0.35 * L))
    box2(p, k, pipe.x - w / 2, top, pipe.x + w / 2, mouth)
  }
  ctx.restore()
  // The air from the mouths: three soft puffs a pipe (left, right and up), spreading and thinning; each a white
  // billow over a faint grey underside, so it reads against the pale tin.
  p.noStroke()
  const shade = mixHex(pc.tinDeep, INK, 0.3)
  for (const [s, ranks] of BREATHS) {
    const age = T - s
    if (age < 0 || age > 1.1) continue
    const big = ranks.length > 1 ? 1 : 0.8
    const u = age / 1.1
    const a = 0.8 * big * Math.min(1, age / 0.05) * Math.pow(1 - u, 1.6)
    const out = 1 - Math.pow(1 - u, 3)
    for (const pipe of FRONT) {
      if (!ranks.includes(pipe.rank)) continue
      const mouth = imp - 0.2 - pipe.h * 0.04
      for (const [dir, j] of [
        [-1, 0],
        [1, 1],
        [0, 2],
      ] as [number, number][]) {
        const wob = 0.02 * Math.sin(u * 5 + pipe.x * 11 + j)
        const x = pipe.x + dir * 0.13 * out + wob
        const y = mouth - 0.03 - (dir === 0 ? 0.36 : 0.2) * big * out
        const r = (0.05 + (dir === 0 ? 0.11 : 0.08) * out) * big
        const aa = a * (dir === 0 ? 0.8 : 1)
        p.fill(alpha(p, shade, aa * 0.3))
        p.ellipse((x + 0.008) * k, (y + 0.022) * k, r * 2 * k, r * 1.45 * k)
        p.fill(alpha(p, '#FFFFFF', aa))
        p.ellipse(x * k, y * k, r * 2 * k, r * 1.45 * k)
      }
    }
  }
}

/* ------------------------------------------------------------------ the east window's light on them */

/**
 * The east window's light on the two of them: as they turn to each other (16.811) the morning through the window
 * over the altar gathers on them, fullest on the kiss, and falls away as they run. Added light (screen), over them,
 * a shaft from the window's sill to the floor where they stand, stronger at the foot; the church draws the window's
 * own flare behind them.
 */
function drawKissLight(p: p5, c: Ctx, T: number): void {
  const a = 0.16 * smooth(T, 16.6, KISS) * (1 - smooth(T, HIS_RUN, HIS_RUN + 1.1)) + 0.06 * knock(T - KISS, 0.4)
  if (a < 0.004) return
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const sill = -0.98
  const floor = CH.floor
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  const g = ctx.createLinearGradient(0, sill * k, 0, floor * k)
  g.addColorStop(0, `rgba(255, 238, 204, ${a * 0.25})`)
  g.addColorStop(0.7, `rgba(255, 238, 204, ${a * 0.8})`)
  g.addColorStop(1, `rgba(255, 238, 204, ${a})`)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(-1.25 * k, sill * k)
  ctx.lineTo(-0.73 * k, sill * k)
  ctx.lineTo((ALTAR_ELLIE + 0.34) * k, floor * k)
  ctx.lineTo((ALTAR_CARL - 0.26) * k, floor * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
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
  // The second photograph, on the kiss (the one on the funeral's easel): the photographer out of frame to the right
  // and below, where his rig went; a softer, warmer flash from there, lighter than air (it adds light; it does not
  // grey), strongest on the side it comes from.
  const warm = T >= KISS ? 0.36 * knock(T - KISS, 0.14) : 0
  if (warm > 0.004) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    const g = ctx.createLinearGradient(f.x1 * k, f.y1 * k, f.x0 * k, f.y0 * k)
    g.addColorStop(0, `rgba(255, 244, 222, ${Math.min(1, warm * 1.5)})`)
    g.addColorStop(1, `rgba(255, 244, 222, ${warm * 0.45})`)
    ctx.fillStyle = g
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
    ...BREATHS.map(([s]) => s),
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
        drawBreath(p, c, T)
        drawKissLight(p, c, T)
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
    // The photograph; one reveal of the whole church (over 5 cells for under 2 s, done by 4.5); in on the organ
    // playing, the two of them at the right of it, and on across the altar to the families in the pews; back in on
    // the two of them by 14 s; a push to 2 cells for the kiss under the east window, held there until the run; then
    // one pull-out on the swell, from rest, taking the bell and the run down the aisle, onto the doors at the cut.
    // (Under Zoom the two of them stay whole throughout: the organ frames keep them in its right third.)
    return [
      // The photograph: the two of them left of centre, the camera and its tray at the right, a slow drift in on it
      // through the flash, while the rig folds away.
      key(0.001, 3.1, 1.46, -0.5),
      key(1.3, 3.0, 1.4, -0.52),
      // Out, once, as the march gets going: organ, altar, families, tower, bell, doors.
      key(3.4, 6.0, 0.9, -1.72),
      // In on the organ, whole at the left (every rank breathing on the loud bars), the two of them at the right.
      key(5.3, 3.5, -1.33, -0.9),
      // Carried across it to the right as it plays on,
      key(7.7, 3.35, -0.95, -0.88),
      // past the two of them (her hops, his hop) to the pews: his family still, hers bobbing.
      key(10.1, 3.15, 1.35, -0.8),
      // Back in on the two of them: her bump (12.202) on the way, there as the march slows.
      key(13.9, 2.4, 0.3, -0.34),
      key(16.811, 2.1, 0.27, -0.24),
      // The kiss, centred at 2 cells, the east window's light on them; held still until he runs.
      key(KISS, 2.0, 0.26, -0.2),
      key(HIS_RUN, 2.0, 0.26, -0.2),
      // Out on the whole swell, the petals over the aisle, following them to the doors; and on out, without a stop,
      // through the cut into the house's opening.
      key(20.5, 4.7, 3.05, -0.95),
      // The cut (`CUTS.house`): 5 cells, Carl 0.9 left of centre and 0.9 below it.
      key(slot.end, 5, CUT_CARL + 0.9, -0.9),
    ].filter((s) => s.t >= slot.begin && s.t <= slot.end)
  },
)
