import { at, circle, ellipse, glow, hash, knock, line, mix, poly, rect, rgba, round, type Pen } from './skins-pen'
import { flashOf, ring, WEIGHT_H, type Skin } from './skins-kit'

/**
 * Lives from the film's own montage, the fast cuts as Evelyn's mind splits: a jungle at night under a green light
 * and a red ring; a red fractal cracking across the dark between cuts; Jobu's white hall and its cult, arms up; a
 * flat at night lit by a blue television; the tax office in a riot, papers in the air; a park under a weeping
 * willow; a field of pearls, glued on; a house on fire and the hose on it; an arrest in a warm yellow room hung with
 * red paper; a cold room of hams and sausages; black tears on pale cyan, and the shape they run from; and a red
 * canyon on a lake, a double rainbow over it. Each is one backdrop and one weight for the same seesaw, drawn as in
 * `skins-film.ts`: the machine in x -1.15..1.15 under y = -1.7, the world's big silhouette off to the sides or high.
 */

/** Shapes of one colour in one path, filled once. */
function fillPath(pen: Pen, fill: string, add: (ctx: CanvasRenderingContext2D) => void): void {
  const { ctx } = pen
  ctx.beginPath()
  add(ctx)
  ctx.fillStyle = fill
  ctx.fill()
}

/** Lines of one colour in one path, stroked once. */
function strokeLines(pen: Pen, colour: string, w: number, add: (ctx: CanvasRenderingContext2D) => void): void {
  const { ctx } = pen
  ctx.beginPath()
  add(ctx)
  ctx.strokeStyle = colour
  ctx.lineWidth = w
  ctx.stroke()
}

/** Ink the path just traced, from `lod` 1 down. */
function inkPath(pen: Pen, w = 1): void {
  if (pen.lod > 1) return
  pen.ctx.strokeStyle = pen.ink
  pen.ctx.lineWidth = pen.lw * w
  pen.ctx.stroke()
}

/** A leaf from its stem at x, y, `len` long and `wid` across, leaning by `a` from straight up. */
function leafPath(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, wid: number, a: number): void {
  const sx = Math.sin(a)
  const sy = -Math.cos(a)
  const nx = -sy
  const ny = sx
  const mx = x + sx * len * 0.45
  const my = y + sy * len * 0.45
  ctx.moveTo(x, y)
  ctx.quadraticCurveTo(mx + nx * wid, my + ny * wid, x + sx * len, y + sy * len)
  ctx.quadraticCurveTo(mx - nx * wid, my - ny * wid, x, y)
  ctx.closePath()
}

/** A small rectangle `w` by `h` about x, y, turned by `a`, added to the path. */
function tile(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, a: number): void {
  const c = Math.cos(a)
  const s = Math.sin(a)
  const hw = w / 2
  const hh = h / 2
  ctx.moveTo(x + c * -hw - s * -hh, y + s * -hw + c * -hh)
  ctx.lineTo(x + c * hw - s * -hh, y + s * hw + c * -hh)
  ctx.lineTo(x + c * hw - s * hh, y + s * hw + c * hh)
  ctx.lineTo(x + c * -hw - s * hh, y + s * -hw + c * hh)
  ctx.closePath()
}

/* ------------------------------------------------------------------ the jungle, under the green light */

const JUNGLE = {
  night: '#0E2216',
  light: '#9CFF6E',
  leaf: '#071209',
  leafLit: '#1C4A26',
  rib: '#3E7A3A',
  mud: '#0B140C',
  moss: '#1F4A26',
  ring: '#D8283C',
  pot: '#6A4630',
  frond: '#62B848',
  ink: '#B8F0A8',
}

/** The fronds: stem x, y, length, width, lean, lit (1) or dark (0). The top ones hang down from out of frame. */
const JUNGLE_LEAVES: readonly [number, number, number, number, number, number][] = [
  [-2.75, 0, 2.0, 0.42, 0.28, 0],
  [-2.25, 0, 1.5, 0.34, 0.6, 1],
  [-1.85, 0, 0.85, 0.22, 0.98, 0],
  [-2.1, -3.0, 1.35, 0.32, Math.PI - 0.5, 1],
  [2.8, 0, 2.0, 0.42, -0.26, 0],
  [2.35, 0, 1.4, 0.32, -0.55, 1],
  [2.05, 0, 0.8, 0.22, -0.95, 0],
  [2.35, -3.0, 1.2, 0.3, Math.PI + 0.55, 0],
]

const jungle: Skin = {
  key: 'jungle',
  bg: JUNGLE.night,
  ink: JUNGLE.ink,
  floor: JUNGLE.mud,
  edge: JUNGLE.moss,
  plank: '#2E2A1A',
  fulcrum: '#1A1A10',
  back(pen, m, _v) {
    // The hard green light, from high on the right.
    glow(pen, 1.6, -2.4, 3.4, JUNGLE.light, 0.42 + 0.12 * flashOf(m, 1.0, 0.25))
    // The red ring, hanging in the air, shivering when the plank lands.
    const r = 0.27 + 0.03 * ring(m, 0.3, 0.4)
    pen.ctx.beginPath()
    pen.ctx.arc(1.72, -1.62, r, 0, Math.PI * 2)
    pen.ctx.strokeStyle = rgba(JUNGLE.ring, 0.9)
    pen.ctx.lineWidth = pen.lod === 2 ? 0.08 : 0.055
    pen.ctx.stroke()
    // The leaves, dark and lit, swaying a little.
    const sw = 0.04 * Math.sin(m.t * 0.7) + 0.07 * ring(m, 0.5, 0.5)
    for (const tone of [0, 1]) {
      fillPath(pen, tone ? JUNGLE.leafLit : JUNGLE.leaf, (ctx) => {
        for (const [x, y, len, wid, a, t] of JUNGLE_LEAVES) if (t === tone) leafPath(ctx, x, y, len, wid, a + sw * (x < 0 ? 1 : -1))
      })
    }
    if (pen.lod === 0) strokeLines(pen, JUNGLE.rib, pen.lw * 0.9, (ctx) => {
      for (const [x, y, len, , a0] of JUNGLE_LEAVES) {
        const a = a0 + sw * (x < 0 ? 1 : -1)
        ctx.moveTo(x, y)
        ctx.lineTo(x + Math.sin(a) * len * 0.92, y - Math.cos(a) * len * 0.92)
      }
    })
  },
  weight(pen) {
    // A fern in a pot.
    const h = WEIGHT_H
    fillPath(pen, JUNGLE.frond, (ctx) => {
      leafPath(ctx, 0, -h * 0.45, h * 0.6, 0.06, 0)
      leafPath(ctx, -0.02, -h * 0.45, h * 0.5, 0.05, -0.75)
      leafPath(ctx, 0.02, -h * 0.45, h * 0.5, 0.05, 0.75)
    })
    poly(pen, [[-0.1, 0], [0.1, 0], [0.13, -h * 0.45], [-0.13, -h * 0.45]], JUNGLE.pot, 0.8)
    if (pen.lod <= 1) rect(pen, -0.14, -h * 0.5, 0.28, 0.05, mix(JUNGLE.pot, '#000000', 0.25), 0.6)
  },
}

/* ------------------------------------------------------------------ the red fractal, between cuts */

const FRACTAL = {
  dark: '#0A0D22',
  floor: '#151934',
  edge: '#262C55',
  red: '#B81A2E',
  hot: '#FF6A78',
  rock: '#2A2346',
  hollow: '#4A3E78',
  ink: '#9AA6E0',
}

