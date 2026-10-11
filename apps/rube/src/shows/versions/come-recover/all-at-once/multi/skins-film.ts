import { DOJO, DOJO_THEME, HIBACHI, HOME, HOTDOG, PREMIERE, ROCKS, ROCKS_THEME, STAR } from '../worlds'
import { at, circle, ellipse, glow, line, mix, poly, rect, rgba, round, type Pen, type Pt } from './skins-pen'
import { flashOf, ring, WEIGHT_H, type Skin } from './skins-kit'

/**
 * Lives from the film she never lived in this show: Evelyn the opera singer, the dawn of man with its black slab,
 * the Alphaverse's van, Gong Gong's mahjong parlour, a park where a pug sits, a dim sum teahouse, a painting in ink
 * and wash, and a picture in black and white. Each is one backdrop and one weight for the same seesaw, as in
 * `skins.ts`, and draws in the same cells: the ground's top at y = 0, the machine in x -1.15..1.15 under y = -1.7,
 * the world's one big silhouette off to the sides or high.
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

/* ------------------------------------------------------------------ the opera */

const OPERA = {
  stage: '#2A1620',
  velvet: '#8E1A28',
  velvetDeep: STAR.velvet,
  boards: '#9A6A3E',
  lip: STAR.gold,
  rose: '#B3202E',
  leaf: '#4E7A4A',
}

/** One side's curtain, falling from the top to the boards and caught back at the waist by a gold cord. */
function curtain(pen: Pen, s: number, top: number, out: number, sw: number): void {
  const { ctx } = pen
  ctx.beginPath()
  ctx.moveTo(out, top)
  ctx.lineTo(s * 1.45, top)
  ctx.quadraticCurveTo(s * 1.5, -1.3, s * 1.95, -0.95)
  ctx.quadraticCurveTo(s * 1.72, -0.5, s * 1.58, 0)
  ctx.lineTo(out, 0)
  ctx.closePath()
  shape(pen, OPERA.velvet)
  if (pen.lod === 0) {
    // Folds, gathered into the tie-back.
    for (const x of [2.15, 2.5]) {
      line(pen, s * x, top, s * 1.98, -0.98, OPERA.velvetDeep, pen.lw * 1.2)
      line(pen, s * 1.98, -0.94, s * (x - 0.05), 0, OPERA.velvetDeep, pen.lw * 1.2)
    }
  }
  if (pen.lod <= 1) {
    // The tie-back's tassel, swinging when the boards are struck.
    circle(pen, s * 1.95, -0.95, 0.06, OPERA.lip, 0.6)
    at(pen, s * 1.95, -0.92, sw * s, 1, () => {
      line(pen, 0, 0, 0, 0.16, OPERA.lip, 0.025)
      poly(pen, [[-0.035, 0.14], [0.035, 0.14], [0.06, 0.3], [-0.06, 0.3]], OPERA.lip, 0.6)
    })
  }
}

const opera: Skin = {
  key: 'opera',
  bg: OPERA.stage,
  ink: PREMIERE.ink,
  floor: OPERA.boards,
  edge: OPERA.lip,
  plank: DOJO.woodDeep,
  fulcrum: OPERA.velvetDeep,
  back(pen, m, v) {
    const top = v.y0 - 0.2
    const sw = ring(m, 0.5, 0.45) * 0.35
    curtain(pen, -1, top, v.x0 - 0.2, sw)
    curtain(pen, 1, top, v.x1 + 0.2, sw)
    // The swags across the top, in their gold fringe.
    if (v.y0 < -2.0) {
      const { ctx } = pen
      ctx.beginPath()
      ctx.moveTo(v.x0 - 0.2, top)
      ctx.lineTo(v.x1 + 0.2, top)
      ctx.lineTo(3.2, -2.12)
      for (let i = 0; i < 4; i++) {
        const x = 3.2 - i * 1.6
        ctx.quadraticCurveTo(x - 0.8, -1.82, x - 1.6, -2.12)
      }
      ctx.lineTo(v.x0 - 0.2, -2.12)
      ctx.closePath()
      ctx.fillStyle = OPERA.velvetDeep
      ctx.fill()
      if (pen.lod <= 1) {
        ctx.strokeStyle = OPERA.lip
        ctx.lineWidth = pen.lod === 0 ? 0.05 : 0.07
        ctx.stroke()
      }
    }
    // The footlights, warm along the front of the stage.
    glow(pen, 0, 0.1, 2.7, STAR.spot, 0.26)
  },
  front(pen, _m, v) {
    // The boards, running off to the wings.
    if (pen.lod === 0) for (const y of [0.22, 0.42, 0.64]) if (y < v.y1) line(pen, v.x0, y, v.x1, y, mix(OPERA.boards, DOJO.woodDeep, 0.6), pen.lw * 0.8)
  },
  weight(pen) {
    // A bouquet of roses, wrapped in paper and tied with a gold ribbon.
    const h = WEIGHT_H
    if (pen.lod <= 1) for (const [x, a] of [[-0.11, -0.6], [0.11, 0.6]] as const) ellipse(pen, x, -h * 0.68, 0.07, 0.03, OPERA.leaf, 0.6, a)
    poly(pen, [[-0.03, 0], [0.03, 0], [0.15, -h * 0.66], [-0.15, -h * 0.66]], STAR.cream, 0.8)
    for (const [x, y] of [[-0.075, -h * 0.76], [0.075, -h * 0.76], [0, -h * 0.86]] as const) circle(pen, x, y, 0.07, OPERA.rose, 0.7)
    if (pen.lod <= 1) line(pen, -0.06, -h * 0.25, 0.06, -h * 0.25, OPERA.lip, 0.03)
  },
}

