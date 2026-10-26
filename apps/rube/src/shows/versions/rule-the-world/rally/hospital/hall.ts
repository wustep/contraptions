import type { Pt } from '../../../../../parts'
import { hash, smooth } from '../kit'
import { sway, type Frame } from '../depth'
import { ctxOf, ellipse, line, mix, rect, rgba, ring, shape, type Pen } from '../pen'
import { SON, at } from '../music'
import { CEIL, CORRIDOR_WIN, CURTAIN, DOOR_HEAD, FAR_DOOR, FLOOR, GLASS, NUDGE, SUN_CLEAR, T0, WARD_WIN } from './geo'
import { MOP_IN, VISIT_DOOR, wetAt } from './people'
import { clock } from './props'

/**
 * The corridor's furniture and small life, for the wider frames the credits and the crane come to: two milk-glass
 * globes on rods from the ceiling, lit through the night and switched off a beat apart as the credits come (the hall's
 * light going down), swaying a little in the draught; a cork notice board by the nursery's door, its sheets lifting
 * when the door swings; a clock over that door; a wheelchair against the wall; the far door itself, which the orderly
 * backs through and which swings to and fro behind him and settles; and the wet he leaves on the tiles, drying.
 *
 * And the morning's visitors at the sills, outside: two pigeons on the ward window's ledge behind Rachel's pillow, one
 * going up off it as she nudges him to go; and one landing on the corridor window's ledge once the sun is up. In the
 * ward, on the partition's curtain, the shadows of the next bed: a mother sitting up with her baby, rocking, and the
 * night nurse bending to her.
 */

/* ------------------------------------------------------------------ the far door */

/** How far open the far door is, radians: open as he backs through, then swinging to and fro behind him, settling. */
export function farDoorOpen(t: number): number {
  // The orderly through it; then the father and his mother.
  const at = t >= VISIT_DOOR - 0.35 ? VISIT_DOOR : MOP_IN
  const open = smooth(t, at - 0.35, at + 0.15)
  const letGo = at + (at === VISIT_DOOR ? 1.6 : 1.0)
  if (t < letGo) {
    // Taking over from the last swing where it is.
    const was = at === VISIT_DOOR ? swingOf(VISIT_DOOR - 0.35 - (MOP_IN + 1.0)) : 0
    return was + (1.15 - was) * open
  }
  return swingOf(t - letGo)
}
const swingOf = (u: number): number => 1.15 * Math.exp(-u / 1.1) * Math.cos(u * Math.PI * 1.25)

