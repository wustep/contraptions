import type p5 from 'p5'
import { solid } from '../../../../../../../../src/core/draw'
import { mixHex, type Pt, type Seg } from '../../../../../parts'
import { alpha, box, carried, frame, part, route, type Ctx, type PartShot } from '../kit'
import { G } from '../physics'
import { HOTDOG } from '../worlds'
import {
  BOTTLE,
  FINGERS,
  FLICK,
  FLOOR_Y,
  FOOT,
  HAND,
  KEY,
  KNUCKLE,
  KX0,
  KX1,
  LID,
  PALM,
  STEPS,
  STOMPS,
  ankleOf,
  ease,
  hotdog,
  indexHeading,
  keyOf,
  kicker,
  palmOff,
  ring,
  stomper,
  toeOf,
  type HotdogPlan,
  type LegPose,
} from './fingers-plan'

/**
 * Hot dog fingers: the world where people have hot dogs for fingers, so a piano is played with the feet.
 *
 * The kick that began in the dojo finishes here: a stockinged foot where the wooden leg was, swinging on through,
 * and she lands on the keys of a grand piano and bounces up the keyboard, each key going down under her on the
 * flurry, while the pianist's feet play the bass. At the top of the keyboard lies the pianist's hand, palm up, all
 * sausages. She rolls into it and the floppy fingers curl round her; they cannot hold on. They flop open and toss
 * her onto the mustard bottle on the lid, which squirts across them; she falls back into the palm, is tossed onto
 * the index finger, lifted, and flicked up on the jump.
 *
 * The motion is worked out in `fingers-plan.ts`; this file lays the lane on it and draws.
 */

interface HotdogState {
  begin: number
  plan: HotdogPlan
}

const PLAN = hotdog()

/* ------------------------------------------------------------------ drawing tools */

/** A soft tube through `pts` with radii `rs`: an ink edge, a flat fill, rounded ends. */
function tube(p: p5, k: number, ink: string, w: number, pts: Pt[], rs: number[], fill: string): void {
  p.strokeCap(p.ROUND)
  p.strokeJoin(p.ROUND)
  p.stroke(ink)
  for (let i = 1; i < pts.length; i++) {
    p.strokeWeight(((rs[i - 1] + rs[i]) / 2) * 2 * k + 2 * w)
    p.line(pts[i - 1][0] * k, pts[i - 1][1] * k, pts[i][0] * k, pts[i][1] * k)
  }
  p.stroke(fill)
  for (let i = 1; i < pts.length; i++) {
    p.strokeWeight(Math.max(0.5, ((rs[i - 1] + rs[i]) / 2) * 2 * k))
    p.line(pts[i - 1][0] * k, pts[i - 1][1] * k, pts[i][0] * k, pts[i][1] * k)
  }
}

/** A light streak along a tube's upper side: what makes a sausage glossy. */
function gloss(p: p5, k: number, pts: Pt[], r: number, from: number, to: number, a = 0.55): void {
  p.stroke(alpha(p, HOTDOG.ivory, a))
  p.strokeWeight(Math.max(1, r * 0.45 * k))
  p.noFill()
  p.beginShape()
  const n = pts.length - 1
  for (let i = Math.floor(from * n); i <= Math.ceil(to * n); i++) {
    const a0 = pts[Math.max(0, i - 1)]
    const a1 = pts[Math.min(n, i + 1)]
    const dx = a1[0] - a0[0]
    const dy = a1[1] - a0[1]
    const l = Math.hypot(dx, dy) || 1
    // The side toward the light (up the screen).
    let nx = dy / l
    let ny = -dx / l
    if (ny > 0) {
      nx = -nx
      ny = -ny
    }
    p.vertex((pts[i][0] + nx * r * 0.45) * k, (pts[i][1] + ny * r * 0.45) * k)
  }
  p.endShape()
}

const STOCKING = HOTDOG.lilac
const STOCKING_DEEP = mixHex(HOTDOG.lilac, HOTDOG.piano, 0.28)
const SKIN = mixHex(HOTDOG.bun, HOTDOG.sausage, 0.18)
const WALL_STRIPE = mixHex('#F7D8D0', HOTDOG.ivory, 0.42)
const WAINSCOT = mixHex('#F7D8D0', HOTDOG.sausage, 0.22)
const KEY_SHADE = mixHex(HOTDOG.ivory, HOTDOG.piano, 0.14)

