import { at, beam, circle, ellipse, glow, hash, knock, line, mix, poly, rect, rgba, round, type Pen, type Pt } from './skins-pen'
import { flashOf, PL, ring, TH, WEIGHT_H, type Skin } from './skins-kit'

/**
 * Wild places Evelyn might have lived instead, far from any laundromat: under a volcano, in a bamboo grove, in a
 * forest of glowing mushrooms, among maples in autumn, by a waterfall, over terraced rice, in a Dutch tulip field,
 * in a field of sunflowers, in a crystal cave, by a koi pond, in a raked-sand garden and out on a bayou at dusk.
 * Each is one silhouette at the side or up high, a sky and a ground of its own colours, and a weight from that
 * place; the same machine works in front of every one.
 *
 * As in `skins-odd.ts`, whatever lies on the ground (cracks, rows, raked lines, lily pads) is laid in `front()`,
 * below the ground's top edge, where the machine never reaches.
 */

/** Fill (and, from `lod` 1 down, ink) the path just traced. */
function shape(pen: Pen, fill: string, ink = 1): void {
  const { ctx } = pen
  ctx.fillStyle = fill
  ctx.fill()
  if (ink > 0 && pen.lod <= 1) {
    ctx.strokeStyle = pen.ink
    ctx.lineWidth = pen.lw * ink
    ctx.stroke()
  }
}

/** Shapes of one colour in one path, filled once. */
function fillAll(pen: Pen, fill: string, add: (ctx: CanvasRenderingContext2D) => void, ink = 0): void {
  pen.ctx.beginPath()
  add(pen.ctx)
  shape(pen, fill, ink)
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

/** A polygon's points added to the path being traced. */
function trace(ctx: CanvasRenderingContext2D, pts: readonly Pt[], dx = 0, dy = 0, s = 1): void {
  ctx.moveTo(dx + pts[0][0] * s, dy + pts[0][1] * s)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(dx + pts[i][0] * s, dy + pts[i][1] * s)
  ctx.closePath()
}

/** An ellipse added to the path being traced. */
function oval(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.moveTo(x + Math.cos(rot) * rx, y + Math.sin(rot) * rx)
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2)
}

/* ------------------------------------------------------------------ under a volcano */

const LAVA = {
  ash: '#2E2C36',
  ember: '#4E3036',
  ridge: '#3C3540',
  cone: '#19161A',
  coneLit: '#2A2023',
  basalt: '#262224',
  basaltEdge: '#3D3436',
  slab: '#4A4044',
  lava: '#F0922A',
  hot: '#FFD660',
  deep: '#B04A1E',
  smoke: '#4C4752',
  ink: '#E6CDB4',
}

/** The cone's outline, its crater between 1.95 and 2.45 at y -2.0. */
const CONE: readonly Pt[] = [[1.18, 0], [1.55, -0.62], [1.78, -1.32], [1.95, -2.0], [2.08, -1.94], [2.22, -2.02], [2.34, -1.95], [2.45, -2.0], [2.62, -1.3], [2.95, -0.6], [3.6, 0]]
/** The lava running down its near face, three streams. */
const FLOWS: readonly (readonly Pt[])[] = [
  [[2.06, -1.95], [2.14, -1.95], [2.02, -1.4], [2.06, -0.9], [1.96, -0.4], [1.86, -0.4], [1.96, -0.92], [1.92, -1.4]],
  [[2.3, -1.96], [2.38, -1.96], [2.5, -1.4], [2.7, -0.8], [2.62, -0.8], [2.42, -1.36]],
  [[2.18, -1.96], [2.24, -1.96], [2.28, -1.5], [2.22, -1.1], [2.16, -1.1], [2.2, -1.5]],
]
/** Cracks in the basalt underfoot, glowing. */
const CRACKS: readonly (readonly Pt[])[] = [
  [[-3.2, 0.2], [-2.7, 0.26], [-2.4, 0.18], [-1.9, 0.32], [-1.5, 0.28]],
  [[1.4, 0.16], [1.8, 0.24], [2.2, 0.2], [2.5, 0.34], [3.1, 0.3]],
  [[-0.6, 0.45], [-0.2, 0.52], [0.3, 0.47], [0.8, 0.58]],
]
/** The lump of lava rock. */
const LUMP: readonly Pt[] = [[-0.16, 0], [0.16, 0], [0.17, -0.12], [0.12, -0.24], [0.04, -0.33], [-0.08, -0.31], [-0.15, -0.2], [-0.18, -0.08]]

const volcano: Skin = {
  key: 'volcano',
  bg: LAVA.ash,
  ink: LAVA.ink,
  floor: LAVA.basalt,
  edge: LAVA.basaltEdge,
  plank: LAVA.slab,
  fulcrum: LAVA.cone,
  back(pen, m, v) {
    // The sky low down, reddened by the fire, and a far ridge on the left.
    rect(pen, v.x0 - 0.1, -0.9, v.x1 - v.x0 + 0.2, 0.9, LAVA.ember, 0)
    poly(pen, [[v.x0 - 0.2, 0], [v.x0 - 0.2, -0.5], [-2.6, -0.62], [-2.0, -0.42], [-1.4, -0.3], [-0.6, -0.18], [-0.6, 0]], LAVA.ridge, 0)
    // The smoke going up from the crater and leaning off on the wind.
    const f = flashOf(m, 0.9, 0.3)
    if (pen.lod <= 1) {
      fillAll(pen, LAVA.smoke, (ctx) => {
        for (let k = 0; k < 4; k++) {
          const s = (m.t * 0.08 + k / 4) % 1
          oval(ctx, 2.2 - 0.9 * s - 0.15 * k, -2.25 - 0.9 * s, 0.22 + 0.3 * s, 0.16 + 0.18 * s)
        }
      })
    }
    // The fire in the crater, brighter on the loud landings.
    glow(pen, 2.2, -2.0, 1.0 + 0.5 * f, LAVA.lava, 0.4 + 0.35 * f)
    // The cone, black, with its lava running.
    poly(pen, CONE, LAVA.cone, 0.8)
    if (pen.lod <= 1) poly(pen, [[1.95, -2.0], [2.08, -1.94], [2.0, -1.2], [1.7, -0.3], [1.55, -0.62], [1.78, -1.32]], LAVA.coneLit, 0)
    fillAll(pen, mix(LAVA.lava, LAVA.hot, f), (ctx) => {
      for (const fl of pen.lod <= 1 ? FLOWS : FLOWS.slice(0, 1)) trace(ctx, fl)
    })
    ellipse(pen, 2.2, -1.99, 0.24, 0.04, LAVA.hot, 0)
    // Bursts of lava thrown up by the slam, falling back.
    if (pen.lod <= 1 && m.since >= 0 && m.since < 1.2 && m.s > 0.6) {
      const a = 1 - m.since / 1.2
      fillAll(pen, rgba(LAVA.hot, a), (ctx) => {
        for (let i = 0; i < 5; i++) {
          const vx = (hash(i, 1, 31) - 0.5) * 1.2
          const vy = 1.3 + 0.8 * hash(i, 2, 31)
          const tt = m.since
          const r = 0.035 + 0.03 * hash(i, 3, 31)
          oval(ctx, 2.2 + vx * tt, -2.05 - vy * tt + 1.6 * tt * tt, r, r)
        }
      })
    }
  },
  front(pen, m, _v) {
    // The cracks in the basalt, glowing.
    if (pen.lod > 1) return
    const f = flashOf(m, 0.9, 0.3)
    strokeLines(pen, mix(LAVA.deep, LAVA.lava, 0.5 + 0.5 * f), 0.035, (ctx) => {
      for (const c of pen.lod === 0 ? CRACKS : CRACKS.slice(0, 2)) {
        ctx.moveTo(c[0][0], c[0][1])
        for (let i = 1; i < c.length; i++) ctx.lineTo(c[i][0], c[i][1])
      }
    })
  },
  weight(pen) {
    // A lump of lava rock, still glowing in its cracks.
    poly(pen, LUMP, LAVA.cone)
    if (pen.lod <= 1) {
      strokeLines(pen, LAVA.lava, 0.025, (ctx) => {
        ctx.moveTo(-0.12, -0.05)
        ctx.lineTo(-0.03, -0.14)
        ctx.lineTo(0.02, -0.09)
        ctx.lineTo(0.1, -0.2)
        ctx.moveTo(-0.03, -0.14)
        ctx.lineTo(-0.06, -0.25)
      })
    }
  },
}

/* ------------------------------------------------------------------ a bamboo grove */

const BAMBOO = {
  mist: '#DCE6BE',
  far: '#BCCF92',
  stalk: '#7BA63E',
  stalkDeep: '#557F2C',
  node: '#3C5E20',
  leaf: '#5E9034',
  leafDeep: '#406E28',
  light: '#FFF8D0',
  earth: '#857546',
  earthDeep: '#6A5C36',
  cane: '#CFA853',
  caneDeep: '#9A7634',
  ink: '#25331A',
}

