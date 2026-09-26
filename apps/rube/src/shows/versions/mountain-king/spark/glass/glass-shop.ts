import { mixHex, type Pt } from '../../../../../parts'
import { hash, smooth } from '../kit'
import { drawFire as drawLicks } from '../fire'
import { DOORS } from '../music'
import { FIRES, GLASS } from '../worlds'
import { DRAW, FLOOR_Y, FURNACE, GLORY, LEHR, OVEN, PORT, RINGS, S0, S1, SANDBOX, SLAM } from './glass-plan'
import { arcPts, box4, clipTo, fillWith, glow, rgba, shape, strokeLine, type Pen } from './glass-pen'

/**
 * The glasshouse itself: whitewashed walls and tall windows with the day falling through them, a stone floor, the
 * glory hole's brick oven at the west end and the great furnace at the east. The fires never go out.
 */

const FIRE = FIRES.glassworks
/** The frame, in cells, as the stage sees it. */
export interface View {
  x0: number
  y0: number
  x1: number
  y1: number
}

/* ------------------------------------------------------------------ the room */

/**
 * Tall arched windows high in the back wall, a clerestory over the machines: in the lehr's and the carriage's frames
 * (71.5-80, their tops down to about -3.4) they are above the frame and only their shafts of daylight come down
 * through it to the floor. None stands by the furnace, so none slides in at the edge as the camera goes up to the
 * port. A taller frame (a phone held upright) sees them whole.
 */
const WINDOWS = [-8.2, 2.9, 9.2]
const WIN = { half: 1.15, top: -8.4, sill: -4.4 }
/** The sun comes in from the upper west: the shafts lean east as they fall. */
const LEAN = 0.5

export function drawRoom(pen: Pen, v: View): void {
  const { ctx, k } = pen
  const x0 = v.x0 - 1
  const x1 = v.x1 + 1
  // The whitewashed wall, a little greyer up toward the roof.
  const top = Math.min(v.y0 - 1, -9)
  const g = ctx.createLinearGradient(0, -8 * k, 0, 2 * k)
  g.addColorStop(0, GLASS.wallShade)
  g.addColorStop(1, GLASS.wall)
  fillWith(pen, box4(x0, top, x1, FLOOR_Y), g)
  // The dado along the foot of the wall.
  shape(pen, box4(x0, FLOOR_Y - 0.6, x1, FLOOR_Y), mixHex(GLASS.wallShade, GLASS.glassDeep, 0.12), 0)
  strokeLine(pen, [[x0, FLOOR_Y - 0.6], [x1, FLOOR_Y - 0.6]], rgba(GLASS.glassDeep, 0.3), Math.max(0.6, pen.w * 0.5))
  // The windows, and the day through them.
  for (const wx of WINDOWS) {
    if (wx + WIN.half + LEAN * (FLOOR_Y - WIN.sill) < v.x0 - 1 || wx - WIN.half > v.x1 + 1) continue
    windowAt(pen, wx)
  }
  drawFloor(pen, v, x0, x1)
}

/** What stands on the floor and throws a shadow forward onto it (the sun is high in the west, behind the wall). */
const FOOT: [number, number][] = [
  [OVEN.x0, OVEN.x1],
  [LEHR.x0, LEHR.x1],
  [SANDBOX.x0, SANDBOX.x1],
  [FURNACE.x0, FURNACE.x1],
]
/** How far toward us each course of flags ends (cells below the floor's back edge): wider as they come nearer. */
const COURSES = [0.32, 0.75, 1.3, 2.0, 2.9, 4.05, 5.5, 7.3, 9.5, 12.2, 15.5, 19.5]

/**
 * The floor: stone flags seen from a little above, the back of the floor lit by the day and going a shade darker
 * toward us. Courses of flags, wider as they come nearer, their joints faint and a little out of true; the pools of
 * daylight from the windows lying forward across them; a soft shadow thrown forward under the oven, the lehr, the
 * sand box and the furnace.
 */