/* ------------------------------------------------------------------ the room and the piano */

function room(p: p5, c: Ctx): void {
  const { k, ink, weight } = c
  const f = frame(p, k)
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  // The wallpaper's stripes, faint, and a dado rail with the deeper pink under it.
  p.noStroke()
  p.fill(WALL_STRIPE)
  for (let x = Math.floor(x0 / 0.56) * 0.56; x < x1; x += 0.56) p.rect((x + 0.14) * k, ((f.y0 - 1 + 1.95) / 2) * k, 0.16 * k, (1.95 - (f.y0 - 1)) * k)
  p.fill(WAINSCOT)
  p.rect(((x0 + x1) / 2) * k, ((1.95 + FLOOR_Y) / 2) * k, (x1 - x0) * k, (FLOOR_Y - 1.95) * k)
  solid(p, ink, weight * 0.6, mixHex(HOTDOG.sausageDeep, WAINSCOT, 0.35))
  p.rect(((x0 + x1) / 2) * k, 1.95 * k, (x1 - x0) * k, 0.09 * k)
  // The floor: warm boards.
  solid(p, ink, weight * 0.8, HOTDOG.bun)
  p.rect(((x0 + x1) / 2) * k, ((FLOOR_Y + Math.max(f.y1 + 1, FLOOR_Y + 0.1)) / 2) * k, (x1 - x0) * k, (Math.max(f.y1 + 1, FLOOR_Y + 0.1) - FLOOR_Y) * k)
  // A warm pool of light on the piano.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createRadialGradient(2.2 * k, 0.6 * k, 0, 2.2 * k, 0.6 * k, 5.5 * k)
  g.addColorStop(0, 'rgba(255, 247, 232, 0.55)')
  g.addColorStop(1, 'rgba(255, 247, 232, 0)')
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, (f.y0 - 1) * k, (x1 - x0) * k, (f.y1 - f.y0 + 2) * k)
  ctx.restore()
}

/** How far white key `i` is down at show time `t`: under her, under the feet, under the hand. */
function keyDown(plan: HotdogPlan, i: number, t: number): number {
  let d = 0
  for (const r of plan.rides) {
    if (r.key !== i) continue
    d = Math.max(d, r.dip(t))
    // Let go, it comes back up a hair past level and settles.
    d += -0.018 * ring(t - (r.t + 0.12), 7, 0.06)
  }
  const press = (u: number, hold: number, depth: number) => (u < 0 ? 0 : u < 0.035 ? (depth * u) / 0.035 : u < hold ? depth : Math.max(0, depth * (1 - (u - hold) / 0.09)))
  const under = (lo: number, hi: number) => i >= keyOf(lo) && i <= keyOf(hi)
  for (const n of STOMPS) {
    const a = ankleOf(stomper(n))
    if (under(a[0] - 0.12, toeOf(stomper(n))[0])) d = Math.max(d, press(t - n, 0.3, 0.075))
  }
  for (const n of STEPS) {
    const a = ankleOf(kicker(n + 0.01))
    if (under(a[0] - 0.12, toeOf(kicker(n + 0.01))[0])) d = Math.max(d, press(t - n, 0.26, 0.07))
  }
  // The hand: her landing on the fingers, the fingers' slap, her landings in the palm and on the index.
  if (under(KNUCKLE[0] - 0.74, KNUCKLE[0] - 0.2)) {
    d = Math.max(d, press(t - HAND.land, 0.12, 0.035), press(t - HAND.slap, 0.16, 0.07), press(t - HAND.land2, 0.1, 0.06))
  }
  if (under(PALM.x0, PALM.x1)) d = Math.max(d, press(t - HAND.catch2, 0.1, 0.05))
  return d
}