/** The near stalks: x, half-width, deep (1) or light (0). */
const STALKS: readonly (readonly [number, number, number])[] = [[-3.15, 0.1, 1], [-2.72, 0.08, 0], [-2.3, 0.11, 1], [-1.86, 0.075, 0], [-1.48, 0.06, 1], [1.5, 0.065, 0], [1.9, 0.1, 1], [2.36, 0.08, 0], [2.8, 0.11, 1], [3.2, 0.08, 0]]
/** Thin far stalks, pale in the haze; they may stand behind the machine. */
const FAR_STALKS = [-2.5, -2.05, -1.1, -0.55, 0.3, 0.85, 1.25, 2.12, 2.6, 3.0]

const bamboo: Skin = {
  key: 'bamboo',
  bg: BAMBOO.mist,
  ink: BAMBOO.ink,
  floor: BAMBOO.earth,
  edge: BAMBOO.earthDeep,
  plank: BAMBOO.stalk,
  fulcrum: BAMBOO.earthDeep,
  back(pen, m, v) {
    const top = v.y0 - 0.1
    // The far stalks, thin and pale.
    if (pen.lod <= 1) {
      fillAll(pen, BAMBOO.far, (ctx) => {
        for (const x of FAR_STALKS) ctx.rect(x - 0.025, top, 0.05, -top)
      })
    }
    // Light, falling slant through the canopy.
    beam(pen, -0.6, v.y0, 0.2, 0, 0.3, 0.9, BAMBOO.light, 0.45)
    beam(pen, 0.9, v.y0, 1.5, 0, 0.2, 0.6, BAMBOO.light, 0.35)
    // The near stalks, swaying a little, and swaying more when the ground is struck.
    const r = ring(m, 0.6, 0.6) * 0.06
    for (const deep of [0, 1]) {
      fillAll(pen, deep ? BAMBOO.stalkDeep : BAMBOO.stalk, (ctx) => {
        for (const [x, w, d] of STALKS) {
          if (d !== deep) continue
          const sw = 0.05 * Math.sin(m.t * 0.5 + x * 1.3) + r * Math.sign(x)
          ctx.moveTo(x - w, 0)
          ctx.lineTo(x + w, 0)
          ctx.lineTo(x + w + sw, top)
          ctx.lineTo(x - w + sw, top)
          ctx.closePath()
        }
      }, 0.7)
    }
    if (pen.lod > 1) return
    // The nodes on the stalks.
    strokeLines(pen, BAMBOO.node, 0.03, (ctx) => {
      for (const [x, w] of STALKS) {
        const sw = 0.05 * Math.sin(m.t * 0.5 + x * 1.3) + r * Math.sign(x)
        for (let y = -0.5 - 0.2 * hash(x * 10, 1, 4); y > top; y -= 0.62) {
          const xx = x + (sw * y) / top
          ctx.moveTo(xx - w, y)
          ctx.lineTo(xx + w, y)
        }
      }
    })
    // Sprays of narrow leaves off the stalks, high up.
    for (const deep of [0, 1]) {
      fillAll(pen, deep ? BAMBOO.leafDeep : BAMBOO.leaf, (ctx) => {
        for (let i = 0; i < STALKS.length; i++) {
          const [x] = STALKS[i]
          const side = x < 0 ? 1 : -1
          const n = pen.lod === 0 ? 3 : 2
          for (let k = 0; k < n; k++) {
            if ((i + k) % 2 !== deep) continue
            const y = -1.8 - 0.35 * k - 0.3 * hash(i, k, 5)
            const s = (k % 2 ? -1 : 1) * side
            const sway = 0.04 * Math.sin(m.t * 0.9 + i + k)
            oval(ctx, x + s * 0.24, y + 0.06, 0.24, 0.04, s * 0.35 + sway)
            oval(ctx, x + s * 0.2, y + 0.16, 0.2, 0.035, s * 0.7 + sway)
          }
        }
      })
    }
  },
  board(pen) {
    // A length of bamboo, with its nodes.
    rect(pen, -PL, -TH / 2, 2 * PL, TH, BAMBOO.stalk)
    if (pen.lod <= 1) {
      strokeLines(pen, BAMBOO.node, 0.025, (ctx) => {
        for (const x of [-0.75, -0.2, 0.4, 0.9]) {
          ctx.moveTo(x, -TH / 2)
          ctx.lineTo(x, TH / 2)
        }
      })
    }
  },
  weight(pen) {
    // A woven bamboo basket with a hoop for a handle.
    const h = WEIGHT_H
    if (pen.lod <= 1) {
      pen.ctx.beginPath()
      pen.ctx.ellipse(0, -h * 0.62, 0.12, h * 0.36, 0, Math.PI, 0)
      pen.ctx.strokeStyle = BAMBOO.caneDeep
      pen.ctx.lineWidth = 0.03
      pen.ctx.stroke()
    }
    poly(pen, [[-0.11, 0], [0.11, 0], [0.16, -h * 0.62], [-0.16, -h * 0.62]], BAMBOO.cane)
    rect(pen, -0.17, -h * 0.66, 0.34, 0.05, BAMBOO.caneDeep, 0.7)
    if (pen.lod === 0) {
      strokeLines(pen, BAMBOO.caneDeep, pen.lw * 0.8, (ctx) => {
        for (let k = 1; k < 4; k++) {
          const y = -h * 0.62 * (k / 4)
          const w = 0.11 + 0.05 * (k / 4)
          ctx.moveTo(-w, y)
          ctx.lineTo(w, y)
        }
        for (const x of [-0.06, 0, 0.06]) {
          ctx.moveTo(x, 0)
          ctx.lineTo(x * 1.4, -h * 0.62)
        }
      })
    }
  },
}

/* ------------------------------------------------------------------ a forest of giant mushrooms, at twilight */

const SHROOM = {
  dusk: '#29275A',
  low: '#3A3472',
  stem: '#D8CDB8',
  stemShade: '#ADA08C',
  teal: '#43BCC8',
  tealDeep: '#2A8296',
  violet: '#B470CC',
  violetDeep: '#7E4898',
  spot: '#ECF8F4',
  spore: '#B6F2EA',
  moss: '#2C4850',
  mossEdge: '#3E6268',
  ink: '#14112E',
}

/** A mushroom: a stem from the ground at x up to its cap's rim at `y`, the cap `w` wide and `h` high. */
function mushroom(pen: Pen, x: number, lean: number, y: number, w: number, h: number, cap: string, capDeep: string): void {
  const sw = w * 0.13
  pen.ctx.beginPath()
  pen.ctx.moveTo(x - sw * 1.5, 0)
  pen.ctx.quadraticCurveTo(x - sw + lean * 0.3, y * 0.5, x - sw * 0.8 + lean, y)
  pen.ctx.lineTo(x + sw * 0.8 + lean, y)
  pen.ctx.quadraticCurveTo(x + sw + lean * 0.3, y * 0.5, x + sw * 1.5, 0)
  pen.ctx.closePath()
  shape(pen, SHROOM.stem, 0.8)
  const cx = x + lean
  if (pen.lod <= 1) ellipse(pen, cx, y, w / 2, h * 0.14, capDeep, 0.6)
  pen.ctx.beginPath()
  pen.ctx.ellipse(cx, y, w / 2, h, 0, Math.PI, 0)
  pen.ctx.closePath()
  shape(pen, cap, 0.8)
  if (pen.lod <= 1) {
    fillAll(pen, SHROOM.spot, (ctx) => {
      for (const [u, vv, r] of [[-0.25, 0.45, 0.08], [0.1, 0.7, 0.1], [0.32, 0.35, 0.07], [-0.05, 0.25, 0.05]] as const) oval(ctx, cx + u * w, y - vv * h, r * w * 0.6, r * w * 0.45)
    })
  }
}