/** The bolts, as segments x0, y0, x1, y1 by depth (0 the trunks), grown once from two bursts at the sides. */
const BOLTS: number[][] = [[], [], []]
;(() => {
  const grow = (x: number, y: number, a: number, len: number, d: number, s: number) => {
    // A crooked segment: a kink partway along it.
    const ex = x + Math.sin(a) * len
    const ey = y - Math.cos(a) * len
    const k = (hash(s, d, 7) - 0.5) * len * 0.35
    const kx = (x + ex) / 2 + Math.cos(a) * k
    const ky = (y + ey) / 2 + Math.sin(a) * k
    // Keep out of the machine's space.
    const inside = (px: number, py: number) => px > -1.3 && px < 1.3 && py > -1.85
    if (inside(ex, ey) || inside(kx, ky)) return
    BOLTS[d].push(x, y, kx, ky, ex, ey)
    if (d < 2) for (const turn of [-1, 1]) grow(ex, ey, a + turn * (0.45 + 0.35 * hash(s, turn, d)), len * 0.62, d + 1, s * 3 + turn + 2)
  }
  for (const [cx, cy, as] of [[-2.15, -1.8, [-0.4, 1.0, -2.3, 3.0]], [2.2, -1.25, [0.5, -1.1, 2.4, -2.9]]] as const) {
    as.forEach((a, i) => grow(cx, cy, a, 0.72, 0, i * 11 + (cx > 0 ? 5 : 1)))
  }
})()

const fractal: Skin = {
  key: 'fractal',
  bg: FRACTAL.dark,
  ink: FRACTAL.ink,
  floor: FRACTAL.floor,
  edge: FRACTAL.edge,
  plank: '#2C2F52',
  fulcrum: '#1C1F3C',
  back(pen, m, _v) {
    // The bursts glow, and crackle brighter on the slam.
    const f = flashOf(m, 0.9, 0.2)
    glow(pen, -2.15, -1.8, 1.5 + 0.4 * f, FRACTAL.red, 0.3 + 0.35 * f)
    glow(pen, 2.2, -1.25, 1.5 + 0.4 * f, FRACTAL.red, 0.3 + 0.35 * f)
    const colour = mix(FRACTAL.red, FRACTAL.hot, 0.15 + 0.85 * f)
    const deep = pen.lod === 2 ? 0 : pen.lod === 1 ? 1 : 2
    for (let d = 0; d <= deep; d++) {
      strokeLines(pen, colour, pen.lod === 2 ? 0.07 : [0.055, 0.032, 0.018][d], (ctx) => {
        const s = BOLTS[d]
        for (let i = 0; i < s.length; i += 6) {
          ctx.moveTo(s[i], s[i + 1])
          ctx.lineTo(s[i + 2], s[i + 3])
          ctx.lineTo(s[i + 4], s[i + 5])
        }
      })
    }
    circle(pen, -2.15, -1.8, 0.07, colour, 0)
    circle(pen, 2.2, -1.25, 0.07, colour, 0)
  },
  weight(pen) {
    // A split geode: a dark crystal, its hollow, and a red vein through it.
    const h = WEIGHT_H
    poly(pen, [[-0.14, 0], [0.14, 0], [0.16, -h * 0.5], [0.07, -h], [-0.09, -h * 0.92], [-0.16, -h * 0.45]], FRACTAL.rock, 0.8)
    if (pen.lod <= 1) {
      poly(pen, [[-0.07, -0.06], [0.08, -0.07], [0.09, -h * 0.55], [0.02, -h * 0.8], [-0.08, -h * 0.5]], FRACTAL.hollow, 0)
      strokeLines(pen, FRACTAL.red, 0.022, (ctx) => {
        ctx.moveTo(-0.15, -h * 0.3)
        ctx.lineTo(-0.02, -h * 0.42)
        ctx.lineTo(0.03, -h * 0.62)
        ctx.lineTo(0.12, -h * 0.75)
      })
    }
  },
}

/* ------------------------------------------------------------------ Jobu's white hall */

const HALL = {
  white: '#F3F0E8',
  recess: '#DED7C9',
  stone: '#DAD3C4',
  step: '#C7BEAC',
  robe: '#A9A090',
  robeFar: '#C2BAAB',
  light: '#FFF4D6',
  pearl: '#FFFFFF',
  ink: '#6E665A',
}

const ARCHES = [-2.8, -1.4, 0, 1.4, 2.8]

/** The faithful: foot x, scale, which row (0 front). */
const FAITHFUL: readonly [number, number, number][] = [
  [-1.65, 1, 0], [-2.15, 1, 0], [-2.65, 1, 0], [-3.15, 1, 0],
  [1.8, 1, 0], [2.3, 1, 0], [2.8, 1, 0], [3.3, 1, 0],
  [-1.9, 0.78, 1], [-2.4, 0.78, 1], [-2.9, 0.78, 1], [2.05, 0.78, 1], [2.55, 0.78, 1], [3.05, 0.78, 1],
]

/** A robed figure, arms raised, its foot at x, 0, added to the path. */
function faithful(ctx: CanvasRenderingContext2D, x: number, s: number, lift: number): void {
  ctx.moveTo(x - 0.2 * s, 0)
  ctx.lineTo(x + 0.2 * s, 0)
  ctx.lineTo(x + 0.11 * s, -0.56 * s)
  ctx.lineTo(x - 0.11 * s, -0.56 * s)
  ctx.closePath()
  ctx.moveTo(x + 0.085 * s, -0.66 * s)
  ctx.arc(x, -0.66 * s, 0.085 * s, 0, Math.PI * 2)
  for (const d of [-1, 1]) {
    const hx = x + d * 0.25 * s
    const hy = (-1.0 - lift) * s
    ctx.moveTo(x + d * 0.06 * s, -0.54 * s)
    ctx.lineTo(x + d * 0.12 * s, -0.54 * s)
    ctx.lineTo(hx + d * 0.035 * s, hy)
    ctx.lineTo(hx - d * 0.035 * s, hy)
    ctx.closePath()
  }
}

const temple: Skin = {
  key: 'temple',
  bg: HALL.white,
  ink: HALL.ink,
  floor: HALL.stone,
  edge: HALL.step,
  plank: '#FBF8F2',
  fulcrum: '#D6CFC0',
  back(pen, m, v) {
    // The tall arches of the hall, in a row along the back wall.
    fillPath(pen, HALL.recess, (ctx) => {
      for (const x of ARCHES) {
        if (x + 0.45 < v.x0 || x - 0.45 > v.x1) continue
        ctx.moveTo(x - 0.45, 0)
        ctx.lineTo(x - 0.45, -2.25)
        ctx.arc(x, -2.25, 0.45, Math.PI, 0)
        ctx.lineTo(x + 0.45, 0)
        ctx.closePath()
      }
    })
    if (pen.lod <= 1) inkPath(pen, 0.8)
    // The light falling in, from on high.
    glow(pen, 0, -2.9, 2.6, HALL.light, 0.7)
    // The faithful, either side, raising their arms higher when the plank lands.
    const lift = 0.08 * knock(m.since, 0.35)
    for (const row of pen.lod === 0 ? [1, 0] : [0]) {
      fillPath(pen, row ? HALL.robeFar : HALL.robe, (ctx) => {
        for (const [x, s, r] of FAITHFUL) if (r === row && x > v.x0 - 0.3 && x < v.x1 + 0.3) faithful(ctx, x, s, lift)
      })
    }
  },
  weight(pen) {
    // A small white pedestal, three pearls on it.
    const h = WEIGHT_H
    rect(pen, -0.14, -0.05, 0.28, 0.05, HALL.white, 0.8)
    rect(pen, -0.09, -h + 0.13, 0.18, h - 0.18, HALL.white, 0.8)
    rect(pen, -0.13, -h + 0.1, 0.26, 0.04, HALL.white, 0.8)
    for (const [x, y] of [[-0.06, -h + 0.05], [0.06, -h + 0.05], [0, -h + 0.03]] as const) circle(pen, x, y, 0.045, HALL.pearl, 0.7)
  },
}

