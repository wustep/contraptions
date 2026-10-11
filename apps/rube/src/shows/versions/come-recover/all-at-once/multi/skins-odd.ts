import { DOJO, HIBACHI, HOME, HOTDOG, STAR } from '../worlds'
import { at, beam, circle, ellipse, glow, hash, line, mix, poly, rect, rgba, round, type Pen, type Pt } from './skins-pen'
import { flashOf, ring, WEIGHT_H, type Skin } from './skins-kit'

/**
 * More lives Evelyn never lived, and never will: the ordinary ones, each a place she might have spent her days
 * instead. A video game, a draughtsman's blueprint, a library after closing, the big top, a diner, a subway platform,
 * a greenhouse and a bowling alley. Each is one big silhouette at the side or up high, a wall and a floor of its own
 * colours, and a weight from its world; the same machine works in front of every one.
 *
 * Their floors are patterned (bricks, checks, parquet, tile, lane boards), and the shared ground paints over
 * anything `back()` draws under y = 0, so the pattern is laid in `front()`, below the ground's top edge, where the
 * machine never reaches.
 */

/** Rects of one colour in one path, filled once. */
function fillRects(pen: Pen, fill: string, add: (ctx: CanvasRenderingContext2D) => void): void {
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

/* ------------------------------------------------------------------ a video game */

const PIXEL = {
  sky: '#7FB0E6',
  cloud: '#F7F8F4',
  hill: '#6DAE58',
  pipe: '#5FA64A',
  pipeLight: '#A3D47E',
  pipeDeep: '#2F6A2C',
  brick: '#B9663A',
  brickLight: '#E09A62',
  mortar: '#5A2C1C',
  gold: '#E8AE34',
  goldDeep: '#A8661E',
  ink: '#2A1A14',
}

/** Snapped to the game's grid of tenths of a cell. */
const px = (v: number): number => Math.round(v * 10) / 10

/** A question block, its top left at x, y and `s` on a side: rivets in its corners and its mark. */
function qblock(pen: Pen, x: number, y: number, s: number): void {
  rect(pen, x, y, s, s, PIXEL.gold, 0.8)
  if (pen.lod > 1) return
  const u = s / 8
  fillRects(pen, PIXEL.goldDeep, (ctx) => {
    for (const [cx, cy] of [[0.5, 0.5], [6.5, 0.5], [0.5, 6.5], [6.5, 6.5]]) ctx.rect(x + cx * u, y + cy * u, u, u)
    ctx.rect(x + 2.5 * u, y + 1.5 * u, 3 * u, u)
    ctx.rect(x + 4.5 * u, y + 2.5 * u, u, u)
    ctx.rect(x + 3.5 * u, y + 3.5 * u, u, 1.2 * u)
    ctx.rect(x + 3.5 * u, y + 5.5 * u, u, u)
  })
}

/** A blocky cloud on its base line. */
function cloud(pen: Pen, cx: number, by: number): void {
  poly(pen, [[cx - 0.4, by], [cx + 0.4, by], [cx + 0.4, by - 0.1], [cx + 0.3, by - 0.1], [cx + 0.3, by - 0.2], [cx + 0.1, by - 0.2], [cx + 0.1, by - 0.3], [cx - 0.2, by - 0.3], [cx - 0.2, by - 0.2], [cx - 0.3, by - 0.2], [cx - 0.3, by - 0.1], [cx - 0.4, by - 0.1]], PIXEL.cloud, 0.6)
}

const pixel: Skin = {
  key: 'pixel',
  bg: PIXEL.sky,
  ink: PIXEL.ink,
  floor: PIXEL.brick,
  edge: PIXEL.brickLight,
  plank: PIXEL.brick,
  fulcrum: PIXEL.mortar,
  back(pen, m, _v) {
    // Two clouds, stepping slowly along the sky a pixel at a time.
    cloud(pen, px(0.2 + 0.3 * Math.sin(m.t * 0.21)), -1.9)
    cloud(pen, px(1.8 + 0.2 * Math.sin(m.t * 0.17 + 2)), -1.5)
    // A stepped green hill on the left, and a row of blocks over it.
    poly(pen, [[-3.0, 0], [-1.5, 0], [-1.5, -0.2], [-1.6, -0.2], [-1.6, -0.4], [-1.8, -0.4], [-1.8, -0.6], [-2.1, -0.6], [-2.1, -0.7], [-2.6, -0.7], [-2.6, -0.5], [-3.0, -0.5]], PIXEL.hill, 0.6)
    rect(pen, -2.6, -1.8, 0.3, 0.3, PIXEL.brick, 0.8)
    rect(pen, -2.0, -1.8, 0.3, 0.3, PIXEL.brick, 0.8)
    qblock(pen, -2.3, -1.8, 0.3)
    if (pen.lod === 0) strokeLines(pen, PIXEL.mortar, pen.lw * 0.7, (ctx) => {
      for (const x of [-2.6, -2.0]) {
        ctx.moveTo(x, -1.65)
        ctx.lineTo(x + 0.3, -1.65)
        ctx.moveTo(x + 0.15, -1.8)
        ctx.lineTo(x + 0.15, -1.65)
      }
    })
    // The warp pipe, on the right.
    rect(pen, 1.7, -0.7, 0.5, 0.7, PIXEL.pipe, 0.8)
    rect(pen, 1.6, -0.9, 0.7, 0.2, PIXEL.pipe, 0.8)
    if (pen.lod <= 1) {
      fillRects(pen, PIXEL.pipeLight, (ctx) => {
        ctx.rect(1.8, -0.7, 0.1, 0.7)
        ctx.rect(1.7, -0.9, 0.1, 0.2)
      })
      fillRects(pen, PIXEL.pipeDeep, (ctx) => {
        ctx.rect(2.1, -0.7, 0.1, 0.7)
        ctx.rect(2.2, -0.9, 0.1, 0.2)
      })
    }
  },
  front(pen, _m, v) {
    // The ground's bricks, in courses, the joints staggered.
    if (pen.lod > 1) return
    const w = 0.03
    fillRects(pen, PIXEL.mortar, (ctx) => {
      for (let r = 0; r < 3; r++) {
        const y = 0.07 + r * 0.3
        if (y > v.y1) break
        ctx.rect(v.x0 - 0.1, y, v.x1 - v.x0 + 0.2, w)
        if (pen.lod > 0) continue
        for (let x = Math.floor(v.x0 / 0.6) * 0.6 + (r % 2) * 0.3; x < v.x1; x += 0.6) ctx.rect(x, y, w, 0.3)
      }
    })
  },
  weight(pen) {
    // A question block.
    qblock(pen, -0.16, -0.32, 0.32)
  },
}

/* ------------------------------------------------------------------ a blueprint */

const BLUE = {
  paper: '#2A5A96',
  deep: '#1E4476',
  part: '#3468A8',
  pale: '#BCD2EC',
  line: '#E8F0F8',
}

/** A gear's outline, square-toothed, round a hole, as one path. */
function gearPath(pen: Pen, x: number, y: number, R: number, n: number, hole: number, a: number): void {
  const { ctx } = pen
  ctx.beginPath()
  const k = n * 4
  for (let i = 0; i < k; i++) {
    const t = a + ((i + 0.5 * (i % 2)) / k) * Math.PI * 2
    const r = (i >> 1) % 2 ? R * 0.8 : R
    if (i === 0) ctx.moveTo(x + Math.cos(t) * r, y + Math.sin(t) * r)
    else ctx.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r)
  }
  ctx.closePath()
  ctx.moveTo(x + hole, y)
  ctx.arc(x, y, hole, 0, Math.PI * 2, true)
}