/** The grand piano from its keyboard: the lid's line, the case, the music desk, the keys, the cheeks, legs and pedals. */
function piano(p: p5, c: Ctx, plan: HotdogPlan, t: number): void {
  const { k, ink, weight } = c
  const X = (x: number) => x * k
  const black = HOTDOG.piano
  const top = KEY.top
  const bed = top + KEY.face + 0.3
  // The music desk standing on the lid, leaning back a little.
  solid(p, ink, weight, black)
  p.quad(X(-0.3), X(LID), X(2.3), X(LID), X(2.22), X(LID - 0.86), X(-0.22), X(LID - 0.86))
  p.stroke(alpha(p, HOTDOG.lilac, 0.5))
  p.strokeWeight(weight * 0.6)
  p.line(X(-0.12), X(LID - 0.78), X(2.12), X(LID - 0.78))
  // Legs to the floor, with brass on their feet; the lyre and its pedals between.
  for (const lx of [KX0 - 0.02, KX1 + 0.02]) {
    solid(p, ink, weight, black)
    p.quad(X(lx - 0.17), X(bed), X(lx + 0.17), X(bed), X(lx + 0.1), X(FLOOR_Y - 0.12), X(lx - 0.1), X(FLOOR_Y - 0.12))
    solid(p, ink, weight * 0.7, HOTDOG.mustard)
    p.rect(X(lx), X(FLOOR_Y - 0.07), X(0.24), X(0.14), X(0.04))
  }
  const ly = (KX0 + KX1) / 2
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(weight * 2.6)
  for (const s of [-1, 1]) p.bezier(X(ly + s * 0.12), X(bed), X(ly + s * 0.34), X(bed + 0.7), X(ly + s * 0.05), X(FLOOR_Y - 0.9), X(ly + s * 0.1), X(FLOOR_Y - 0.4))
  p.stroke(black)
  p.strokeWeight(weight * 1.2)
  for (const s of [-1, 1]) p.bezier(X(ly + s * 0.12), X(bed), X(ly + s * 0.34), X(bed + 0.7), X(ly + s * 0.05), X(FLOOR_Y - 0.9), X(ly + s * 0.1), X(FLOOR_Y - 0.4))
  solid(p, ink, weight, black)
  p.rect(X(ly), X(FLOOR_Y - 0.33), X(0.62), X(0.2), X(0.04))
  solid(p, ink, weight * 0.7, HOTDOG.mustard)
  for (const s of [-1, 0, 1]) p.rect(X(ly + s * 0.17), X(FLOOR_Y - 0.2), X(0.08), X(0.12), X(0.02))

  // The case over the keys, from the lid's line down to them.
  solid(p, ink, weight, black)
  p.rect(X((KX0 + KX1) / 2), X((LID + top - 0.16) / 2), X(KX1 - KX0 + 0.5), X(top - 0.16 - LID))
  p.stroke(alpha(p, HOTDOG.ivory, 0.35))
  p.strokeWeight(weight * 0.6)
  p.line(X(KX0 - 0.2), X(LID + 0.05), X(KX1 + 0.2), X(LID + 0.05))
  // The key bed under the keys.
  solid(p, ink, weight, black)
  p.rect(X((KX0 + KX1) / 2), X((top + KEY.face + bed) / 2), X(KX1 - KX0 + 0.5), X(bed - top - KEY.face))

  // The keys, seen a little from above: their tops as a strip with the black keys in it, and their fronts.
  for (let i = 0; i < KEY.n; i++) {
    const x = KX0 + i * KEY.w
    const d = keyDown(plan, i, t)
    // The gap a pressed key opens shows the dark behind it.
    solid(p, ink, weight * 0.5, d > 0.004 ? KEY_SHADE : HOTDOG.ivory)
    p.rect(X(x + KEY.w / 2), X(top - 0.08 + d * 0.5), X(KEY.w), X(0.16 + d * 0.2))
    // A key held down blushes lilac, the note sounding, and fades back as it comes up.
    solid(p, ink, weight * 0.7, d > 0.004 ? mixHex(HOTDOG.ivory, HOTDOG.lilac, Math.min(0.75, d * 9)) : HOTDOG.ivory)
    p.rect(X(x + KEY.w / 2), X(top + KEY.face / 2 + d), X(KEY.w - 0.02), X(KEY.face), X(0.02))
  }
  // The black keys, set back among the tops: after the first, second, fourth, fifth and sixth of each seven.
  for (let i = 0; i < KEY.n - 1; i++) {
    const n = (i + 2) % 7
    if (n === 2 || n === 6) continue
    const x = KX0 + (i + 1) * KEY.w
    solid(p, ink, weight * 0.5, black)
    p.rect(X(x), X(top - 0.1), X(0.13), X(0.13), X(0.015))
  }
  // The cheeks at either end.
  solid(p, ink, weight, black)
  for (const [a, b] of [[KX0 - 0.26, KX0], [KX1, KX1 + 0.26]]) p.rect(X((a + b) / 2), X((top - 0.2 + top + KEY.face + 0.12) / 2), X(b - a), X(KEY.face + 0.32), X(0.04))
}