/* ------------------------------------------------------------------ the blue flat at night */

const FLAT = {
  wall: '#15162E',
  floor: '#2A2238',
  edge: '#3A3150',
  shelf: '#2C2A48',
  clutter: ['#55507A', '#6E5A44', '#3E5A6E', '#7A6E4A'],
  set: '#3A3A50',
  screen: '#5EA6FF',
  blue: '#2F7BFF',
  gold: '#E2B33A',
  ink: '#C8CCF0',
}

/** The clutter on the shelves: x, y (bottom), w, h, colour. */
const CLUTTER: readonly [number, number, number, number, number][] = (() => {
  const out: [number, number, number, number, number][] = []
  for (let r = 0; r < 4; r++) {
    let x = -3.05
    for (let i = 0; i < 6 && x < -1.75; i++) {
      const w = 0.12 + 0.18 * hash(i, r, 21)
      const h = 0.18 + 0.26 * hash(i, r, 22)
      out.push([x, -0.06 - r * 0.55, Math.min(w, -1.68 - x), h, Math.floor(hash(i, r, 23) * 4)])
      x += w + 0.03
    }
  }
  return out
})()

const crt: Skin = {
  key: 'crt',
  bg: FLAT.wall,
  ink: FLAT.ink,
  floor: FLAT.floor,
  edge: FLAT.edge,
  plank: '#4A3A2E',
  fulcrum: '#2E2430',
  back(pen, m, _v) {
    // Shelves on the left, crammed.
    rect(pen, -3.15, -2.3, 1.55, 2.3, FLAT.shelf, 0.8)
    if (pen.lod === 2) rect(pen, -3.05, -2.1, 1.35, 1.9, FLAT.clutter[0], 0)
    else {
      for (let c = 0; c < 4; c++) {
        fillPath(pen, FLAT.clutter[c], (ctx) => {
          for (const [x, y, w, h, k] of CLUTTER) if (k === c && (pen.lod === 0 || w > 0.18)) ctx.rect(x, y - h, w, h)
        })
      }
      fillPath(pen, mix(FLAT.shelf, '#000000', 0.3), (ctx) => {
        for (let r = 0; r < 4; r++) ctx.rect(-3.15, -0.06 - r * 0.55, 1.55, 0.05)
      })
    }
    // The television on its cabinet, glowing hard blue, harder on the slam.
    const f = flashOf(m, 0.9, 0.25)
    glow(pen, 2.2, -1.0, 2.0, FLAT.blue, 0.5 + 0.25 * f)
    rect(pen, 1.55, -0.55, 1.4, 0.55, FLAT.shelf, 0.8)
    round(pen, 1.7, -1.42, 1.0, 0.88, 0.1, FLAT.set, 0.9)
    round(pen, 1.8, -1.33, 0.72, 0.68, 0.12, mix(FLAT.screen, '#FFFFFF', 0.1 + 0.4 * f), 0.7)
    if (pen.lod <= 1) {
      circle(pen, 2.61, -1.2, 0.03, FLAT.gold, 0)
      circle(pen, 2.61, -1.1, 0.03, FLAT.gold, 0)
      strokeLines(pen, FLAT.ink, pen.lw, (ctx) => {
        ctx.moveTo(2.2, -1.42)
        ctx.lineTo(1.98, -1.8)
        ctx.moveTo(2.2, -1.42)
        ctx.lineTo(2.45, -1.78)
      })
    }
    // A gold pendant hanging from the ceiling, swinging when the floor is struck.
    at(pen, 0.65, -3.2, ring(m, 0.55, 0.6) * 0.12, 1, () => {
      line(pen, 0, 0, 0, 1.08, FLAT.gold, 0.02)
      circle(pen, 0, 1.18, 0.13, FLAT.gold, 0.8)
      if (pen.lod <= 1) circle(pen, 0, 1.18, 0.06, FLAT.wall, 0)
    })
  },
  weight(pen) {
    // A small television, its screen on.
    const h = WEIGHT_H
    if (pen.lod <= 1) strokeLines(pen, FLAT.ink, pen.lw, (ctx) => {
      ctx.moveTo(0, -h * 0.72)
      ctx.lineTo(-0.08, -h)
      ctx.moveTo(0, -h * 0.72)
      ctx.lineTo(0.09, -h * 0.98)
    })
    round(pen, -0.16, -h * 0.72, 0.32, h * 0.72, 0.04, FLAT.set, 0.8)
    round(pen, -0.12, -h * 0.64, 0.19, h * 0.54, 0.04, FLAT.screen, 0)
  },
}

/* ------------------------------------------------------------------ the tax office, in a riot */

const RIOT = {
  wall: '#CFCB9A',
  carpet: '#7A7E60',
  edge: '#5E624A',
  panel: '#A89C7E',
  trim: '#6E6650',
  tube: '#F6FFD6',
  light: '#E8FF96',
  paper: '#FBF9EF',
  chair: '#36363A',
  ink: '#3A3826',
}

/** Papers in the air: x, y, turn. */
const PAPERS: readonly [number, number, number][] = [
  [-2.7, -1.35, 0.4], [-2.15, -1.95, -0.6], [-1.55, -2.3, 0.9], [-2.95, -2.15, -0.2], [-1.75, -1.15, 0.2],
  [-0.65, -2.1, -0.9], [0.35, -2.0, 0.5], [1.05, -2.35, -0.3], [1.7, -1.95, 1.1], [2.35, -1.55, -0.5],
  [2.85, -2.1, 0.3], [1.95, -2.55, -1.0], [-1.45, -1.9, -1.2], [2.95, -1.25, 0.8],
]