/* ------------------------------------------------------------------ the dawn of man */

const DAWN = {
  high: '#E8B79C',
  mid: '#F0C9A6',
  low: '#F6DDBA',
  sun: '#FCEBC2',
  ridge: '#D9B38C',
  savanna: '#C8A877',
  grass: '#A88A5C',
  slab: '#16131A',
  sheen: '#3A3440',
  bone: '#EFE6D2',
}

const monolith: Skin = {
  key: 'monolith',
  bg: DAWN.mid,
  ink: ROCKS_THEME.ink,
  floor: DAWN.savanna,
  edge: DAWN.grass,
  plank: HOTDOG.sausageDeep,
  fulcrum: ROCKS.stoneDeep,
  back(pen, m, v) {
    // The sky in its bands, the sun just up, and a low ridge far off.
    rect(pen, v.x0 - 0.1, v.y0 - 0.1, v.x1 - v.x0 + 0.2, -1.75 - v.y0 + 0.1, DAWN.high, 0)
    rect(pen, v.x0 - 0.1, -0.85, v.x1 - v.x0 + 0.2, 0.85, DAWN.low, 0)
    // The sun flares on the loud landings.
    const f = flashOf(m, 1.0, 0.2)
    glow(pen, -1.85, -0.2, 1.0 + 0.4 * f, DAWN.sun, 0.35 + 0.35 * f)
    circle(pen, -1.85, -0.2, 0.46, DAWN.sun, 0)
    if (pen.lod <= 1) poly(pen, [[v.x0 - 0.2, -0.16], [-2.2, -0.24], [-1.3, -0.2], [-0.4, -0.3], [0.6, -0.22], [1.4, -0.32], [v.x1 + 0.2, -0.2], [v.x1 + 0.2, 0], [v.x0 - 0.2, 0]], DAWN.ridge, 0)
    // The slab, standing on the plain.
    rect(pen, 1.72, -2.0, 0.66, 2.0, DAWN.slab, 0.8)
    if (pen.lod <= 1) rect(pen, 1.74, -1.98, 0.07, 1.98, DAWN.sheen, 0)
    // Tufts of dry grass.
    if (pen.lod === 0) {
      for (const x of [-2.45, -1.25, 1.35, 2.6]) poly(pen, [[x - 0.1, 0], [x - 0.07, -0.13], [x - 0.02, -0.03], [x + 0.02, -0.17], [x + 0.05, -0.03], [x + 0.1, -0.11], [x + 0.11, 0]], DAWN.grass, 0)
    }
  },
  weight(pen) {
    // A bone, on its end.
    const h = WEIGHT_H
    const r = 0.05
    for (const y of [-r, -h + r]) for (const x of [-0.045, 0.045]) circle(pen, x, y, r, DAWN.bone, 0.8)
    rect(pen, -0.035, -h + r, 0.07, h - 2 * r, DAWN.bone, 0)
    if (pen.lod <= 1) {
      const d = 0.049
      for (const x of [-0.035, 0.035]) line(pen, x, -h + r + d, x, -r - d, pen.ink, pen.lw * 0.8)
    }
  },
}