/** A dimension line with its arrowheads, from one point to another. */
function dimension(pen: Pen, x0: number, y0: number, x1: number, y1: number): void {
  const L = Math.hypot(x1 - x0, y1 - y0) || 1
  const ux = (x1 - x0) / L
  const uy = (y1 - y0) / L
  const s = 0.09
  line(pen, x0, y0, x1, y1, BLUE.line, pen.lw * 0.8)
  fillRects(pen, BLUE.line, (ctx) => {
    for (const [px0, py0, d] of [[x0, y0, 1], [x1, y1, -1]] as const) {
      ctx.moveTo(px0, py0)
      ctx.lineTo(px0 + (ux * s - uy * s * 0.35) * d, py0 + (uy * s + ux * s * 0.35) * d)
      ctx.lineTo(px0 + (ux * s + uy * s * 0.35) * d, py0 + (uy * s - ux * s * 0.35) * d)
      ctx.closePath()
    }
  })
}

const blueprint: Skin = {
  key: 'blueprint',
  bg: BLUE.paper,
  ink: BLUE.line,
  floor: BLUE.deep,
  plank: BLUE.part,
  fulcrum: BLUE.part,
  back(pen, m, v) {
    // The grid, faint, over the whole sheet.
    if (pen.lod === 0) strokeLines(pen, rgba(BLUE.line, 0.13), pen.lw * 0.6, (ctx) => {
      for (let x = Math.floor(v.x0 / 0.4) * 0.4; x < v.x1; x += 0.4) {
        ctx.moveTo(x, v.y0)
        ctx.lineTo(x, 0)
      }
      for (let y = -0.4; y > v.y0; y -= 0.4) {
        ctx.moveTo(v.x0, y)
        ctx.lineTo(v.x1, y)
      }
    })
    // A big gear drawn on the left, turning, and a small one meshed with it over its shoulder.
    const a = m.t * 0.25
    gearPath(pen, -1.95, -1.3, 0.65, 10, 0.2, a)
    pen.ctx.fillStyle = BLUE.part
    pen.ctx.fill('evenodd')
    pen.ctx.strokeStyle = BLUE.line
    pen.ctx.lineWidth = pen.lw * (pen.lod <= 1 ? 1.2 : 2)
    pen.ctx.stroke()
    if (pen.lod <= 1) {
      gearPath(pen, -1.35, -1.92, 0.3, 5, 0.08, -a * 2 + 0.3)
      pen.ctx.stroke()
      // Its centre lines, and the dimensions: the plank's length across the top, and a height up the right.
      if (pen.lod === 0) strokeLines(pen, rgba(BLUE.line, 0.6), pen.lw * 0.6, (ctx) => {
        ctx.moveTo(-2.8, -1.3)
        ctx.lineTo(-1.15, -1.3)
        ctx.moveTo(-1.95, -2.1)
        ctx.lineTo(-1.95, -0.5)
        ctx.moveTo(-1.15, -2.05)
        ctx.lineTo(-1.15, -1.82)
        ctx.moveTo(1.15, -2.05)
        ctx.lineTo(1.15, -1.82)
        ctx.moveTo(1.6, -1.6)
        ctx.lineTo(2.1, -1.6)
      })
      dimension(pen, -1.15, -1.95, 1.15, -1.95)
      dimension(pen, 1.95, -1.6, 1.95, 0)
    }
  },
  weight(pen) {
    // A small gear, on its edge.
    const h = WEIGHT_H
    gearPath(pen, 0, -h / 2, h / 2, 8, 0.05, 0.2)
    pen.ctx.fillStyle = BLUE.part
    pen.ctx.fill('evenodd')
    pen.ctx.strokeStyle = BLUE.line
    pen.ctx.lineWidth = pen.lw * 1.2
    pen.ctx.stroke()
  },
}

