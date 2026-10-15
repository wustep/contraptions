import type { Pt } from '../../../../../parts'
import { hash } from '../kit'
import { layer, onLayer, rgbaOf, sway, type View } from '../depth'
import { cityThrough } from './city'
import { DOOR_X, FLOOR, TREADLE } from './press-plan'
import { downbeat, lampsOn, runOf, thump } from './pulse'

/**
 * The press hall in depth (the PRESS builder's): everything behind the machine's own line. The far wall with its
 * gallery of tall windows and the city at dawn through them; three more press lines receding into the dark, each
 * printing, each under its own lamps, with catwalks over them and men on the catwalks; an overhead conveyor carrying
 * bundles; the paper itself, in ribbons, running up to the roof and across it; and the roof's trusses and the hall's
 * columns on the machine's own plane. The floor runs back under all of it to the far wall.
 *
 * It is drawn as planes (`depth.ts`), and placed as a perspective would place them: a plane at depth `z` stands on
 * its floor `floorOf(z)`, which rises toward the eye the further back it is, and everything on it is `z` times its
 * size. So as the camera goes along the hall the far lines slide by slowly, and when it pulls back the hall opens up.
 */

type C2 = CanvasRenderingContext2D


/** Where the hall's planes coincide with the machine: mid-hall at the web, at the camera's usual distance. */
export const ANCHOR: Pt = [14, 2.2]
export const REF = 4.8
const EYE = ANCHOR[1]
/** A plane's floor, in its own cells. */
export const floorOf = (z: number): number => EYE + z * (FLOOR - EYE)

export const HP = {
  wall: '#11181C',
  brick: '#1B252B',
  reveal: '#34495A',
  mullion: '#0B1013',
  floorFar: '#121A1E',
  floor: '#101518',
  floorLine: '#1A2328',
  lamp: '#F4B85E',
  bulb: '#FFE6B0',
  paper: '#ECE6D6',
  paperFar: '#9FA7A5',
  ink: '#0B0E10',
  truss: '#1A2328',
  column: '#161E22',
  columnHi: '#35505C',
  dawn: '#F2C88E',
  skylight: '#8FB0BA',
}

/* ------------------------------------------------------------------ the far wall and its windows */

const FW = { z: 0.2, pitch: 1.25, w: 0.72, top: -0.85, sill: 1.35 }

/** The far windows in view, each its own cells' left edge (plane coordinates). */
function farWindowsIn(x0: number, x1: number): number[] {
  const out: number[] = []
  for (let i = Math.floor((x0 - FW.w) / FW.pitch); i * FW.pitch <= x1; i++) out.push(i * FW.pitch + 0.25)
  return out
}

/** Where the far windows are at this frame, in world cells: for the shafts the front draws from them. */
export function farWindows(v: View): { x: number; y0: number; y1: number; w: number }[] {
  const s = Math.pow(v.h / REF, 1 - FW.z)
  const ox = ANCHOR[0] + FW.z * (v.cx - ANCHOR[0])
  const hw = v.w / 2 / s
  return farWindowsIn(ox - hw, ox + hw).map((wx) => {
    const a = onLayer(v, FW.z, ANCHOR, REF, [wx, FW.top - FW.w / 2])
    const b = onLayer(v, FW.z, ANCHOR, REF, [wx + FW.w, FW.sill])
    return { x: a[0], y0: a[1], y1: b[1], w: b[0] - a[0] }
  })
}

function windowPath(xs: number[]): Path2D {
  const p = new Path2D()
  const r = FW.w / 2
  for (const wx of xs) {
    p.moveTo(wx, FW.sill)
    p.lineTo(wx, FW.top)
    p.arc(wx + r, FW.top, r, Math.PI, 0)
    p.lineTo(wx + FW.w, FW.sill)
    p.closePath()
  }
  return p
}

/**
 * Put the context into plane `z`'s own cells (as `layer` does, then scaled to cells), without a save: for a clip that
 * has to outlast the plane's transform. Returns the plane's view.
 */
export function enter(ctx: C2, v: View, z: number): View {
  const s = Math.pow(v.h / REF, 1 - z)
  const ox = ANCHOR[0] + z * (v.cx - ANCHOR[0])
  const oy = ANCHOR[1] + z * (v.cy - ANCHOR[1])
  const k = v.k
  ctx.translate(v.cx * k, v.cy * k)
  ctx.scale(s, s)
  ctx.translate(-ox * k, -oy * k)
  ctx.scale(k, k)
  const hw = v.w / 2 / s
  const hh = v.h / 2 / s
  return { x0: ox - hw, y0: oy - hh, x1: ox + hw, y1: oy + hh, cx: ox, cy: oy, w: 2 * hw, h: 2 * hh, k }
}