function drawFloor(pen: Pen, v: View, x0: number, x1: number): void {
  const { ctx, k } = pen
  const y0 = FLOOR_Y
  const y1 = Math.max(v.y1 + 1, FLOOR_Y + 3)
  if (y0 > v.y1 + 0.5) return
  const floor = mixHex(GLASS.sand, GLASS.wallShade, 0.55)
  const near = mixHex(floor, GLASS.iron, 0.13)
  const g = ctx.createLinearGradient(0, y0 * k, 0, (y0 + 7) * k)
  g.addColorStop(0, mixHex(floor, GLASS.light, 0.12))
  g.addColorStop(0.35, floor)
  g.addColorStop(1, near)
  fillWith(pen, box4(x0, y0, x1, y1), g)
  // Shadows thrown forward and a little east by what stands on it.
  for (const [a, b] of FOOT) {
    if (b + 1 < v.x0 || a - 1 > v.x1) continue
    const sg = ctx.createLinearGradient(0, y0 * k, 0, (y0 + 0.6) * k)
    sg.addColorStop(0, rgba(GLASS.iron, 0.2))
    sg.addColorStop(1, rgba(GLASS.iron, 0))
    fillWith(pen, [[a + 0.05, y0], [b, y0], [b + 0.45, y0 + 0.6], [a + 0.35, y0 + 0.6]], sg)
  }
  // The day through the windows lies forward across the flags, going on the way the shafts lean, and fades.
  for (const wx of WINDOWS) {
    const dx = LEAN * (FLOOR_Y - WIN.sill)
    const a = wx - WIN.half + dx
    const b = wx + WIN.half + dx
    const deep = 2.6
    const run = LEAN * deep * 0.6
    if (b + run + 1 < v.x0 || a - 1 > v.x1) continue
    const lg = ctx.createLinearGradient(0, y0 * k, 0, (y0 + deep) * k)
    lg.addColorStop(0, rgba(GLASS.light, 0.42))
    lg.addColorStop(0.45, rgba(GLASS.light, 0.2))
    lg.addColorStop(1, rgba(GLASS.light, 0))
    fillWith(pen, [[a, y0 + 0.01], [b, y0 + 0.01], [b + run, y0 + deep], [a + run, y0 + deep]], lg)
  }
  // The joints: one faint path, stroked once.
  ctx.save()
  ctx.strokeStyle = rgba(GLASS.iron, 0.16)
  ctx.lineWidth = Math.max(0.6, pen.w * 0.5)
  ctx.lineCap = 'round'
  ctx.beginPath()
  let top = y0
  for (let i = 0; i < COURSES.length && top < v.y1 + 0.5; i++) {
    const bottom = y0 + COURSES[i]
    if (bottom > v.y0 - 0.5) {
      const yb = bottom + 0.04 * (hash(i, 611) - 0.5)
      ctx.moveTo((v.x0 - 1) * k, yb * k)
      ctx.lineTo((v.x1 + 1) * k, (bottom + 0.04 * (hash(i, 612) - 0.5)) * k)
      // Flags wider as they come nearer, laid broken-bond.
      const w = 1.25 + 0.42 * (COURSES[i] + (i ? COURSES[i - 1] : 0)) * 0.5
      const off = w * (0.5 * (i % 2) + 0.2 * hash(i, 613))
      for (let c = Math.floor((v.x0 - 1 - off) / w); c * w + off <= v.x1 + 1; c++) {
        const x = c * w + off + 0.18 * w * (hash(i, c, 614) - 0.5)
        const lean = 0.06 * (bottom - top) * (hash(i, c, 615) - 0.5)
        ctx.moveTo(x * k, top * k)
        ctx.lineTo((x + lean) * k, bottom * k)
      }
    }
    top = bottom
  }
  ctx.stroke()
  ctx.restore()
  strokeLine(pen, [[x0, FLOOR_Y], [x1, FLOOR_Y]], pen.ink, pen.w * 0.9)
}

function windowAt(pen: Pen, wx: number): void {
  const { ctx, k } = pen
  const { half, top, sill } = WIN
  const spring = top + half
  // The shaft of light, falling from the window to the floor.
  const dx = LEAN * (FLOOR_Y - sill)
  const shaft: Pt[] = [
    [wx - half, sill],
    [wx + half, sill],
    [wx + half + dx, FLOOR_Y],
    [wx - half + dx, FLOOR_Y],
  ]
  const g = ctx.createLinearGradient(wx * k, sill * k, (wx + dx) * k, FLOOR_Y * k)
  g.addColorStop(0, rgba(GLASS.light, 0.4))
  g.addColorStop(0.6, rgba(GLASS.light, 0.16))
  g.addColorStop(1, rgba(GLASS.light, 0.07))
  fillWith(pen, shaft, g)
  // The opening: an arched window, its iron frame and panes.
  const outline: Pt[] = [[wx - half, sill], ...arcPts(wx, spring, half, half, Math.PI, 2 * Math.PI, 16), [wx + half, sill]]
  shape(pen, outline, GLASS.light, 1)
  const bar = pen.w * 0.8
  const iron = GLASS.iron
  for (const f of [-1 / 3, 1 / 3]) strokeLine(pen, [[wx + half * 2 * f * 0.75, sill], [wx + half * 2 * f * 0.75, spring - Math.sqrt(Math.max(0, 1 - (f * 1.5) ** 2)) * half * 0.98]], iron, bar)
  for (let r = 1; r < 5; r++) {
    const y = sill - ((sill - spring) * r) / 5
    strokeLine(pen, [[wx - half, y], [wx + half, y]], iron, bar)
  }
  // The sill.
  shape(pen, box4(wx - half - 0.15, sill, wx + half + 0.15, sill + 0.14), GLASS.wallShade, 0.8)
}