/* ------------------------------------------------------------------ a library, after closing */

const LIB = {
  wall: '#2A2220',
  wood: '#6B4630',
  woodDeep: '#3E281C',
  parquet: '#7A5236',
  parquetDeep: '#634029',
  skirting: '#4A3022',
  spines: ['#7E3A34', '#43604E', '#3E4C6C', '#A88A4E', '#6C4E66'],
  brass: '#C79A3E',
  shade: '#2F6B4A',
  lamp: '#FFE2A0',
  page: '#EFE3C8',
  night: '#1E2A40',
  moon: '#F2E8CC',
  ink: '#E6D9C2',
}

const SHELVES = [-2.42, -1.82, -1.22, -0.62]

const library: Skin = {
  key: 'library',
  bg: LIB.wall,
  ink: LIB.ink,
  floor: LIB.parquet,
  edge: LIB.skirting,
  plank: LIB.wood,
  fulcrum: LIB.woodDeep,
  back(pen, m, _v) {
    // A tall bookcase on the left, full.
    const x0 = -3.0
    const x1 = -1.5
    rect(pen, x0, -2.55, x1 - x0, 2.55, LIB.wood)
    rect(pen, x0 + 0.06, -2.48, x1 - x0 - 0.12, 2.4, LIB.woodDeep, 0)
    if (pen.lod === 2) rect(pen, x0 + 0.06, -2.4, x1 - x0 - 0.12, 2.3, mix(LIB.spines[0], LIB.woodDeep, 0.3), 0)
    else {
      // Its books, by colour, each colour one path; fewer and wider from further off.
      const wide = pen.lod === 1
      for (let c = 0; c < LIB.spines.length; c++) {
        fillRects(pen, LIB.spines[c], (ctx) => {
          for (let r = 0; r < 4; r++) {
            const yb = SHELVES[r] + 0.6
            let x = x0 + 0.1
            for (let i = 0; i < 12; i++) {
              const w = wide ? 0.3 : 0.1 + 0.06 * hash(i, r, 11)
              if (x + w > x1 - 0.08) break
              if (Math.floor(hash(i, r, 12) * LIB.spines.length) === c) {
                const h = 0.38 + 0.14 * hash(i, r, 13)
                ctx.rect(x, yb - h, w - 0.012, h)
              }
              x += w
            }
          }
        })
      }
      // The shelves.
      fillRects(pen, LIB.wood, (ctx) => {
        for (const y of SHELVES) ctx.rect(x0, y + 0.6, x1 - x0, 0.06)
      })
    }
    // A tall window at night on the right, and the moon in it.
    if (pen.lod <= 1) {
      round(pen, 1.6, -2.5, 0.76, 1.3, 0.38, LIB.night, 0.8)
      circle(pen, 2.15, -2.0, 0.09, LIB.moon, 0)
      strokeLines(pen, LIB.wood, 0.05, (ctx) => {
        ctx.moveTo(1.98, -2.5)
        ctx.lineTo(1.98, -1.2)
        ctx.moveTo(1.6, -1.65)
        ctx.lineTo(2.36, -1.65)
      })
    }
    // The desk under it, and the banker's lamp on the desk, lit; it brightens on the loud landings.
    const dx = 1.6
    rect(pen, dx, -0.66, 1.4, 0.08, LIB.wood)
    rect(pen, dx + 0.08, -0.58, 1.3, 0.58, LIB.woodDeep, 0.8)
    const f = flashOf(m, 1.0, 0.3)
    const lx = 1.95
    glow(pen, lx, -0.75, 0.75, LIB.lamp, 0.32 + 0.2 * f)
    if (pen.lod <= 1) {
      line(pen, lx, -0.7, lx, -1.0, LIB.brass, 0.03)
      ellipse(pen, lx, -0.68, 0.12, 0.03, LIB.brass, 0.6)
    }
    poly(pen, [[lx - 0.27, -0.94], [lx + 0.27, -0.94], [lx + 0.21, -1.06], [lx + 0.07, -1.12], [lx - 0.07, -1.12], [lx - 0.21, -1.06]], LIB.shade, 0.8)
  },
  front(pen, _m, v) {
    // Parquet: blocks in two tones, laid like brick.
    if (pen.lod > 0) return
    fillRects(pen, LIB.parquetDeep, (ctx) => {
      for (let r = 0; r < 4; r++) {
        const y = 0.07 + r * 0.2
        if (y > v.y1) break
        for (let x = Math.floor(v.x0 / 0.7) * 0.7 + (r % 2) * 0.35; x < v.x1; x += 0.7) ctx.rect(x, y, 0.35, 0.2)
      }
    })
  },
  weight(pen) {
    // Three books, stacked.
    const h = WEIGHT_H / 3
    const books: [number, number, string][] = [[-0.16, 0.32, LIB.spines[0]], [-0.13, 0.27, LIB.spines[1]], [-0.15, 0.29, LIB.spines[2]]]
    for (let i = 0; i < 3; i++) {
      const [x, w, c] = books[i]
      rect(pen, x, -(i + 1) * h, w, h, c, 0.8)
      if (pen.lod <= 1) rect(pen, x + w - 0.04, -(i + 1) * h + 0.018, 0.03, h - 0.036, LIB.page, 0)
    }
  },
}