const riot: Skin = {
  key: 'riot',
  bg: RIOT.wall,
  ink: RIOT.ink,
  floor: RIOT.carpet,
  edge: RIOT.edge,
  plank: '#9A8C6A',
  fulcrum: '#6A6450',
  back(pen, m, v) {
    // The fluorescent tubes, buzzing yellow-green.
    glow(pen, 0, -2.3, 3.2, RIOT.light, 0.45)
    fillPath(pen, RIOT.tube, (ctx) => {
      for (const x of [-2.4, -0.6, 1.2]) ctx.rect(x, -2.3, 1.2, 0.09)
    })
    if (pen.lod <= 1) fillPath(pen, RIOT.trim, (ctx) => {
      for (const x of [-2.4, -0.6, 1.2]) ctx.rect(x - 0.04, -2.35, 1.28, 0.05)
    })
    // Cubicle partitions, low, either side.
    rect(pen, v.x0 - 0.1, -0.9, -1.45 - v.x0 + 0.1, 0.9, RIOT.panel, 0.8)
    rect(pen, 2.75, -0.9, v.x1 - 2.65, 0.9, RIOT.panel, 0.8)
    rect(pen, v.x0 - 0.1, -0.96, -1.45 - v.x0 + 0.1, 0.07, RIOT.trim, 0)
    rect(pen, 2.75, -0.96, v.x1 - 2.65, 0.07, RIOT.trim, 0)
    if (pen.lod === 0) strokeLines(pen, rgba(RIOT.trim, 0.6), pen.lw, (ctx) => {
      for (const x of [-2.05, -2.65, -3.25]) {
        ctx.moveTo(x, -0.9)
        ctx.lineTo(x, 0)
      }
    })
    // The empty wheelchair, left at the side.
    const cx = 2.2
    if (pen.lod <= 1) strokeLines(pen, RIOT.chair, 0.035, (ctx) => {
      ctx.moveTo(cx + 0.3, -0.45)
      ctx.lineTo(cx + 0.36, -1.0)
      ctx.lineTo(cx + 0.46, -1.02)
      ctx.moveTo(cx - 0.22, -0.45)
      ctx.lineTo(cx - 0.28, -0.12)
      ctx.lineTo(cx - 0.4, -0.12)
      ctx.moveTo(cx + 0.06, -0.3)
      ctx.arc(cx, -0.3, 0.06, 0, Math.PI * 2)
    })
    pen.ctx.beginPath()
    pen.ctx.arc(cx, -0.3, 0.27, 0, Math.PI * 2)
    pen.ctx.strokeStyle = RIOT.chair
    pen.ctx.lineWidth = pen.lod === 2 ? 0.08 : 0.055
    pen.ctx.stroke()
    rect(pen, cx - 0.26, -0.52, 0.58, 0.08, RIOT.chair, 0)
    rect(pen, cx + 0.28, -0.98, 0.08, 0.5, RIOT.chair, 0)
    circle(pen, cx - 0.3, -0.05, 0.05, RIOT.chair, 0)
    // The papers, flung up on the slam and drifting.
    const k = knock(m.since, 0.45)
    const n = pen.lod === 2 ? 6 : pen.lod === 1 ? 10 : PAPERS.length
    fillPath(pen, RIOT.paper, (ctx) => {
      for (let i = 0; i < n; i++) {
        const [x, y, a] = PAPERS[i]
        const up = 0.3 * k * (0.5 + hash(i, 4, 9))
        tile(ctx, x + 0.04 * Math.sin(m.t * 0.9 + i), y - up + 0.05 * Math.sin(m.t * 1.3 + i * 2), 0.17, 0.22, a + 0.3 * Math.sin(m.t * 0.6 + i) + k * 0.6)
      }
    })
    inkPath(pen, 0.6)
  },
  weight(pen) {
    // A stack of tax forms, held by a black clip.
    const h = WEIGHT_H
    rect(pen, -0.15, -h * 0.7, 0.3, h * 0.7, RIOT.paper, 0.8)
    if (pen.lod === 0) strokeLines(pen, rgba(RIOT.ink, 0.45), pen.lw * 0.7, (ctx) => {
      for (const y of [0.14, 0.28, 0.42, 0.56]) {
        ctx.moveTo(-0.15, -h * y)
        ctx.lineTo(0.15, -h * y)
      }
    })
    rect(pen, -0.07, -h * 0.78, 0.14, 0.06, RIOT.chair, 0)
    if (pen.lod <= 1) strokeLines(pen, '#9A9AA0', 0.018, (ctx) => {
      ctx.moveTo(-0.05, -h * 0.78)
      ctx.lineTo(-0.035, -h)
      ctx.lineTo(0.035, -h)
      ctx.lineTo(0.05, -h * 0.78)
    })
  },
}

/* ------------------------------------------------------------------ a park under a weeping willow */

const WILLOW = {
  haze: '#EAE3B4',
  sun: '#FFF0A8',
  grass: '#86A845',
  edge: '#6E9036',
  canopy: '#5C8634',
  curtain: '#78A440',
  frond: '#9CC456',
  bark: '#5E4A32',
  bush: '#A8BE62',
  wicker: '#B88A4E',
  wickerDeep: '#86602E',
  cloth: '#4E78B8',
  ink: '#3A4A22',
}

const willow: Skin = {
  key: 'willow',
  bg: WILLOW.haze,
  ink: WILLOW.ink,
  floor: WILLOW.grass,
  edge: WILLOW.edge,
  plank: '#8A6A44',
  fulcrum: '#5E4A30',
  back(pen, m, _v) {
    // The low sun, flaring behind the right.
    glow(pen, 1.9, -1.6, 2.4, WILLOW.sun, 0.75)
    circle(pen, 1.9, -1.6, 0.3, '#FFF8DC', 0)
    // Soft trees far off on the right.
    fillPath(pen, WILLOW.bush, (ctx) => {
      ctx.ellipse(2.4, -0.25, 0.7, 0.42, 0, 0, Math.PI * 2)
      ctx.moveTo(3.6, -0.3)
      ctx.ellipse(3.1, -0.3, 0.55, 0.6, 0, 0, Math.PI * 2)
    })
    // The willow on the left: its trunk, its crown, and the curtain of fronds that falls from it.
    poly(pen, [[-2.55, 0], [-2.15, 0], [-2.2, -1.5], [-2.4, -1.5]], WILLOW.bark, 0.8)
    const sw = 0.05 * Math.sin(m.t * 0.6)
    const { ctx } = pen
    ctx.beginPath()
    ctx.moveTo(-1.45, -1.7)
    ctx.quadraticCurveTo(-1.25 + sw, -0.9, -1.4 + sw, -0.3)
    for (let i = 1; i <= 6; i++) {
      const x = -1.4 - i * 0.32 + sw
      ctx.quadraticCurveTo(x + 0.16, -0.45 - 0.1 * (i % 2), x, -0.3 - 0.08 * ((i + 1) % 2))
    }
    ctx.lineTo(-3.45, -1.7)
    ctx.closePath()
    ctx.fillStyle = WILLOW.curtain
    ctx.fill()
    ellipse(pen, -2.4, -1.85, 1.15, 0.55, WILLOW.canopy, pen.lod <= 1 ? 0.8 : 0)
    if (pen.lod <= 1) {
      const step = pen.lod === 0 ? 0.13 : 0.26
      strokeLines(pen, WILLOW.frond, pen.lod === 0 ? 0.03 : 0.045, (ctx) => {
        for (let x = -3.35; x < -1.5; x += step) {
          const tip = -0.45 - 0.35 * hash(Math.round(x * 100), 1, 31)
          ctx.moveTo(x, -1.6)
          ctx.quadraticCurveTo(x + 0.05, -1.0, x + sw * 1.5, tip)
        }
      })
    }
  },
  weight(pen) {
    // A picnic basket, its cloth tucked in.
    const h = WEIGHT_H
    if (pen.lod <= 1) {
      pen.ctx.beginPath()
      pen.ctx.arc(0, -h * 0.55, 0.1, Math.PI, 0)
      pen.ctx.strokeStyle = WILLOW.wickerDeep
      pen.ctx.lineWidth = 0.025
      pen.ctx.stroke()
    }
    poly(pen, [[-0.12, 0], [0.12, 0], [0.16, -h * 0.55], [-0.16, -h * 0.55]], WILLOW.wicker, 0.8)
    poly(pen, [[-0.16, -h * 0.55], [0.16, -h * 0.55], [0.1, -h * 0.68], [-0.06, -h * 0.66]], WILLOW.cloth, 0.6)
    if (pen.lod === 0) strokeLines(pen, WILLOW.wickerDeep, pen.lw * 0.8, (ctx) => {
      for (const y of [0.15, 0.3, 0.45]) {
        ctx.moveTo(-0.15 + y * 0.03, -h * y)
        ctx.lineTo(0.15 - y * 0.03, -h * y)
      }
    })
  },
}