/* ------------------------------------------------------------------ brick */

/** Courses of brick across an outline: faint joints, staggered. */
function bricks(pen: Pen, pts: Pt[], x0: number, y0: number, x1: number, y1: number, v: View, a = 0.32): void {
  const ya = Math.max(y0, v.y0 - 0.5)
  const yb = Math.min(y1, v.y1 + 0.5)
  if (ya >= yb) return
  const xa = Math.max(x0, v.x0 - 0.5)
  const xb = Math.min(x1, v.x1 + 0.5)
  if (xa >= xb) return
  const H = 0.3
  const W = 0.62
  clipTo(pen, pts, () => {
    const joint = rgba(GLASS.brickDeep, a)
    const lw = Math.max(0.6, pen.w * 0.45)
    for (let r = Math.floor(ya / H); r * H <= yb; r++) {
      const y = r * H
      strokeLine(pen, [[xa, y], [xb, y]], joint, lw)
      const off = (r % 2) * W * 0.5
      for (let c = Math.floor((xa - off) / W); c * W + off <= xb; c++) {
        const x = c * W + off
        strokeLine(pen, [[x, y], [x, y + H]], joint, lw)
      }
    }
  })
}

/** An iron strap or post: flat iron with a lit edge. */
function iron(pen: Pen, x0: number, y0: number, x1: number, y1: number): void {
  shape(pen, box4(x0, y0, x1, y1), GLASS.iron, 0.8)
  const w = x1 - x0
  const h = y1 - y0
  if (w < h) strokeLine(pen, [[x0 + w * 0.3, y0 + 0.04], [x0 + w * 0.3, y1 - 0.04]], GLASS.steel, Math.max(0.6, pen.w * 0.5))
  else strokeLine(pen, [[x0 + 0.04, y0 + h * 0.3], [x1 - 0.04, y0 + h * 0.3]], GLASS.steel, Math.max(0.6, pen.w * 0.5))
}

/* ------------------------------------------------------------------ fire */

/**
 * A fire seen through an opening: the furnace's glow deep inside, darker toward the crown of the arch, and licks of
 * flame rising through it off the sill (`fire.ts`), forking and burning white where they cross, higher as it roars.
 */
function fireIn(pen: Pen, opening: Pt[], cx: number, cy: number, r: number, t: number, flare: number, seed: number): void {
  const { ctx, k } = pen
  const g = ctx.createLinearGradient(0, (cy + r * 1.05) * k, 0, (cy - r * 1.1) * k)
  g.addColorStop(0, FIRE.body)
  g.addColorStop(0.45, mixHex(FIRE.body, FIRE.rim, 0.55))
  g.addColorStop(1, mixHex(FIRE.rim, GLASS.brickDeep, 0.45))
  fillWith(pen, opening, g)
  clipTo(pen, opening, () => {
    drawLicks(ctx, k, { x0: cx - r * 1.1, x1: cx + r * 1.1, y: cy + r * 1.05, h: r * 1.9 * (1 + 0.35 * flare), n: 8, t, seed, pal: FIRE, alpha: 0.72, lean: 0.25 * r * Math.sin(t * 0.9 + seed) })
    // The opening's inner lip in shadow, across its top.
    const sh = ctx.createLinearGradient(0, (cy - r) * k, 0, (cy - r * 0.55) * k)
    sh.addColorStop(0, rgba(FIRE.rim, 0.85))
    sh.addColorStop(1, rgba(FIRE.rim, 0))
    fillWith(pen, box4(cx - r * 1.3, cy - r * 1.3, cx + r * 1.3, cy - r * 0.5), sh)
  })
}