const mushrooms: Skin = {
  key: 'mushroom',
  bg: SHROOM.dusk,
  ink: SHROOM.ink,
  floor: SHROOM.moss,
  edge: SHROOM.mossEdge,
  plank: SHROOM.stemShade,
  fulcrum: SHROOM.violetDeep,
  back(pen, m, v) {
    // The last light low in the sky.
    rect(pen, v.x0 - 0.1, -1.0, v.x1 - v.x0 + 0.2, 1.0, SHROOM.low, 0)
    // The caps glow, and glow brighter when the ground is struck.
    const f = flashOf(m, 0.9, 0.35)
    const breathe = 0.5 + 0.5 * Math.sin(m.t * 0.7)
    glow(pen, -2.14, -1.8, 1.5 + 0.3 * f, SHROOM.teal, 0.32 + 0.08 * breathe + 0.3 * f)
    glow(pen, 2.1, -1.25, 1.1 + 0.25 * f, SHROOM.violet, 0.3 + 0.08 * (1 - breathe) + 0.3 * f)
    // A giant on the left, its cap high; a smaller one on the right; little ones round their feet.
    mushroom(pen, -2.02, -0.12, -1.8, 1.75, 0.56, SHROOM.teal, SHROOM.tealDeep)
    mushroom(pen, 2.12, 0.08, -1.2, 1.25, 0.46, SHROOM.violet, SHROOM.violetDeep)
    if (pen.lod <= 1) {
      mushroom(pen, -1.45, 0.04, -0.3, 0.4, 0.15, SHROOM.violet, SHROOM.violetDeep)
      mushroom(pen, 2.95, -0.04, -0.45, 0.5, 0.2, SHROOM.teal, SHROOM.tealDeep)
    }
    // Spores, rising slowly in the dark.
    if (pen.lod > 1) return
    const n = pen.lod === 0 ? 16 : 8
    fillAll(pen, rgba(SHROOM.spore, 0.8), (ctx) => {
      for (let i = 0; i < n; i++) {
        const h = v.y1 - v.y0
        const y = -((m.t * (0.08 + 0.06 * hash(i, 1, 41)) + hash(i, 2, 41) * 3) % h) + 0.1
        const x = v.x0 + (v.x1 - v.x0) * hash(i, 3, 41) + 0.08 * Math.sin(m.t * 0.6 + i)
        const r = 0.012 + 0.014 * hash(i, 4, 41)
        oval(ctx, x, y, r, r)
      }
    })
  },
  weight(pen) {
    // A toadstool, violet, spotted.
    const h = WEIGHT_H
    poly(pen, [[-0.06, 0], [0.06, 0], [0.045, -h * 0.6], [-0.045, -h * 0.6]], SHROOM.stem, 0.8)
    pen.ctx.beginPath()
    pen.ctx.ellipse(0, -h * 0.58, 0.16, h * 0.42, 0, Math.PI, 0)
    pen.ctx.closePath()
    shape(pen, SHROOM.violet)
    if (pen.lod <= 1) {
      fillAll(pen, SHROOM.spot, (ctx) => {
        oval(ctx, -0.07, -h * 0.75, 0.03, 0.025)
        oval(ctx, 0.05, -h * 0.85, 0.035, 0.028)
        oval(ctx, 0.1, -h * 0.66, 0.02, 0.018)
      })
    }
  },
}

/* ------------------------------------------------------------------ a maple wood in autumn */

const FALL = {
  sky: '#D5DBDC',
  hills: '#B8AC94',
  trunk: '#3E2C24',
  crimson: '#7E1E2C',
  red: '#A0302A',
  amber: '#D48A2C',
  gold: '#E0B44C',
  litter: '#8A5A32',
  litterEdge: '#A06A30',
  acorn: '#9C6A36',
  cap: '#5C4028',
  ink: '#2E211C',
}

/** A tree's crown as overlapping rounds: x, y, r, colour. */
const LEFT_CROWN: readonly (readonly [number, number, number, number])[] = [[-2.85, -1.7, 0.6, 0], [-2.2, -2.15, 0.7, 1], [-1.9, -1.6, 0.48, 0], [-2.55, -1.2, 0.45, 1]]
const RIGHT_CROWN: readonly (readonly [number, number, number, number])[] = [[2.0, -1.6, 0.5, 0], [2.55, -1.95, 0.62, 1], [2.9, -1.35, 0.5, 0], [2.35, -1.2, 0.4, 1]]
const LEAF: readonly Pt[] = [[0, -1], [0.35, -0.35], [1, -0.4], [0.5, 0.2], [0.6, 0.9], [0, 0.5], [-0.6, 0.9], [-0.5, 0.2], [-1, -0.4], [-0.35, -0.35]]
const LEAF_COLOURS = [FALL.red, FALL.amber, FALL.gold, FALL.crimson]

function crown(pen: Pen, parts: readonly (readonly [number, number, number, number])[], a: string, b: string): void {
  for (const k of [0, 1]) {
    fillAll(pen, k ? b : a, (ctx) => {
      for (const [x, y, r, c] of parts) if (c === k && (pen.lod <= 1 || r >= 0.55)) oval(ctx, x, y, r, r * 0.9)
    }, 0.7)
  }
}

const autumn: Skin = {
  key: 'autumn',
  bg: FALL.sky,
  ink: FALL.ink,
  floor: FALL.litter,
  edge: FALL.litterEdge,
  plank: FALL.trunk,
  fulcrum: FALL.cap,
  back(pen, _m, v) {
    // Low hills far off, brown with the turn of the year.
    poly(pen, [[v.x0 - 0.2, 0], [v.x0 - 0.2, -0.45], [-1.8, -0.55], [-0.6, -0.36], [0.7, -0.5], [2.0, -0.4], [v.x1 + 0.2, -0.56], [v.x1 + 0.2, 0]], FALL.hills, 0)
    // Two maples, their trunks and the crowns over them: crimson on the left, amber on the right.
    fillAll(pen, FALL.trunk, (ctx) => {
      trace(ctx, [[-2.5, 0], [-2.22, 0], [-2.28, -0.9], [-1.95, -1.5], [-2.05, -1.55], [-2.36, -1.1], [-2.6, -1.6], [-2.7, -1.55], [-2.44, -0.9]])
      trace(ctx, [[2.3, 0], [2.52, 0], [2.48, -0.9], [2.8, -1.4], [2.72, -1.46], [2.44, -1.1], [2.2, -1.5], [2.12, -1.44], [2.36, -0.9]])
    }, 0.8)
    crown(pen, LEFT_CROWN, FALL.red, FALL.crimson)
    crown(pen, RIGHT_CROWN, FALL.amber, FALL.gold)
  },
  front(pen, m, v) {
    if (pen.lod > 1) return
    // Leaves fallen on the ground.
    if (pen.lod === 0) {
      for (let c = 0; c < 3; c++) {
        fillAll(pen, LEAF_COLOURS[c], (ctx) => {
          for (let i = c; i < 21; i += 3) {
            const x = v.x0 + (v.x1 - v.x0) * hash(i, 1, 51)
            trace(ctx, LEAF, x, 0.12 + 0.6 * hash(i, 2, 51), 0.05)
          }
        })
      }
    }
    // And leaves falling, turning over as they drift down; a few more let go on the loud landings.
    const n = pen.lod === 0 ? 14 : 7
    const extra = knock(m.since, 0.8)
    for (let c = 0; c < 3; c++) {
      fillAll(pen, LEAF_COLOURS[c], (ctx) => {
        for (let i = c; i < n; i += 3) {
          const sp = 0.22 + 0.15 * hash(i, 1, 52)
          const h = 0 - v.y0 + 0.2
          const y = v.y0 + ((m.t * sp + hash(i, 2, 52) * 9 + extra * 0.15 * hash(i, 5, 52)) % h)
          const x = v.x0 + (v.x1 - v.x0) * hash(i, 3, 52) + 0.25 * Math.sin(m.t * 0.9 + i * 2.1)
          const s = 0.045 + 0.025 * hash(i, 4, 52)
          const flip = Math.cos(m.t * 1.6 + i)
          ctx.save()
          ctx.translate(x, y)
          ctx.rotate(m.t * 0.7 + i)
          ctx.scale(flip, 1)
          trace(ctx, LEAF, 0, 0, s)
          ctx.restore()
        }
      })
    }
  },
  weight(pen) {
    // An acorn, in its cap.
    const h = WEIGHT_H
    ellipse(pen, 0, -h * 0.4, 0.13, h * 0.4, FALL.acorn)
    pen.ctx.beginPath()
    pen.ctx.ellipse(0, -h * 0.62, 0.155, h * 0.22, 0, Math.PI, 0)
    pen.ctx.closePath()
    shape(pen, FALL.cap)
    rect(pen, -0.015, -h, 0.03, h * 0.18, FALL.cap, 0)
    if (pen.lod === 0) line(pen, -0.06, -h * 0.4, -0.04, -h * 0.2, mix(FALL.acorn, '#FFFFFF', 0.3), 0.02)
  },
}

/* ------------------------------------------------------------------ a waterfall */

const FALLS = {
  mist: '#C2D9D2',
  cliff: '#4E5C57',
  cliffDeep: '#3B4743',
  moss: '#5E7E4C',
  water: '#E8F4F4',
  streak: '#A8CED6',
  pool: '#4C8EA0',
  fern: '#4C8A42',
  fernDeep: '#356A32',
  stone: '#7E8780',
  stoneLight: '#A4AAA2',
  stoneDeep: '#5C6560',
  floor: '#5C6B5C',
  edge: '#475848',
  ink: '#1D2723',
}

/** A fern's frond: an arc from its root, leaflets along it, as one path. */
function frond(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, len: number, lift: number): void {
  const n = 8
  for (let k = 1; k <= n; k++) {
    const s = k / n
    const px = x + dir * len * s
    const py = y - lift * Math.sin(s * Math.PI * 0.9)
    const a = Math.atan2(-lift * Math.PI * 0.9 * Math.cos(s * Math.PI * 0.9), dir * len)
    const w = 0.13 * (1 - s * 0.6)
    for (const side of [-1, 1]) oval(ctx, px + Math.cos(a + side * 1.1) * w * 0.8, py + Math.sin(a + side * 1.1) * w * 0.8, w, 0.03, a + side * 1.1)
  }
}