/**
 * Where plane `z`'s floor is on the screen at this frame (world cells): the eye is the frame's middle. Behind the
 * machine as the planes have it; in front of it, a plain perspective, so the near floor keeps opening out under the
 * camera however far it draws back.
 */
export function floorAt(v: View, z: number): number {
  const s = z < 1 ? Math.pow(v.h / REF, 1 - z) : 1
  return v.cy + s * z * (FLOOR - v.cy)
}

function farWall(ctx: C2, v: View): void {
  const k = v.k
  const world = ctx.getTransform()
  // The window panes in this frame, in the wall's own cells.
  let xs: number[] = []
  layer(ctx, v, FW.z, ANCHOR, REF, (s0) => {
    xs = farWindowsIn(s0.x0, s0.x1)
  })
  layer(ctx, v, FW.z, ANCHOR, REF, (s) => {
    ctx.save()
    ctx.scale(k, k)
    const fy = floorOf(FW.z)
    // The wall; the dawn and the city through its panes (drawn back in the world's cells, without a clip).
    ctx.fillStyle = HP.wall
    ctx.fillRect(s.x0 - 0.1, s.y0 - 0.1, s.w + 0.2, fy - s.y0 + 0.1)
    ctx.save()
    ctx.setTransform(world)
    cityThrough(ctx, v, farWindows(v))
    ctx.restore()
    // Its brick, course by course, between and round the windows: thin filled rules (cheaper to raster than strokes).
    const brick = new Path2D()
    const course = 0.13
    const m = 0.012
    const piers = xs.map((wx): [number, number] => [wx - FW.pitch + FW.w, wx])
    for (let y = Math.ceil(s.y0 / course) * course; y < fy; y += course) {
      const inBand = y > FW.top - FW.w / 2 && y < FW.sill
      const runs: [number, number][] = inBand ? piers.map(([a, b]) => [Math.max(a, s.x0), Math.min(b, s.x1)]) : [[s.x0, s.x1]]
      const row = Math.round(y / course)
      for (const [a, b] of runs) {
        if (b <= a) continue
        brick.rect(a, y, b - a, m)
        for (let x = Math.floor(a / 0.44) * 0.44 + (row % 2) * 0.22; x < b; x += 0.44) if (x > a) brick.rect(x, y, m, course)
      }
    }
    ctx.fillStyle = HP.brick
    ctx.fill(brick)
    // The windows: dawn on their reveals, their glazing bars, the haze on old glass.
    const bars = new Path2D()
    const reveal = new Path2D()
    for (const wx of xs) {
      for (let m = 1; m < 3; m++) {
        bars.rect(wx + (FW.w * m) / 3 - 0.008, FW.top - FW.w * 0.48, 0.016, FW.sill - FW.top + FW.w * 0.48)
      }
      for (let y = FW.top + 0.3; y < FW.sill; y += 0.3) bars.rect(wx, y - 0.008, FW.w, 0.016)
      bars.rect(wx - 0.03, FW.sill, FW.w + 0.06, 0.05)
      reveal.rect(wx - 0.035, FW.top, 0.035, FW.sill - FW.top)
    }
    ctx.fillStyle = 'rgba(170, 200, 210, 0.1)'
    ctx.fill(windowPath(xs))
    ctx.fillStyle = HP.mullion
    ctx.fill(bars)
    ctx.fillStyle = HP.reveal
    ctx.fill(reveal)
    ctx.restore()
  })
}

/* ------------------------------------------------------------------ the press lines */

interface Line {
  /** Its index in the lamps' cascade (1 nearest of the three). */
  i: number
  z: number
  pitch: number
  /** A unit's height, in the plane's cells. */
  h: number
  body: string
  steel: string
  web: string
  /** Its catwalk's height over its floor, and the men on it: their speed, cells a second, and where they set off. */
  walk?: { up: number; men: [number, number][] }
  /** Stacks of finished copies standing between its units, rising a copy a beat. */
  stacks?: boolean
}

const LINES: Line[] = [
  { i: 3, z: 0.32, pitch: 1.12, h: 1.3, body: '#1D2A31', steel: '#2B3D45', web: '#7E8685', walk: { up: 1.65, men: [[0.18, 3.0], [-0.12, 19.0]] } },
  { i: 2, z: 0.48, pitch: 1.7, h: 1.85, body: '#141D22', steel: '#1E2B32', web: '#A29F96', walk: { up: 2.5, men: [[-0.2, 17.5], [0.14, 9.0]] }, stacks: true },
  { i: 1, z: 0.66, pitch: 2.4, h: 2.4, body: '#0D1316', steel: '#141D21', web: '#B9B4A8' },
]