/** The far door (the nursery's own, by the glass): its frame, the corridor beyond when it opens, and its leaf. */
export function farDoor(pen: Pen, t: number, C: Record<string, string>): void {
  const [a, b] = FAR_DOOR
  rect(pen, a - 0.1, DOOR_HEAD - 0.1, b + 0.1, FLOOR, C.frame)
  const th = farDoorOpen(t)
  // Beyond it: the nursery's anteroom, dim, its own window's morning on the far wall.
  rect(pen, a, DOOR_HEAD, b, FLOOR - 0.02, '#8E9A90')
  rect(pen, a, DOOR_HEAD + 1.1, b, FLOOR - 0.02, '#7A887E')
  rect(pen, a + 0.25, DOOR_HEAD + 0.25, a + 0.7, DOOR_HEAD + 0.9, mix('#C8C9B8', '#F2D29E', smooth(t, SUN_CLEAR, SUN_CLEAR + 4)))
  // The leaf, turned on its hinge at the left: seen narrower as it swings, darker side on.
  const w = (b - a) * Math.cos(Math.min(1.45, Math.abs(th)))
  const x1 = a + w
  const face = mix(C.door, '#5E7A6C', 0.5 * Math.min(1, Math.abs(th)))
  rect(pen, a, DOOR_HEAD, x1, FLOOR - 0.02, face)
  if (w > 0.4) {
    const sx = w / (b - a)
    rect(pen, a + 0.12 * sx, DOOR_HEAD + 1.45, x1 - 0.12 * sx, FLOOR - 0.15, C.doorDark)
    const pc: Pt = [a + (b - a) * 0.5 * sx, DOOR_HEAD + 0.7]
    ellipse(pen, pc, 0.25 * sx, 0.25, C.frame)
    ellipse(pen, pc, 0.19 * sx, 0.19, mix(C.glass, '#8FA6AE', 0.45))
    // Through its porthole now and then: someone going along the anteroom, a cap passing.
    if (Math.abs(th) < 0.05) {
      for (const p0 of [at(110, 2), at(113, 3)]) {
        const u = (t - p0) / 1.6
        if (u <= 0 || u >= 1) continue
        const x = pc[0] - 0.3 + 0.6 * u
        const ctx = ctxOf(pen.p)
        ctx.save()
        ctx.beginPath()
        ctx.ellipse(pc[0] * pen.k, pc[1] * pen.k, 0.19 * sx * pen.k, 0.19 * pen.k, 0, 0, Math.PI * 2)
        ctx.clip()
        ellipse(pen, [x, pc[1] + 0.06], 0.1, 0.11, '#C9A68A')
        rect(pen, x - 0.1, pc[1] - 0.1, x + 0.08, pc[1] - 0.02, '#F4F3EC')
        rect(pen, x - 0.18, pc[1] + 0.15, x + 0.18, pc[1] + 0.4, '#F4F3EC')
        ctx.restore()
      }
    }
    ellipse(pen, [a + 0.13 * sx, DOOR_HEAD + 1.35], 0.045 * sx, 0.045, C.brass)
  }
  // The wet on the tiles before it, where he has mopped: darker, drying from its edges.
  for (const s of wetAt(t)) {
    const x0 = Math.min(s.x0, s.x1)
    const x1w = Math.max(s.x0, s.x1)
    const ctx = ctxOf(pen.p)
    ctx.save()
    ctx.fillStyle = rgba(pen, '#4A5A52', 0.1 * s.a)
    ctx.beginPath()
    ctx.ellipse(((x0 + x1w) / 2) * pen.k, (FLOOR + 0.42) * pen.k, ((x1w - x0) / 2 + 0.15) * pen.k, 0.22 * pen.k, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

/* ------------------------------------------------------------------ the wall */

/** The corridor's globes: where they hang, and when each goes off. */
const GLOBES: [number, number][] = [
  [-13.0, at(108, 3)],
  [-6.2, at(108, 4)],
]
const GLOBE_Y = -4.35

/** The milk-glass globes on their rods, lit until they are switched off, a beat apart; the draught moving them a little. */
export function globes(pen: Pen, t: number, f: Frame): void {
  if (f.y0 > GLOBE_Y + 0.3) return
  GLOBES.forEach(([x, off], i) => {
    if (x + 0.4 < f.x0 || x - 0.4 > f.x1) return
    const a = 0.018 * sway(t, 40 + i, 4.2 + i) + 0.012 * ring(t - off, 1.4, 0.8)
    const len = GLOBE_Y - CEIL
    const g: Pt = [x + Math.sin(a) * len, CEIL + Math.cos(a) * len]
    line(pen, [x, CEIL], g, '#8C8A80', 0.8)
    rect(pen, x - 0.08, CEIL, x + 0.08, CEIL + 0.05, '#B7B5A8')
    shape(pen, [[g[0] - 0.07, g[1] - 0.2], [g[0] + 0.07, g[1] - 0.2], [g[0] + 0.09, g[1] - 0.13], [g[0] - 0.09, g[1] - 0.13]], '#8C8A80')
    // Lit, the glass is the warm of its bulb through it; off, it is milk glass in the morning.
    const lit = 1 - smooth(t, off, off + 0.08)
    ellipse(pen, g, 0.21, 0.2, mix('#E9E7DC', '#FFE6B2', lit))
    ellipse(pen, [g[0], g[1] + 0.07], 0.17, 0.11, mix('#D9D7CB', '#FFD98F', lit))
  })
}

/** The notice board by the nursery's door: cork in a frame, four sheets pinned to it, their corners lifting in the door's draught. */
export function noticeBoard(pen: Pen, t: number, f: Frame): void {
  const x0 = -13.25
  const x1 = -12.25
  const y0 = -3.35
  const y1 = -2.55
  if (x1 < f.x0 || x0 > f.x1 || y1 < f.y0 || y0 > f.y1) return
  rect(pen, x0 - 0.05, y0 - 0.05, x1 + 0.05, y1 + 0.05, '#7A5C40')
  rect(pen, x0, y0, x1, y1, '#B48E62')
  const draught = Math.min(1, Math.abs(farDoorOpen(t)) * 0.9 + 0.15 * Math.max(0, sway(t, 44, 3.7)))
  const sheets: [number, number, number, number, string][] = [
    [-13.15, -3.25, 0.32, 0.4, '#F4F1E4'],
    [-12.75, -3.28, 0.36, 0.28, '#EFE6C8'],
    [-12.7, -2.95, 0.3, 0.33, '#F4F1E4'],
    [-13.1, -2.8, 0.26, 0.2, '#E3EBDF'],
  ]
  sheets.forEach(([x, y, w, h, col], i) => {
    const lift = draught * (0.4 + 0.6 * hash(i, 3, 7)) * (0.7 + 0.3 * Math.sin(t * 7 + i * 2))
    shape(pen, [[x, y], [x + w, y], [x + w + 0.02 * lift, y + h - 0.12 * lift], [x + w - 0.08 * lift, y + h - 0.02 * lift], [x, y + h]], col)
    for (let j = 1; j < 4; j++) line(pen, [x + 0.04, y + (h * j) / 4], [x + w - 0.06, y + (h * j) / 4], '#B9B3A0', 0.3)
    ellipse(pen, [x + w / 2, y + 0.03], 0.02, 0.02, i % 2 ? '#B44A3C' : '#3E6A8A')
  })
}

/** The clock over the nursery's door. */
export function doorClock(pen: Pen, t: number, f: Frame): void {
  const c: Pt = [-14.05, -1.95]
  if (c[0] + 0.3 < f.x0 || c[0] - 0.3 > f.x1 || c[1] - 0.3 > f.y1 || c[1] + 0.3 < f.y0) return
  clock(pen, t, c, 0.21)
}

/** A wheelchair against the wall at the corridor's end: cane back, two big wheels, a footrest. */
export function wheelchair(pen: Pen, f: Frame): void {
  const x = -15.9
  if (x + 0.8 < f.x0 || x - 0.8 > f.x1) return
  const y = FLOOR + 0.08
  const iron = '#5F6763'
  const { p, k } = pen
  p.noFill()
  p.stroke(pen.tone(iron))
  p.strokeWeight(pen.w * 0.9)
  p.ellipse((x + 0.12) * k, (y - 0.4) * k, 0.8 * k, 0.8 * k)
  ellipse(pen, [x + 0.12, y - 0.4], 0.05, 0.05, iron)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI
    line(pen, [x + 0.12 + Math.cos(a) * 0.38, y - 0.4 + Math.sin(a) * 0.38], [x + 0.12 - Math.cos(a) * 0.38, y - 0.4 - Math.sin(a) * 0.38], iron, 0.3)
  }
  shape(pen, [[x - 0.2, y - 0.62], [x + 0.45, y - 0.62], [x + 0.48, y - 0.56], [x - 0.2, y - 0.56]], '#9C7A52')
  shape(pen, [[x - 0.22, y - 1.25], [x - 0.12, y - 1.25], [x - 0.12, y - 0.6], [x - 0.22, y - 0.6]], '#B89A6C')
  line(pen, [x - 0.2, y - 1.28], [x - 0.36, y - 1.32], iron, 0.9)
  line(pen, [x + 0.45, y - 0.6], [x + 0.62, y - 0.12], iron, 0.8)
  line(pen, [x + 0.55, y - 0.12], [x + 0.72, y - 0.12], iron, 1.1)
  ellipse(pen, [x + 0.55, y - 0.05], 0.06, 0.06, iron)
}

/* ------------------------------------------------------------------ pigeons */

const PIGEON = '#AEB1B6'
const PIGEON_DARK = '#7D8187'
const NECK = '#6C7B75'

/** A pigeon standing on a ledge at `x`, its feet on `y`, facing `face`, `s` its size: head bobbing (`bob`), or pecking. */
function pigeon(pen: Pen, x: number, y: number, face: 1 | -1, s: number, bob: number, peck: number, puff = 0): void {
  const f = face
  // Tail, body, wing, the neck and head.
  shape(pen, [[x - f * 0.18 * s, y - 0.11 * s], [x - f * 0.34 * s, y - 0.06 * s], [x - f * 0.32 * s, y - 0.02 * s], [x - f * 0.12 * s, y - 0.05 * s]], PIGEON_DARK)
  ellipse(pen, [x, y - 0.1 * s], (0.18 + 0.02 * puff) * s, (0.085 + 0.02 * puff) * s, PIGEON)
  shape(pen, [[x - f * 0.12 * s, y - 0.15 * s], [x + f * 0.08 * s, y - 0.16 * s], [x + f * 0.02 * s, y - 0.07 * s], [x - f * 0.2 * s, y - 0.06 * s]], PIGEON_DARK)
  line(pen, [x - f * 0.08 * s, y - 0.12 * s], [x + f * 0.0 * s, y - 0.125 * s], '#3F4247', 0.4)
  const head: Pt = [x + f * (0.16 + 0.05 * bob + 0.04 * peck) * s, y - (0.24 - 0.12 * peck) * s]
  shape(pen, [[x + f * 0.05 * s, y - 0.17 * s], [x + f * 0.16 * s, y - 0.1 * s], [head[0] + f * 0.02 * s, head[1] + 0.03 * s], [head[0] - f * 0.05 * s, head[1] + 0.02 * s]], NECK)
  ellipse(pen, head, 0.055 * s, 0.05 * s, PIGEON)
  shape(pen, [[head[0] + f * 0.04 * s, head[1] - 0.005 * s], [head[0] + f * 0.1 * s, head[1] + 0.012 * s], [head[0] + f * 0.04 * s, head[1] + 0.02 * s]], '#3B3633')
  ellipse(pen, [head[0] + f * 0.015 * s, head[1] - 0.008 * s], 0.012 * s, 0.012 * s, '#C46A2E')
  line(pen, [x, y - 0.03 * s], [x + f * 0.02 * s, y], '#B06A5A', 0.5)
}

/** A pigeon going up: wings up and down, climbing away from `from` over `dur` seconds. */
function flier(pen: Pen, from: Pt, t: number, t0: number, dur: number, dir: Pt, s: number): void {
  const u = (t - t0) / dur
  if (u < 0 || u > 1) return
  const x = from[0] + dir[0] * u * u * 2 + dir[0] * u
  const y = from[1] + dir[1] * u - 0.25 * Math.sin(Math.PI * Math.min(1, u * 1.5))
  const beat = Math.sin((t - t0) * 22)
  const sc = s * (1 - 0.35 * u)
  ellipse(pen, [x, y], 0.14 * sc, 0.065 * sc, PIGEON)
  shape(pen, [[x - 0.05 * sc, y], [x - 0.24 * sc, y - 0.2 * sc * beat], [x + 0.02 * sc, y - 0.02 * sc]], PIGEON_DARK)
  shape(pen, [[x + 0.05 * sc, y], [x + 0.24 * sc, y - 0.2 * sc * beat], [x - 0.02 * sc, y - 0.02 * sc]], PIGEON)
}

/** The two on the ward window's ledge (drawn inside its glass, behind its bars): one goes up as she nudges him to go. */
export function wardPigeons(pen: Pen, t: number): void {
  const y = WARD_WIN.y1 + 0.02
  const s = 0.9
  // The right one preens, bobs, turns about now and then.
  const turn: 1 | -1 = Math.sin((t - T0) * 0.37) > 0.55 ? 1 : -1
  pigeon(pen, 1.42, y, turn, s, Math.max(0, Math.sin(t * 2.6)) ** 3, 0.5 * Math.max(0, Math.sin(t * 0.9 + 1)) ** 8, 0.5 + 0.5 * Math.sin(t * 0.7))
  // The left one walks along the ledge toward it, head going, until it goes.
  const go = NUDGE + 0.1
  if (t < go) {
    const walkX = 0.35 + 0.22 * smooth(t, T0 + 0.6, T0 + 2.6) + 0.12 * smooth(t, T0 + 3.4, T0 + 4.6)
    const stepping = smooth(t, T0 + 0.6, T0 + 1.0) * (1 - smooth(t, T0 + 2.4, T0 + 2.7)) + smooth(t, T0 + 3.4, T0 + 3.6) * (1 - smooth(t, T0 + 4.4, T0 + 4.7))
    pigeon(pen, walkX, y, 1, s, stepping * Math.max(0, Math.sin(t * 11)) + 0.2 * Math.max(0, Math.sin(t * 1.9)) ** 4, 0)
  } else flier(pen, [0.69, y - 0.12], t, go, 1.6, [-1.2, -0.9], s)
}

/** The one that comes down onto the corridor window's ledge once the sun is up, and walks about on it. */
export function hallPigeon(pen: Pen, t: number): void {
  const land = SUN_CLEAR + 0.7
  if (t < land - 1.1) return
  const y = CORRIDOR_WIN.y1 + 0.02
  const s = 0.62
  if (t < land) {
    const u = (t - (land - 1.1)) / 1.1
    const x = -5.0 - 0.5 * u
    const yy = y - 0.6 * (1 - u) * (1 - u) - 0.08
    const beat = Math.sin(t * 20) * (1 - 0.5 * u)
    ellipse(pen, [x, yy], 0.14 * s, 0.065 * s, PIGEON)
    shape(pen, [[x - 0.05 * s, yy], [x - 0.24 * s, yy - 0.2 * s * beat], [x + 0.02 * s, yy - 0.02 * s]], PIGEON_DARK)
    shape(pen, [[x + 0.05 * s, yy], [x + 0.24 * s, yy - 0.2 * s * beat], [x - 0.02 * s, yy - 0.02 * s]], PIGEON)
    return
  }
  // Strutting a little way and back at the ledge's far end, clear of the hat of the father asleep on the bench under
  // it; bobbing, puffing up now and then.
  const u = t - land
  const x = -5.5 - 0.1 * Math.sin(u * 0.45)
  const face: 1 | -1 = Math.cos(u * 0.45) > 0 ? -1 : 1
  pigeon(pen, x, y, face, s, Math.max(0, Math.sin(u * 7)) * Math.abs(Math.cos(u * 0.45)), 0.6 * Math.max(0, Math.sin(u * 0.8 + 2)) ** 10, Math.max(0, Math.sin(u * 0.5)) ** 4)
}

/* ------------------------------------------------------------------ the curtain */

/**
 * The next bed's shadows on the partition's curtain, from her own window on the far side of it: a mother sitting up
 * with her baby at her shoulder, rocking it, and the night nurse coming to her and bending, and going. Shade only, soft
 * at the edges as a shadow through a curtain is.
 */
export function curtainShadows(pen: Pen, t: number, f: Frame): void {
  const [x0] = CURTAIN
  if (f.x1 < x0 || t > T0 + 10) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0 * k, -4.5 * k, (f.x1 + 1 - x0) * k, 5.5 * k)
  ctx.clip()
  const rock = 0.06 * Math.sin(((t - T0) / 1.7) * Math.PI)
  const m: Pt = [3.05 + rock, -0.95]
  // The nurse comes to her, bends, goes; and comes back with a cup for her and bends again.
  const nurse = smooth(t, T0 + 0.4, T0 + 1.6) * (1 - smooth(t, T0 + 3.6, T0 + 4.6)) + smooth(t, T0 + 5.4, T0 + 6.4)
  const bend = smooth(t, T0 + 1.6, T0 + 2.2) * (1 - smooth(t, T0 + 3.0, T0 + 3.6)) + smooth(t, T0 + 6.4, T0 + 7.0)
  const step = 0.05 * Math.abs(Math.sin(t * 5.5)) * (1 - bend)
  const nx = 4.3 - 0.8 * Math.min(1, nurse) - step
  const paths = (spread: number): Path2D => {
    const p = new Path2D()
    // Her: a head, her shoulders and back sitting up against the pillows, the baby's head at her shoulder.
    p.ellipse(m[0] * k, m[1] * k, (0.17 + spread) * k, (0.19 + spread) * k, 0, 0, Math.PI * 2)
    p.moveTo((m[0] - 0.3 - spread) * k, (m[1] + 0.25) * k)
    p.lineTo((m[0] + 0.32 + spread) * k, (m[1] + 0.22) * k)
    p.lineTo((m[0] + 0.45 + spread) * k, (m[1] + 1.2) * k)
    p.lineTo((m[0] - 0.42 - spread) * k, (m[1] + 1.2) * k)
    p.closePath()
    p.moveTo((m[0] - 0.22 + 0.11 + spread) * k, (m[1] + 0.32) * k)
    p.ellipse((m[0] - 0.22) * k, (m[1] + 0.32) * k, (0.11 + spread) * k, (0.1 + spread) * k, 0, 0, Math.PI * 2)
    if (nurse > 0.01) {
      // The nurse, standing, her cap; bending to her and straightening.
      const hx = nx - 0.35 * bend
      const hy = -1.75 + 0.35 * bend
      p.moveTo((hx + 0.16 + spread) * k, hy * k)
      p.ellipse(hx * k, hy * k, (0.16 + spread) * k, (0.18 + spread) * k, 0, 0, Math.PI * 2)
      p.moveTo((hx - 0.14) * k, (hy - 0.14 - spread) * k)
      p.lineTo((hx + 0.12) * k, (hy - 0.14 - spread) * k)
      p.lineTo((hx + 0.08) * k, (hy - 0.3 - spread) * k)
      p.lineTo((hx - 0.1) * k, (hy - 0.3 - spread) * k)
      p.closePath()
      p.moveTo((hx - 0.28 - spread) * k, (hy + 0.25) * k)
      p.lineTo((hx + 0.28 + spread) * k, (hy + 0.25) * k)
      p.lineTo((nx + 0.36 + spread) * k, 1.0 * k)
      p.lineTo((nx - 0.36 - spread) * k, 1.0 * k)
      p.closePath()
      // Her arm out to the mother's shoulder.
      p.moveTo((hx - 0.1) * k, (hy + 0.35) * k)
      p.lineTo((m[0] + 0.3) * k, (m[1] + 0.3 + 0.2 * (1 - bend)) * k)
      p.lineTo((m[0] + 0.32) * k, (m[1] + 0.42 + 0.2 * (1 - bend)) * k)
      p.lineTo((hx - 0.05) * k, (hy + 0.5) * k)
      p.closePath()
    }
    return p
  }
  const fade = 1 - smooth(t, T0 + 8.5, T0 + 10)
  ctx.fillStyle = rgba(pen, '#6E8679', 0.12 * fade)
  ctx.fill(paths(0.06), 'nonzero')
  ctx.fillStyle = rgba(pen, '#6E8679', 0.2 * fade)
  ctx.fill(paths(0), 'nonzero')
  ctx.restore()
}

/**
 * Before the blind goes up, someone in the nursery going along behind it, her shadow on it from the nursery's own
 * window: a nurse with her cap, carrying a baby, across as he comes down the corridor to the glass.
 */
export function blindShadows(pen: Pen, t: number, down: number): void {
  const t0 = SON - 4.6
  const u = (t - t0) / 4.4
  if (u <= 0 || u >= 1 || down < GLASS.y0 + 0.6) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const x = GLASS.x1 - 0.4 - (GLASS.x1 - GLASS.x0 - 0.8) * u
  const bob = 0.03 * Math.abs(Math.sin(t * 5.6))
  const hy = -1.45 - bob
  const fig = (sp: number): Path2D => {
    const p = new Path2D()
    p.ellipse(x * k, hy * k, (0.17 + sp) * k, (0.19 + sp) * k, 0, 0, Math.PI * 2)
    p.moveTo((x - 0.14) * k, (hy - 0.13 - sp) * k)
    p.lineTo((x + 0.14) * k, (hy - 0.13 - sp) * k)
    p.lineTo((x + 0.1) * k, (hy - 0.3 - sp) * k)
    p.lineTo((x - 0.12) * k, (hy - 0.3 - sp) * k)
    p.closePath()
    p.moveTo((x - 0.3 - sp) * k, (hy + 0.26) * k)
    p.lineTo((x + 0.3 + sp) * k, (hy + 0.26) * k)
    p.lineTo((x + 0.38 + sp) * k, (down + 0.1) * k)
    p.lineTo((x - 0.38 - sp) * k, (down + 0.1) * k)
    p.closePath()
    // The baby at her shoulder.
    p.moveTo((x - 0.2 + 0.14 + sp) * k, (hy + 0.38) * k)
    p.ellipse((x - 0.2) * k, (hy + 0.38) * k, (0.14 + sp) * k, (0.1 + sp) * k, 0, 0, Math.PI * 2)
    return p
  }
  const a = Math.min(1, u * 6, (1 - u) * 6)
  ctx.save()
  ctx.fillStyle = rgba(pen, '#9C8C6C', 0.1 * a)
  ctx.fill(fig(0.06))
  ctx.fillStyle = rgba(pen, '#9C8C6C', 0.16 * a)
  ctx.fill(fig(0))
  ctx.restore()
}
