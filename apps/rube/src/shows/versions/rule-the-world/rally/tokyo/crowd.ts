import type { Pt } from '../../../../../parts'
import { parallax, type Frame } from '../depth'
import { hash, smooth } from '../kit'
import { WIN } from '../music'
import { ctxOf, type Pen } from '../pen'
import { box, crown, disc, Fills, Glows, oval, poly, toned } from './batch'
import { CAPS, GI, LIGHTS_UP, SECTIONS, SERVE, TURN, WAY } from './geo'
import { ANCHOR, closeness, heat, HIGH, house, lit, risen, sectionOf, spill, surge, swell } from './mood'
import { C, CLOTHES } from './palette'

/**
 * The house: two tiers of the stands rising into the dark, and everyone in them. The lower tier runs back from the
 * red wall at the court's edge, each row a little farther off than the one in front (the front row moves with the
 * table as the camera goes, the ninth at 0.85 of its speed), up to the balcony's front; over the balcony the upper
 * tier, far back across the arena at 0.6. Every head in the house follows the ball, a moment behind it. Through the
 * dark exhibition the house is alive without its lights: paper fans going, programmes, the ends of cigarettes glowing
 * and brightening on a draw. With the lights the flags come out, small Japanese and American ones, and wave harder as
 * the match goes; the GIs are up from the serve, the front rows rise through the last bar, and on the winner everyone
 * is up, arms and flags and programmes in the air, and the GIs' caps go up.
 *
 * A thousand and more people, drawn straight onto the canvas and gathered by colour (`batch.ts`): every body of a
 * colour and a light is one fill, every head another, so the house is a hundred-odd fills, not three thousand.
 */

const ROW = 0.56
const SEAT = 0.4
/** The lower tier's rows, and the balcony's front over the last of them (cells, in the lower tier's own frame). */
export const LOWER = 9
export const FASCIA = 0.3 - LOWER * ROW
/** How far back each row of the lower tier is: 1 at the front, the table's own plane. */
export const rowDepth = (r: number): number => 1 - (0.15 * r) / (LOWER - 1)
/** The upper tier: its depth, rows, seats, and where its lowest row stands (behind the balcony's front). */
export const FAR = 0.6
const FAR_ROW = 0.42
const FAR_SEAT = 0.3
const FAR_ROWS = 9
const FAR_BASE = FASCIA - 0.2
const FAR_SCALE = 0.72

/** A seated body, its shoulders up from `0`; a GI's garrison cap over his head. */
const BODY = [-0.16, 0, -0.15, -0.2, -0.08, -0.26, 0.08, -0.26, 0.15, -0.2, 0.16, 0]
const CAP = [-0.1, -0.05, 0.1, -0.06, 0.07, -0.13, -0.09, -0.11]
const FAR_BODY = BODY.map((v) => v * FAR_SCALE)

/** Which GIs throw their caps, and when. */
function capThrow(j: number, r: number): number | null {
  if (r > 4) return null
  const h = hash(j, r, 17)
  if (h > 0.5) return null
  return CAPS[Math.floor(h * 8) % CAPS.length]
}
const capUp = (j: number, r: number, t: number): boolean => {
  const c = capThrow(j, r)
  return c !== null && t >= c
}

/** A small flag on its stick, flying from `sx, sy` (the stick's top) toward `side`: Japanese, or American. */
function flag(pen: Pen, flags: Fills, sx: number, sy: number, side: number, us: boolean, phase: number, amp: number, fl: number, hz: number, s = 1): void {
  const { k } = pen
  const w = 0.27 * s
  const h = 0.17 * s
  const at = (u: number, v: number): [number, number] => [sx + side * u * w, sy + v * h + amp * s * u * Math.sin(phase - u * 3.2)]
  const strip = (p: Path2D, u0: number, u1: number, v0: number, v1: number) => {
    const n = 3
    for (let i = 0; i <= n; i++) {
      const [x, y] = at(u0 + ((u1 - u0) * i) / n, v0)
      if (i) p.lineTo(x * k, y * k)
      else p.moveTo(x * k, y * k)
    }
    for (let i = n; i >= 0; i--) {
      const [x, y] = at(u0 + ((u1 - u0) * i) / n, v1)
      p.lineTo(x * k, y * k)
    }
    p.closePath()
  }
  strip(flags.at(toned(pen, C.white, fl, hz)), 0, 1, 0, 1)
  const red = flags.at(toned(pen, C.redHi, fl, hz))
  if (us) {
    for (const v of [0.14, 0.43, 0.72]) strip(red, 0, 1, v, v + 0.14)
    strip(flags.at(toned(pen, C.navy, fl, hz)), 0, 0.42, 0, 0.56)
  } else {
    const [cx, cy] = at(0.5, 0.5)
    oval(red, k, cx, cy, 0.3 * h, 0.3 * h)
  }
}