function pressLine(ctx: C2, v: View, t: number, L: Line): void {
  const k = v.k
  layer(ctx, v, L.z, ANCHOR, REF, (s) => {
    ctx.save()
    ctx.scale(k, k)
    const fy = floorOf(L.z)
    const h = L.h
    const lit = lampsOn(t, L.i)
    const run = runOf(t, L.i, 0.9 * L.z)
    const beat = thump(t, 0.1) * (t >= TREADLE ? 1 : 0)
    const swell = downbeat(t, 0.3)
    const i0 = Math.floor((s.x0 - h) / L.pitch)
    const i1 = Math.ceil((s.x1 + h) / L.pitch)
    const frame = new Path2D()
    const steel = new Path2D()
    const spokes = new Path2D()
    const shade = new Path2D()
    const bulb = new Path2D()
    const cone = new Path2D()
    const paper = new Path2D()
    const top = new Path2D()
    const rims = new Path2D()
    const webY = fy - 0.51 * h
    for (let i = i0; i <= i1; i++) {
      const x = i * L.pitch + (hash(i, 1, L.i) - 0.5) * 0.12 * L.pitch
      // The side frame: two posts, a beam over them, a bearing plate, braces, a foot.
      frame.rect(x - 0.42 * h, fy - 0.05 * h, 0.84 * h, 0.05 * h)
      frame.moveTo(x - 0.4 * h, fy)
      frame.lineTo(x - 0.31 * h, fy - 0.84 * h)
      frame.lineTo(x - 0.24 * h, fy - 0.84 * h)
      frame.lineTo(x - 0.31 * h, fy)
      frame.closePath()
      frame.moveTo(x + 0.4 * h, fy)
      frame.lineTo(x + 0.31 * h, fy - 0.84 * h)
      frame.lineTo(x + 0.24 * h, fy - 0.84 * h)
      frame.lineTo(x + 0.31 * h, fy)
      frame.closePath()
      frame.rect(x - 0.34 * h, fy - 0.89 * h, 0.68 * h, 0.06 * h)
      frame.roundRect(x - 0.24 * h, fy - 0.74 * h, 0.48 * h, 0.44 * h, 0.04 * h)
      rims.moveTo(x - 0.2 * h, fy - 0.715 * h)
      rims.lineTo(x + 0.215 * h, fy - 0.715 * h)
      rims.lineTo(x + 0.215 * h, fy - 0.36 * h)
      for (let b = 0; b < 4; b++) rims.rect(x - 0.17 * h + b * 0.11 * h, fy - 0.2 * h, 0.012 * h, 0.012 * h)
      frame.rect(x - 0.13 * h, fy - 1.04 * h, 0.26 * h, 0.16 * h)
      frame.rect(x - 0.33 * h, fy - 0.24 * h, 0.66 * h, 0.03 * h)
      top.rect(x - 0.34 * h, fy - 0.89 * h, 0.68 * h, 0.012 * h)
      // Its two cylinders, turning with the line, the web between them.
      for (const [cy, r, dir] of [[fy - 0.63 * h, 0.11 * h, -1], [fy - 0.39 * h, 0.13 * h, 1]] as const) {
        steel.moveTo(x + r, cy)
        steel.arc(x, cy, r, 0, Math.PI * 2)
        rims.moveTo(x + Math.cos(-2.6) * r * 0.88, cy + Math.sin(-2.6) * r * 0.88)
        rims.arc(x, cy, r * 0.88, -2.6, -1.6)
        const a = (dir * run) / r + i
        for (let n = 0; n < 3; n++) {
          const b = a + (n * Math.PI * 2) / 3
          spokes.moveTo(x + Math.cos(b) * r * 0.2, cy + Math.sin(b) * r * 0.2)
          spokes.lineTo(x + Math.cos(b) * r * 0.85, cy + Math.sin(b) * r * 0.85)
        }
      }
      // Its lamp, on a long cord, and the cone of light it throws.
      const ly = fy - 1.3 * h
      shade.moveTo(x - 0.11 * h, ly + 0.05 * h)
      shade.lineTo(x + 0.11 * h, ly + 0.05 * h)
      shade.lineTo(x + 0.04 * h, ly - 0.03 * h)
      shade.lineTo(x - 0.04 * h, ly - 0.03 * h)
      shade.closePath()
      shade.rect(x - 0.004 * h - 0.004, s.y0 - 0.2, 0.008 * h + 0.008, ly - s.y0 + 0.2)
      bulb.moveTo(x + 0.035 * h, ly + 0.05 * h)
      bulb.arc(x, ly + 0.05 * h, 0.035 * h, 0, Math.PI * 2)
      cone.moveTo(x - 0.09 * h, ly + 0.05 * h)
      cone.lineTo(x + 0.09 * h, ly + 0.05 * h)
      cone.lineTo(x + 0.36 * h, fy)
      cone.lineTo(x - 0.36 * h, fy)
      cone.closePath()
      // Stacks of finished copies, rising a copy a beat from when the line came up.
      if (L.stacks && i % 2 === 0) {
        const sx = x + 0.5 * L.pitch
        const n = Math.max(0, Math.floor((t - TREADLE) / 0.42)) + Math.floor(hash(i, 9, L.i) * 30)
        const sh = Math.min(0.62 * h, 0.06 * h + n * 0.011 * h)
        paper.rect(sx - 0.17 * h, fy - sh, 0.34 * h, sh)
      }
    }
    // The light from the lamps first, so the frames stand in it.
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = rgbaOf(HP.lamp, (0.035 + 0.05 * beat + 0.04 * swell) * lit)
    if (L.i === 1) ctx.fill(cone)
    ctx.restore()
    ctx.fillStyle = L.body
    ctx.fill(frame)
    ctx.fillStyle = rgbaOf(HP.lamp, Math.min(1, 0.08 + 0.3 * lit))
    ctx.fill(top)
    ctx.fillStyle = L.steel
    ctx.fill(steel)
    // The plates' edges and the cylinders' rims, catching what light there is.
    ctx.strokeStyle = rgbaOf(L.i === 1 ? '#5D7A84' : '#4E6872', 0.55 + 0.25 * lit)
    ctx.lineWidth = 0.012 * h
    ctx.stroke(rims)
    if (L.i < 3) {
      ctx.strokeStyle = L.body
      ctx.lineWidth = 0.022 * h
      ctx.stroke(spokes)
    }
    // The web, the whole length of the line, racing; its printed marks going by.
    ctx.strokeStyle = L.web
    ctx.lineWidth = 0.035 * h
    ctx.beginPath()
    ctx.moveTo(s.x0 - 0.5, webY)
    ctx.lineTo(s.x1 + 0.5, webY)
    ctx.stroke()
    const marks = new Path2D()
    const gap = 0.32 * h
    for (let x = Math.floor((s.x0 - run) / gap) * gap + run; x < s.x1 + gap; x += gap) marks.rect(x, webY - 0.012 * h, 0.1 * h, 0.024 * h)
    ctx.fillStyle = rgbaOf('#6F7478', 0.8)
    ctx.fill(marks)
    ctx.fillStyle = rgbaOf(L.web, 0.45)
    ctx.fill(paper)
    if (L.stacks) {
      // Each copy's edge on the stacks.
      ctx.strokeStyle = rgbaOf('#7E7B72', 0.6)
      ctx.lineWidth = 0.006 * h
      ctx.beginPath()
      for (let i = i0; i <= i1; i++) {
        if (i % 2) continue
        const x = i * L.pitch + (hash(i, 1, L.i) - 0.5) * 0.12 * L.pitch + 0.5 * L.pitch
        const n = Math.max(0, Math.floor((t - TREADLE) / 0.42)) + Math.floor(hash(i, 9, L.i) * 30)
        const sh = Math.min(0.62 * h, 0.06 * h + n * 0.011 * h)
        for (let y = fy - 0.022 * h; y > fy - sh; y -= 0.022 * h) {
          ctx.moveTo(x - 0.17 * h, y)
          ctx.lineTo(x + 0.17 * h, y)
        }
      }
      ctx.stroke()
    }
    ctx.fillStyle = HP.ink
    ctx.fill(shade)
    ctx.fillStyle = rgbaOf(HP.bulb, Math.min(1, 0.12 + 0.75 * lit + 0.3 * beat))
    ctx.fill(bulb)
    // The catwalk over the line, its rail, and the men walking it.
    if (L.walk) {
      const dy = fy - L.walk.up
      const rail = new Path2D()
      rail.rect(s.x0 - 0.5, dy, s.w + 1, 0.05 * h)
      rail.rect(s.x0 - 0.5, dy - 0.36 * h, s.w + 1, 0.016 * h)
      rail.rect(s.x0 - 0.5, dy - 0.18 * h, s.w + 1, 0.01 * h)
      for (let x = Math.floor(s.x0 / (0.22 * h)) * 0.22 * h; x < s.x1 + 0.5; x += 0.22 * h) rail.rect(x, dy - 0.36 * h, 0.012 * h, 0.36 * h)
      // Its hangers, up into the roof.
      for (let x = Math.floor(s.x0 / (1.6 * h)) * 1.6 * h; x < s.x1 + 0.5; x += 1.6 * h) rail.rect(x, s.y0 - 0.2, 0.014 * h, dy - s.y0 + 0.2)
      const men = new Path2D()
      const tall = 0.6 * h
      for (const [vx, x0] of L.walk.men) {
        const span = 26 * L.z + 6
        const x = (((x0 + vx * t - s.x0) % span) + span) % span + s.x0 - 1
        if (x < s.x0 - 1 || x > s.x1 + 1) continue
        const stride = Math.sin(t * 5.2 + x0)
        figure(men, x, dy, tall, stride, vx < 0 ? -1 : 1)
      }
      ctx.fillStyle = HP.ink
      ctx.fill(rail)
      ctx.fill(men)
    }
    ctx.restore()
  })
}