const waterfall: Skin = {
  key: 'waterfall',
  bg: FALLS.mist,
  ink: FALLS.ink,
  floor: FALLS.floor,
  edge: FALLS.edge,
  plank: FALLS.stoneDeep,
  fulcrum: FALLS.cliffDeep,
  back(pen, m, v) {
    const top = v.y0 - 0.1
    // The cliff on the right, the whole height, and a lower shoulder of it on the left.
    poly(pen, [[1.4, 0], [1.52, -0.7], [1.45, -1.4], [1.58, -2.0], [1.5, top], [v.x1 + 0.1, top], [v.x1 + 0.1, 0]], FALLS.cliff, 0.8)
    poly(pen, [[v.x0 - 0.1, 0], [v.x0 - 0.1, -1.25], [-2.6, -1.3], [-2.0, -1.0], [-1.62, -0.55], [-1.5, 0]], FALLS.cliffDeep, 0.8)
    if (pen.lod <= 1) {
      // Moss along the cliff's ledges.
      fillAll(pen, FALLS.moss, (ctx) => {
        oval(ctx, 1.62, -0.72, 0.16, 0.05)
        oval(ctx, 1.7, -2.0, 0.14, 0.05)
        oval(ctx, 3.1, -1.2, 0.3, 0.06)
        oval(ctx, -2.7, -1.28, 0.3, 0.06)
      })
    }
    // The fall itself, from the top of the frame to the pool.
    rect(pen, 1.78, top, 0.56, -0.18 - top, FALLS.water, 0.8)
    if (pen.lod <= 1) {
      // Streaks running down it.
      const n = pen.lod === 0 ? 10 : 5
      strokeLines(pen, FALLS.streak, 0.03, (ctx) => {
        for (let i = 0; i < n; i++) {
          const x = 1.84 + 0.44 * ((i * 0.37) % 1)
          const len = 0.3 + 0.25 * hash(i, 1, 61)
          const span = -0.2 - top + len
          const y = top - len + ((m.t * 2.2 + hash(i, 2, 61) * 5) % span)
          ctx.moveTo(x, Math.max(top, y))
          ctx.lineTo(x, Math.min(-0.2, y + len))
        }
      })
    }
    // The pool at its foot, and the mist the fall throws up, thicker after a slam.
    rect(pen, 1.35, -0.2, v.x1 - 1.25, 0.2, FALLS.pool, 0)
    const f = knock(m.since, 0.6)
    fillAll(pen, rgba(FALLS.water, 0.75), (ctx) => {
      for (let k = 0; k < 3; k++) {
        const s = Math.sin(m.t * 0.8 + k * 2)
        oval(ctx, 2.06 + (k - 1) * 0.4 + 0.05 * s, -0.22 - 0.06 * k, 0.32 + 0.06 * s + 0.08 * f, 0.13 + 0.04 * f)
      }
    })
    // Ferns over the shoulder on the left.
    for (const deep of [0, 1]) {
      fillAll(pen, deep ? FALLS.fernDeep : FALLS.fern, (ctx) => {
        if (pen.lod > 1) {
          if (!deep) oval(ctx, -2.3, -1.35, 0.55, 0.18)
          return
        }
        for (let i = 0; i < 6; i++) {
          if (i % 2 !== deep) continue
          frond(ctx, -2.35, -1.12, i < 3 ? -1 : 1, 0.35 + 0.18 * (i % 3), 0.15 + 0.2 * (2 - (i % 3)))
        }
      }, 0)
    }
  },
  weight(pen) {
    // River stones, stacked.
    ellipse(pen, 0, -0.06, 0.16, 0.06, FALLS.stoneDeep)
    ellipse(pen, 0.01, -0.165, 0.12, 0.05, FALLS.stone)
    ellipse(pen, -0.01, -0.25, 0.085, 0.04, FALLS.stoneLight)
    circle(pen, 0, -0.31, 0.03, FALLS.stone, 0.7)
  },
}

/* ------------------------------------------------------------------ terraced rice paddies */

const PADDY = {
  sky: '#F2E6D4',
  far: '#B4C9A2',
  green: '#78AC48',
  bright: '#9CC85A',
  mirror: '#D2E4E2',
  bund: '#557A34',
  water: '#9CC0BC',
  waterEdge: '#6E9A50',
  shoot: '#5C9A3A',
  straw: '#DAB966',
  strawDeep: '#A8883E',
  ink: '#2C3826',
}

/** The steps of a hill of terraces: the top of each step and how far out from the side it reaches. */
const STEPS: readonly (readonly [number, number])[] = [[-0.42, 1.35], [-0.8, 1.62], [-1.18, 1.9], [-1.56, 2.2], [-1.94, 2.5], [-2.32, 2.82]]

/** One hillside of terraces from the frame's side, `dir` -1 on the left, 1 on the right. */
function terraces(pen: Pen, dir: number, edge: number, wob: number): void {
  const n = pen.lod <= 1 ? STEPS.length : 3
  for (let k = n - 1; k >= 0; k--) {
    const [y, x] = STEPS[pen.lod <= 1 ? k : k * 2]
    const h = (pen.lod <= 1 ? 0.38 : 0.76) - 0.0
    const xr = dir * (x + 0.06 * Math.sin(k * 2.3 + wob))
    const x0 = dir < 0 ? edge : xr
    const w = Math.abs(edge - xr)
    round(pen, x0 - (dir < 0 ? 0.3 : 0), y, w + 0.3, -y, 0.2, k % 2 ? PADDY.green : PADDY.bright, 0.7)
    // The water standing on the step, a sliver of sky in it.
    if (pen.lod <= 1) rect(pen, (dir < 0 ? edge : xr + 0.12), y + 0.04, w - 0.12, 0.06, PADDY.mirror, 0)
    if (pen.lod === 2 && k === 0) rect(pen, x0, y + h, w, -y - h, PADDY.green, 0)
  }
}

const ricepaddy: Skin = {
  key: 'ricepaddy',
  bg: PADDY.sky,
  ink: PADDY.ink,
  floor: PADDY.water,
  edge: PADDY.waterEdge,
  plank: PADDY.strawDeep,
  fulcrum: PADDY.bund,
  back(pen, _m, v) {
    // Far hills in the haze, then the terraced hills stepping down either side.
    poly(pen, [[v.x0 - 0.2, 0], [v.x0 - 0.2, -1.0], [-1.6, -0.62], [-0.4, -0.36], [0.8, -0.5], [2.0, -0.9], [v.x1 + 0.2, -1.2], [v.x1 + 0.2, 0]], PADDY.far, 0)
    terraces(pen, -1, v.x0 - 0.1, 0)
    terraces(pen, 1, v.x1 + 0.1, 1.4)
  },
  front(pen, m, v) {
    if (pen.lod > 1) return
    // Rows of young rice standing in the water.
    const step = pen.lod === 0 ? 0.3 : 0.6
    strokeLines(pen, PADDY.shoot, 0.025, (ctx) => {
      for (const [y, s] of [[0.24, 0.07], [0.5, 0.09]] as const) {
        if (y > v.y1) break
        for (let x = Math.floor(v.x0 / step) * step + y; x < v.x1; x += step) {
          ctx.moveTo(x, y)
          ctx.lineTo(x - s * 0.5, y - s)
          ctx.moveTo(x, y)
          ctx.lineTo(x + s * 0.5, y - s)
          ctx.moveTo(x, y)
          ctx.lineTo(x, y - s * 1.2)
        }
      }
    })
    // Rings on the water where the plank's end came down.
    if (m.since >= 0 && m.since < 1.4) {
      const x = m.e ? -1.1 : 1.1
      const a = 1 - m.since / 1.4
      strokeLines(pen, rgba('#FFFFFF', 0.6 * a), pen.lw * 1.2, (ctx) => {
        for (const d of [0, 0.25]) {
          const r = 0.15 + (m.since + d) * 0.5
          oval(ctx, x, 0.14, r, r * 0.18)
        }
      })
    }
  },
  weight(pen) {
    // A conical straw hat.
    const h = WEIGHT_H * 0.72
    ellipse(pen, 0, -0.025, 0.2, 0.03, PADDY.strawDeep, 0.7)
    poly(pen, [[-0.2, -0.03], [0.2, -0.03], [0, -h]], PADDY.straw)
    if (pen.lod === 0) {
      strokeLines(pen, PADDY.strawDeep, pen.lw * 0.7, (ctx) => {
        for (const f of [0.35, 0.65]) {
          ctx.moveTo(-0.2 * (1 - f), -0.03 - (h - 0.03) * f)
          ctx.lineTo(0.2 * (1 - f), -0.03 - (h - 0.03) * f)
        }
      })
    }
  },
}

/* ------------------------------------------------------------------ a tulip field, and its windmill */

const TULIP = {
  sky: '#A4C4EA',
  cloud: '#F4F7FA',
  pink: '#EC8CB4',
  yellow: '#F4D04A',
  purple: '#8C5CB8',
  white: '#F6F1E6',
  leaf: '#5C963E',
  leafDeep: '#4A7E32',
  tower: '#6E4C3A',
  towerDeep: '#4C3428',
  cap: '#3C3C48',
  sail: '#F0E8D4',
  frame: '#3A2A22',
  clog: '#E8C25A',
  clogDeep: '#B48C36',
  ink: '#2A2630',
}

const ROWS = [TULIP.pink, TULIP.yellow, TULIP.purple, TULIP.white, TULIP.pink, TULIP.yellow]