/* ------------------------------------------------------------------ the pianist */

/** A stockinged leg from out of the frame above: thigh down to the knee, the shin, the foot with its darker toe. */
function drawLeg(p: p5, c: Ctx, l: LegPose, lean: number): void {
  const { k, ink, weight } = c
  const ankle = ankleOf(l)
  const toe = toeOf(l)
  const up: Pt = [l.knee[0] + lean, l.knee[1] - 9]
  tube(p, k, ink, weight, [up, [l.knee[0] + lean * 0.05, l.knee[1] - 0.4], l.knee], [0.21, 0.19, 0.155], STOCKING)
  // The shin, slim at the ankle where she sits; its seam down the back.
  const shin: Pt[] = []
  const rs: number[] = []
  for (let i = 0; i <= 10; i++) {
    const u = i / 10
    shin.push([l.knee[0] + (ankle[0] - l.knee[0]) * u, l.knee[1] + (ankle[1] - l.knee[1]) * u])
    // A calf that swells below the knee and slims to the ankle, slim where she sits.
    rs.push(u < 0.3 ? 0.13 + 0.05 * Math.sin((u / 0.3) * (Math.PI / 2)) : u < 0.85 ? 0.18 - 0.095 * ease((u - 0.3) / 0.55) : 0.085)
  }
  tube(p, k, ink, weight, shin, rs, STOCKING)
  gloss(p, k, shin, 0.14, 0.1, 0.8, 0.3)
  // The foot: heel behind the ankle, the sole to the toe.
  const fd: Pt = [Math.cos(l.foot), Math.sin(l.foot)]
  const heel: Pt = [ankle[0] - fd[0] * 0.08, ankle[1] - fd[1] * 0.08]
  tube(p, k, ink, weight, [heel, [ankle[0] + fd[0] * FOOT * 0.55, ankle[1] + fd[1] * FOOT * 0.55], toe], [0.095, 0.092, 0.08], STOCKING)
  tube(p, k, ink, weight * 0.5, [[ankle[0] + fd[0] * FOOT * 0.8, ankle[1] + fd[1] * FOOT * 0.8], toe], [0.07, 0.068], STOCKING_DEEP)
  // The seam, a fine dark line down the back of the leg.
  const sd: Pt = [Math.cos(l.psi), Math.sin(l.psi)]
  const back: Pt = [-sd[1], sd[0]]
  p.stroke(alpha(p, HOTDOG.piano, 0.4))
  p.strokeWeight(Math.max(0.6, weight * 0.45))
  p.line((l.knee[0] + back[0] * 0.09) * k, (l.knee[1] + back[1] * 0.09) * k, (ankle[0] + back[0] * 0.06) * k, (ankle[1] + back[1] * 0.06) * k)
}

/** A finger's centreline from its knuckle: heading `a`, bending by `bend` over its length, the tip past `stiff` of it drooping by `droop`. */
function fingerLine(root: Pt, a: number, bend: number, len: number, droop = 0, stiff = 1): Pt[] {
  const pts: Pt[] = [root]
  const n = 9
  let h = a
  let [x, y] = root
  for (let i = 1; i <= n; i++) {
    const s = i / n
    h += (bend / n) * 1 + (s > stiff ? (-droop / n) * 2 : 0)
    x += (len / n) * Math.cos(h)
    y += (len / n) * Math.sin(h)
    pts.push([x, y])
  }
  return pts
}

/** How curled the fingers are at `t` (0 flat on the keys, 1 cupped round her), and how much they flop. */
function curlOf(t: number): number {
  // The tender hold: curled round her slowly; flung open by the toss, flopped back onto the keys.
  const hold = ease((t - HAND.hold) / 0.62) * (t < HAND.toss1 - 0.06 ? 1 : 0)
  const open1 = t >= HAND.toss1 - 0.06 && t < HAND.slap ? -0.28 * Math.sin(Math.PI * Math.min(1, (t - HAND.toss1 + 0.06) / (HAND.slap - HAND.toss1 + 0.06))) : 0
  // A second try, smaller, after she comes back; flung open again.
  const hold2 = t > HAND.catch2 + 0.12 && t < HAND.toss2 - 0.05 ? 0.42 * ease((t - HAND.catch2 - 0.12) / 0.5) : 0
  const open2 = t >= HAND.toss2 - 0.05 && t < HAND.toss2 + 0.25 ? -0.2 * Math.sin((Math.PI * (t - HAND.toss2 + 0.05)) / 0.3) : 0
  return hold + open1 + hold2 + open2
}