/** A limb from a to b, `w` thick: a quad added to `p`. */
function limb(p: Path2D, ax: number, ay: number, bx: number, by: number, w: number): void {
  const l = Math.hypot(bx - ax, by - ay) || 1
  const nx = (-(by - ay) / l) * (w / 2)
  const ny = ((bx - ax) / l) * (w / 2)
  p.moveTo(ax + nx, ay + ny)
  p.lineTo(bx + nx, by + ny)
  p.lineTo(bx - nx, by - ny)
  p.lineTo(ax - nx, ay - ny)
  p.closePath()
}

/** A man in silhouette at `x`, his feet at `y`, `tall` high, mid-stride, facing `dir`: a cap, a work jacket, arms and legs swinging. */
export function figure(p: Path2D, x: number, y: number, tall: number, stride: number, dir: number): void {
  const u = tall
  p.moveTo(x + 0.062 * u, y - 0.885 * u)
  p.arc(x, y - 0.885 * u, 0.062 * u, 0, Math.PI * 2)
  p.rect(x - 0.065 * u + (dir > 0 ? 0.01 : -0.05) * u, y - 0.945 * u, 0.17 * u, 0.028 * u)
  p.rect(x - 0.06 * u, y - 0.95 * u, 0.12 * u, 0.05 * u)
  p.moveTo(x - 0.115 * u, y - 0.79 * u)
  p.quadraticCurveTo(x, y - 0.83 * u, x + 0.115 * u, y - 0.79 * u)
  p.lineTo(x + 0.09 * u, y - 0.45 * u)
  p.lineTo(x - 0.09 * u, y - 0.45 * u)
  p.closePath()
  const a = 0.13 * stride * u
  limb(p, x - 0.04 * u, y - 0.47 * u, x - a, y, 0.065 * u)
  limb(p, x + 0.04 * u, y - 0.47 * u, x + a, y, 0.065 * u)
  limb(p, x - 0.1 * u, y - 0.77 * u, x - 0.1 * u + a * 0.7, y - 0.5 * u, 0.05 * u)
  limb(p, x + 0.1 * u, y - 0.77 * u, x + 0.1 * u - a * 0.7, y - 0.5 * u, 0.05 * u)
}