/* ------------------------------------------------------------------ the Alphaverse: Alpha Waymond's van */

const ALPHA = {
  wall: '#14211F',
  rack: '#24312F',
  rackDeep: '#1A2624',
  screen: '#0E2A20',
  trace: '#7BE3A8',
  grate: '#3A4744',
  grateEdge: '#56625E',
  pack: '#A8834F',
  packDeep: '#6E5430',
}

const alpha: Skin = {
  key: 'alpha',
  bg: ALPHA.wall,
  ink: '#CFE3D8',
  floor: ALPHA.grate,
  edge: ALPHA.grateEdge,
  plank: HIBACHI.steel,
  fulcrum: HIBACHI.steelDeep,
  back(pen, m, _v) {
    // The bank of monitors on the right, flaring on the loud landings, on its cabinet.
    const f = flashOf(m, 0.9, 0.18)
    rect(pen, 1.38, -2.22, 1.42, 1.5, ALPHA.rack, 0.8)
    rect(pen, 1.3, -0.72, 1.58, 0.72, ALPHA.rackDeep, 0.8)
    glow(pen, 2.08, -1.5, 1.2, ALPHA.trace, (pen.lod <= 1 ? 0.1 : 0) + 0.35 * f)
    for (let i = 0; i < 4; i++) {
      const x = 1.48 + (i % 2) * 0.64
      const y = -2.12 + Math.floor(i / 2) * 0.66
      round(pen, x, y, 0.56, 0.54, 0.08, mix(ALPHA.screen, ALPHA.trace, 0.12 + 0.3 * f), 0.7)
      if (pen.lod <= 1) {
        const pts: Pt[] = []
        const amp = (0.08 + 0.1 * f) * (i % 2 ? 0.7 : 1)
        for (let k = 0; k <= 8; k++) pts.push([x + 0.06 + k * 0.055, y + 0.27 + amp * Math.sin(k * 1.3 + m.t * 6 + i * 1.7) * Math.sin(k * 0.4 + i)])
        poly(pen, pts, null, 0, false)
        pen.ctx.strokeStyle = ALPHA.trace
        pen.ctx.lineWidth = pen.lw * 1.3
        pen.ctx.stroke()
      }
    }
    if (pen.lod === 0) for (let i = 0; i < 4; i++) circle(pen, 1.55 + i * 0.16, -0.5, 0.03, i % 2 ? HOME.gold : ALPHA.trace, 0)
    // The jump chair on the left, and its headset hanging over it on a cable.
    const cx = -2.0
    if (pen.lod <= 1) {
      line(pen, cx, -2.8, cx, -1.62, ALPHA.grateEdge, pen.lw * 1.2)
      pen.ctx.beginPath()
      pen.ctx.arc(cx, -1.42, 0.18, Math.PI, 0)
      pen.ctx.strokeStyle = HIBACHI.steel
      pen.ctx.lineWidth = 0.04
      pen.ctx.stroke()
      for (const s of [-1, 1]) ellipse(pen, cx + s * 0.18, -1.38, 0.06, 0.09, ALPHA.grate, 0.7)
      rect(pen, cx - 0.06, -0.48, 0.12, 0.48, ALPHA.rack, 0.7)
    }
    round(pen, cx - 0.38, -1.2, 0.2, 0.8, 0.06, ALPHA.grate)
    round(pen, cx - 0.38, -0.56, 0.78, 0.16, 0.05, ALPHA.grate)
  },
  weight(pen) {
    // Waymond's fanny pack: a zipped pouch, its strap looped over the top, and the buckle.
    const h = WEIGHT_H
    if (pen.lod <= 1) {
      pen.ctx.beginPath()
      pen.ctx.moveTo(-0.13, -h * 0.5)
      pen.ctx.quadraticCurveTo(-0.12, -h * 1.05, 0, -h * 0.98)
      pen.ctx.quadraticCurveTo(0.12, -h * 1.05, 0.13, -h * 0.5)
      pen.ctx.strokeStyle = ALPHA.packDeep
      pen.ctx.lineWidth = 0.035
      pen.ctx.stroke()
    }
    round(pen, -0.17, -h * 0.6, 0.34, h * 0.6, 0.08, ALPHA.pack)
    if (pen.lod === 0) line(pen, -0.13, -h * 0.42, 0.13, -h * 0.42, ALPHA.packDeep, pen.lw)
    rect(pen, -0.045, -h * 1.02, 0.09, 0.06, HIBACHI.steel, 0.6)
  },
}