/** The floppy aftershock of each blow, per finger. */
function wobbleOf(t: number, j: number): number {
  let w = 0.035 * Math.sin(t * 5.3 + j * 1.7)
  for (const [at, amp] of [[HAND.land, 0.12], [HAND.slap, 0.3], [HAND.squirt + 0.35, 0.1], [HAND.catch2, 0.14], [HAND.land2, 0.26]] as const) {
    w += amp * ring(t - at - j * 0.025, 3.2 + j * 0.3, 0.32)
  }
  return w
}

interface Hand {
  palm: Pt
  fingers: Pt[][]
  thumb: Pt[]
  elbow: Pt
  shoulder: Pt
}

function handAt(t: number): Hand {
  const off = palmOff(t)
  const c = curlOf(t)
  const fingers: Pt[][] = []
  for (let j = 0; j < 4; j++) {
    // The index nearest (lowest on the screen, the hand seen a little from above), the others fanned behind it.
    const root: Pt = [KNUCKLE[0] + off[0] + 0.02 * j, KNUCKLE[1] + off[1] - FINGERS.lift * j]
    const len = FINGERS.len[j]
    const wob = wobbleOf(t, j)
    if (j === 0 && t >= HAND.land2 - 0.02) {
      // The index has her for the flick: straight to her, its tip drooping past her.
      fingers.push(fingerLine(root, indexHeading(t), 0, len, 0.35 + wob, 0.72))
      continue
    }
    // For the flick the others tuck into a loose fist, leaving the index alone with her.
    const tuck = j > 0 ? 0.75 * ease((t - HAND.lift + 0.05) / 0.35) : 0
    const cc = Math.max(-0.35, Math.max(c * (1 - j * 0.07), tuck))
    const fan = (j - 1) * 0.07
    // Flat on the keys (or, flung open, lifted off them), and floppy.
    const flat = fingerLine(root, Math.PI + fan + wob * 0.6 + (cc < 0 ? 1.1 * cc : 0), wob, len, 0.1, 0.6)
    if (cc <= 0) {
      fingers.push(flat)
      continue
    }
    // Curled round her: each finger lifts from its knuckle over the top of her and lays its tip on the palm beyond.
    // (Tucked, with nothing in the palm, they curl lower and tighter.)
    const fist = tuck > 0 && c < 0.1 ? 1 : 0
    const over: Pt = [4.52 + 0.035 * j + off[0], 0.06 + 0.18 * fist - 0.03 * j + off[1] + wob * 0.12]
    const rest: Pt = [5.0 - 0.18 * fist + 0.03 * j + off[0], 0.43 + 0.08 * fist - 0.045 * j + off[1] + wob * 0.05]
    const u = ease(cc)
    fingers.push(
      flat.map((q, i) => {
        const v = i / (flat.length - 1)
        const hx = (1 - v) * (1 - v) * root[0] + 2 * v * (1 - v) * over[0] + v * v * rest[0]
        const hy = (1 - v) * (1 - v) * root[1] + 2 * v * (1 - v) * over[1] + v * v * rest[1]
        return [q[0] + (hx - q[0]) * u, q[1] + (hy - q[1]) * u] as Pt
      }),
    )
  }
  // The thumb, on the near side of the palm, lying toward us; it closes over her with the fingers.
  const cp = Math.max(0, c)
  const thumb = fingerLine([KNUCKLE[0] + 0.2 + off[0], KEY.top - 0.03 + off[1]], Math.PI - 0.75 + 0.7 * cp, 0.5 + 0.5 * cp, 0.4, 0, 1)
  const elbow: Pt = [6.1 + off[0] * 0.35, -0.9 + off[1] * 0.35]
  return { palm: off, fingers, thumb, elbow, shoulder: [6.45, -9.5] }
}

const SAUSAGE_DEEP = HOTDOG.sausageDeep