/* ------------------------------------------------------------------ overhead */

/** The overhead conveyor: a rail high over the middle line, hooks on its chain, a bundle on each, going toward the door. */
function conveyor(ctx: C2, v: View, t: number): void {
  const z = 0.6
  const k = v.k
  layer(ctx, v, z, ANCHOR, REF, (s) => {
    ctx.save()
    ctx.scale(k, k)
    const ry = floorOf(z) - 6.6 * z
    const p = new Path2D()
    p.rect(s.x0 - 0.5, ry - 0.06, s.w + 1, 0.06)
    for (let x = Math.floor(s.x0 / 2.4) * 2.4; x < s.x1 + 0.5; x += 2.4) p.rect(x, s.y0 - 0.2, 0.03, ry - s.y0 + 0.2)
    const bundles = new Path2D()
    const straps = new Path2D()
    const pitch = 1.15
    const go = 0.42 * t
    for (let x = Math.floor((s.x0 - go) / pitch) * pitch + go; x < s.x1 + 1; x += pitch) {
      const i = Math.round((x - go) / pitch)
      const lean = 0.12 * sway(t, 0.37, i)
      const hx = x + lean * 0.35
      p.moveTo(x - 0.01, ry)
      p.lineTo(hx - 0.012, ry + 0.34)
      p.lineTo(hx + 0.012, ry + 0.34)
      p.lineTo(x + 0.01, ry)
      p.closePath()
      if (hash(i, 4) < 0.25) {
        // An empty hook.
        p.rect(hx - 0.04, ry + 0.33, 0.08, 0.025)
        continue
      }
      bundles.rect(hx - 0.2, ry + 0.36, 0.4, 0.32)
      straps.rect(hx - 0.012, ry + 0.36, 0.024, 0.32)
      straps.rect(hx - 0.2, ry + 0.5, 0.4, 0.018)
    }
    ctx.fillStyle = '#0E1417'
    ctx.fill(p)
    ctx.fillStyle = '#6E6C66'
    ctx.fill(bundles)
    ctx.fillStyle = '#1A2328'
    ctx.fill(straps)
    ctx.restore()
  })
}