/** The four sails of a windmill at (x, y), turned by `a`, as one path. */
function sails(pen: Pen, x: number, y: number, R: number, a: number): void {
  const { ctx } = pen
  ctx.beginPath()
  for (let k = 0; k < 4; k++) {
    const t = a + (k * Math.PI) / 2
    const c = Math.cos(t)
    const s = Math.sin(t)
    const r0 = R * 0.14
    const w = R * 0.22
    // The sail sits to one side of its stock.
    ctx.moveTo(x + c * r0, y + s * r0)
    ctx.lineTo(x + c * R, y + s * R)
    ctx.lineTo(x + c * R - s * w, y + s * R + c * w)
    ctx.lineTo(x + c * r0 - s * w, y + s * r0 + c * w)
    ctx.closePath()
  }
  shape(pen, TULIP.sail, 0.8)
  if (pen.lod > 1) return
  strokeLines(pen, TULIP.frame, 0.03, (c2) => {
    for (let k = 0; k < 4; k++) {
      const t = a + (k * Math.PI) / 2
      c2.moveTo(x, y)
      c2.lineTo(x + Math.cos(t) * R, y + Math.sin(t) * R)
    }
  })
}

const tulips: Skin = {
  key: 'tulips',
  bg: TULIP.sky,
  ink: TULIP.ink,
  floor: TULIP.leaf,
  edge: TULIP.leafDeep,
  plank: TULIP.tower,
  fulcrum: TULIP.towerDeep,
  back(pen, m, v) {
    // A cloud going over.
    if (pen.lod <= 1) {
      const cx = -0.2 + 0.4 * Math.sin(m.t * 0.05)
      fillAll(pen, TULIP.cloud, (ctx) => {
        oval(ctx, cx, -2.15, 0.45, 0.12)
        oval(ctx, cx + 0.2, -2.25, 0.25, 0.12)
      })
    }
    // The field to the horizon, in its bands of colour.
    for (let i = 0; i < 4; i++) rect(pen, v.x0 - 0.1, -0.48 + i * 0.12, v.x1 - v.x0 + 0.2, 0.08, ROWS[i], 0)
    if (pen.lod <= 1) {
      fillAll(pen, TULIP.leaf, (ctx) => {
        for (let i = 0; i < 4; i++) ctx.rect(v.x0 - 0.1, -0.4 + i * 0.12, v.x1 - v.x0 + 0.2, 0.04)
      })
      // A little mill far off on the right.
      rect(pen, 2.5, -0.95, 0.14, 0.47, TULIP.towerDeep, 0.6)
      sails(pen, 2.57, -0.95, 0.32, -m.t * 0.8)
    }
    // The windmill on the left: its tower, its cap and its sails, turning, with a kick when the ground is struck.
    const x = -2.2
    poly(pen, [[x - 0.4, 0], [x + 0.4, 0], [x + 0.24, -1.5], [x - 0.24, -1.5]], TULIP.tower)
    if (pen.lod <= 1) {
      rect(pen, x - 0.1, -0.36, 0.2, 0.36, TULIP.towerDeep, 0.6)
      rect(pen, x - 0.07, -1.05, 0.14, 0.16, TULIP.sky, 0.6)
    }
    poly(pen, [[x - 0.3, -1.48], [x + 0.3, -1.48], [x + 0.22, -1.68], [x, -1.78], [x - 0.22, -1.68]], TULIP.cap)
    const a = m.t * 0.7 + ring(m, 0.5, 0.4) * 0.12
    sails(pen, x + 0.02, -1.62, 0.95, a)
    circle(pen, x + 0.02, -1.62, 0.06, TULIP.frame, 0)
  },
  front(pen, _m, v) {
    // The near rows running out toward us, a colour each.
    if (pen.lod > 1) return
    const h = v.y1 - 0.07
    const n = pen.lod === 0 ? 12 : 6
    for (let c = 0; c < 3; c++) {
      fillAll(pen, ROWS[c], (ctx) => {
        for (let i = c; i < n; i += 3) {
          const k = i - n / 2 + 0.5
          const x0 = k * 0.5
          const x1 = k * (0.5 + h * 1.2)
          const w0 = 0.16
          const w1 = 0.16 + h * 0.4
          ctx.moveTo(x0 - w0 / 2, 0.07)
          ctx.lineTo(x0 + w0 / 2, 0.07)
          ctx.lineTo(x1 + w1 / 2, v.y1 + 0.1)
          ctx.lineTo(x1 - w1 / 2, v.y1 + 0.1)
          ctx.closePath()
        }
      })
    }
  },
  weight(pen) {
    // A wooden clog, seen from the side.
    const h = 0.2
    pen.ctx.beginPath()
    pen.ctx.moveTo(-0.17, 0)
    pen.ctx.lineTo(0.12, 0)
    pen.ctx.quadraticCurveTo(0.2, -0.01, 0.2, -h * 0.55)
    pen.ctx.quadraticCurveTo(0.18, -h * 0.7, 0.04, -h * 0.75)
    pen.ctx.lineTo(-0.06, -h)
    pen.ctx.lineTo(-0.17, -h)
    pen.ctx.closePath()
    shape(pen, TULIP.clog)
    if (pen.lod <= 1) ellipse(pen, -0.11, -h, 0.06, 0.02, TULIP.clogDeep, 0.6)
    if (pen.lod === 0) line(pen, 0.0, -h * 0.4, 0.14, -h * 0.45, TULIP.clogDeep, 0.02)
  },
}

/* ------------------------------------------------------------------ a field of sunflowers */

const SUNNY = {
  sky: '#2E84D2',
  high: '#2470BE',
  sun: '#FFF2B4',
  petal: '#F6C62C',
  petalDeep: '#E09A1E',
  seed: '#4A2E1A',
  stem: '#4E8A2E',
  leaf: '#5EA03A',
  leafDeep: '#3E7428',
  soil: '#A9854A',
  soilDeep: '#8A6A38',
  hay: '#E4C66A',
  hayDeep: '#B8963E',
  twine: '#7A5A2A',
  ink: '#1E2836',
}

/** A sunflower head's petals, a unit across. */
const PETALS: readonly Pt[] = Array.from({ length: 24 }, (_, i) => {
  const a = (i / 24) * Math.PI * 2
  const r = i % 2 ? 0.62 : 1
  return [Math.cos(a) * r, Math.sin(a) * r] as Pt
})

/** Big heads in the near field: x, head height, size, facing. */
const HEADS: readonly (readonly [number, number, number, number])[] = [[-2.75, -1.25, 0.38, 0.2], [-2.0, -1.62, 0.46, -0.1], [-1.55, -0.95, 0.3, -0.3], [1.65, -1.05, 0.32, 0.25], [2.2, -1.55, 0.44, 0.05], [2.9, -1.95, 0.4, -0.2]]

const sunflower: Skin = {
  key: 'sunflower',
  bg: SUNNY.sky,
  ink: SUNNY.ink,
  floor: SUNNY.soil,
  edge: SUNNY.soilDeep,
  plank: SUNNY.hayDeep,
  fulcrum: SUNNY.soilDeep,
  back(pen, m, v) {
    // The sky deeper up high, and the sun hot in it.
    rect(pen, v.x0 - 0.1, v.y0 - 0.1, v.x1 - v.x0 + 0.2, -2.0 - v.y0 + 0.1, SUNNY.high, 0)
    glow(pen, -0.4, -2.35, 1.0, SUNNY.sun, 0.55)
    circle(pen, -0.4, -2.35, 0.26, SUNNY.sun, 0)
    // The field to the horizon, a band of yellow heads over green.
    rect(pen, v.x0 - 0.1, -0.42, v.x1 - v.x0 + 0.2, 0.42, SUNNY.leafDeep, 0)
    if (pen.lod <= 1) {
      fillAll(pen, SUNNY.petal, (ctx) => {
        for (let x = Math.floor(v.x0 / 0.16) * 0.16; x < v.x1; x += pen.lod === 0 ? 0.16 : 0.32) oval(ctx, x, -0.46 + 0.03 * Math.sin(x * 7), 0.075, 0.05)
      })
    } else rect(pen, v.x0 - 0.1, -0.52, v.x1 - v.x0 + 0.2, 0.1, SUNNY.petal, 0)
    // The near flowers, tall on their stems, nodding when the ground is struck.
    const nod = ring(m, 0.55, 0.5) * 0.12
    const sway = 0.03 * Math.sin(m.t * 0.6)
    strokeLines(pen, SUNNY.stem, 0.05, (ctx) => {
      for (const [x, y] of HEADS) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x + sway, y)
      }
    })
    if (pen.lod <= 1) {
      fillAll(pen, SUNNY.leaf, (ctx) => {
        for (const [x, y] of HEADS) {
          oval(ctx, x - 0.12, y * 0.45, 0.15, 0.055, 0.5)
          oval(ctx, x + 0.12, y * 0.7, 0.15, 0.055, -0.5)
        }
      }, 0.6)
    }
    for (const [x, y, s, face] of HEADS) {
      at(pen, x + sway, y, face + nod * Math.sign(x), 1, () => {
        poly(pen, PETALS.map(([px, py]) => [px * s, py * s * 0.9] as Pt), SUNNY.petal, 0.6)
        circle(pen, 0, 0, s * 0.42, SUNNY.seed, 0)
      })
    }
  },
  weight(pen) {
    // A bale of straw, tied twice.
    const h = WEIGHT_H * 0.78
    round(pen, -0.17, -h, 0.34, h, 0.04, SUNNY.hay)
    if (pen.lod <= 1) {
      rect(pen, -0.1, -h, 0.03, h, SUNNY.twine, 0)
      rect(pen, 0.07, -h, 0.03, h, SUNNY.twine, 0)
    }
    if (pen.lod === 0) {
      strokeLines(pen, SUNNY.hayDeep, pen.lw * 0.7, (ctx) => {
        for (const y of [-h * 0.3, -h * 0.62]) {
          ctx.moveTo(-0.15, y)
          ctx.lineTo(0.15, y + 0.01)
        }
      })
    }
  },
}