/** The arm down from above in its lilac sleeve, the ruffled cuff, the palm on the keys, and the fingers behind the index. */
function drawHandBack(p: p5, c: Ctx, h: Hand): void {
  const { k, ink, weight } = c
  const x0 = PALM.x0 + h.palm[0]
  const x1 = PALM.x1 + h.palm[0]
  const yb = KEY.top + 0.02 + h.palm[1]
  const wrist: Pt = [x1 + 0.02, yb - 0.24]
  // The sleeve, from out of the frame to the wrist; its cuff a ruffle.
  const mid: Pt = [(h.elbow[0] + wrist[0]) / 2 + 0.12, (h.elbow[1] + wrist[1]) / 2]
  tube(p, k, ink, weight, [h.shoulder, [h.elbow[0] + 0.05, h.elbow[1] - 0.7], h.elbow, mid, wrist], [0.25, 0.24, 0.21, 0.18, 0.16], STOCKING)
  const d: Pt = [wrist[0] - mid[0], wrist[1] - mid[1]]
  const l = Math.hypot(d[0], d[1]) || 1
  // The cuff: an ivory band across the sleeve's end, a little wider than it.
  const across: Pt = [-d[1] / l, d[0] / l]
  const cuff: Pt = [wrist[0] - (d[0] / l) * 0.05, wrist[1] - (d[1] / l) * 0.05]
  tube(p, k, ink, weight * 0.8, [[cuff[0] - across[0] * 0.19, cuff[1] - across[1] * 0.19], [cuff[0] + across[0] * 0.19, cuff[1] + across[1] * 0.19]], [0.055, 0.055], HOTDOG.ivory)
  // The fingers behind, farthest first.
  for (let j = 3; j >= 1; j--) sausage(p, c, h.fingers[j], 0.9)
  // The palm, seen a little from above as it lies on the keys: its heel at the wrist, the hollow where she rests.
  solid(p, ink, weight, SKIN)
  p.beginShape()
  p.vertex((x0 + 0.02) * k, yb * k)
  p.bezierVertex((x0 - 0.08) * k, (yb - 0.12) * k, (x0 - 0.06) * k, (yb - 0.34) * k, (x0 + 0.08) * k, (yb - 0.37) * k)
  p.bezierVertex((x0 + 0.3) * k, (yb - 0.42) * k, (x1 - 0.1) * k, (yb - 0.36) * k, (x1 + 0.04) * k, (yb - 0.28) * k)
  p.bezierVertex((x1 + 0.1) * k, (yb - 0.18) * k, (x1 + 0.06) * k, (yb - 0.02) * k, (x1 - 0.12) * k, yb * k)
  p.endShape(p.CLOSE)
  // Its lines: a soft crease across the hollow.
  p.noFill()
  p.stroke(alpha(p, HOTDOG.sausageDeep, 0.45))
  p.strokeWeight(weight * 0.55)
  p.bezier((x0 + 0.1) * k, (yb - 0.12) * k, (x0 + 0.25) * k, (yb - 0.2) * k, (x1 - 0.2) * k, (yb - 0.22) * k, (x1 - 0.08) * k, (yb - 0.3) * k)
}

/** The index, nearest, and the thumb: in front of the palm (and, while she is held, in front of her). */
function drawHandFront(p: p5, c: Ctx, h: Hand): void {
  sausage(p, c, h.fingers[0], 1)
  sausage(p, c, h.thumb, 1)
}

/** One hot dog finger along `pts`. */
function sausage(p: p5, c: Ctx, pts: Pt[], shade: number): void {
  const { k, ink, weight } = c
  const fill = shade < 1 ? mixHex(HOTDOG.sausage, SAUSAGE_DEEP, 0.35) : HOTDOG.sausage
  tube(p, k, ink, weight, pts, pts.map(() => FINGERS.r), fill)
  gloss(p, k, pts, FINGERS.r, 0.15, 0.85, shade < 1 ? 0.3 : 0.55)
}

/* ------------------------------------------------------------------ the mustard */

/** The bottle's squash (0..1) and its tip to the right (radians) at `t`, after she lands on its shoulder. */
function bottleAt(t: number): { squash: number; tilt: number } {
  const u = t - HAND.squirt
  if (u <= 0) return { squash: 0, tilt: 0 }
  const squash = u < 0.05 ? Math.sin((u / 0.05) * (Math.PI / 2)) : Math.exp(-(u - 0.05) / 0.22)
  const tilt = 0.36 * (1 - Math.exp(-u / 0.05)) * Math.exp(-u / 0.7) * Math.cos(2 * Math.PI * 0.9 * u)
  return { squash, tilt }
}