/* ------------------------------------------------------------------ the big top */

const CIRCUS = {
  canvas: STAR.cream,
  red: '#B23A3C',
  redDeep: '#842A2E',
  gold: STAR.gold,
  sawdust: '#DCC08E',
  pole: DOJO.woodDeep,
  blue: '#3E5A8A',
  spot: STAR.spot,
  ink: '#3A2420',
}

const circus: Skin = {
  key: 'circus',
  bg: CIRCUS.canvas,
  ink: CIRCUS.ink,
  floor: CIRCUS.sawdust,
  edge: CIRCUS.red,
  plank: CIRCUS.blue,
  fulcrum: CIRCUS.red,
  back(pen, m, v) {
    // The tent's canvas, red and cream, the stripes closing in to the peak far overhead.
    const apex = -5.0
    const top = v.y0 - 0.1
    const k = (top - apex) / -apex
    fillRects(pen, CIRCUS.red, (ctx) => {
      for (const i of [-5, -3, -1, 1, 3, 5]) {
        const a = -0.35 + i * 0.7
        const b = 0.35 + i * 0.7
        if (b * k < v.x0 - 0.3 && b < v.x0 - 0.3) continue
        if (a * k > v.x1 + 0.3 && a > v.x1 + 0.3) continue
        ctx.moveTo(a, 0)
        ctx.lineTo(b, 0)
        ctx.lineTo(b * k, top)
        ctx.lineTo(a * k, top)
        ctx.closePath()
      }
    })
    // A spotlight down onto the ring.
    beam(pen, -2.6, -2.8, -0.2, 0.05, 0.2, 2.4, CIRCUS.spot, 0.3)
    // Tent poles either side, and a pennant flying from each, flapping when the plank lands.
    const flap = ring(m, 0.3, 0.4) * 0.08
    for (const x of [-2.05, 2.05]) {
      const s = -Math.sign(x)
      rect(pen, x - 0.05, v.y0 - 0.1, 0.1, -v.y0 + 0.1, CIRCUS.pole, 0.7)
      const tip = 0.04 * Math.sin(m.t * 3.1 + x) + flap
      poly(pen, [[x + s * 0.05, -2.05], [x + s * 0.62, -1.93 + tip], [x + s * 0.05, -1.8]], s > 0 ? CIRCUS.gold : CIRCUS.blue, 0.7)
    }
    // A performer's tub by the right-hand pole.
    const tx = 1.85
    poly(pen, [[tx - 0.3, 0], [tx + 0.3, 0], [tx + 0.24, -0.55], [tx - 0.24, -0.55]], CIRCUS.red)
    if (pen.lod <= 1) {
      fillRects(pen, CIRCUS.gold, (ctx) => {
        ctx.rect(tx - 0.27, -0.2, 0.54, 0.06)
        ctx.rect(tx - 0.25, -0.42, 0.5, 0.06)
      })
      rect(pen, tx - 0.28, -0.6, 0.56, 0.06, CIRCUS.blue, 0.7)
    }
  },
  weight(pen) {
    // A drum: a red shell, gold hoops and its cord, and the head on top.
    const h = WEIGHT_H
    rect(pen, -0.15, -h + 0.04, 0.3, h - 0.04, CIRCUS.red)
    if (pen.lod <= 1) {
      if (pen.lod === 0) poly(pen, [[-0.13, -0.05], [-0.07, -h + 0.09], [0, -0.05], [0.07, -h + 0.09], [0.13, -0.05]], null, 0, false)
      pen.ctx.strokeStyle = CIRCUS.gold
      pen.ctx.lineWidth = 0.015
      if (pen.lod === 0) pen.ctx.stroke()
      fillRects(pen, CIRCUS.gold, (ctx) => {
        ctx.rect(-0.16, -0.05, 0.32, 0.05)
        ctx.rect(-0.16, -h + 0.04, 0.32, 0.05)
      })
    }
    ellipse(pen, 0, -h + 0.04, 0.15, 0.035, CIRCUS.canvas, 0.8)
  },
}

/* ------------------------------------------------------------------ a diner */