/* ------------------------------------------------------------------ a crystal cave */

const CAVE = {
  dark: '#1C1630',
  wall: '#2E2444',
  wallDeep: '#241C38',
  amethyst: '#9A62D8',
  amethystDeep: '#6A3EAA',
  amethystLight: '#D0ACF4',
  teal: '#3CC6C0',
  tealDeep: '#22848A',
  tealLight: '#A8F2EA',
  floor: '#3A2E4A',
  edge: '#4C3C60',
  rock: '#5A4E66',
  glint: '#FFFFFF',
  ink: '#0E0A18',
}

/** One crystal: a pointed prism from its root at (x, y), pointing along `a`, `len` long and `w` wide. */
function prism(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, len: number, w: number): void {
  const c = Math.cos(a)
  const s = Math.sin(a)
  const nx = -s * w
  const ny = c * w
  const b = len * 0.78
  ctx.moveTo(x + nx, y + ny)
  ctx.lineTo(x + c * b + nx, y + s * b + ny)
  ctx.lineTo(x + c * len, y + s * len)
  ctx.lineTo(x + c * b - nx, y + s * b - ny)
  ctx.lineTo(x - nx, y - ny)
  ctx.closePath()
}
/** The bright face down one side of a crystal. */
function facet(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, len: number, w: number): void {
  const c = Math.cos(a)
  const s = Math.sin(a)
  const b = len * 0.78
  ctx.moveTo(x, y)
  ctx.lineTo(x + c * b, y + s * b)
  ctx.lineTo(x + c * len, y + s * len)
  ctx.lineTo(x + c * b - s * w, y + s * b + c * w)
  ctx.lineTo(x - s * w, y + c * w)
  ctx.closePath()
}

type Crystal = readonly [number, number, number, number, number]
/** The clusters: root x, root y, angle, length, half-width. */
const AMETHYST: readonly Crystal[] = [[-2.2, 0, -1.9, 1.3, 0.14], [-2.0, 0, -1.45, 1.6, 0.18], [-1.7, 0, -1.15, 0.9, 0.12], [-2.6, 0, -2.3, 1.0, 0.13], [-2.9, 0, -1.7, 0.7, 0.1]]
const TEAL: readonly Crystal[] = [[2.15, 0, -1.6, 1.25, 0.15], [1.9, 0, -2.1, 0.85, 0.12], [2.5, 0, -1.2, 1.0, 0.13], [2.8, 0, -1.75, 0.6, 0.1]]
const HANGING: readonly Crystal[] = [[0.9, -2.45, 1.75, 0.45, 0.07], [1.5, -2.45, 1.45, 0.55, 0.09], [1.9, -2.45, 1.6, 0.38, 0.07], [-0.4, -2.45, 1.5, 0.35, 0.06], [-1.6, -2.45, 1.65, 0.48, 0.08]]

function cluster(pen: Pen, set: readonly Crystal[], body: string, light: string): void {
  const all = pen.lod <= 1 ? set : set.slice(0, 3)
  fillAll(pen, body, (ctx) => {
    for (const [x, y, a, l, w] of all) prism(ctx, x, y, a, l, w)
  }, 0.8)
  if (pen.lod <= 1) {
    fillAll(pen, light, (ctx) => {
      for (const [x, y, a, l, w] of all) facet(ctx, x, y, a, l, w * 0.6)
    })
  }
}

const crystal: Skin = {
  key: 'crystal',
  bg: CAVE.dark,
  ink: CAVE.ink,
  floor: CAVE.floor,
  edge: CAVE.edge,
  plank: CAVE.rock,
  fulcrum: CAVE.wall,
  back(pen, m, v) {
    // The cave's walls, closing in at the sides and over the top.
    const top = v.y0 - 0.1
    poly(pen, [[v.x0 - 0.1, 0], [v.x0 - 0.1, top], [v.x1 + 0.1, top], [v.x1 + 0.1, 0], [3.1, 0], [3.0, -1.4], [2.6, -2.2], [1.6, -2.45], [0, -2.5], [-1.6, -2.45], [-2.7, -2.1], [-3.1, -1.3], [-3.2, 0]], CAVE.wall, 0)
    if (pen.lod <= 1) poly(pen, [[v.x0 - 0.1, 0], [v.x0 - 0.1, -2.4], [-3.0, -1.5], [-2.95, 0]], CAVE.wallDeep, 0)
    // Light off the crystals, a little brighter after a slam.
    const f = flashOf(m, 0.9, 0.3)
    glow(pen, -2.0, -0.8, 1.4, CAVE.amethyst, 0.28 + 0.2 * f)
    glow(pen, 2.2, -0.7, 1.2, CAVE.teal, 0.24 + 0.2 * f)
    // The crystals: amethyst on the left, teal on the right, and more hanging from the roof.
    cluster(pen, AMETHYST, CAVE.amethyst, CAVE.amethystLight)
    cluster(pen, TEAL, CAVE.teal, CAVE.tealLight)
    if (pen.lod <= 1) {
      fillAll(pen, CAVE.tealDeep, (ctx) => {
        for (const [x, y, a, l, w] of HANGING) prism(ctx, x, y, a, l, w)
      }, 0.7)
    }
    // Glints at the crystals' tips: a slow twinkle, and all at once on the loud landings.
    if (pen.lod > 1) return
    const tips = [AMETHYST[0], AMETHYST[1], TEAL[0], TEAL[2], HANGING[1], AMETHYST[3]]
    fillAll(pen, CAVE.glint, (ctx) => {
      for (let i = 0; i < tips.length; i++) {
        const [x, y, a, l] = tips[i]
        const tw = Math.max(0, Math.sin(m.t * 1.3 + i * 2.4)) ** 6
        const s = 0.09 * Math.max(tw, f)
        if (s < 0.01) continue
        const tx = x + Math.cos(a) * l
        const ty = y + Math.sin(a) * l
        ctx.moveTo(tx - s, ty)
        ctx.lineTo(tx - s * 0.18, ty - s * 0.18)
        ctx.lineTo(tx, ty - s)
        ctx.lineTo(tx + s * 0.18, ty - s * 0.18)
        ctx.lineTo(tx + s, ty)
        ctx.lineTo(tx + s * 0.18, ty + s * 0.18)
        ctx.lineTo(tx, ty + s)
        ctx.lineTo(tx - s * 0.18, ty + s * 0.18)
        ctx.closePath()
      }
    })
  },
  weight(pen) {
    // A cluster of amethyst on its lump of rock.
    ellipse(pen, 0, -0.04, 0.16, 0.06, CAVE.rock, 0.8)
    fillAll(pen, CAVE.amethyst, (ctx) => {
      prism(ctx, -0.07, -0.05, -2.0, 0.22, 0.05)
      prism(ctx, 0.0, -0.06, -1.55, 0.3, 0.06)
      prism(ctx, 0.08, -0.05, -1.15, 0.22, 0.05)
    }, 0.8)
    if (pen.lod <= 1) {
      fillAll(pen, CAVE.amethystLight, (ctx) => {
        facet(ctx, 0.0, -0.06, -1.55, 0.3, 0.035)
      })
    }
  },
}

/* ------------------------------------------------------------------ a koi pond */

const KOI = {
  leaves: '#55704A',
  bush: '#3E5A38',
  bushLight: '#6A8A52',
  pond: '#2A5664',
  pondLight: '#3C6E7C',
  bank: '#7A7462',
  pad: '#62A04A',
  padDeep: '#467A38',
  lotus: '#F4CCDC',
  koi: '#F09A3C',
  white: '#F6F2EA',
  bridge: '#7A4A30',
  bridgeDeep: '#54321F',
  stone: '#A29E92',
  stoneDeep: '#7A766C',
  light: '#FFE6A4',
  ink: '#1C2820',
}

/** The bridge's arch: x from 1.35 to 3.45, rising to -0.95. */
const archY = (x: number): number => -0.2 - 0.75 * Math.sin((Math.PI * (x - 1.35)) / 2.1)
const ARCH_TOP: readonly Pt[] = Array.from({ length: 13 }, (_, i) => {
  const x = 1.35 + (2.1 * i) / 12
  return [x, archY(x)] as Pt
})
const DECK: readonly Pt[] = [...ARCH_TOP, ...ARCH_TOP.slice().reverse().map(([x, y]) => [x, y + 0.14] as Pt)]