/**
 * The paper in the roof: webs taken up off the lines over turning bars and run across under the roof to the
 * folders, racing, white in the dark. Each is a run of straight legs through rollers, in a plane just behind the
 * machine's.
 */
const RIBBONS: { z: number; pts: Pt[]; v: number }[] = [
  { z: 0.62, pts: [[7.4, -5], [9.4, -1.3], [31, -1.3], [33, -5]], v: 1.9 },
  { z: 0.55, pts: [[25.5, -5], [23.6, -0.9], [-2, -0.9], [-4, -5]], v: 2.3 },
  { z: 0.7, pts: [[11.8, -6], [13.6, -2.0], [40, -2.0]], v: 1.6 },
  { z: 0.48, pts: [[3.0, -5], [4.6, -0.2], [17.5, -0.2], [19.2, -5]], v: 2.0 },
]

function ribbons(ctx: C2, v: View, t: number): void {
  const k = v.k
  for (const R of RIBBONS) {
    layer(ctx, v, R.z, ANCHOR, REF, (s) => {
      const xs = R.pts.map((q) => q[0])
      const ys = R.pts.map((q) => q[1])
      if (Math.max(...xs) < s.x0 - 0.5 || Math.min(...xs) > s.x1 + 0.5 || Math.max(...ys) < s.y0 - 0.5 || Math.min(...ys) > s.y1 + 0.5) return
      ctx.save()
      ctx.scale(k, k)
      const lit = lampsOn(t, 1)
      const run = runOf(t, 1, R.v)
      const path = new Path2D()
      path.moveTo(R.pts[0][0], R.pts[0][1])
      for (const q of R.pts.slice(1)) path.lineTo(q[0], q[1])
      ctx.lineJoin = 'round'
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.strokeStyle = rgbaOf(HP.lamp, 0.05 + 0.05 * lit)
      ctx.lineWidth = 0.22
      ctx.stroke(path)
      ctx.restore()
      ctx.strokeStyle = rgbaOf(HP.paper, 0.85)
      ctx.lineWidth = 0.045
      ctx.stroke(path)
      // Marks going by: the grain of the paper running.
      const ticks = new Path2D()
      let d0 = 0
      for (let j = 1; j < R.pts.length; j++) {
        const [ax, ay] = R.pts[j - 1]
        const [bx, by] = R.pts[j]
        const len = Math.hypot(bx - ax, by - ay)
        const ux = (bx - ax) / len
        const uy = (by - ay) / len
        const gap = 0.36
        for (let d = (((run - d0) % gap) + gap) % gap; d < len; d += gap) {
          const x = ax + ux * d
          const y = ay + uy * d
          if (x < s.x0 - 0.2 || x > s.x1 + 0.2 || y < s.y0 - 0.2 || y > s.y1 + 0.2) continue
          ticks.moveTo(x, y)
          ticks.lineTo(x + ux * 0.1, y + uy * 0.1)
        }
        d0 += len
      }
      ctx.strokeStyle = rgbaOf('#7C7F80', 0.75)
      ctx.lineWidth = 0.03
      ctx.stroke(ticks)
      // The rollers it turns over.
      const rollers = new Path2D()
      for (const [x, y] of R.pts.slice(1, -1)) {
        rollers.moveTo(x + 0.11, y)
        rollers.arc(x, y, 0.11, 0, Math.PI * 2)
      }
      ctx.fillStyle = '#4D6670'
      ctx.fill(rollers)
      ctx.restore()
    })
  }
}

/* ------------------------------------------------------------------ the machine's plane: roof, columns, floor */

const ROOF = -7.3
const TRUSS = { top: -6.1, bottom: -5.15 }
/** The hall's columns, standing behind the machine where it leaves room. */
export const COLUMNS = [2.28, 9.8, 16.3, 20.5]