/** The lower tier: every row back to front, its risers, the aisles, and its people with what they hold. */
export function drawStands(pen: Pen, t: number, f: Frame): void {
  const ctx = ctxOf(pen.p)
  const { k } = pen
  const up = risen(t)
  const sg = surge(t)
  const sw = swell(t)
  const hot = heat(t)
  const lights = house(t)
  // Close in, the stands are seen through more of the lit haze: the lens's focus is on the table.
  const hz = closeness(f) * (0.4 + 2.6 * lights)
  const [bx, by] = WAY.at(t - 0.09)
  const giUp = smooth(t, SERVE - 0.3, SERVE + 0.2) * (1 - smooth(t, TURN, TURN + 3))
  const flagsOut = smooth(t, LIGHTS_UP[0], SERVE)
  const risers = new Fills()
  const lips = new Fills()
  const aisles = new Fills()
  const bodies = new Fills()
  const heads = new Fills()
  const tops = new Fills()
  const arms = new Fills()
  const props = new Fills()
  const sticks = new Fills()
  const flags = new Fills()
  const embers = new Glows(pen)
  const dark = toned(pen, C.dark, 1)
  for (let r = LOWER - 1; r >= 0; r--) {
    const [dx, dy] = parallax(f, rowDepth(r), ANCHOR)
    const y = 0.3 - r * ROW
    const Y = y + dy
    if (Y < f.y0 || Y - 1.4 > f.y1) continue
    const fade = Math.exp(-r / 10)
    for (let i = 0; i < SECTIONS.length - 1; i++) {
      const a = Math.max(SECTIONS[i] + dx, f.x0 - 1)
      const b = Math.min(SECTIONS[i + 1] + dx, f.x1 + 1)
      if (b <= a) continue
      const L = Math.min(1, lit(i, t)) * fade * 0.7 + spill((a + b) / 2 - dx, y) * fade
      box(risers.at(toned(pen, C.riser, 0.12 + 0.8 * L, hz)), k, a, Y - ROW, b, Y + (r === 0 ? 0.3 : 0))
      box(lips.at(toned(pen, C.riserHi, 0.2 + 0.8 * L, hz)), k, a, Y - 0.06, b, Y)
    }
    for (const a of SECTIONS) if (a + dx > f.x0 - 1 && a + dx < f.x1 + 1) box(aisles.at(dark), k, a + dx - 0.12, Y - ROW, a + dx + 0.12, Y)
    const x0 = f.x0 - 1 - dx
    const x1 = f.x1 + 1 - dx
    for (let j = Math.floor(x0 / SEAT); j * SEAT < x1; j++) {
      const hx = j * SEAT + (hash(j, r, 3) - 0.5) * 0.12
      const sec = sectionOf(hx)
      if (Math.abs(hx - SECTIONS[sec]) < 0.22 || Math.abs(hx - SECTIONS[sec + 1]) < 0.22) continue
      if (hash(j, r, 5) < 0.06) continue
      const gi = hx > GI[0] && hx < GI[1] && r < GI[2] && hash(j, r, 9) < 0.86
      const L = Math.min(1.15, lit(sec, t)) * fade * 0.68 + spill(hx, y) * fade
      const fl = 0.05 + 0.85 * Math.min(1, L)
      const ph = hash(j, r, 7)
      // Up: the GIs from the first serve, everyone at the smash, the front rows through the last bar; the surges.
      const stand = gi ? Math.max(giUp, up) : Math.max(up, ph > 0.4 ? sw : 0)
      const bob = (0.05 * sg * (0.5 + ph) + 0.03 * Math.sin(t * 7 + ph * 6)) * (stand > 0.3 || gi ? 1 : 0.5)
      const X = hx + dx
      const yy = Y - 0.12 - stand * 0.22 - bob
      const body = gi ? C.olive : CLOTHES[Math.floor(hash(j, r, 11) * CLOTHES.length)]
      const bodyCol = toned(pen, body, fl, hz)
      poly(bodies.at(bodyCol), k, X, yy, BODY)
      // The face turned toward the ball, and up at a lob; and a little shifting in their seats.
      const look = Math.max(-1, Math.min(1, (bx - hx) / 2.2))
      const lift = Math.max(0, Math.min(1, -(by + 0.6) / 1.6))
      const hxh = X + 0.035 * look + 0.02 * Math.sin(t * 0.6 + ph * 40)
      const hyh = yy - 0.36 - 0.025 * lift
      disc(heads.at(toned(pen, hash(j, r, 13) > 0.2 ? C.skin : C.skinDark, fl, hz)), k, hxh, hyh, 0.1)
      if (gi && !capUp(j, r, t)) poly(tops.at(toned(pen, C.oliveDark, fl, hz)), k, hxh, hyh, CAP)
      else crown(tops.at(toned(pen, C.hair, fl, hz)), k, hxh - 0.04 * look, hyh + 0.005 + 0.03 * lift, 0.1)
      // Arms up, cheering, when they are up, and the front rows' on his power shots.
      const cheer = (up > 0.3 && ph > 0.4) || (gi && stand > 0.3 && (up > 0.3 || sg * (0.4 + ph) > 0.35)) || (r < 5 && sg > 0.5 && ph > 0.62 && hot > 0.3)
      const side = ph > 0.7 ? 1 : -1
      const role = hash(j, r, 31)
      const holds = role < 0.17 ? role : 1
      if (cheer && !(holds >= 0.13 && holds < 0.17)) {
        const wave = Math.sin(t * 9 + ph * 12) * 0.06
        const p = arms.at(bodyCol)
        p.moveTo((X + side * 0.12) * k, (yy - 0.18) * k)
        p.lineTo((X + side * 0.2 + wave) * k, (yy - 0.62 - 0.08 * sg) * k)
        if (ph > 0.75 || gi) {
          p.moveTo((X - side * 0.12) * k, (yy - 0.18) * k)
          p.lineTo((X - side * 0.16 - wave) * k, (yy - 0.58) * k)
        }
      }
      if (holds >= 1) continue
      const paper = toned(pen, hash(j, r, 33) < 0.35 ? C.redHi : C.paper, Math.min(1, fl + 0.06), hz)
      if (holds < 0.035) {
        // A cigarette: a draw on it every few seconds, the hand to the mouth and the end bright.
        const per = 5 + 4 * hash(j, r, 35)
        const u = ((t / per + ph) % 1 + 1) % 1
        const draw = u < 0.22 ? Math.sin((u / 0.22) * Math.PI) : 0
        const hand: Pt = draw > 0.05 ? [hxh + side * 0.07, hyh + 0.07] : [X + side * 0.17, yy - 0.12]
        if (draw > 0.05) {
          const p = arms.at(bodyCol)
          p.moveTo((X + side * 0.12) * k, (yy - 0.16) * k)
          p.lineTo(hand[0] * k, (hand[1] + 0.03) * k)
        }
        // The end: a red point, and its glow while it is bright enough to see (in the dark, or on a draw).
        const glow = (0.3 + 0.7 * draw) * (1 - 0.65 * lights)
        oval(props.at(toned(pen, C.ember, 0.55 + 0.45 * glow)), k, hand[0] + side * 0.03, hand[1], 0.014, 0.014)
        if (glow > 0.12) embers.add(hand[0] + side * 0.03, hand[1], 0.09, C.ember, glow)
      } else if (holds < 0.1) {
        // A paper fan going in front of the face, quicker as the night gets hotter.
        const sweep = Math.sin(t * (2.6 + 6 * hot) + ph * 30)
        const fx = hxh + side * (0.17 + 0.05 * sweep)
        const fy = hyh + 0.03
        const rot = 0.5 * sweep
        oval(props.at(paper), k, fx, fy, 0.085, 0.1, rot)
        const hp = sticks.at(toned(pen, C.handle, fl, hz))
        hp.moveTo((fx - Math.sin(rot) * 0.09) * k, (fy + Math.cos(rot) * 0.09) * k)
        hp.lineTo((fx - Math.sin(rot) * 0.24) * k, (fy + Math.cos(rot) * 0.24) * k)
      } else if (holds < 0.13) {
        // A programme: read on the lap, and up over the head and waved when they are up.
        const high = Math.max(stand, cheer ? 1 : 0)
        const px = X + side * (0.05 + 0.15 * high) + 0.06 * high * Math.sin(t * 8 + ph * 9)
        const py = yy - 0.16 - 0.55 * high
        poly(props.at(paper), k, px, py, [-0.07, -0.09, 0.07, -0.08, 0.07, 0.08, -0.07, 0.09])
      } else if (flagsOut > 0.02 || cheer) {
        // A small flag on a stick, out with the house lights and waved harder as the match goes.
        const raise = Math.max(0.35 * flagsOut, stand, cheer ? 1 : 0, Math.min(1, sg * 1.5), hot)
        const hand: Pt = [X + side * 0.17, yy - 0.2 - 0.38 * raise]
        const p = arms.at(bodyCol)
        p.moveTo((X + side * 0.12) * k, (yy - 0.18) * k)
        p.lineTo(hand[0] * k, hand[1] * k)
        const top: Pt = [hand[0] + side * (0.12 - 0.1 * raise), hand[1] - 0.48]
        const sp = sticks.at(toned(pen, C.handle, fl, hz))
        sp.moveTo(hand[0] * k, (hand[1] + 0.06) * k)
        sp.lineTo(top[0] * k, top[1] * k)
        const amp = 0.04 + 0.07 * hot + 0.06 * sg
        flag(pen, flags, top[0], top[1], side, gi || hash(j, r, 37) < 0.3, t * (3 + 6 * hot) + ph * 20, amp, Math.min(1, fl + 0.1), hz)
      }
    }
  }
  ctx.save()
  risers.fill(ctx)
  lips.fill(ctx)
  aisles.fill(ctx)
  bodies.fill(ctx)
  heads.fill(ctx)
  tops.fill(ctx)
  ctx.lineCap = 'round'
  arms.stroke(ctx, pen.w * 1.6)
  props.fill(ctx)
  sticks.stroke(ctx, pen.w * 0.5)
  flags.fill(ctx)
  ctx.restore()
  embers.draw(ctx)
}