const koi: Skin = {
  key: 'koi',
  bg: KOI.leaves,
  ink: KOI.ink,
  floor: KOI.pond,
  edge: KOI.bank,
  plank: KOI.bridge,
  fulcrum: KOI.stoneDeep,
  back(pen, _m, v) {
    // Shrubs clipped round along the far bank.
    fillAll(pen, KOI.bush, (ctx) => {
      ctx.rect(v.x0 - 0.1, -0.35, v.x1 - v.x0 + 0.2, 0.35)
      for (const [x, r] of [[-3.0, 0.5], [-2.2, 0.62], [-1.5, 0.4], [0.2, 0.3], [1.0, 0.35], [2.9, 0.5]] as const) oval(ctx, x, -0.3, r, r * 0.75)
    })
    if (pen.lod <= 1) {
      fillAll(pen, KOI.bushLight, (ctx) => {
        for (const [x, r] of [[-2.35, 0.3], [-3.05, 0.22], [2.75, 0.24]] as const) oval(ctx, x, -0.5, r, r * 0.6)
      })
    }
    // The arched bridge on the right, over the water: its deck, its posts and its rail.
    if (pen.lod <= 1) {
      strokeLines(pen, KOI.bridgeDeep, 0.035, (ctx) => {
        for (let i = 1; i < 12; i += 2) {
          const [x, y] = ARCH_TOP[i]
          ctx.moveTo(x, y)
          ctx.lineTo(x, y - 0.3)
        }
        ctx.moveTo(ARCH_TOP[0][0], ARCH_TOP[0][1] - 0.3)
        for (let i = 1; i < ARCH_TOP.length; i++) ctx.lineTo(ARCH_TOP[i][0], ARCH_TOP[i][1] - 0.3)
      })
    }
    poly(pen, DECK, KOI.bridge, 0.8)
    if (pen.lod <= 1) {
      fillAll(pen, KOI.bridgeDeep, (ctx) => {
        ctx.rect(1.33, -0.25, 0.08, 0.25)
        ctx.rect(3.39, -0.25, 0.08, 0.25)
      })
    }
  },
  front(pen, m, v) {
    if (pen.lod > 1) {
      ellipse(pen, -2.1, 0.35, 0.22, 0.07, KOI.pad, 0)
      return
    }
    // Light on the water.
    strokeLines(pen, KOI.pondLight, 0.03, (ctx) => {
      for (const [x, y, w] of [[-2.6, 0.16, 0.6], [0.4, 0.22, 0.8], [2.3, 0.14, 0.5], [-0.8, 0.48, 0.5]] as const) {
        ctx.moveTo(x, y)
        ctx.lineTo(x + w, y)
      }
    })
    // Koi swimming slow lengths of the pond; they start when the plank comes down.
    const dart = knock(m.since, 0.5)
    const span = v.x1 - v.x0 + 1
    for (let i = 0; i < (pen.lod === 0 ? 3 : 2); i++) {
      const dir = i % 2 ? -1 : 1
      const x = v.x0 - 0.5 + ((m.t * (0.18 + 0.05 * i) + i * 2.3 + dart * 0.12) % span)
      const xx = dir > 0 ? x : v.x1 + v.x0 - x
      const y = 0.26 + 0.18 * i + 0.03 * Math.sin(m.t * 1.5 + i)
      at(pen, xx, y, 0.06 * Math.sin(m.t * 3 + i), 1, () => {
        poly(pen, [[-0.1 * dir, 0], [-0.2 * dir, -0.05], [-0.2 * dir, 0.05]], i === 1 ? KOI.white : KOI.koi, 0)
        ellipse(pen, 0, 0, 0.12, 0.04, i === 1 ? KOI.white : KOI.koi, 0)
        if (pen.lod === 0) ellipse(pen, 0.02 * dir, -0.005, 0.04, 0.025, i === 1 ? KOI.koi : KOI.white, 0)
      })
    }
    // Lily pads over them, and a lotus.
    fillAll(pen, KOI.pad, (ctx) => {
      for (const [x, y, r] of [[-2.1, 0.35, 0.22], [-1.6, 0.55, 0.16], [1.7, 0.42, 0.2], [2.6, 0.62, 0.24], [0.2, 0.68, 0.15]] as const) {
        ctx.moveTo(x, y)
        ctx.ellipse(x, y, r, r * 0.32, 0, 0.35, Math.PI * 2 - 0.05)
        ctx.closePath()
      }
    }, 0.6)
    if (pen.lod === 0) {
      ellipse(pen, -2.05, 0.31, 0.06, 0.035, KOI.lotus, 0.6)
      poly(pen, [[-2.1, 0.31], [-2.05, 0.24], [-2.0, 0.31]], KOI.lotus, 0.6)
    }
  },
  weight(pen) {
    // A stone lantern: its foot, its post, the lit box, the roof and its knob.
    rect(pen, -0.11, -0.04, 0.22, 0.04, KOI.stoneDeep, 0.7)
    rect(pen, -0.04, -0.15, 0.08, 0.11, KOI.stone, 0.7)
    rect(pen, -0.1, -0.21, 0.2, 0.06, KOI.stoneDeep, 0.7)
    rect(pen, -0.08, -0.29, 0.16, 0.08, KOI.stone, 0.7)
    if (pen.lod <= 1) rect(pen, -0.035, -0.275, 0.07, 0.05, KOI.light, 0)
    poly(pen, [[-0.17, -0.28], [0.17, -0.28], [0.05, -0.33], [-0.05, -0.33]], KOI.stoneDeep, 0.7)
    circle(pen, 0, -0.335, 0.025, KOI.stone, 0.6)
  },
}

/* ------------------------------------------------------------------ a raked-sand garden */

const ZEN = {
  sky: '#D6DEE2',
  wall: '#D9C9A4',
  wallLow: '#C6B48C',
  tile: '#4A4E54',
  pine: '#2E5038',
  pineLight: '#466A48',
  trunk: '#4A3A30',
  sand: '#E6E0D0',
  rake: '#BDB4A0',
  stone: '#6C6A64',
  stoneLight: '#8A8880',
  moss: '#7A8E4E',
  pot: '#3E5A72',
  ink: '#2A2A28',
}

/** The pine's pads, cloud-pruned: x, y, half-width. */
const PADS: readonly (readonly [number, number, number])[] = [[-2.85, -1.55, 0.42], [-2.2, -2.05, 0.5], [-1.62, -1.75, 0.36], [-2.75, -2.45, 0.34], [-1.85, -2.5, 0.3]]

/** A stone set in the sand at (x, y). */
function stone(pen: Pen, x: number, y: number, s: number, tall: number): void {
  poly(pen, [[x - s, y], [x - s * 0.8, y - s * 0.45 * tall], [x - s * 0.2, y - s * 0.9 * tall], [x + s * 0.5, y - s * 0.7 * tall], [x + s, y]], ZEN.stone, 0.8)
  if (pen.lod <= 1) ellipse(pen, x - s * 0.35, y - s * 0.55 * tall, s * 0.3, s * 0.12, ZEN.moss, 0, -0.4)
}

const zen: Skin = {
  key: 'zen',
  bg: ZEN.sky,
  ink: ZEN.ink,
  floor: ZEN.sand,
  edge: ZEN.rake,
  plank: ZEN.trunk,
  fulcrum: ZEN.stone,
  back(pen, m, v) {
    // The old earthen wall along the back, under its line of tiles.
    rect(pen, v.x0 - 0.1, -1.15, v.x1 - v.x0 + 0.2, 1.15, ZEN.wall, 0)
    if (pen.lod <= 1) rect(pen, v.x0 - 0.1, -0.35, v.x1 - v.x0 + 0.2, 0.35, ZEN.wallLow, 0)
    rect(pen, v.x0 - 0.1, -1.28, v.x1 - v.x0 + 0.2, 0.14, ZEN.tile, 0)
    if (pen.lod === 0) {
      strokeLines(pen, mix(ZEN.tile, ZEN.sky, 0.35), pen.lw * 0.8, (ctx) => {
        for (let x = Math.floor(v.x0 / 0.18) * 0.18; x < v.x1; x += 0.18) {
          ctx.moveTo(x, -1.27)
          ctx.lineTo(x, -1.15)
        }
      })
    }
    // A pine leaning over the wall from beyond it, its pads clipped flat; they sway a little in the wind.
    const sw = 0.03 * Math.sin(m.t * 0.4)
    fillAll(pen, ZEN.trunk, (ctx) => {
      trace(ctx, [[-2.55, -1.28], [-2.35, -1.28], [-2.3, -1.7], [-2.0, -2.05], [-1.62, -1.78], [-1.6, -1.72], [-2.02, -1.95], [-2.3, -2.1], [-2.7, -2.4], [-2.75, -2.35], [-2.42, -2.0], [-2.85, -1.55], [-2.82, -1.5], [-2.48, -1.7]])
    }, 0.7)
    for (const k of [0, 1]) {
      fillAll(pen, k ? ZEN.pineLight : ZEN.pine, (ctx) => {
        for (const [x, y, w] of PADS) {
          if (k && pen.lod > 1) continue
          if (k) oval(ctx, x + sw - w * 0.1, y - 0.06, w * 0.75, 0.07)
          else oval(ctx, x + sw, y, w, 0.15)
        }
      }, k ? 0 : 0.7)
    }
    // Two stones on the right, set in the sand.
    stone(pen, 2.3, 0, 0.42, 1.3)
    stone(pen, 1.72, 0, 0.2, 1.0)
  },
  front(pen, _m, v) {
    if (pen.lod > 1) return
    // The sand raked in long lines, and in rings round a stone near us.
    const cx = -2.2
    const cy = 0.42
    strokeLines(pen, ZEN.rake, pen.lw * 1.1, (ctx) => {
      for (let y = 0.16; y < v.y1; y += pen.lod === 0 ? 0.09 : 0.18) {
        ctx.moveTo(v.x0, y)
        ctx.lineTo(v.x1, y)
      }
    })
    ellipse(pen, cx, cy, 0.62, 0.22, ZEN.sand, 0)
    strokeLines(pen, ZEN.rake, pen.lw * 1.1, (ctx) => {
      for (const k of pen.lod === 0 ? [0.3, 0.44, 0.58] : [0.36, 0.58]) oval(ctx, cx, cy, k, k * 0.36)
    })
    stone(pen, cx + 0.02, cy + 0.04, 0.2, 0.9)
  },
  weight(pen) {
    // A small bonsai pine in its shallow pot.
    poly(pen, [[-0.14, 0], [0.14, 0], [0.17, -0.07], [-0.17, -0.07]], ZEN.pot, 0.8)
    if (pen.lod <= 1) line(pen, -0.02, -0.07, 0.04, -0.2, ZEN.trunk, 0.045)
    ellipse(pen, -0.05, -0.2, 0.12, 0.045, ZEN.pine, 0.7)
    ellipse(pen, 0.07, -0.27, 0.1, 0.04, ZEN.pine, 0.7)
    if (pen.lod === 0) ellipse(pen, -0.03, -0.32, 0.07, 0.03, ZEN.pineLight, 0.6)
  },
}