const DINER = {
  mint: '#A9D7C2',
  mintDeep: '#86C0A8',
  chrome: '#C9D0D2',
  chromeDeep: '#8E989E',
  red: HOME.red,
  cream: '#F6F1E4',
  black: '#2A2A2C',
  shake: '#F2A6B8',
  neon: STAR.neonPink,
  crust: '#D9A35A',
  cherry: '#C0262E',
}

const diner: Skin = {
  key: 'diner',
  bg: DINER.mint,
  ink: DINER.black,
  floor: DINER.cream,
  plank: DINER.chrome,
  fulcrum: DINER.red,
  back(pen, m, v) {
    // The wall: seafoam over a darker dado, with a chrome rail between.
    rect(pen, v.x0 - 0.1, -0.85, v.x1 - v.x0 + 0.2, 0.85, DINER.mintDeep, 0)
    if (pen.lod <= 2) rect(pen, v.x0 - 0.1, -0.9, v.x1 - v.x0 + 0.2, 0.05, DINER.chrome, pen.lod <= 1 ? 0.6 : 0)
    // The clock, ringed in neon, and its second hand ticking round.
    const cx = -1.85
    const cy = -1.65
    glow(pen, cx, cy, 0.7, DINER.neon, 0.3)
    circle(pen, cx, cy, 0.32, DINER.cream, 0)
    pen.ctx.strokeStyle = DINER.neon
    pen.ctx.lineWidth = 0.06
    pen.ctx.stroke()
    if (pen.lod <= 1) {
      const s = (Math.floor(m.t) / 60) * Math.PI * 2 - Math.PI / 2
      line(pen, cx, cy, cx + 0.16, cy - 0.1, DINER.black, 0.035)
      line(pen, cx, cy, cx - 0.05, cy - 0.22, DINER.black, 0.025)
      line(pen, cx, cy, cx + Math.cos(s) * 0.24, cy + Math.sin(s) * 0.24, DINER.red, 0.012)
    }
    // A booth on the left: its red back and the table end.
    round(pen, -3.0, -1.05, 1.05, 1.05, 0.12, DINER.red)
    if (pen.lod <= 1) {
      rect(pen, -2.2, -0.62, 0.5, 0.06, DINER.cream, 0.6)
      rect(pen, -1.98, -0.56, 0.06, 0.56, DINER.chromeDeep, 0.6)
    }
    // The counter on the right, chrome-topped, a pie under glass on it, and two stools in front.
    const kx = 1.6
    rect(pen, kx, -0.8, v.x1 - kx + 0.2, 0.8, DINER.cream)
    rect(pen, kx - 0.05, -0.88, v.x1 - kx + 0.3, 0.08, DINER.chrome, 0.8)
    if (pen.lod <= 1) {
      rect(pen, kx, -0.1, v.x1 - kx + 0.2, 0.1, DINER.chromeDeep, 0)
      rect(pen, kx, -0.58, v.x1 - kx + 0.2, 0.06, DINER.red, 0)
      poly(pen, [[2.0, -0.92], [2.4, -0.92], [2.34, -0.98], [2.06, -0.98]], DINER.crust, 0.6)
      pen.ctx.beginPath()
      pen.ctx.ellipse(2.2, -0.9, 0.3, 0.28, 0, Math.PI, Math.PI * 2)
      pen.ctx.closePath()
      pen.ctx.fillStyle = rgba(DINER.cream, 0.35)
      pen.ctx.fill()
      pen.ctx.strokeStyle = DINER.black
      pen.ctx.lineWidth = pen.lw * 0.8
      pen.ctx.stroke()
    }
    for (const x of [1.85, 2.5]) {
      rect(pen, x - 0.025, -0.48, 0.05, 0.48, DINER.chromeDeep, 0)
      round(pen, x - 0.2, -0.56, 0.4, 0.09, 0.045, DINER.red, 0.7)
    }
  },
  front(pen, _m, v) {
    // Black and white checks.
    const s = pen.lod === 0 ? 0.3 : pen.lod === 1 ? 0.45 : 0.6
    fillRects(pen, DINER.black, (ctx) => {
      for (let r = 0; r * s < v.y1; r++) {
        for (let x = Math.floor(v.x0 / (2 * s)) * 2 * s + (r % 2) * s; x < v.x1; x += 2 * s) ctx.rect(x, r * s, s, s)
      }
    })
  },
  weight(pen) {
    // A milkshake in a tall glass, a straw and a cherry.
    const h = WEIGHT_H
    poly(pen, [[-0.06, 0], [0.06, 0], [0.04, -0.03], [0.1, -h * 0.74], [-0.1, -h * 0.74], [-0.04, -0.03]], DINER.shake)
    if (pen.lod <= 1) line(pen, 0.02, -h * 0.74, 0.09, -h * 1.08, DINER.red, 0.022)
    ellipse(pen, 0, -h * 0.78, 0.11, 0.05, DINER.cream, 0.7)
    circle(pen, -0.02, -h * 0.88, 0.035, DINER.cherry, 0.6)
  },
}

/* ------------------------------------------------------------------ a subway platform */