/**
 * The upper tier, across the arena over the balcony: smaller, farther, hazier, slower past the frame. Its people
 * follow the ball too, bob on the beat and are up on the winner with their arms and their flags; a few flags are
 * out all match.
 */
export function drawFarStands(pen: Pen, t: number, f: Frame): void {
  const [dx, dy] = parallax(f, FAR, HIGH)
  const top = FAR_BASE - FAR_ROWS * FAR_ROW
  if (FAR_BASE + dy < f.y0 || top + dy > f.y1) return
  const ctx = ctxOf(pen.p)
  const { k } = pen
  const up = risen(t)
  const sg = surge(t)
  const hot = heat(t)
  const [bx] = WAY.at(t - 0.12)
  const flagsOut = smooth(t, LIGHTS_UP[0], SERVE)
  const risers = new Fills()
  const aisles = new Fills()
  const bodies = new Fills()
  const heads = new Fills()
  const tops = new Fills()
  const arms = new Fills()
  const sticks = new Fills()
  const flags = new Fills()
  const hz = 2
  const dark = toned(pen, C.dark, 1)
  for (let r = FAR_ROWS - 1; r >= 0; r--) {
    const y = FAR_BASE - r * FAR_ROW
    const Y = y + dy
    if (Y < f.y0 || Y - 1 > f.y1) continue
    const fade = Math.exp(-r / 14)
    for (let i = 0; i < SECTIONS.length - 1; i++) {
      const a = Math.max(SECTIONS[i] + dx, f.x0 - 1)
      const b = Math.min(SECTIONS[i + 1] + dx, f.x1 + 1)
      if (b <= a) continue
      const L = Math.min(1, lit(i, t)) * fade * 0.5
      box(risers.at(toned(pen, C.farRiser, 0.15 + 0.8 * L, hz)), k, a, Y - FAR_ROW, b, Y)
      box(aisles.at(dark), k, SECTIONS[i] + dx - 0.09, Y - FAR_ROW, SECTIONS[i] + dx + 0.09, Y)
    }
    for (let j = Math.floor((f.x0 - 1 - dx) / FAR_SEAT); j * FAR_SEAT < f.x1 + 1 - dx; j++) {
      const hx = j * FAR_SEAT + (hash(j, r, 43) - 0.5) * 0.08
      const sec = sectionOf(hx)
      if (Math.abs(hx - SECTIONS[sec]) < 0.16 || Math.abs(hx - SECTIONS[sec + 1]) < 0.16) continue
      if (hash(j, r, 45) < 0.08) continue
      const L = Math.min(1.1, lit(sec, t)) * fade * 0.55
      const fl = 0.08 + 0.8 * Math.min(1, L)
      const ph = hash(j, r, 47)
      const stand = Math.max(up, sg * (ph > 0.6 ? 0.5 : 0))
      const X = hx + dx
      const yy = Y - 0.08 - stand * 0.15 - 0.02 * Math.sin(t * 7 + ph * 6) * (0.4 + hot)
      const body = CLOTHES[Math.floor(hash(j, r, 49) * CLOTHES.length)]
      const col = toned(pen, body, fl, hz)
      poly(bodies.at(col), k, X, yy, FAR_BODY)
      const look = Math.max(-1, Math.min(1, (bx - hx) / 3))
      const hxh = X + 0.025 * look
      const hyh = yy - 0.26
      disc(heads.at(toned(pen, C.skin, fl, hz)), k, hxh, hyh, 0.072)
      crown(tops.at(toned(pen, C.hair, fl, hz)), k, hxh - 0.03 * look, hyh - 0.005, 0.072)
      const side = ph > 0.5 ? 1 : -1
      const flagger = hash(j, r, 51) < 0.05
      if (flagger) {
        const raise = Math.max(0.3 * flagsOut, stand, hot)
        const hand: Pt = [X + side * 0.12, yy - 0.15 - 0.3 * raise]
        const p = arms.at(col)
        p.moveTo((X + side * 0.09) * k, (yy - 0.13) * k)
        p.lineTo(hand[0] * k, hand[1] * k)
        const stick: Pt = [hand[0] + side * 0.04, hand[1] - 0.36]
        const sp = sticks.at(toned(pen, C.handle, fl, hz))
        sp.moveTo(hand[0] * k, hand[1] * k)
        sp.lineTo(stick[0] * k, stick[1] * k)
        flag(pen, flags, stick[0], stick[1], side, hash(j, r, 53) < 0.35, t * (3 + 6 * hot) + ph * 20, 0.04 + 0.07 * hot, Math.min(1, fl + 0.1), hz, 0.72)
      } else if (up > 0.3 && ph > 0.45) {
        const wave = Math.sin(t * 9 + ph * 12) * 0.05
        const p = arms.at(col)
        p.moveTo((X + side * 0.09) * k, (yy - 0.13) * k)
        p.lineTo((X + side * 0.15 + wave) * k, (yy - 0.46) * k)
      }
    }
  }
  ctx.save()
  risers.fill(ctx)
  aisles.fill(ctx)
  bodies.fill(ctx)
  heads.fill(ctx)
  tops.fill(ctx)
  ctx.lineCap = 'round'
  arms.stroke(ctx, pen.w * 1.15)
  sticks.stroke(ctx, pen.w * 0.4)
  flags.fill(ctx)
  ctx.restore()
}