/* ------------------------------------------------------------------ Gong Gong's mahjong parlour */

const MAHJONG = {
  wall: '#F1D9B5',
  wainscot: '#B98552',
  felt: '#2F6B4F',
  feltDeep: '#24533D',
  lamp: '#B8312A',
  light: '#FFD9A0',
  tile: '#F7F0DE',
  back: '#3E8A62',
  red: '#C63A2B',
}

/** A mahjong tile standing up: its ivory face, the green of its back showing at the side. */
function tile(pen: Pen, w: number, h: number): void {
  round(pen, -w / 2 + w * 0.18, -h, w, h, w * 0.14, MAHJONG.back, 0.7)
  round(pen, -w / 2, -h, w, h, w * 0.14, MAHJONG.tile, 0.7)
}

const mahjong: Skin = {
  key: 'mahjong',
  bg: MAHJONG.wall,
  ink: DOJO_THEME.ink,
  floor: MAHJONG.felt,
  edge: MAHJONG.feltDeep,
  plank: DOJO.woodDeep,
  fulcrum: DOJO.lacquer,
  back(pen, m, v) {
    // Wood panelling to the waist.
    rect(pen, v.x0 - 0.1, -0.7, v.x1 - v.x0 + 0.2, 0.7, MAHJONG.wainscot, 0)
    if (pen.lod <= 1) line(pen, v.x0, -0.7, v.x1, -0.7, DOJO.woodDeep, pen.lw * 1.5)
    // The red lamp hung high over the table, its glow, swinging when the table is struck.
    const sw = ring(m, 0.6, 0.5) * 0.08 + 0.015 * Math.sin(m.t * 1.3)
    glow(pen, 0, -1.6, 2.2, MAHJONG.light, 0.45)
    at(pen, 0, v.y0 - 0.2, sw, 1, () => {
      const d = -2.05 - v.y0
      if (pen.lod <= 1) line(pen, 0, 0, 0, d + 0.4, DOJO_THEME.ink, pen.lw)
      pen.ctx.beginPath()
      pen.ctx.moveTo(-0.1, d)
      pen.ctx.quadraticCurveTo(-0.38, d + 0.05, -0.42, d + 0.24)
      pen.ctx.lineTo(0.42, d + 0.24)
      pen.ctx.quadraticCurveTo(0.38, d + 0.05, 0.1, d)
      pen.ctx.closePath()
      shape(pen, MAHJONG.lamp, 0.8)
      if (pen.lod <= 1) rect(pen, -0.42, d + 0.22, 0.84, 0.04, HOME.gold, 0)
    })
    // A side table on the right with a wall of tiles built on it.
    const tx = 2.05
    rect(pen, tx - 0.65, -0.78, 1.3, 0.08, DOJO.woodDeep, 0.8)
    if (pen.lod <= 1) for (const x of [tx - 0.55, tx + 0.47]) rect(pen, x, -0.7, 0.08, 0.7, DOJO.woodDeep, 0.7)
    for (let r = 0; r < 2; r++) {
      const y = -0.78 - r * 0.28
      rect(pen, tx - 0.52 + r * 0.06, y - 0.28, 1.04 - r * 0.12, 0.28, MAHJONG.tile, 0.8)
      if (pen.lod <= 1) rect(pen, tx - 0.52 + r * 0.06, y - 0.08, 1.04 - r * 0.12, 0.08, MAHJONG.back, 0)
      if (pen.lod === 0) for (let i = 1; i < 6; i++) line(pen, tx - 0.52 + r * 0.06 + i * (1.04 - r * 0.12) / 6, y - 0.28, tx - 0.52 + r * 0.06 + i * (1.04 - r * 0.12) / 6, y, DOJO_THEME.ink, pen.lw * 0.6)
    }
    // Two tiles stood up in front, face out.
    if (pen.lod === 0) {
      at(pen, tx - 0.6, -0.78, 0, 0.9, () => tile(pen, 0.22, 0.3))
      at(pen, tx - 0.33, -0.78, 0, 0.9, () => tile(pen, 0.22, 0.3))
    }
  },
  weight(pen) {
    // A tile, upright: three dots on its ivory face.
    const h = WEIGHT_H
    tile(pen, 0.24, h)
    for (let i = 0; i < 3; i++) circle(pen, -0.06 + i * 0.06, -h * 0.2 - i * h * 0.3, 0.032, i === 1 ? MAHJONG.back : MAHJONG.red, pen.lod === 0 ? 0.5 : 0)
  },
}