const SUB = {
  tile: '#2F5146',
  tileDeep: '#24403A',
  trim: '#C9973A',
  concrete: '#8D8A82',
  yellow: '#E8C23A',
  silver: '#B8C0C4',
  silverDeep: '#7E888D',
  window: '#F3DFA0',
  windowDark: '#4A4E44',
  steel: '#3C4A44',
  bullet: HIBACHI.greens,
  leather: '#7A4A2A',
  ink: '#E7E2D4',
}

const subway: Skin = {
  key: 'subway',
  bg: SUB.tile,
  ink: SUB.ink,
  floor: SUB.concrete,
  edge: SUB.yellow,
  plank: SUB.silverDeep,
  fulcrum: SUB.steel,
  back(pen, m, v) {
    // Tile, in its grout, and an ochre band along the top.
    if (pen.lod === 0) strokeLines(pen, SUB.tileDeep, pen.lw * 0.8, (ctx) => {
      for (let y = -0.25; y > -2.1; y -= 0.25) {
        ctx.moveTo(v.x0, y)
        ctx.lineTo(v.x1, y)
      }
      for (let x = Math.floor(v.x0 / 0.5) * 0.5; x < v.x1; x += 0.5) {
        ctx.moveTo(x, -2.06)
        ctx.lineTo(x, 0)
      }
    })
    rect(pen, v.x0 - 0.1, -2.2, v.x1 - v.x0 + 0.2, 0.14, SUB.trim, 0)
    // A steel column on the left, and the line's sign hung from the ceiling beside it.
    rect(pen, -2.2, v.y0 - 0.1, 0.24, -v.y0 + 0.1, SUB.steel, 0.8)
    if (pen.lod <= 1) {
      line(pen, -1.62, v.y0 - 0.1, -1.62, -1.95, SUB.steel, 0.03)
      round(pen, -1.88, -1.95, 0.52, 0.28, 0.04, HOTDOG.piano, 0.6)
      circle(pen, -1.62, -1.81, 0.085, SUB.bullet, 0)
    }
    // The train in on the right, its windows lit; they blink when the plank lands.
    const x0 = 1.6
    round(pen, x0, -1.85, v.x1 - x0 + 0.6, 1.7, 0.18, SUB.silver)
    if (pen.lod <= 1) rect(pen, x0, -0.6, v.x1 - x0 + 0.3, 0.08, SUB.silverDeep, 0)
    const f = flashOf(m, 0.9, 0.12)
    fillRects(pen, mix(SUB.window, SUB.windowDark, Math.min(1, f * 1.5)), (ctx) => {
      ctx.rect(x0 + 0.18, -1.5, 0.42, 0.5)
      ctx.rect(x0 + 0.78, -1.5, 0.42, 0.5)
    })
    if (pen.lod <= 1) {
      rect(pen, x0 + 1.36, -1.6, 0.36, 1.32, SUB.silverDeep, 0.6)
      rect(pen, x0, -0.15, v.x1 - x0 + 0.3, 0.15, SUB.steel, 0)
    }
  },
  weight(pen) {
    // A briefcase, its handle and its clasps.
    const h = WEIGHT_H * 0.78
    if (pen.lod <= 1) {
      pen.ctx.beginPath()
      pen.ctx.moveTo(-0.06, -h)
      pen.ctx.lineTo(-0.06, -h - 0.06)
      pen.ctx.lineTo(0.06, -h - 0.06)
      pen.ctx.lineTo(0.06, -h)
      pen.ctx.strokeStyle = HOTDOG.piano
      pen.ctx.lineWidth = 0.03
      pen.ctx.stroke()
    }
    round(pen, -0.18, -h, 0.36, h, 0.04, SUB.leather)
    if (pen.lod <= 1) {
      line(pen, -0.18, -h * 0.72, 0.18, -h * 0.72, mix(SUB.leather, HOTDOG.piano, 0.5), pen.lw * 0.8)
      fillRects(pen, SUB.trim, (ctx) => {
        ctx.rect(-0.1, -h * 0.78, 0.04, 0.05)
        ctx.rect(0.06, -h * 0.78, 0.04, 0.05)
      })
    }
  },
}

/* ------------------------------------------------------------------ a greenhouse */

const GARDEN = {
  glass: '#DCEBE2',
  roof: '#C7DFD2',
  frame: '#FAF8F0',
  terracotta: '#C2724E',
  terracottaDeep: '#9A5238',
  leaf: '#5E9A4E',
  leafDeep: '#3F7340',
  petal: HOTDOG.mustard,
  seed: HIBACHI.soy,
  can: DOJO.jade,
  ink: '#2F3A30',
}

/** A sunflower: its stem and leaves from the pot at x, y up to its head, nodding by `nod`. */
function sunflower(pen: Pen, x: number, y: number, top: number, nod: number): void {
  const hx = x + nod * 0.5
  if (pen.lod <= 1) {
    line(pen, x, y, hx, top, GARDEN.leafDeep, 0.045)
    ellipse(pen, x - 0.13, (y + top) / 2 + 0.2, 0.16, 0.06, GARDEN.leaf, 0.6, 0.5)
    ellipse(pen, x + 0.13, (y + top) / 2 - 0.1, 0.16, 0.06, GARDEN.leaf, 0.6, -0.5)
  } else line(pen, x, y, hx, top, GARDEN.leafDeep, 0.07)
  at(pen, hx, top, nod, 1, () => {
    const pts: Pt[] = []
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2
      const r = i % 2 ? 0.19 : 0.32
      pts.push([Math.cos(a) * r, Math.sin(a) * r])
    }
    poly(pen, pts, GARDEN.petal, 0.6)
    circle(pen, 0, 0, 0.14, GARDEN.seed, pen.lod <= 1 ? 0.6 : 0)
  })
}