/** The caps in the air: up off the GIs' heads, turning, and down somewhere among them, each with its row. */
export function drawCaps(pen: Pen, t: number, f: Frame): void {
  if (t < WIN || t > WIN + 6) return
  const { k } = pen
  const caps = new Fills()
  for (let r = 0; r <= 4; r++) {
    const [dx, dy] = parallax(f, rowDepth(r), ANCHOR)
    for (let j = Math.floor(GI[0] / SEAT); j * SEAT < GI[1]; j++) {
      const c = capThrow(j, r)
      if (c === null || t < c) continue
      const u = t - c
      const hx = j * SEAT + (hash(j, r, 3) - 0.5) * 0.12
      const y0 = 0.3 - r * ROW - 0.12 - 0.22 - 0.42
      const vy = -5.2 - 1.6 * hash(j, r, 19)
      const vx = (hash(j, r, 21) - 0.5) * 1.6
      const yy = y0 + vy * u + 6 * u * u
      if (u > 0.4 && yy > y0 + 0.2) continue
      const x = hx + vx * u + dx
      const y = yy + dy
      const a = u * (6 + 6 * hash(j, r, 23))
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      const pts = [-0.13, 0.03, 0.13, 0.02, 0.09, -0.07, -0.11, -0.05]
      const out: number[] = []
      for (let i = 0; i < pts.length; i += 2) out.push(pts[i] * ca - pts[i + 1] * sa, pts[i] * sa + pts[i + 1] * ca)
      poly(caps.at(C.oliveDark), k, x, y, out)
    }
  }
  const ctx = ctxOf(pen.p)
  ctx.save()
  caps.fill(ctx)
  ctx.restore()
}