/* ------------------------------------------------------------------ the field of pearls */

const PEARL = {
  blush: '#EBC9BC',
  floor: '#D6A898',
  edge: '#C49282',
  pearl: '#E4D6C6',
  shine: '#FFFFFF',
  lid: '#2A1C20',
  lens: '#D9A79C',
  stand: '#C9A86A',
  ink: '#6A4640',
}

/** The pearls, in rows round the eye: x, y, r. The near ones (every other) are kept from far off. */
const PEARLS: readonly [number, number, number][] = (() => {
  const out: [number, number, number][] = []
  for (let k = 0; k < 5; k++) {
    const rx = 1.3 + 0.36 * k
    const ry = 0.45 + 0.34 * k
    const r = 0.08 + 0.008 * k
    const n = Math.round((Math.PI * (rx + ry)) / 0.3)
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + k * 0.3
      const x = Math.cos(a) * rx
      const y = -1.98 + Math.sin(a) * ry
      if (y > -0.15 || Math.abs(x) > 3.5 || y < -3.1) continue
      if (Math.abs(x) < 1.45 && y > -1.9) continue
      out.push([x, y, r])
    }
  }
  return out
})()

const pearls: Skin = {
  key: 'pearls',
  bg: PEARL.blush,
  ink: PEARL.ink,
  floor: PEARL.floor,
  edge: PEARL.edge,
  plank: '#F2E6DA',
  fulcrum: '#C9A396',
  back(pen, m, _v) {
    const { ctx } = pen
    // The eye: a lens of deeper blush, and the dark curve of its lid over it.
    ctx.beginPath()
    ctx.moveTo(-1.0, -1.98)
    ctx.quadraticCurveTo(0, -2.55, 1.0, -1.98)
    ctx.quadraticCurveTo(0, -1.54, -1.0, -1.98)
    ctx.fillStyle = PEARL.lens
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-1.12, -1.92)
    ctx.quadraticCurveTo(0, -2.66, 1.12, -1.92)
    ctx.strokeStyle = PEARL.lid
    ctx.lineWidth = pen.lod === 2 ? 0.14 : 0.11
    ctx.stroke()
    // The pearls, glued in their rows; they catch the light on the slam.
    const f = flashOf(m, 0.9, 0.3)
    const every = pen.lod === 2 ? 4 : pen.lod === 1 ? 2 : 1
    fillPath(pen, mix(PEARL.pearl, PEARL.shine, 0.35 * f), (ctx) => {
      for (let i = 0; i < PEARLS.length; i += every) {
        const [x, y, r] = PEARLS[i]
        const rr = r * (every > 1 ? 1.25 : 1)
        ctx.moveTo(x + rr, y)
        ctx.arc(x, y, rr, 0, Math.PI * 2)
      }
    })
    inkPath(pen, 0.45)
    if (pen.lod <= 1) fillPath(pen, PEARL.shine, (ctx) => {
      for (let i = 0; i < PEARLS.length; i += every) {
        const [x, y, r0] = PEARLS[i]
        const r = r0 * (every > 1 ? 1.25 : 1)
        ctx.moveTo(x - r * 0.3 + r * 0.3, y - r * 0.32)
        ctx.arc(x - r * 0.3, y - r * 0.32, r * 0.3, 0, Math.PI * 2)
      }
    })
  },
  weight(pen) {
    // One big pearl, on a little gold stand.
    const h = WEIGHT_H
    poly(pen, [[-0.11, 0], [0.11, 0], [0.05, -0.1], [-0.05, -0.1]], PEARL.stand, 0.8)
    circle(pen, 0, -h + 0.12, 0.12, PEARL.pearl, 0.8)
    if (pen.lod <= 1) circle(pen, -0.04, -h + 0.08, 0.03, PEARL.shine, 0)
  },
}

/* ------------------------------------------------------------------ the fire, and the hose on it */

const FIRE = {
  smoke: '#2A2030',
  ground: '#2C2826',
  edge: '#463830',
  house: '#140F14',
  flame: '#F07A20',
  core: '#FFD256',
  window: '#FFB040',
  suit: '#E8982C',
  band: '#F4E86A',
  helmet: '#D9B030',
  shadow: '#2A1E1A',
  hose: '#5A4A3A',
  water: '#A8D8F0',
  hydrant: '#E6B830',
  ink: '#E8D6C8',
}

/** Flame tongues off the house: x, base y, height, half-width. */
const TONGUES: readonly [number, number, number, number][] = [
  [1.72, -1.15, 0.6, 0.2], [2.05, -1.45, 0.95, 0.24], [2.4, -1.7, 0.9, 0.22], [2.75, -1.4, 0.8, 0.22], [3.05, -1.15, 0.6, 0.2], [1.95, -0.55, 0.45, 0.13],
]

const fire: Skin = {
  key: 'fire',
  bg: FIRE.smoke,
  ink: FIRE.ink,
  floor: FIRE.ground,
  edge: FIRE.edge,
  plank: '#5A4636',
  fulcrum: '#3A2E2A',
  back(pen, m, _v) {
    const f = flashOf(m, 0.9, 0.3)
    glow(pen, 2.35, -1.3, 2.0 + 0.4 * f, FIRE.flame, 0.45 + 0.25 * f)
    // The house, burning: the flames flare up on the slam.
    const grow = 1 + 0.35 * f
    const tongues = (scale: number, colour: string) =>
      fillPath(pen, colour, (ctx) => {
        TONGUES.forEach(([x, y, h, w], i) => {
          if (pen.lod === 2 && i === 5) return
          const hh = h * scale * grow * (1 + 0.08 * Math.sin(m.t * 5 + i * 1.7))
          const ww = w * scale
          const lean = 0.08 * Math.sin(m.t * 3 + i)
          ctx.moveTo(x - ww, y)
          ctx.quadraticCurveTo(x - ww * 0.6, y - hh * 0.6, x + lean, y - hh)
          ctx.quadraticCurveTo(x + ww * 0.6, y - hh * 0.6, x + ww, y)
          ctx.closePath()
        })
      })
    tongues(1, FIRE.flame)
    poly(pen, [[1.6, 0], [3.1, 0], [3.1, -1.1], [3.28, -1.1], [2.35, -1.78], [1.42, -1.1], [1.6, -1.1]], FIRE.house, 0)
    if (pen.lod <= 1) {
      tongues(0.55, FIRE.core)
      fillPath(pen, FIRE.window, (ctx) => {
        ctx.rect(1.8, -0.85, 0.3, 0.3)
        ctx.rect(2.6, -0.85, 0.3, 0.3)
        ctx.rect(2.22, -0.55, 0.26, 0.55)
      })
    }
    // The water, arcing over from the hose to the roof.
    strokeLines(pen, rgba(FIRE.water, 0.85), pen.lod === 2 ? 0.08 : 0.055, (ctx) => {
      ctx.moveTo(-1.95, -1.08)
      ctx.quadraticCurveTo(0.1, -3.45, 2.1, -1.6)
    })
    if (pen.lod === 0) fillPath(pen, FIRE.water, (ctx) => {
      for (let i = 0; i < 6; i++) {
        const x = 1.95 + 0.12 * i + 0.05 * Math.sin(m.t * 4 + i)
        const y = -1.55 + 0.1 * ((i * 3 + Math.floor(m.t * 6)) % 4)
        ctx.moveTo(x + 0.025, y)
        ctx.arc(x, y, 0.025, 0, Math.PI * 2)
      }
    })
    // The firefighter, braced, the hose trailing behind.
    if (pen.lod <= 1) strokeLines(pen, FIRE.hose, 0.05, (ctx) => {
      ctx.moveTo(-2.15, -0.92)
      ctx.quadraticCurveTo(-2.75, -0.6, -2.7, -0.02)
      ctx.lineTo(-3.6, -0.02)
    })
    const x = -2.32
    fillPath(pen, FIRE.suit, (ctx) => {
      ctx.rect(x - 0.13, -0.5, 0.09, 0.5)
      ctx.rect(x + 0.03, -0.5, 0.09, 0.5)
      ctx.rect(x - 0.15, -1.05, 0.3, 0.6)
      ctx.moveTo(x + 0.05, -0.98)
      ctx.lineTo(x + 0.37, -1.14)
      ctx.lineTo(x + 0.4, -1.04)
      ctx.lineTo(x + 0.1, -0.85)
      ctx.closePath()
    })
    inkPath(pen, 0.8)
    if (pen.lod <= 1) {
      fillPath(pen, FIRE.band, (ctx) => {
        ctx.rect(x - 0.15, -0.66, 0.3, 0.04)
        ctx.rect(x - 0.13, -0.22, 0.25, 0.04)
      })
      rect(pen, x + 0.36, -1.15, 0.06, 0.12, FIRE.hose, 0)
    }
    circle(pen, x, -1.15, 0.1, FIRE.shadow, 0)
    poly(pen, [[x - 0.15, -1.15], [x + 0.17, -1.15], [x + 0.1, -1.27], [x - 0.09, -1.28]], FIRE.helmet, 0.7)
  },
  weight(pen) {
    // A fire hydrant.
    const h = WEIGHT_H
    rect(pen, -0.13, -0.04, 0.26, 0.04, FIRE.hydrant, 0.7)
    rect(pen, -0.08, -h * 0.75, 0.16, h * 0.75 - 0.04, FIRE.hydrant, 0.8)
    rect(pen, -0.14, -h * 0.55, 0.28, 0.07, FIRE.hydrant, 0.7)
    pen.ctx.beginPath()
    pen.ctx.arc(0, -h * 0.75, 0.09, Math.PI, 0)
    pen.ctx.closePath()
    pen.ctx.fillStyle = FIRE.hydrant
    pen.ctx.fill()
    inkPath(pen, 0.8)
    if (pen.lod <= 1) rect(pen, -0.025, -h, 0.05, 0.04, FIRE.hydrant, 0.6)
  },
}