/** A terracotta pot, its rim at y and `w` wide there. */
function pot(pen: Pen, x: number, y: number, w: number): void {
  poly(pen, [[x - w / 2 + 0.05, 0], [x + w / 2 - 0.05, 0], [x + w / 2, y], [x - w / 2, y]], GARDEN.terracotta, 0.8)
  rect(pen, x - w / 2 - 0.03, y - 0.07, w + 0.06, 0.08, GARDEN.terracottaDeep, 0.7)
}

const garden: Skin = {
  key: 'garden',
  bg: GARDEN.glass,
  ink: GARDEN.ink,
  floor: GARDEN.terracotta,
  edge: GARDEN.terracottaDeep,
  plank: DOJO.wood,
  fulcrum: GARDEN.terracottaDeep,
  back(pen, m, v) {
    // The roof's glass over the eaves; the white frame, its mullions standing between the panes.
    rect(pen, v.x0 - 0.1, v.y0 - 0.1, v.x1 - v.x0 + 0.2, -1.95 - v.y0 + 0.1, GARDEN.roof, 0)
    const { ctx } = pen
    ctx.beginPath()
    ctx.rect(v.x0 - 0.1, -2.0, v.x1 - v.x0 + 0.2, 0.09)
    for (const x of [-2.75, -1.65, -0.55, 0.55, 1.65, 2.75]) {
      if (x < v.x0 - 0.1 || x > v.x1 + 0.1) continue
      ctx.rect(x - 0.04, v.y0 - 0.1, 0.08, -v.y0 + 0.1)
    }
    if (pen.lod <= 1) ctx.rect(v.x0 - 0.1, -0.92, v.x1 - v.x0 + 0.2, 0.05)
    ctx.fillStyle = GARDEN.frame
    ctx.fill()
    if (pen.lod <= 1) {
      ctx.strokeStyle = rgba(GARDEN.ink, 0.35)
      ctx.lineWidth = pen.lw * 0.7
      ctx.stroke()
    }
    // Two sunflowers, tall in their pots, nodding when the floor is struck; a little potted fern beside the left.
    const nod = ring(m, 0.5, 0.5) * 0.12
    sunflower(pen, -2.05, -0.45, -1.8, -0.06 + nod)
    sunflower(pen, 2.0, -0.45, -1.6, 0.08 - nod)
    pot(pen, -2.05, -0.45, 0.46)
    pot(pen, 2.0, -0.45, 0.46)
    if (pen.lod <= 1) {
      ellipse(pen, -1.68, -0.42, 0.15, 0.12, GARDEN.leaf, 0.6)
      pot(pen, -1.68, -0.28, 0.2)
    }
  },
  front(pen, _m, v) {
    // Grout between the floor's tiles.
    if (pen.lod > 1) return
    strokeLines(pen, GARDEN.terracottaDeep, pen.lw * 0.8, (ctx) => {
      for (let y = 0.37; y < v.y1; y += 0.3) {
        ctx.moveTo(v.x0, y)
        ctx.lineTo(v.x1, y)
      }
      if (pen.lod > 0) return
      for (let x = Math.floor(v.x0 / 0.45) * 0.45; x < v.x1; x += 0.45) {
        ctx.moveTo(x, 0.07)
        ctx.lineTo(x, v.y1)
      }
    })
  },
  weight(pen) {
    // A green watering can: its spout, its rose and its handle.
    const h = WEIGHT_H * 0.7
    poly(pen, [[0.1, -h * 0.35], [0.26, -h * 1.15], [0.29, -h * 1.08], [0.12, -h * 0.15]], GARDEN.can, 0.7)
    if (pen.lod <= 1) {
      pen.ctx.beginPath()
      pen.ctx.arc(-0.02, -h, 0.1, Math.PI, 0)
      pen.ctx.strokeStyle = GARDEN.can
      pen.ctx.lineWidth = 0.035
      pen.ctx.stroke()
    }
    round(pen, -0.14, -h, 0.26, h, 0.04, GARDEN.can)
    if (pen.lod <= 1) rect(pen, -0.14, -h * 0.35, 0.26, 0.04, mix(GARDEN.can, GARDEN.leafDeep, 0.6), 0)
  },
}

/* ------------------------------------------------------------------ a bowling alley */

const BOWL = {
  navy: '#1A2142',
  pit: '#10152C',
  hood: '#2A3260',
  lane: '#D9A766',
  laneDeep: '#B8864C',
  pin: '#F7F4EE',
  stripe: HOTDOG.ketchup,
  pink: STAR.neonPink,
  teal: STAR.neonTeal,
  ball: '#3A2E6A',
  ink: '#F0EADF',
}