function roof(ctx: C2, v: View, t: number): void {
  const k = v.k
  ctx.save()
  ctx.scale(k, k)
  const x0 = v.x0 - 0.5
  const x1 = Math.min(v.x1 + 0.5, DOOR_X)
  if (v.y0 < TRUSS.bottom + 0.2) {
    // The roof's underside, its north lights glowing with the dawn, and the truss under it.
    ctx.fillStyle = '#0D1215'
    ctx.fillRect(x0, v.y0 - 0.5, x1 - x0, ROOF - v.y0 + 0.5)
    const glass = new Path2D()
    const frame = new Path2D()
    for (let x = Math.floor(x0 / 2.2) * 2.2; x < x1; x += 2.2) {
      glass.moveTo(x, ROOF)
      glass.lineTo(x + 0.25, ROOF - 0.9)
      glass.lineTo(x + 1.0, ROOF - 0.9)
      glass.lineTo(x + 1.0, ROOF)
      glass.closePath()
      frame.moveTo(x + 1.0, ROOF - 0.9)
      frame.lineTo(x + 2.2, ROOF)
      frame.lineTo(x + 1.0, ROOF)
      frame.closePath()
    }
    ctx.fillStyle = HP.skylight
    ctx.fill(glass)
    ctx.fillStyle = '#10171B'
    ctx.fill(frame)
    ctx.fillStyle = '#141B1F'
    ctx.fillRect(x0, ROOF, x1 - x0, 0.18)
    // The truss: chords and its zigzag.
    const tr = new Path2D()
    tr.rect(x0, TRUSS.top, x1 - x0, 0.09)
    tr.rect(x0, TRUSS.bottom - 0.09, x1 - x0, 0.09)
    const bay = 0.8
    for (let x = Math.floor(x0 / bay) * bay; x < x1; x += bay) {
      tr.moveTo(x, TRUSS.bottom)
      tr.lineTo(x + bay / 2, TRUSS.top)
      tr.lineTo(x + bay / 2 + 0.05, TRUSS.top)
      tr.lineTo(x + 0.05, TRUSS.bottom)
      tr.closePath()
      tr.moveTo(x + bay / 2, TRUSS.top)
      tr.lineTo(x + bay, TRUSS.bottom)
      tr.lineTo(x + bay - 0.05, TRUSS.bottom)
      tr.lineTo(x + bay / 2 - 0.05, TRUSS.top)
      tr.closePath()
    }
    // Hangers from the roof to the truss.
    for (let x = Math.floor(x0 / 2.2) * 2.2 + 1.0; x < x1; x += 2.2) tr.rect(x, ROOF, 0.03, TRUSS.top - ROOF)
    ctx.fillStyle = HP.truss
    ctx.fill(tr)
  }
  // The columns: I-beams from the truss to the floor, their flanges catching the lamps.
  const col = new Path2D()
  const hi = new Path2D()
  for (const cx of COLUMNS) {
    if (cx + 0.3 < v.x0 || cx - 0.3 > v.x1) continue
    col.rect(cx - 0.14, TRUSS.top, 0.28, FLOOR - TRUSS.top)
    col.rect(cx - 0.22, FLOOR - 0.12, 0.44, 0.12)
    // Its knee braces up into the truss.
    col.moveTo(cx - 0.14, TRUSS.bottom + 0.9)
    col.lineTo(cx - 0.9, TRUSS.bottom)
    col.lineTo(cx - 0.75, TRUSS.bottom)
    col.lineTo(cx - 0.14, TRUSS.bottom + 0.7)
    col.closePath()
    col.moveTo(cx + 0.14, TRUSS.bottom + 0.9)
    col.lineTo(cx + 0.9, TRUSS.bottom)
    col.lineTo(cx + 0.75, TRUSS.bottom)
    col.lineTo(cx + 0.14, TRUSS.bottom + 0.7)
    col.closePath()
    hi.rect(cx + 0.11, TRUSS.top, 0.025, FLOOR - TRUSS.top)
    hi.rect(cx - 0.135, TRUSS.top, 0.012, FLOOR - TRUSS.top)
    for (let y = TRUSS.bottom + 0.4; y < FLOOR - 0.2; y += 0.35) {
      hi.rect(cx - 0.1, y, 0.03, 0.03)
      hi.rect(cx + 0.06, y, 0.03, 0.03)
    }
  }
  ctx.fillStyle = HP.column
  ctx.fill(col)
  ctx.fillStyle = rgbaOf(HP.columnHi, 0.75 + 0.25 * thump(t))
  ctx.fill(hi)
  ctx.restore()
}

/**
 * The floor between two planes, from the far wall's foot to under the camera: its plates' seams, set where the planes
 * put them (`floorAt`), and lines running back toward the eye.
 */