/** Flame curling out over the top of an opening and up the brick face: more of it as the fire breathes. */
function breath(pen: Pen, x: number, y: number, hw: number, t: number, flare: number, seed: number): void {
  const h = (0.45 + 0.35 * Math.sin(t * 1.9 + seed) ** 2) * (0.5 + 1.1 * flare)
  if (h < 0.08) return
  drawLicks(pen.ctx, pen.k, { x0: x - hw * 0.8, x1: x + hw * 0.8, y: y + 0.25, h: h + 0.25, n: 4, t, seed: seed + 40, pal: FIRE, alpha: 0.55 + 0.2 * Math.min(1, flare), bed: false })
}

/* ------------------------------------------------------------------ the glory hole */

/** How hard the glory hole roars: it bursts as the spark comes out of it, and as it goes back through on the way home. */
const gloryFlare = (t: number): number => {
  const out = t >= S0 - 0.3 ? Math.exp(-Math.max(0, t - S0) / 0.6) * smooth(t, S0 - 0.3, S0) : 0
  const home = smooth(t, DOORS.back[1] - 0.25, DOORS.back[1] - 0.05) * (1 - smooth(t, DOORS.back[2] + 0.05, DOORS.back[2] + 0.7))
  return Math.min(1.2, out + home)
}

export function drawOven(pen: Pen, v: View, t: number): void {
  const { x0, x1, top } = OVEN
  if (x1 + 3 < v.x0 || x0 - 1 > v.x1) return
  const mid = (x0 + x1) / 2
  const plinth = FLOOR_Y - 0.45
  const flare = gloryFlare(t)
  // The flue, up through the roof.
  const fx = mid - 0.55
  shape(pen, box4(fx - 0.28, Math.min(v.y0 - 1, top - 6), fx + 0.28, top - 0.3), GLASS.iron, 0.8)
  strokeLine(pen, [[fx - 0.12, Math.min(v.y0 - 1, top - 6)], [fx - 0.12, top - 0.35]], GLASS.steel, Math.max(0.6, pen.w * 0.5))
  // The brick, vaulted over.
  const body: Pt[] = [[x0, plinth], [x0, top], ...arcPts(mid, top, (x1 - x0) / 2, 0.6, Math.PI, 2 * Math.PI, 18), [x1, top], [x1, plinth]]
  shape(pen, body, GLASS.brick, 1)
  bricks(pen, body, x0, top - 0.7, x1, plinth, v)
  // The fire's heat on its face.
  glow(pen, GLORY.x, GLORY.y, 2.6, GLASS.furnace, 0.4 + 0.2 * flare, 0.5)
  // Straps and posts.
  iron(pen, x0, top - 0.02, x0 + 0.16, plinth)
  iron(pen, x1 - 0.16, top - 0.02, x1, plinth)
  iron(pen, x0, -1.4, x1, -1.26)
  iron(pen, x0, 1.36, x1, 1.5)
  // The mouth: an arch of fire brick round an iron collar, and the fire in it. An arch on a sill, not a round port:
  // a round hole of fire the spark's size-and-a-half reads as a second ball, or a scene seen through a porthole.
  const { x, y, r } = GLORY
  const sill = y + r * 0.8
  const spring = y - r * 0.05
  const arch = (e: number, drop: number): Pt[] => [
    [x - r - e, sill + drop],
    [x - r - e, spring],
    ...arcPts(x, spring, r + e, r + e, Math.PI, 2 * Math.PI, 24),
    [x + r + e, spring],
    [x + r + e, sill + drop],
  ]
  shape(pen, arch(0.36, 0.16), GLASS.brickDeep, 0.9)
  for (let i = 1; i < 12; i++) {
    const a = Math.PI + (Math.PI * i) / 12
    strokeLine(pen, [[x + Math.cos(a) * (r + 0.1), spring + Math.sin(a) * (r + 0.1)], [x + Math.cos(a) * (r + 0.36), spring + Math.sin(a) * (r + 0.36)]], rgba(GLASS.brick, 0.8), Math.max(0.6, pen.w * 0.5))
  }
  shape(pen, arch(0.12, 0), GLASS.iron, 0.9)
  const mouth = arch(0, 0)
  fireIn(pen, mouth, x, y, r, t, flare, 1)
  shape(pen, mouth, null, 0.9)
  shape(pen, box4(x - r - 0.5, sill, x + r + 0.5, sill + 0.17), mixHex(GLASS.brickDeep, GLASS.iron, 0.35), 0.9)
  // It breathes out over its lip and up the brick.
  breath(pen, x, spring - r * 0.92, r * 0.8, t, 0.35 + flare, 3)
  // The plinth.
  shape(pen, box4(x0 - 0.12, plinth, x1 + 0.12, FLOOR_Y), mixHex(GLASS.brickDeep, GLASS.iron, 0.35), 0.9)
}