/* ------------------------------------------------------------------ a city park, and Jobu's pug */

const PARK = {
  sky: '#BFD8E4',
  cloud: '#F4F7F6',
  hedge: '#8DB894',
  grass: '#4E8A5A',
  grassDeep: '#3E7049',
  iron: '#33403D',
  bench: '#A86E3B',
  fawn: '#D4B07E',
  mask: '#3B302A',
}

const pug: Skin = {
  key: 'pug',
  bg: PARK.sky,
  ink: '#2A3130',
  floor: PARK.grass,
  edge: PARK.grassDeep,
  plank: DOJO.wood,
  fulcrum: PARK.iron,
  back(pen, m, v) {
    const { ctx } = pen
    // Clouds.
    if (pen.lod <= 1 && v.y0 < -1.9) {
      for (const [x, y] of [[-0.9, -2.15], [1.4, -2.3]] as const) {
        ellipse(pen, x, y, 0.42, 0.13, PARK.cloud, 0)
        ellipse(pen, x + 0.12, y - 0.08, 0.22, 0.12, PARK.cloud, 0)
      }
    }
    // The hedge along the back of the lawn.
    ctx.beginPath()
    ctx.moveTo(v.x0 - 0.2, 0)
    for (let x = Math.floor(v.x0 / 0.55) * 0.55; x < v.x1 + 0.55; x += 0.55) ctx.arc(x, -0.26, 0.3, Math.PI, 0)
    ctx.lineTo(v.x1 + 0.6, 0)
    ctx.closePath()
    ctx.fillStyle = PARK.hedge
    ctx.fill()
    // The lamppost, with a sparrow on its cap that hops when the lawn is struck.
    const lx = -2.0
    rect(pen, lx - 0.03, -1.85, 0.06, 1.85, PARK.iron, 0.6)
    if (pen.lod <= 1) rect(pen, lx - 0.08, -0.22, 0.16, 0.22, PARK.iron, 0.6)
    poly(pen, [[lx - 0.1, -1.85], [lx + 0.1, -1.85], [lx + 0.14, -2.12], [lx - 0.14, -2.12]], HOME.light, 0.8)
    poly(pen, [[lx - 0.19, -2.12], [lx + 0.19, -2.12], [lx, -2.26]], PARK.iron, 0.6)
    if (pen.lod === 0) {
      const hop = Math.max(0, ring(m, 0.4, 0.3)) * 0.1
      ellipse(pen, lx + 0.02, -2.32 - hop, 0.07, 0.045, DOJO.woodDeep, 0.6)
      circle(pen, lx + 0.08, -2.37 - hop, 0.03, DOJO.woodDeep, 0)
    }
    // A park bench on the right.
    const bx = 2.1
    if (pen.lod <= 1) for (const x of [bx - 0.48, bx + 0.42]) rect(pen, x, -0.82, 0.06, 0.82, PARK.iron, 0.6)
    for (const y of [-0.82, -0.66]) rect(pen, bx - 0.6, y, 1.2, 0.1, PARK.bench, 0.7)
    rect(pen, bx - 0.66, -0.42, 1.32, 0.1, PARK.bench, 0.7)
  },
  weight(pen) {
    // A fawn pug, sitting up, with its dark muzzle and its tail curled over its back.
    const h = WEIGHT_H
    if (pen.lod <= 1) {
      pen.ctx.beginPath()
      pen.ctx.arc(-0.12, -h * 0.5, 0.05, 0, Math.PI * 1.7)
      pen.ctx.strokeStyle = PARK.fawn
      pen.ctx.lineWidth = 0.035
      pen.ctx.stroke()
    }
    ellipse(pen, -0.01, -h * 0.34, 0.14, h * 0.34, PARK.fawn, 0.8)
    if (pen.lod <= 1) for (const x of [0.03, 0.09]) round(pen, x - 0.025, -0.12, 0.05, 0.12, 0.02, PARK.fawn, 0.6)
    circle(pen, 0.06, -h * 0.76, 0.1, PARK.fawn, 0.8)
    ellipse(pen, 0.11, -h * 0.7, 0.055, 0.045, PARK.mask, 0)
    if (pen.lod <= 1) {
      for (const x of [-0.01, 0.12]) ellipse(pen, x, -h * 0.97, 0.04, 0.03, PARK.mask, 0)
      if (pen.lod === 0) circle(pen, 0.08, -h * 0.82, 0.016, '#141414', 0)
    }
  },
}