/* ------------------------------------------------------------------ the arrest, in the yellow room */

const ARREST = {
  wall: '#EDC254',
  bulb: '#FFF4C0',
  lino: '#C49A5E',
  edge: '#9A7442',
  red: '#C41E3A',
  gold: '#E8B830',
  navy: '#1E2E5A',
  navyDeep: '#141C38',
  badge: '#E8C64A',
  hand: '#C99A70',
  steel: '#C8CCD4',
  ink: '#4A3018',
}

const DECOR = [-3.0, -2.3, -1.6, -0.9, -0.2, 0.5, 1.2, 1.9, 2.6, 3.3]

const arrest: Skin = {
  key: 'arrest',
  bg: ARREST.wall,
  ink: ARREST.ink,
  floor: ARREST.lino,
  edge: ARREST.edge,
  plank: '#7A5A3A',
  fulcrum: '#4E3A28',
  back(pen, m, v) {
    glow(pen, -0.3, -2.4, 2.8, ARREST.bulb, 0.55)
    // A long red paper banner on the left wall, gold-edged.
    rect(pen, -2.95, -2.05, 0.5, 1.45, ARREST.red, 0.8)
    if (pen.lod <= 1) rect(pen, -2.89, -1.99, 0.38, 1.33, null, 0)
    if (pen.lod <= 1) {
      pen.ctx.strokeStyle = ARREST.gold
      pen.ctx.lineWidth = 0.025
      pen.ctx.stroke()
    }
    // Red paper diamonds strung across the top, swinging when the floor is struck.
    const sw = ring(m, 0.45, 0.5) * 0.25
    if (pen.lod <= 1) strokeLines(pen, ARREST.ink, pen.lw * 0.8, (ctx) => {
      ctx.moveTo(v.x0, -2.42)
      for (let i = 0; i < DECOR.length - 1; i++) ctx.quadraticCurveTo((DECOR[i] + DECOR[i + 1]) / 2, -2.28, DECOR[i + 1], -2.42)
    })
    fillPath(pen, ARREST.red, (ctx) => {
      DECOR.forEach((x, i) => {
        if (x < v.x0 - 0.2 || x > v.x1 + 0.2) return
        const a = sw * (i % 2 ? 1 : -1)
        const cx = x + Math.sin(a) * 0.22
        const cy = -2.42 + Math.cos(a) * 0.22
        tile(ctx, cx, cy, 0.17, 0.17, Math.PI / 4 + a)
      })
    })
    if (pen.lod === 0) fillPath(pen, ARREST.gold, (ctx) => {
      DECOR.forEach((x, i) => {
        const a = sw * (i % 2 ? 1 : -1)
        ctx.rect(x + Math.sin(a) * 0.36 - 0.012, -2.42 + Math.cos(a) * 0.36, 0.024, 0.1)
      })
    })
    // The officer at the right: shoulder and sleeve in police blue, the cap, and handcuffs from the hand.
    poly(pen, [[3.6, 0], [2.4, 0], [2.32, -0.9], [2.45, -1.32], [2.75, -1.52], [3.6, -1.6]], ARREST.navy, 0.8)
    circle(pen, 2.98, -1.74, 0.2, ARREST.navyDeep, 0)
    poly(pen, [[2.7, -1.86], [3.24, -1.86], [3.32, -2.12], [2.62, -2.1]], ARREST.navy, 0.8)
    ellipse(pen, 2.66, -1.86, 0.17, 0.04, ARREST.navyDeep, 0)
    if (pen.lod <= 1) circle(pen, 2.97, -2.0, 0.045, ARREST.badge, 0.5)
    strokeLines(pen, ARREST.navy, 0.18, (ctx) => {
      ctx.moveTo(2.55, -1.25)
      ctx.lineTo(2.3, -0.95)
      ctx.lineTo(1.98, -1.05)
    })
    circle(pen, 1.86, -1.07, 0.07, ARREST.hand, pen.lod <= 1 ? 0.6 : 0)
    at(pen, 1.84, -1.02, ring(m, 0.32, 0.45) * 0.4, 1, () => {
      strokeLines(pen, ARREST.steel, pen.lod === 2 ? 0.04 : 0.028, (ctx) => {
        ctx.moveTo(0, 0)
        ctx.lineTo(0, 0.1)
        ctx.moveTo(0.02, 0.18)
        ctx.arc(-0.05, 0.18, 0.07, 0, Math.PI * 2)
        ctx.moveTo(0.12, 0.21)
        ctx.arc(0.05, 0.21, 0.07, 0, Math.PI * 2)
      })
    })
  },
  weight(pen) {
    // A police cap on a stack of folded laundry.
    const h = WEIGHT_H
    rect(pen, -0.15, -0.1, 0.3, 0.1, '#F2EEE4', 0.7)
    rect(pen, -0.14, -0.19, 0.28, 0.09, '#9EC4DE', 0.7)
    poly(pen, [[-0.11, -0.2], [0.11, -0.2], [0.15, -h], [-0.13, -h + 0.01]], ARREST.navy, 0.8)
    rect(pen, -0.11, -0.25, 0.22, 0.05, ARREST.navyDeep, 0)
    ellipse(pen, -0.12, -0.2, 0.1, 0.025, ARREST.navyDeep, 0)
    if (pen.lod <= 1) circle(pen, 0.01, -h + 0.07, 0.03, ARREST.badge, 0)
  },
}