/* ------------------------------------------------------------------ the furnace */

/** How hard the furnace's port breathes: it gathers as the carriage climbs, roars on 81.12 as it draws the spark in. */
const portFlare = (t: number): number =>
  0.35 * smooth(t, RINGS[2], SLAM + 0.3) +
  0.9 * smooth(t, DRAW - 0.3, S1) +
  (t > DRAW ? 0.7 * (1 - Math.exp(-(t - DRAW) / 0.03)) * Math.exp(-(t - DRAW) / 0.4) : 0) -
  0.8 * smooth(t, S1 + 0.8, S1 + 3)

export function drawFurnace(pen: Pen, v: View, t: number): void {
  const { x0, x1, top } = FURNACE
  if (x1 + 1 < v.x0 || x0 - 3 > v.x1) return
  const mid = (x0 + x1) / 2
  const plinth = FLOOR_Y - 0.5
  const crown = 2.5
  // The stack, up through the roof.
  const sx = mid + 0.9
  const stack = box4(sx - 0.7, Math.min(v.y0 - 1, top - 12), sx + 0.7, top - crown + 0.4)
  shape(pen, stack, GLASS.brickDeep, 1)
  bricks(pen, stack, sx - 0.7, top - 12, sx + 0.7, top - crown + 0.4, v, 0.4)
  // The beehive: wall and crown.
  const body: Pt[] = [[x0, plinth], [x0, top], ...arcPts(mid, top, (x1 - x0) / 2, crown, Math.PI, 2 * Math.PI, 30), [x1, top], [x1, plinth]]
  shape(pen, body, GLASS.brick, 1.1)
  bricks(pen, body, x0, top - crown, x1, plinth, v)
  // The heat on its face round the port.
  const flare = Math.max(0, portFlare(t))
  glow(pen, PORT.x, PORT.y + 0.2, 3.6, GLASS.furnace, 0.45 + 0.25 * flare, 0.6)
  // Buckstays: the iron posts that hold a furnace together, tied across the top.
  const posts = [x0 + 0.05, PORT.x - PORT.w / 2 - 0.62, PORT.x + PORT.w / 2 + 0.42, PORT.x + 3.2, x1 - 0.25]
  for (const px of posts) iron(pen, px, top - 0.35, px + 0.2, plinth + 0.05)
  iron(pen, x0 - 0.1, top - 0.35, x1 + 0.1, top - 0.2)
  // The working port: an arch of fire brick, the fire.
  const { x, y, w, h } = PORT
  const hw = w / 2
  const sill = y + h / 2
  const spring = y - h / 2 + hw
  const opening: Pt[] = [[x - hw, sill], [x - hw, spring], ...arcPts(x, spring, hw, hw, Math.PI, 2 * Math.PI, 20), [x + hw, spring], [x + hw, sill]]
  const arch: Pt[] = [[x - hw - 0.4, sill + 0.15], [x - hw - 0.4, spring], ...arcPts(x, spring, hw + 0.4, hw + 0.4, Math.PI, 2 * Math.PI, 20), [x + hw + 0.4, spring], [x + hw + 0.4, sill + 0.15]]
  shape(pen, arch, GLASS.brickDeep, 1)
  for (let i = 1; i < 10; i++) {
    const a = Math.PI + (Math.PI * i) / 10
    strokeLine(pen, [[x + Math.cos(a) * (hw + 0.05), spring + Math.sin(a) * (hw + 0.05)], [x + Math.cos(a) * (hw + 0.4), spring + Math.sin(a) * (hw + 0.4)]], rgba(GLASS.brick, 0.8), Math.max(0.6, pen.w * 0.5))
  }
  fireIn(pen, opening, x, y, Math.max(hw, h / 2) * 0.9, t, flare, 7)
  shape(pen, opening, null, 1)
  // It breathes: flame licks out over the arch and up the face.
  breath(pen, x, y - h / 2 + 0.1, hw, t, flare, 21)
  // The sill, and the plinth.
  shape(pen, box4(x - hw - 0.55, sill, x + hw + 0.55, sill + 0.17), mixHex(GLASS.brickDeep, GLASS.iron, 0.35), 0.9)
  shape(pen, box4(x0 - 0.12, plinth, x1 + 0.12, FLOOR_Y), mixHex(GLASS.brickDeep, GLASS.iron, 0.35), 0.9)
}