/* ------------------------------------------------------------------ a dim sum teahouse */

const TEA = {
  wall: '#8C3A2B',
  wainscot: '#5E2A1E',
  teak: '#3E2418',
  sky: '#EBD9B0',
  bamboo: '#D2AE6E',
  bambooDeep: '#A9834A',
  bao: '#F6EEDC',
  steam: '#FFF7E8',
  pot: '#5E7F6E',
}

const dimsum: Skin = {
  key: 'dimsum',
  bg: TEA.wall,
  ink: DOJO_THEME.ink,
  floor: TEA.teak,
  edge: mix(TEA.teak, DOJO.wood, 0.35),
  plank: TEA.bamboo,
  fulcrum: TEA.teak,
  back(pen, m, v) {
    // Teak panelling to the waist.
    rect(pen, v.x0 - 0.1, -0.6, v.x1 - v.x0 + 0.2, 0.6, TEA.wainscot, 0)
    if (pen.lod <= 1) line(pen, v.x0, -0.6, v.x1, -0.6, TEA.teak, pen.lw * 1.5)
    // The moon window, its lattice, and the light beyond it.
    const wx = -1.98
    const wy = -1.42
    circle(pen, wx, wy, 0.7, TEA.teak, 0.8)
    circle(pen, wx, wy, 0.6, TEA.sky, 0.6)
    if (pen.lod <= 1) {
      for (const d of [-0.3, 0, 0.3]) {
        const c = Math.sqrt(0.36 - d * d)
        line(pen, wx + d, wy - c, wx + d, wy + c, TEA.teak, 0.035)
        if (pen.lod === 0) line(pen, wx - c, wy + d, wx + c, wy + d, TEA.teak, 0.035)
      }
    }
    // The cart on the right: its shelves and wheels, a stack of steamers, and the teapot.
    const cx = 2.05
    rect(pen, cx - 0.62, -0.62, 1.24, 0.07, HIBACHI.steel, 0.7)
    if (pen.lod <= 1) {
      for (const x of [cx - 0.56, cx + 0.52]) rect(pen, x, -0.55, 0.04, 0.47, HIBACHI.steelDeep, 0)
      if (pen.lod === 0) {
        rect(pen, cx - 0.58, -0.28, 1.16, 0.05, HIBACHI.steel, 0.6)
        for (const x of [cx - 0.5, cx + 0.5]) circle(pen, x, -0.06, 0.06, HIBACHI.steelDeep, 0.6)
      }
    }
    for (let i = 0; i < 3; i++) {
      const y = -0.62 - (i + 1) * 0.2
      round(pen, cx - 0.55, y, 0.66, 0.2, 0.05, TEA.bamboo, 0.7)
      if (pen.lod === 0) line(pen, cx - 0.53, y + 0.1, cx + 0.09, y + 0.1, TEA.bambooDeep, pen.lw)
    }
    poly(pen, [[cx - 0.55, -1.22], [cx + 0.11, -1.22], [cx + 0.02, -1.36], [cx - 0.46, -1.36]], TEA.bambooDeep, 0.7)
    // Steam off the top basket, rising, and a puff on the loud landings.
    if (pen.lod <= 1) {
      const f = flashOf(m, 1.0, 0.3)
      for (let i = 0; i < 2; i++) {
        const u = (m.t * 0.6 + i * 0.5) % 1
        ellipse(pen, cx - 0.22 + 0.08 * Math.sin(u * 5 + i), -1.45 - u * 0.55, 0.07 + 0.08 * u + 0.06 * f, 0.05 + 0.04 * u, rgba(TEA.steam, (0.45 + 0.3 * f) * (1 - u)), 0)
      }
    }
    ellipse(pen, cx + 0.34, -0.76, 0.17, 0.14, TEA.pot, 0.8)
    if (pen.lod <= 1) {
      poly(pen, [[cx + 0.47, -0.78], [cx + 0.6, -0.92], [cx + 0.63, -0.9], [cx + 0.5, -0.72]], TEA.pot, 0.6)
      circle(pen, cx + 0.34, -0.92, 0.035, TEA.pot, 0.6)
    }
  },
  weight(pen) {
    // A bao, plump, pleated to a twist on top.
    const h = WEIGHT_H * 0.82
    const { ctx } = pen
    ctx.beginPath()
    ctx.moveTo(-0.19, 0)
    ctx.quadraticCurveTo(-0.23, -h * 0.75, -0.02, -h)
    ctx.lineTo(0.02, -h)
    ctx.quadraticCurveTo(0.23, -h * 0.75, 0.19, 0)
    ctx.closePath()
    shape(pen, TEA.bao, 0.8)
    if (pen.lod === 0) for (const x of [-0.11, -0.04, 0.04, 0.11]) line(pen, 0, -h * 0.94, x, -h * 0.62, mix(TEA.bao, TEA.bambooDeep, 0.5), pen.lw * 0.8)
  },
}