/* ------------------------------------------------------------------ a bayou at dusk */

const BAYOU = {
  dusk: '#4C5064',
  low: '#8E7480',
  far: '#3A3E44',
  cypress: '#24261F',
  moss: '#8C9A82',
  mossDeep: '#6C7A66',
  water: '#2C3532',
  waterEdge: '#3C4A44',
  shine: '#5E6670',
  fly: '#E8F48A',
  glass: '#BFD8D2',
  lid: '#7A6A4A',
  ink: '#121411',
}

/** A cypress: flared at the foot, bare up its trunk, a flat sprawling crown, as one path. */
function cypress(ctx: CanvasRenderingContext2D, x: number, h: number, s: number): void {
  trace(ctx, [[x - 0.5 * s, 0], [x - 0.25 * s, -0.22 * s], [x - 0.14 * s, -0.6 * s], [x - 0.1 * s, -h + 0.25], [x - 0.55 * s, -h + 0.05], [x - 0.5 * s, -h], [x - 0.06 * s, -h + 0.12], [x + 0.08 * s, -h - 0.1], [x + 0.14 * s, -h - 0.08], [x + 0.1 * s, -h + 0.15], [x + 0.6 * s, -h + 0.02], [x + 0.62 * s, -h + 0.08], [x + 0.12 * s, -h + 0.3], [x + 0.14 * s, -0.6 * s], [x + 0.25 * s, -0.22 * s], [x + 0.55 * s, 0]])
  for (const [u, w, r, t] of CROWN) oval(ctx, x + u * s, -h + w * s, r * s, t * s)
}

/** The crown's flat masses: x, y, half-width, half-height, in units of the tree's size. */
const CROWN: readonly (readonly [number, number, number, number])[] = [[-0.5, 0.02, 0.42, 0.12], [0.1, -0.15, 0.5, 0.14], [0.6, 0.02, 0.38, 0.11], [-0.15, -0.32, 0.3, 0.1], [-0.85, 0.12, 0.24, 0.08]]

/** Spanish moss hanging from the crowns: x, top, length. */
const MOSS: readonly (readonly [number, number, number])[] = [[-2.95, -2.0, 0.6], [-2.6, -1.95, 0.85], [-2.25, -2.0, 0.5], [-1.85, -2.0, 0.7], [-1.55, -2.05, 0.45], [1.85, -1.55, 0.5], [2.15, -1.5, 0.7], [2.55, -1.52, 0.55], [2.9, -1.55, 0.4]]

const swamp: Skin = {
  key: 'swamp',
  bg: BAYOU.dusk,
  ink: BAYOU.ink,
  floor: BAYOU.water,
  edge: BAYOU.waterEdge,
  plank: BAYOU.lid,
  fulcrum: BAYOU.cypress,
  back(pen, m, v) {
    // The last light low over the water, and the far tree line.
    rect(pen, v.x0 - 0.1, -0.75, v.x1 - v.x0 + 0.2, 0.75, BAYOU.low, 0)
    poly(pen, [[v.x0 - 0.2, 0], [v.x0 - 0.2, -0.42], [-2.2, -0.5], [-1.4, -0.36], [-0.5, -0.3], [0.4, -0.38], [1.4, -0.32], [2.4, -0.48], [v.x1 + 0.2, -0.4], [v.x1 + 0.2, 0]], BAYOU.far, 0)
    // Two cypresses, a big one on the left and a smaller one on the right, and their knees in the shallows.
    fillAll(pen, BAYOU.cypress, (ctx) => {
      cypress(ctx, -2.3, 2.0, 1.0)
      cypress(ctx, 2.35, 1.55, 0.8)
      if (pen.lod <= 1) {
        for (const x of [-1.65, -1.5, 1.7, 2.95]) trace(ctx, [[x - 0.05, 0], [x, -0.12], [x + 0.05, 0]])
      }
    })
    // The moss hanging off them, stirring.
    if (pen.lod <= 1) {
      fillAll(pen, BAYOU.moss, (ctx) => {
        for (let i = 0; i < MOSS.length; i++) {
          const [x, y, l] = MOSS[i]
          const sw = 0.06 * Math.sin(m.t * 0.7 + i * 1.3) + ring(m, 0.7, 0.6) * 0.04
          ctx.moveTo(x - 0.07, y)
          ctx.lineTo(x + 0.07, y)
          ctx.lineTo(x + 0.02 + sw, y + l)
          ctx.lineTo(x - 0.01 + sw, y + l * 0.85)
          ctx.closePath()
        }
      })
    } else {
      fillAll(pen, BAYOU.mossDeep, (ctx) => {
        ctx.rect(-2.8, -2.0, 1.1, 0.4)
        ctx.rect(1.9, -1.55, 0.9, 0.35)
      })
    }
    // Fireflies, blinking in their own time.
    if (pen.lod > 1) return
    const n = pen.lod === 0 ? 14 : 7
    fillAll(pen, BAYOU.fly, (ctx) => {
      for (let i = 0; i < n; i++) {
        const on = Math.sin(m.t * (1.1 + 0.6 * hash(i, 1, 81)) + i * 2.7)
        if (on < 0.3) continue
        const x = v.x0 + (v.x1 - v.x0) * hash(i, 2, 81) + 0.15 * Math.sin(m.t * 0.3 + i)
        const y = -0.3 - 1.9 * hash(i, 3, 81) + 0.1 * Math.cos(m.t * 0.4 + i * 2)
        const r = 0.02 + 0.02 * on
        oval(ctx, x, y, r, r)
      }
    })
  },
  front(pen, _m, v) {
    // The trees and the light, mirrored dimly in the still water.
    if (pen.lod > 1) return
    fillAll(pen, mix(BAYOU.water, BAYOU.cypress, 0.6), (ctx) => {
      ctx.rect(-2.42, 0.07, 0.24, v.y1)
      ctx.rect(2.25, 0.07, 0.2, v.y1)
    })
    strokeLines(pen, BAYOU.shine, 0.03, (ctx) => {
      for (const [x, y, w] of [[-1.6, 0.18, 0.7], [0.3, 0.3, 0.9], [1.0, 0.14, 0.4], [-0.6, 0.55, 0.6]] as const) {
        ctx.moveTo(x, y)
        ctx.lineTo(x + w, y)
      }
    })
  },
  weight(pen) {
    // A jar of fireflies, lit from inside.
    const h = WEIGHT_H
    glow(pen, 0, -h * 0.45, 0.3, BAYOU.fly, 0.45)
    round(pen, -0.12, -h * 0.84, 0.24, h * 0.84, 0.05, rgba(BAYOU.glass, 0.45))
    rect(pen, -0.1, -h, 0.2, h * 0.16, BAYOU.lid, 0.8)
    fillAll(pen, BAYOU.fly, (ctx) => {
      for (const [x, y] of [[-0.05, -0.12], [0.04, -0.2], [0.0, -0.08], [-0.03, -0.24], [0.06, -0.1]] as const) oval(ctx, x, y, 0.018, 0.018)
    })
  },
}

export const WILD_SKINS = { volcano, bamboo, mushroom: mushrooms, autumn, waterfall, ricepaddy, tulips, sunflower, crystal, koi, zen, swamp } as const satisfies Record<string, Skin>