/** A pin's profile, one side, foot to crown, a unit tall. */
const PIN: readonly Pt[] = [[0.12, 0], [0.17, -0.12], [0.2, -0.3], [0.15, -0.5], [0.08, -0.66], [0.09, -0.78], [0.1, -0.88], [0.06, -0.97], [0, -1]]
/** A pin's outline, its foot at x, y and `h` tall, leaning by `lean`, as a subpath. */
function pinPath(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, lean: number): void {
  for (let i = 0; i < PIN.length; i++) {
    const [px0, py0] = PIN[i]
    if (i === 0) ctx.moveTo(x + px0 * h - py0 * h * lean, y + py0 * h)
    else ctx.lineTo(x + px0 * h - py0 * h * lean, y + py0 * h)
  }
  for (let i = PIN.length - 2; i >= 0; i--) {
    const [px0, py0] = PIN[i]
    ctx.lineTo(x - px0 * h - py0 * h * lean, y + py0 * h)
  }
  ctx.closePath()
}

const bowling: Skin = {
  key: 'bowling',
  bg: BOWL.navy,
  ink: BOWL.ink,
  floor: BOWL.lane,
  edge: BOWL.laneDeep,
  plank: BOWL.laneDeep,
  fulcrum: BOWL.ball,
  back(pen, m, v) {
    // Neon high on the left: an arc, swung like a ball's hook, and a star.
    glow(pen, -1.8, -1.6, 0.9, BOWL.pink, 0.28)
    const { ctx } = pen
    ctx.beginPath()
    ctx.arc(-1.75, -1.35, 0.5, Math.PI * 1.05, Math.PI * 1.85)
    ctx.strokeStyle = BOWL.pink
    ctx.lineWidth = pen.lod <= 1 ? 0.05 : 0.08
    ctx.stroke()
    glow(pen, -2.0, -1.85, 0.45, BOWL.teal, 0.3)
    const star: Pt[] = []
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5
      const r = i % 2 ? 0.07 : 0.18
      star.push([-2.0 + Math.cos(a) * r, -1.85 + Math.sin(a) * r])
    }
    poly(pen, star, null, 0)
    ctx.strokeStyle = BOWL.teal
    ctx.lineWidth = pen.lod <= 1 ? 0.035 : 0.06
    ctx.stroke()
    // The far end, on the right: the pit under its hood, and the ten pins in their triangle, rocking when the
    // plank lands.
    const x0 = 1.5
    rect(pen, x0, -1.3, v.x1 - x0 + 0.2, 1.3, BOWL.pit, 0)
    rect(pen, x0, -1.5, v.x1 - x0 + 0.2, 0.3, BOWL.hood, pen.lod <= 1 ? 0.7 : 0)
    if (pen.lod <= 1) rect(pen, x0, -1.32, v.x1 - x0 + 0.2, 0.04, BOWL.pink, 0)
    const r = ring(m, 0.22, 0.3) * 0.12
    const cx = 1.95
    for (let row = 3; row >= 0; row--) {
      const y = -0.08 - row * 0.05
      const h = 0.44 - row * 0.03
      const n = row + 1
      ctx.beginPath()
      for (let i = 0; i < n; i++) pinPath(ctx, cx + (i - (n - 1) / 2) * 0.21, y, h, r * (i % 2 ? -1 : 1) * (0.6 + 0.1 * row))
      ctx.fillStyle = BOWL.pin
      ctx.fill()
      if (pen.lod <= 1) {
        ctx.strokeStyle = BOWL.navy
        ctx.lineWidth = pen.lw * 0.6
        ctx.stroke()
      }
      if (pen.lod === 0) fillRects(pen, BOWL.stripe, (c) => {
        for (let i = 0; i < n; i++) {
          const lean = r * (i % 2 ? -1 : 1) * (0.6 + 0.1 * row)
          const px0 = cx + (i - (n - 1) / 2) * 0.21 + 0.72 * h * lean
          c.rect(px0 - 0.085 * h, y - 0.74 * h, 0.17 * h, 0.05 * h)
        }
      })
    }
  },
  front(pen, _m, v) {
    // The lane's boards.
    if (pen.lod > 0) return
    strokeLines(pen, BOWL.laneDeep, pen.lw * 0.7, (ctx) => {
      for (let y = 0.19; y < v.y1; y += 0.12) {
        ctx.moveTo(v.x0, y)
        ctx.lineTo(v.x1, y)
      }
    })
  },
  weight(pen) {
    // A bowling pin, its two red stripes.
    const h = WEIGHT_H * 1.05
    const { ctx } = pen
    ctx.beginPath()
    pinPath(ctx, 0, 0, h, 0)
    ctx.fillStyle = BOWL.pin
    ctx.fill()
    if (pen.lod <= 1) {
      ctx.strokeStyle = BOWL.navy
      ctx.lineWidth = pen.lw * 0.8
      ctx.stroke()
      fillRects(pen, BOWL.stripe, (c) => {
        c.rect(-0.085 * h, -0.76 * h, 0.17 * h, 0.04 * h)
        c.rect(-0.08 * h, -0.7 * h, 0.16 * h, 0.04 * h)
      })
    }
  },
}

/* ------------------------------------------------------------------ the table */

export const ODD_SKINS = { pixel, blueprint, library, circus, diner, subway, garden, bowling } as const satisfies Record<string, Skin>