/** The nozzle's tip, and the way it points, at `t`. */
function nozzleAt(t: number): { tip: Pt; dir: number } {
  const b = bottleAt(t)
  const h = BOTTLE.h * (1 - 0.3 * b.squash) + BOTTLE.nozzle
  // Tipped about the base's right corner.
  const piv: Pt = [BOTTLE.x + BOTTLE.w / 2, LID]
  const rel: Pt = [-BOTTLE.w / 2, -h]
  const c = Math.cos(b.tilt)
  const s = Math.sin(b.tilt)
  return { tip: [piv[0] + rel[0] * c - rel[1] * s, piv[1] + rel[0] * s + rel[1] * c], dir: -Math.PI / 2 + b.tilt }
}

/** The squirt: drops leave the nozzle for a moment after she lands, arc, and land along the index finger. */
interface Drop {
  t0: number
  from: Pt
  v: Pt
  /** When and where along the index it lands. */
  tl: number
  s: number
}
const DROPS: Drop[] = (() => {
  const out: Drop[] = []
  for (let t0 = HAND.squirt + 0.015; t0 < HAND.squirt + 0.55; t0 += 0.008) {
    const n = nozzleAt(t0)
    // A hard squirt that eases as the bottle springs back.
    const speed = 2.95 * (1 - 0.4 * ((t0 - HAND.squirt) / 0.55))
    const a = n.dir + 0.55
    const v: Pt = [Math.cos(a) * speed, Math.sin(a) * speed]
    // Down onto the fingers' tops, flat on the keys by then.
    const topY = KNUCKLE[1] - FINGERS.r
    let tl = 0
    for (let u = 0; u < 1.5; u += 0.004) {
      const y = n.tip[1] + v[1] * u + 0.5 * G * u * u
      if (u > 0.05 && y >= topY) {
        tl = t0 + u
        break
      }
    }
    if (!tl) continue
    const x = n.tip[0] + v[0] * (tl - t0)
    out.push({ t0, from: n.tip, v, tl, s: KNUCKLE[0] - x })
  }
  return out
})()

function drawBottle(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const b = bottleAt(t)
  const h = BOTTLE.h * (1 - 0.3 * b.squash)
  const w = BOTTLE.w * (1 + 0.28 * b.squash)
  p.push()
  p.translate((BOTTLE.x + BOTTLE.w / 2) * k, LID * k)
  p.rotate(b.tilt)
  p.translate(-BOTTLE.w / 2 * k, 0)
  // The body, round-shouldered; a paler band round it; the cone of the nozzle and its red tip.
  solid(p, ink, weight, HOTDOG.mustard)
  p.rect(0, (-h / 2) * k, w * k, h * k, (w * 0.42) * k, (w * 0.42) * k, 0.03 * k, 0.03 * k)
  p.noStroke()
  p.fill(alpha(p, HOTDOG.bun, 0.9))
  p.rect(0, -h * 0.42 * k, (w - 0.04) * k, h * 0.26 * k)
  solid(p, ink, weight * 0.8, mixHex(HOTDOG.mustard, HOTDOG.sausageDeep, 0.25))
  p.triangle((-0.07) * k, -h * k + 0.01 * k, 0.07 * k, -h * k + 0.01 * k, 0, (-h - BOTTLE.nozzle) * k)
  p.pop()
}

function drawSquirt(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  // In the air: the stream from the nozzle, every drop still flying.
  const flying = DROPS.filter((d) => d.t0 <= t && d.tl > t)
  if (flying.length > 1) {
    const pts: Pt[] = flying.map((d) => {
      const u = t - d.t0
      return [d.from[0] + d.v[0] * u, d.from[1] + d.v[1] * u + 0.5 * G * u * u]
    })
    // One rope from the nozzle, thickest where it leaves.
    const n = pts.length
    tube(p, k, ink, weight * 0.7, pts, pts.map((_, i) => 0.026 + 0.018 * (i / n)), HOTDOG.mustard)
  }
}