/* ------------------------------------------------------------------ the cold room */

const COLD = {
  wall: '#D6E8DC',
  tile: '#8FA89A',
  edge: '#6F8A7C',
  tube: '#F6FFFA',
  light: '#E6FFF0',
  rail: '#7E8C84',
  ham: '#B86A5C',
  hamDeep: '#8E4A40',
  bone: '#F2EDE2',
  sausage: '#9A4A36',
  steel: '#C9D2CC',
  ink: '#2E3E36',
}

/** The hooks along the rail: x, a ham (1) or a string of sausages (0). */
const HOOKS: readonly [number, number][] = [[-3.0, 0], [-2.45, 1], [-1.85, 0], [1.75, 1], [2.3, 0], [2.85, 1]]

const butcher: Skin = {
  key: 'butcher',
  bg: COLD.wall,
  ink: COLD.ink,
  floor: COLD.tile,
  edge: COLD.edge,
  plank: '#B8C2BC',
  fulcrum: '#7E8C84',
  back(pen, m, v) {
    // The tube overhead, cold.
    glow(pen, 0, -2.6, 2.8, COLD.light, 0.55)
    rect(pen, -0.8, -2.68, 1.6, 0.08, COLD.tube, 0.6)
    // The rail.
    line(pen, v.x0, -2.25, v.x1, -2.25, COLD.rail, 0.05)
    // Hams and sausages hanging from it, swinging when the floor is struck.
    const sw = ring(m, 0.5, 0.55) * 0.12
    const ox = (i: number) => Math.sin(sw * (i % 2 ? 1 : -1))
    const oy = (i: number) => Math.cos(sw * (i % 2 ? 1 : -1))
    if (pen.lod <= 1) strokeLines(pen, COLD.rail, 0.02, (ctx) => {
      HOOKS.forEach(([x], i) => {
        ctx.moveTo(x, -2.25)
        ctx.lineTo(x + ox(i) * 0.18, -2.25 + oy(i) * 0.18)
      })
    })
    fillPath(pen, COLD.ham, (ctx) => {
      HOOKS.forEach(([x, ham], i) => {
        if (!ham) return
        const s = ox(i)
        const c = oy(i)
        // A pear of a ham, its narrow end up, along the hook's line.
        const tx = x + s * 0.22
        const ty = -2.25 + c * 0.22
        const bx = x + s * 0.8
        const by = -2.25 + c * 0.8
        ctx.moveTo(tx, ty)
        ctx.quadraticCurveTo(tx + c * 0.3, ty - s * 0.3 + 0.25, bx + c * 0.24, by)
        ctx.quadraticCurveTo(bx + s * 0.32, by + c * 0.32, bx - c * 0.24, by)
        ctx.quadraticCurveTo(tx - c * 0.3, ty + s * 0.3 + 0.25, tx, ty)
        ctx.closePath()
      })
    })
    inkPath(pen, 0.8)
    const links = pen.lod === 2 ? 3 : 5
    fillPath(pen, COLD.sausage, (ctx) => {
      HOOKS.forEach(([x, ham], i) => {
        if (ham) return
        const s = ox(i)
        const c = oy(i)
        for (let k = 0; k < links; k++) {
          const d = 0.28 + k * (pen.lod === 2 ? 0.34 : 0.21)
          const cx = x + s * d
          const cy = -2.25 + c * d
          const rr = pen.lod === 2 ? 0.16 : 0.1
          ctx.moveTo(cx + 0.06, cy)
          ctx.ellipse(cx, cy, 0.06, rr, -sw, 0, Math.PI * 2)
        }
      })
    })
    inkPath(pen, 0.7)
    if (pen.lod <= 1) fillPath(pen, COLD.bone, (ctx) => {
      HOOKS.forEach(([x, ham], i) => {
        if (!ham) return
        const cx = x + ox(i) * 0.2
        const cy = -2.25 + oy(i) * 0.2
        ctx.moveTo(cx + 0.065, cy)
        ctx.arc(cx, cy, 0.065, 0, Math.PI * 2)
      })
    })
    if (pen.lod === 0) strokeLines(pen, COLD.bone, pen.lw, (ctx) => {
      HOOKS.forEach(([x, ham], i) => {
        if (!ham) return
        for (const d of [0.42, 0.6]) {
          const cx = x + ox(i) * d
          const cy = -2.25 + oy(i) * d
          const w = 0.12 + (d - 0.4) * 0.5
          ctx.moveTo(cx - w, cy)
          ctx.lineTo(cx + w, cy)
        }
      })
    })
  },
  front(pen, _m, v) {
    // White tile, the grout in a grid.
    if (pen.lod > 0) return
    strokeLines(pen, rgba(COLD.wall, 0.45), pen.lw * 0.8, (ctx) => {
      for (const y of [0.3, 0.6]) {
        ctx.moveTo(v.x0, y)
        ctx.lineTo(v.x1, y)
      }
      for (let x = Math.ceil(v.x0 / 0.5) * 0.5; x < v.x1; x += 0.5) {
        ctx.moveTo(x, 0.07)
        ctx.lineTo(x, v.y1)
      }
    })
  },
  weight(pen) {
    // A butcher's scale: its pan, its dial.
    const h = WEIGHT_H
    rect(pen, -0.14, -0.05, 0.28, 0.05, COLD.rail, 0.7)
    rect(pen, -0.11, -h * 0.68, 0.22, h * 0.68 - 0.05, COLD.steel, 0.8)
    circle(pen, 0, -h * 0.4, 0.075, '#FFFFFF', 0.6)
    if (pen.lod <= 1) line(pen, 0, -h * 0.4, 0.04, -h * 0.4 - 0.05, COLD.ink, 0.015)
    rect(pen, -0.015, -h * 0.85, 0.03, h * 0.17, COLD.rail, 0)
    ellipse(pen, 0, -h * 0.88, 0.16, 0.035, COLD.rail, 0.7)
  },
}

/* ------------------------------------------------------------------ black tears */

const TEARS = {
  cyan: '#C4E8EC',
  floor: '#9CCDD4',
  edge: '#7FB6BE',
  black: '#141A1E',
  ghost: '#F4FCFC',
  label: '#EDE6D6',
  ink: '#24343A',
}

/** The drips: x, how far down they reach, width. Short over the machine, long at the sides. */
const DRIPS: readonly [number, number, number][] = [
  [-3.25, -0.7, 0.07], [-2.85, -1.25, 0.05], [-2.45, -0.95, 0.08], [-2.05, -1.45, 0.05], [-1.6, -1.1, 0.06],
  [-1.05, -2.05, 0.05], [-0.45, -2.2, 0.06], [0.2, -1.95, 0.05], [0.8, -2.15, 0.06],
  [1.5, -1.35, 0.06], [1.95, -2.0, 0.05], [2.4, -0.85, 0.07], [2.85, -1.5, 0.05], [3.25, -1.05, 0.07],
]