/* ------------------------------------------------------------------ a painting in ink and wash */

const INK = {
  paper: '#EEE6D2',
  far: '#D9D3C4',
  mid: '#B8B2A5',
  near: '#7E7A73',
  ground: '#D6D2C6',
  pine: '#3E4A3E',
  seal: DOJO.lacquer,
  celadon: '#A9C8B0',
}

/** A range of hills through `pts`, its tops rounded the way a brush leaves them, down to the ground. */
function hills(pen: Pen, pts: readonly Pt[], fill: string): void {
  const { ctx } = pen
  ctx.beginPath()
  ctx.moveTo(pts[0][0], 0.1)
  ctx.lineTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length - 1; i++) ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2)
  const end = pts[pts.length - 1]
  ctx.lineTo(end[0], end[1])
  ctx.lineTo(end[0], 0.1)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

const FAR_HILLS: Pt[] = [[-3.3, -0.8], [-2.7, -2.3], [-2.25, -2.6], [-1.8, -1.6], [-1.0, -1.1], [-0.3, -1.9], [0.25, -2.25], [0.8, -1.3], [1.6, -1.7], [2.2, -2.5], [2.7, -2.3], [3.3, -1.0]]
const MID_HILLS: Pt[] = [[-3.3, -0.5], [-2.6, -1.5], [-2.15, -1.6], [-1.6, -0.75], [-0.6, -0.45], [0.5, -0.55], [1.1, -0.95], [3.3, -0.6]]
const CRAG: Pt[] = [[1.35, 0], [1.6, -0.7], [1.95, -1.45], [2.4, -1.3], [2.75, -0.7], [3.3, -0.2]]