/** The mustard that has landed, a squiggle along the index finger's top, riding it wherever it goes. */
function drawDressing(p: p5, c: Ctx, h: Hand, t: number): void {
  const { k, ink, weight } = c
  const landed = DROPS.filter((d) => d.tl <= t)
  if (landed.length < 2) return
  const line = h.fingers[0]
  const len = FINGERS.len[0]
  const at = (s: number): Pt => {
    const f = Math.max(0, Math.min(1, s / len)) * (line.length - 1)
    const i = Math.min(line.length - 2, Math.floor(f))
    const u = f - i
    const a = line[i]
    const b = line[i + 1]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy) || 1
    let nx = dy / l
    let ny = -dx / l
    if (ny > 0) {
      nx = -nx
      ny = -ny
    }
    return [a[0] + dx * u + nx * FINGERS.r * 0.75, a[1] + dy * u + ny * FINGERS.r * 0.75]
  }
  const s0 = Math.min(...landed.map((d) => d.s))
  const s1 = Math.max(...landed.map((d) => d.s))
  const pts: Pt[] = []
  for (let i = 0; i <= 26; i++) {
    const s = s0 + ((s1 - s0) * i) / 26
    const q = at(Math.max(0.04, Math.min(len - 0.04, s)))
    pts.push([q[0] + 0.022 * Math.sin(i * 1.9), q[1] + 0.026 * Math.cos(i * 1.9)])
  }
  tube(p, k, ink, weight * 0.55, pts, pts.map(() => 0.026), HOTDOG.mustard)
}

/* ------------------------------------------------------------------ the part */

export const fingers = part<HotdogState>(
  {
    name: 'hotdog',
    draw: (p, s, c) => {
      const t = c.t + s.begin
      p.push()
      room(p, c)
      piano(p, c, s.plan, t)
      drawBottle(p, c, t)
      // The pianist's legs: the stomping one behind, the kicking one in front.
      drawLeg(p, c, stomper(t), -0.35)
      drawLeg(p, c, kicker(t), -0.2)
      const h = handAt(t)
      const cupped = t > HAND.hold + 0.25 && t < HAND.toss1 - 0.04
      drawHandBack(p, c, h)
      if (!cupped) drawHandFront(p, c, h)
      drawDressing(p, c, h, t)
      drawSquirt(p, c, t)
      p.pop()
    },
    over: (p, s, c) => {
      const t = c.t + s.begin
      // While she is held, the nearest fingers curl in front of her.
      if (t > HAND.hold + 0.25 && t < HAND.toss1 - 0.04) {
        const h = handAt(t)
        p.push()
        drawHandFront(p, c, h)
        p.pop()
      }
    },
  },
  (slot) => {
    const plan = PLAN
    const segs: Seg[] = []
    for (const pc of plan.pieces) {
      if (pc.fly) {
        const T = pc.t1 - pc.t0
        segs.push(...route([{ at: pc.t0, p: pc.fly.a }, { at: pc.t1, p: pc.fly.b, arc: (G * T * T) / 8 }]))
      } else if (pc.at) {
        segs.push(...carried(pc.at, pc.t0, pc.t1, Math.max(4, Math.ceil((pc.t1 - pc.t0) * 240))))
      }
    }
    const end = segs[segs.length - 1].to
    return {
      cells: box(-9, -6, 16, 6, 2),
      exit: [end[0] + 0.5, end[1]],
      lane: { segs, fire: 97.489 - slot.begin },
      state: { begin: slot.begin, plan },
    }
  },
  (slot) =>
    [
      // In close on the keys as she bounces up them, the keyboard low in the frame.
      { t: 97.75, cells: 3.9, off: [0.35, -0.3] },
      { t: 99.0, cells: 3.4, off: [0.45, -0.28] },
      { t: 100.6, cells: 3.4, off: [0.45, -0.28] },
      // The hand: held close while it holds her.
      { t: 101.6, cells: 3.5, hold: [4.4, 0.35], w: 0.85 },
      { t: 102.75, cells: 3.6, hold: [4.35, 0.25], w: 0.88 },
      // Out for the toss, the bottle and the squirt.
      { t: 103.45, cells: 4.3, hold: [4.0, -0.25], w: 0.9 },
      { t: 104.6, cells: 4.1, hold: [4.3, -0.1], w: 0.85 },
      { t: 105.9, cells: 3.8, hold: [4.3, 0.2], w: 0.85 },
      { t: slot.end, cells: 4.5, hold: [4.3, -0.2], w: 0.55 },
    ] as PartShot[],
)

/** Every strike this part makes, in show seconds. */
export const HOTDOG_HITS: number[] = [
  97.489, 97.71, 97.93, 98.348, 98.894, 99.219, 99.776, 100.171, 100.635, 101.065, 101.518, 102.922, 103.12, 103.561, 104.432,
  105.314, 105.848, FLICK,
]