const tears: Skin = {
  key: 'tears',
  bg: TEARS.cyan,
  ink: TEARS.ink,
  floor: TEARS.floor,
  edge: TEARS.edge,
  plank: '#EAF6F6',
  fulcrum: '#8EB4BA',
  back(pen, m, v) {
    // The pale shape, and its ghosts trailing off from it; they spread on the slam.
    const k = knock(m.since, 0.5)
    for (const [x, y, s, d] of [[2.25, -1.25, 1, 1], [-2.25, -1.85, 0.7, -1]] as const) {
      const n = pen.lod === 2 ? 1 : 3
      for (let i = n; i >= 1; i--) {
        const off = i * (0.17 + 0.12 * k)
        ellipse(pen, x - d * off, y + 0.04 * i, 0.3 * s, 0.4 * s, rgba(TEARS.ghost, 0.55 - 0.13 * i), 0)
      }
      ellipse(pen, x + 0.03 * Math.sin(m.t * 0.5), y, 0.3 * s, 0.4 * s, TEARS.ghost, 0.8)
    }
    // The ink, running down from above.
    const top = v.y0 - 0.1
    const step = pen.lod === 2 ? 2 : 1
    fillPath(pen, TEARS.black, (ctx) => {
      for (let i = 0; i < DRIPS.length; i += step) {
        const [x, y0, w0] = DRIPS[i]
        const w = w0 * (step > 1 ? 1.6 : 1)
        const y = y0 + 0.06 * Math.sin(m.t * 0.35 + i * 1.3) + 0.05 * k * hash(i, 2, 41)
        ctx.moveTo(x - w / 2, top)
        ctx.lineTo(x - w / 2, y)
        ctx.arc(x, y, w / 2 + 0.012, Math.PI, 0, true)
        ctx.lineTo(x + w / 2, top)
        ctx.closePath()
      }
      // The ink pooled along the top edge.
      ctx.rect(v.x0 - 0.1, top, v.x1 - v.x0 + 0.2, Math.max(0.05, -2.45 - top))
    })
  },
  weight(pen) {
    // An ink bottle.
    const h = WEIGHT_H
    round(pen, -0.14, -h * 0.62, 0.28, h * 0.62, 0.05, TEARS.black, 0.8)
    rect(pen, -0.06, -h * 0.82, 0.12, h * 0.22, TEARS.black, 0.8)
    rect(pen, -0.075, -h, 0.15, h * 0.18, '#3A4A52', 0.8)
    if (pen.lod <= 1) rect(pen, -0.1, -h * 0.45, 0.2, h * 0.22, TEARS.label, 0)
  },
}

/* ------------------------------------------------------------------ the rainbow over the canyon lake */

const CANYON = {
  sky: '#8CC4E6',
  rock: '#9A3E24',
  rockDeep: '#6E2A18',
  lake: '#2F78B8',
  ripple: '#7AB2DC',
  sand: '#B25A34',
  edge: '#8E4026',
  hoodoo: '#B4502E',
  cap: '#6E3420',
  ink: '#3A1A12',
}

const BOW = ['#E04A3C', '#F29A38', '#F2D648', '#5DB860', '#3F7FD0', '#7A5AB8']

const rainbow: Skin = {
  key: 'rainbow',
  bg: CANYON.sky,
  ink: CANYON.ink,
  floor: CANYON.sand,
  edge: CANYON.edge,
  plank: '#7A3A22',
  fulcrum: '#5A2A1A',
  back(pen, m, v) {
    const { ctx } = pen
    // The double rainbow, the faint outer bow's colours turned round; both brighten a little on the slam.
    const f = flashOf(m, 1.0, 0.4)
    const bands = pen.lod === 2 ? [0, 2, 4] : [0, 1, 2, 3, 4, 5]
    const bw = pen.lod === 2 ? 0.11 : 0.055
    for (const outer of pen.lod === 2 ? [false] : [true, false]) {
      for (const b of bands) {
        const r = outer ? 2.85 + b * bw : 2.38 - b * bw * (pen.lod === 2 ? 0.5 : 1)
        ctx.beginPath()
        ctx.arc(0, -0.2, r, Math.PI, 0)
        ctx.strokeStyle = rgba(BOW[b], (outer ? 0.4 : 0.85) + 0.15 * f)
        ctx.lineWidth = bw
        ctx.stroke()
      }
    }
    // The lake, across the bottom of the canyon.
    rect(pen, v.x0 - 0.1, -0.34, v.x1 - v.x0 + 0.2, 0.34, CANYON.lake, 0)
    // Red rock: a mesa on the left, a butte and its shoulder on the right.
    poly(pen, [[v.x0 - 0.2, -0.34], [-1.55, -0.34], [-1.7, -0.7], [-1.82, -0.75], [-1.9, -1.55], [-2.2, -1.62], [-3.1, -1.6], [-3.3, -1.3], [v.x0 - 0.2, -1.25]], CANYON.rock, 0.8)
    poly(pen, [[1.55, -0.34], [v.x1 + 0.2, -0.34], [v.x1 + 0.2, -1.05], [2.6, -1.1], [2.45, -1.2], [2.4, -1.95], [1.95, -2.0], [1.88, -1.1], [1.7, -0.8]], CANYON.rock, 0.8)
    if (pen.lod <= 1) {
      fillPath(pen, CANYON.rockDeep, (ctx) => {
        ctx.moveTo(-1.55, -0.34)
        ctx.lineTo(-1.7, -0.7)
        ctx.lineTo(-1.82, -0.75)
        ctx.lineTo(-1.9, -1.55)
        ctx.lineTo(-2.05, -1.58)
        ctx.lineTo(-1.98, -0.7)
        ctx.lineTo(-1.8, -0.34)
        ctx.closePath()
        ctx.moveTo(2.4, -1.95)
        ctx.lineTo(2.45, -1.2)
        ctx.lineTo(2.6, -1.1)
        ctx.lineTo(2.6, -0.34)
        ctx.lineTo(2.3, -0.34)
        ctx.lineTo(2.25, -1.95)
        ctx.closePath()
      })
      // The rock's reflection, and ripples on the water.
      fillPath(pen, rgba(CANYON.rockDeep, 0.5), (ctx) => {
        ctx.rect(v.x0 - 0.1, -0.34, -1.6 - v.x0 + 0.1, 0.22)
        ctx.rect(1.65, -0.34, v.x1 - 1.55, 0.2)
      })
    }
    if (pen.lod === 0) strokeLines(pen, CANYON.ripple, pen.lw, (ctx) => {
      for (let i = 0; i < 7; i++) {
        const x = -2.8 + i * 0.85 + 0.1 * Math.sin(m.t * 0.4 + i)
        const y = -0.27 + 0.08 * (i % 3)
        ctx.moveTo(x, y)
        ctx.lineTo(x + 0.3, y)
      }
    })
  },
  weight(pen) {
    // A hoodoo: red sandstone stacked, a darker cap rock on top.
    const h = WEIGHT_H
    poly(pen, [[-0.15, 0], [0.15, 0], [0.11, -h * 0.35], [0.07, -h * 0.45], [0.1, -h * 0.62], [0.06, -h * 0.78], [-0.06, -h * 0.78], [-0.1, -h * 0.6], [-0.07, -h * 0.45], [-0.12, -h * 0.33]], CANYON.hoodoo, 0.8)
    poly(pen, [[-0.13, -h * 0.78], [0.14, -h * 0.78], [0.1, -h], [-0.1, -h * 0.98]], CANYON.cap, 0.8)
  },
}

export const MONTAGE_SKINS = { jungle, fractal, temple, crt, riot, willow, pearls, fire, arrest, butcher, tears, rainbow } as const satisfies Record<string, Skin>