function floorLines(ctx: C2, v: View, z0: number, z1: number, color: string): void {
  const k = v.k
  const ey = v.cy
  const drop = FLOOR - ey
  if (drop <= 0.05) return
  const ya = floorAt(v, z0)
  const yb = Math.min(v.y1 + 0.2, floorAt(v, z1))
  if (yb <= ya + 0.002 || ya > v.y1) return
  ctx.save()
  ctx.scale(k, k)
  ctx.fillStyle = color
  ctx.fillRect(v.x0 - 0.5, ya, v.w + 1, yb - ya + 0.01)
  const p = new Path2D()
  // Seams across, at even steps of depth.
  for (let z = 0.2; z < 12; z *= 1.14) {
    const y = floorAt(v, z)
    if (y < ya || y > yb) continue
    p.moveTo(v.x0 - 0.5, y)
    p.lineTo(v.x1 + 0.5, y)
  }
  // Lines running back toward the eye, through every 0.6 of the machine's floor: only where the floor is seen
  // (behind the middle line it is all but hidden).
  const step = z1 < 0.6 ? Infinity : 0.6
  const fa = (ya - ey) / drop
  const fb = (yb - ey) / drop
  const xa = v.cx + (v.x0 - 1 - v.cx) / Math.max(0.05, fa)
  const xb = v.cx + (v.x1 + 1 - v.cx) / Math.max(0.05, fa)
  for (let x = Number.isFinite(step) ? Math.floor(xa / step) * step : xb; x < xb; x += step) {
    const ax = v.cx + (x - v.cx) * fa
    const bx = v.cx + (x - v.cx) * fb
    if (Math.max(ax, bx) < v.x0 - 0.5 || Math.min(ax, bx) > v.x1 + 0.5) continue
    p.moveTo(ax, ya)
    p.lineTo(bx, yb)
  }
  ctx.strokeStyle = HP.floorLine
  ctx.lineWidth = 0.014
  ctx.stroke(p)
  ctx.restore()
}

/* ------------------------------------------------------------------ the whole */

/** The hall behind the machine, back to front: the far wall, the lines, the overhead, the roof and columns, the floor. */
export function drawHall(ctx: C2, v: View, t: number): void {
  farWall(ctx, v)
  let zPrev = FW.z
  for (const L of LINES) {
    floorLines(ctx, v, zPrev, L.z, HP.floorFar)
    pressLine(ctx, v, t, L)
    zPrev = L.z
    if (L.i === 2) conveyor(ctx, v, t)
  }
  ribbons(ctx, v, t)
  floorLines(ctx, v, zPrev, 1, HP.floorFar)
  roof(ctx, v, t)
  floorLines(ctx, v, 1, 40, HP.floor)
  walkway(ctx, v)
}

/**
 * On the near floor: the walkway's painted edges, amber, dashed, running the length of the hall in front of the
 * machine; and spoiled sheets lying where the folder throws them.
 */
function walkway(ctx: C2, v: View): void {
  const drop = FLOOR - v.cy
  if (drop <= 0.05 || v.y1 < FLOOR) return
  const k = v.k
  const x1 = Math.min(v.x1 + 0.5, DOOR_X)
  if (x1 <= v.x0) return
  ctx.save()
  ctx.scale(k, k)
  const paint = new Path2D()
  for (const z of [1.12, 1.55]) {
    const y = floorAt(v, z)
    if (y > v.y1 + 0.1) continue
    const w = 0.03 * z
    // Dashes a cell long in the floor's own measure, so they spread as they come nearer.
    const step = 0.9 * z
    const off = (v.cx * (z - 1)) % step
    for (let x = Math.floor((v.x0 - 1) / step) * step - off; x < x1; x += step) paint.rect(x, y, Math.min(0.55 * z, x1 - x), w)
  }
  ctx.fillStyle = rgbaOf('#C98F3E', 0.38)
  ctx.fill(paint)
  // Spoiled sheets by the folder, flat on the floor, foreshortened.
  const sheets = new Path2D()
  for (let i = 0; i < 9; i++) {
    const z = 1.05 + 0.45 * hash(i, 1, 99)
    const y = floorAt(v, z)
    if (y > v.y1 + 0.1) continue
    const x = v.cx + (16.4 + 3.6 * hash(i, 2, 99) - v.cx) * z
    if (x > x1 - 0.3) continue
    const w = 0.22 * z
    const d = 0.05 * z
    const sk = (hash(i, 3, 99) - 0.5) * 0.12 * z
    sheets.moveTo(x, y)
    sheets.lineTo(x + w, y + sk * 0.3)
    sheets.lineTo(x + w + sk, y + d + sk * 0.3)
    sheets.lineTo(x + sk, y + d)
    sheets.closePath()
  }
  ctx.fillStyle = rgbaOf(HP.paper, 0.55)
  ctx.fill(sheets)
  ctx.restore()
}