const inkwash: Skin = {
  key: 'inkwash',
  bg: INK.paper,
  ink: DOJO_THEME.ink,
  floor: INK.ground,
  edge: mix(INK.ground, INK.mid, 0.5),
  plank: DOJO.wash,
  fulcrum: mix(DOJO.wash, DOJO_THEME.ink, 0.5),
  back(pen, _m, v) {
    // Three washes of hills, the lightest farthest, and mist between them.
    hills(pen, FAR_HILLS, INK.far)
    if (pen.lod <= 1) hills(pen, MID_HILLS, INK.mid)
    if (pen.lod === 0) rect(pen, v.x0 - 0.1, -0.42, v.x1 - v.x0 + 0.2, 0.3, rgba(INK.paper, 0.55), 0)
    hills(pen, CRAG, INK.near)
    // A pine, leaning out from the crag.
    if (pen.lod <= 1) {
      const { ctx } = pen
      ctx.beginPath()
      ctx.moveTo(2.05, -1.42)
      ctx.quadraticCurveTo(1.95, -1.85, 1.62, -2.02)
      ctx.strokeStyle = DOJO_THEME.ink
      ctx.lineWidth = 0.05
      ctx.stroke()
    }
    for (const [x, y, r] of [[1.62, -2.06, 0.3], [1.98, -1.84, 0.26], [1.72, -1.72, 0.2]] as const) ellipse(pen, x, y, r, 0.07, INK.pine, 0)
    // The painter's seal, in the corner.
    const sx = v.x0 + 0.22
    const sy = v.y0 + 0.22
    rect(pen, sx, sy, 0.2, 0.2, INK.seal, 0)
    if (pen.lod === 0) {
      pen.ctx.strokeStyle = INK.paper
      pen.ctx.lineWidth = 0.02
      pen.ctx.strokeRect(sx + 0.05, sy + 0.05, 0.1, 0.1)
      line(pen, sx + 0.1, sy + 0.05, sx + 0.1, sy + 0.15, INK.paper, 0.02)
    }
  },
  weight(pen) {
    // A celadon teapot.
    const h = WEIGHT_H * 0.8
    if (pen.lod <= 1) {
      pen.ctx.beginPath()
      pen.ctx.arc(-0.17, -h * 0.5, 0.08, Math.PI * 0.5, Math.PI * 1.5)
      pen.ctx.strokeStyle = INK.celadon
      pen.ctx.lineWidth = 0.035
      pen.ctx.stroke()
      poly(pen, [[0.12, -h * 0.4], [0.27, -h * 0.85], [0.29, -h * 0.82], [0.17, -h * 0.25]], INK.celadon, 0.6)
    }
    ellipse(pen, 0, -h * 0.45, 0.18, h * 0.45, INK.celadon, 0.8)
    if (pen.lod <= 1) {
      rect(pen, -0.08, -h * 0.94, 0.16, 0.035, mix(INK.celadon, DOJO.wash, 0.3), 0.6)
      circle(pen, 0, -h * 1.0, 0.03, mix(INK.celadon, DOJO.wash, 0.3), 0.6)
    }
  },
}

/* ------------------------------------------------------------------ a picture in black and white */

const NOIR = {
  wall: '#3A3A3B',
  floor: '#232323',
  slat: '#DADADA',
  door: '#2B2B2C',
  frame: '#1C1C1C',
  glass: '#8E8E8E',
  hat: '#646464',
  band: '#1E1E1E',
}

const noir: Skin = {
  key: 'noir',
  bg: NOIR.wall,
  ink: '#D6D6D6',
  floor: NOIR.floor,
  edge: '#2E2E2E',
  plank: '#6E6E6E',
  fulcrum: '#4A4A4A',
  back(pen, m, _v) {
    // The blinds' light thrown across the wall, from a window off to the left; a sign outside flashes on the loud
    // landings and the slats flare with it.
    const f = flashOf(m, 1.0, 0.16)
    const { ctx } = pen
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const y = -2.45 + i * 0.32
      ctx.moveTo(-3.0, y)
      ctx.lineTo(-0.3, y + 0.85)
      ctx.lineTo(-0.3, y + 0.85 + 0.15)
      ctx.lineTo(-3.0, y + 0.15)
      ctx.closePath()
    }
    ctx.fillStyle = rgba(NOIR.slat, 0.2 + 0.25 * f)
    ctx.fill()
    // The door on the right, its frosted glass.
    rect(pen, 1.45, -2.15, 1.04, 2.15, NOIR.frame, 0.6)
    rect(pen, 1.53, -2.07, 0.88, 2.07, NOIR.door, 0)
    rect(pen, 1.64, -1.95, 0.66, 0.82, mix(NOIR.glass, NOIR.slat, 0.25 * f), 0.7)
    if (pen.lod === 0) rect(pen, 1.64, -1.95, 0.66, 0.16, rgba(NOIR.slat, 0.25), 0)
    if (pen.lod <= 1) circle(pen, 1.66, -0.95, 0.045, NOIR.glass, 0.6)
  },
  weight(pen) {
    // A fedora: its brim, its pinched crown, its band.
    const h = WEIGHT_H * 0.82
    poly(pen, [[-0.13, -0.05], [-0.12, -h * 0.82], [-0.05, -h], [0, -h * 0.88], [0.05, -h], [0.12, -h * 0.82], [0.13, -0.05]], NOIR.hat, 0.8)
    rect(pen, -0.13, -0.15, 0.26, 0.07, NOIR.band, 0)
    ellipse(pen, 0, -0.04, 0.22, 0.045, NOIR.hat, 0.8)
  },
}

/* ------------------------------------------------------------------ the table */

export const FILM_SKINS = { opera, monolith, alpha, mahjong, pug, dimsum, inkwash, noir } as const satisfies Record<string, Skin>
