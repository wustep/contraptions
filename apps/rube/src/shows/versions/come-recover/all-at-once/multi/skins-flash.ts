import { beam, circle, ellipse, glow, hash, knock, line, mix, poly, rect, rgba, round, type Pen, type Pt } from './skins-pen'
import { flashOf, ring, WEIGHT_H, type Skin } from './skins-kit'

/**
 * Lives from the film's quick jumps, the montage and the verse-jumps between: a desert war zone, a sepia studio of
 * the forties, a conspiracy thumbnail, the salt flats, the boulder in the laundromat at dawn, the movie star alone in
 * black space under her blue spotlight, Evelyn the maid at the IRS, the cat-headed news anchor, a child's crayon
 * drawing, the anime city in the rain, the curb outside the smashed window, and the master who trained her pinkies.
 * Each is one backdrop and one weight for the same seesaw, drawn as in `skins.ts`: the ground's top at y = 0, the
 * machine in x -1.15..1.15 under y = -1.7, the world's one big silhouette off to the sides or high. Floor patterns
 * are laid in `front()`, under the ground's top edge.
 */

/** Rects (or any shapes) of one colour in one path, filled once. */
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

/* ------------------------------------------------------------------ the war zone */

const BATTLE = {
  sky: '#D3B88F',
  haze: '#E3CDA6',
  dune: '#C19E70',
  sand: '#A9865B',
  sandDeep: '#8C6C46',
  smoke: '#7E776D',
  smokeLight: '#B4AA9B',
  bag: '#BCA677',
  bagDeep: '#8E7A52',
  olive: '#5E6142',
  wood: '#7A5A38',
  ink: '#3A2C1E',
}

const DUNES: Pt[] = [[-3.6, 0.1], [-3.6, -0.42], [-2.4, -0.62], [-1.2, -0.38], [0.2, -0.55], [1.5, -0.4], [2.6, -0.66], [3.6, -0.45], [3.6, 0.1]]

/** A sandbag lying on its side, its left end at x, its foot at y. */
function sandbag(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const r = h / 2
  ctx.moveTo(x + r, y - h)
  ctx.lineTo(x + w - r, y - h)
  ctx.arc(x + w - r, y - r, r, -Math.PI / 2, Math.PI / 2)
  ctx.lineTo(x + r, y)
  ctx.arc(x + r, y - r, r, Math.PI / 2, Math.PI * 1.5)
  ctx.closePath()
}

/** The bunker's bags, row by row: x, foot, width. */
const BAGS: [number, number, number][] = [
  [1.62, 0, 0.36], [1.98, 0, 0.36], [2.34, 0, 0.36], [2.7, 0, 0.36], [3.06, 0, 0.36],
  [1.78, -0.22, 0.36], [2.14, -0.22, 0.36], [2.5, -0.22, 0.36], [2.86, -0.22, 0.36],
  [1.95, -0.44, 0.36], [2.31, -0.44, 0.36], [2.67, -0.44, 0.36], [3.03, -0.44, 0.36],
]

const battle: Skin = {
  key: 'battle',
  bg: BATTLE.sky,
  ink: BATTLE.ink,
  floor: BATTLE.sand,
  edge: BATTLE.sandDeep,
  plank: BATTLE.wood,
  fulcrum: BATTLE.olive,
  back(pen, m, v) {
    // A pale haze low over the desert, and the dunes far off.
    if (pen.lod <= 1) rect(pen, v.x0 - 0.1, -1.0, v.x1 - v.x0 + 0.2, 1.0, BATTLE.haze, 0)
    poly(pen, DUNES, BATTLE.dune, 0)
    // A column of smoke on the left, leaning in the wind and rolling slowly up.
    const n = pen.lod === 2 ? 3 : 6
    fillPath(pen, BATTLE.smoke, (ctx) => {
      for (let i = 0; i < n; i++) {
        const k = (i / (n - 1)) * 5
        const x = -2.35 + k * 0.12 + 0.07 * Math.sin(m.t * 0.6 + k)
        const y = -0.35 - k * 0.46
        const r = 0.26 + k * 0.07
        ctx.moveTo(x + r, y)
        ctx.arc(x, y, r, 0, Math.PI * 2)
      }
    })
    if (pen.lod <= 1) fillPath(pen, BATTLE.smokeLight, (ctx) => {
      for (let i = 1; i < 6; i++) {
        const x = -2.25 + i * 0.12 + 0.07 * Math.sin(m.t * 0.6 + i)
        const y = -0.45 - i * 0.46
        const r = 0.12 + i * 0.04
        ctx.moveTo(x + r, y)
        ctx.arc(x, y, r, 0, Math.PI * 2)
      }
    })
    // The sandbag bunker on the right, three courses high.
    if (pen.lod === 2) poly(pen, [[1.6, 0], [3.5, 0], [3.5, -0.66], [1.95, -0.66]], BATTLE.bag, 0)
    else {
      for (let row = 0; row < 3; row++) {
        fillPath(pen, row === 1 ? mix(BATTLE.bag, BATTLE.bagDeep, 0.25) : BATTLE.bag, (ctx) => {
          for (const [x, y, w] of BAGS) if (Math.round(-y / 0.22) === row) sandbag(ctx, x, y, w - 0.02, 0.22)
        })
      }
      pen.ctx.strokeStyle = pen.ink
      pen.ctx.lineWidth = pen.lw * 0.7
      pen.ctx.beginPath()
      for (const [x, y, w] of BAGS) sandbag(pen.ctx, x, y, w - 0.02, 0.22)
      pen.ctx.stroke()
    }
  },
  front(pen, m, v) {
    // Dust, kicked up on both sides when the plank slams.
    const k = m.s > 0.6 ? knock(m.since, 0.4) : 0
    if (k > 0.02) {
      const g = 1 - k
      fillPath(pen, rgba(BATTLE.smokeLight, 0.75 * k), (ctx) => {
        for (const [x, s] of [[-1.85, -1], [1.95, 1]] as const) {
          for (let i = 0; i < 3; i++) {
            const px = x + s * (i - 1) * (0.14 + 0.2 * g)
            const py = -0.06 - (0.08 + 0.12 * i % 2) * (0.5 + g) - 0.1 * g
            const r = 0.1 + 0.08 * g + 0.03 * i
            ctx.moveTo(px + r, py)
            ctx.arc(px, py, r, 0, Math.PI * 2)
          }
        }
      })
    }
    // Ripples in the sand.
    if (pen.lod === 0) strokeLines(pen, BATTLE.sandDeep, pen.lw * 0.7, (ctx) => {
      for (const y of [0.24, 0.48]) {
        if (y > v.y1) break
        for (let x = Math.floor(v.x0 / 0.9) * 0.9 + (y > 0.3 ? 0.45 : 0); x < v.x1; x += 0.9) {
          ctx.moveTo(x, y)
          ctx.quadraticCurveTo(x + 0.2, y - 0.05, x + 0.4, y)
        }
      }
    })
  },
  weight(pen) {
    // A sandbag, standing, tied at the neck.
    const h = WEIGHT_H
    round(pen, -0.15, -h * 0.84, 0.3, h * 0.84, 0.1, BATTLE.bag)
    poly(pen, [[-0.07, -h * 0.84], [0.07, -h * 0.84], [0.1, -h], [-0.1, -h]], BATTLE.bag, 0.8)
    if (pen.lod <= 1) {
      line(pen, -0.07, -h * 0.84, 0.07, -h * 0.84, BATTLE.bagDeep, 0.03)
      if (pen.lod === 0) line(pen, -0.12, -h * 0.4, 0.12, -h * 0.42, BATTLE.bagDeep, pen.lw * 0.7)
    }
  },
}

/* ------------------------------------------------------------------ a studio of the forties */

const SEPIA = {
  room: '#4E3A28',
  roomDeep: '#3A2A1C',
  sweep: '#D8C09A',
  sweepShade: '#C6AA80',
  roll: '#8E7050',
  stand: '#2C2118',
  chrome: '#B8A07C',
  lamp: '#FFF2D2',
  table: '#6E4E32',
  tray: '#A8916E',
  holder: '#1E1610',
  smoke: '#8AA6CC',
  phone: '#1F1813',
  dial: '#E6D6B6',
  ink: '#2A1E14',
}

const sepia: Skin = {
  key: 'sepia',
  bg: SEPIA.room,
  ink: SEPIA.ink,
  floor: SEPIA.sweep,
  plank: '#8A6440',
  fulcrum: SEPIA.roomDeep,
  back(pen, m, _v) {
    // The paper sweep, hung from its roll and curving down into the floor; it darkens where it bends.
    const top = -2.55
    rect(pen, -2.55, top, 5.1, -top + 0.05, SEPIA.sweep, 0)
    if (pen.lod <= 1) {
      rect(pen, -2.55, -0.32, 5.1, 0.37, SEPIA.sweepShade, 0)
      rect(pen, -2.55, -0.62, 5.1, 0.3, mix(SEPIA.sweep, SEPIA.sweepShade, 0.5), 0)
    }
    round(pen, -2.7, top - 0.14, 5.4, 0.16, 0.08, SEPIA.roll, 0.8)
    // The studio light on its stand at the left, aimed at the sitter; it fires on the loud landings.
    const sx = -2.15
    const f = flashOf(m, 1.0, 0.18)
    glow(pen, sx + 0.35, -1.82, 1.4, SEPIA.lamp, 0.3 + 0.35 * f)
    if (pen.lod <= 1) strokeLines(pen, SEPIA.stand, 0.035, (ctx) => {
      ctx.moveTo(sx, -1.7)
      ctx.lineTo(sx, -0.6)
      ctx.lineTo(sx - 0.32, 0)
      ctx.moveTo(sx, -0.6)
      ctx.lineTo(sx + 0.3, 0)
      ctx.moveTo(sx, -0.6)
      ctx.lineTo(sx + 0.02, 0)
    })
    else rect(pen, sx - 0.03, -1.7, 0.06, 1.7, SEPIA.stand, 0)
    const { ctx } = pen
    ctx.beginPath()
    ctx.moveTo(sx - 0.18, -2.18)
    ctx.lineTo(sx + 0.42, -1.92)
    ctx.lineTo(sx + 0.2, -1.52)
    ctx.lineTo(sx - 0.34, -1.78)
    ctx.closePath()
    shape(pen, SEPIA.chrome)
    ellipse(pen, sx + 0.31, -1.72, 0.08, 0.23, mix(SEPIA.lamp, SEPIA.chrome, 0.3 - 0.3 * f), 0.7, -1.1)
    // A pedestal table on the right, and on its tray a long cigarette holder, a curl of blue smoke going up.
    const tx = 1.95
    poly(pen, [[tx - 0.06, -0.6], [tx + 0.06, -0.6], [tx + 0.05, -0.06], [tx - 0.05, -0.06]], SEPIA.table, 0.8)
    ellipse(pen, tx, -0.04, 0.24, 0.05, SEPIA.table, 0.8)
    ellipse(pen, tx, -0.64, 0.42, 0.07, SEPIA.table)
    if (pen.lod <= 1) {
      ellipse(pen, tx + 0.05, -0.73, 0.2, 0.04, SEPIA.tray, 0.7)
      line(pen, tx - 0.12, -0.75, tx + 0.48, -0.86, SEPIA.holder, 0.025)
      circle(pen, tx + 0.48, -0.86, 0.018, '#E8A050', 0)
      ctx.beginPath()
      const bx = tx + 0.5
      ctx.moveTo(bx, -0.9)
      const w = 0.07 * Math.sin(m.t * 0.9)
      ctx.bezierCurveTo(bx - 0.12, -1.15, bx + 0.14 + w, -1.35, bx + 0.02, -1.6)
      ctx.bezierCurveTo(bx - 0.1 - w, -1.8, bx + 0.12, -1.95, bx + 0.04 + w, -2.15)
      ctx.strokeStyle = rgba(SEPIA.smoke, 0.75)
      ctx.lineWidth = 0.03
      ctx.stroke()
    }
  },
  front(pen, _m, v) {
    // The studio's dark boards either side of the sweep.
    rect(pen, v.x0 - 0.1, 0, -2.55 - v.x0 + 0.1, v.y1 + 0.1, SEPIA.roomDeep, 0)
    rect(pen, 2.55, 0, v.x1 - 2.55 + 0.1, v.y1 + 0.1, SEPIA.roomDeep, 0)
  },
  weight(pen) {
    // A big desk telephone: its body, the dial and the handset in its cradle.
    const h = WEIGHT_H
    poly(pen, [[-0.17, 0], [0.17, 0], [0.12, -h * 0.62], [-0.12, -h * 0.62]], SEPIA.phone)
    if (pen.lod <= 1) circle(pen, 0, -h * 0.32, 0.075, SEPIA.dial, 0.6)
    if (pen.lod === 0) circle(pen, 0, -h * 0.32, 0.025, SEPIA.phone, 0)
    rect(pen, -0.05, -h * 0.75, 0.1, h * 0.14, SEPIA.phone, 0)
    round(pen, -0.2, -h, 0.4, 0.07, 0.035, SEPIA.phone, 0.8)
    ellipse(pen, -0.17, -h * 0.9, 0.06, 0.045, SEPIA.phone, 0.8)
    ellipse(pen, 0.17, -h * 0.9, 0.06, 0.045, SEPIA.phone, 0.8)
  },
}

/* ------------------------------------------------------------------ a conspiracy thumbnail */

const CONS = {
  field: '#B6B6B4',
  far: '#9C9C9A',
  hill: '#7A7A78',
  blob: '#5A5A58',
  floor: '#686866',
  edge: '#565654',
  bar: '#1C1C1C',
  barMid: '#3A3A3A',
  barLight: '#7C7C7C',
  red: '#E31B1B',
  stone: '#9A9690',
  stoneDeep: '#6E6A64',
  eye: '#F2F2F0',
  ink: '#141414',
}

const RIDGE: Pt[] = [[-3.6, 0.1], [-3.6, -0.5], [-2.6, -0.8], [-1.6, -0.55], [-0.4, -0.7], [0.8, -0.5], [2.0, -0.85], [3.6, -0.6], [3.6, 0.1]]

/** A circle drawn fast in red marker: once round and a bit over, not quite closing on itself. */
function markerRing(pen: Pen, x: number, y: number, rx: number, ry: number, w: number, seed: number): void {
  const { ctx } = pen
  ctx.beginPath()
  const n = pen.lod === 0 ? 22 : 12
  for (let i = 0; i <= n; i++) {
    const a = -1.9 + (i / n) * Math.PI * 2.25
    const g = 1 + 0.08 * (i / n) + 0.04 * (hash(i, seed) - 0.5)
    const px = x + Math.cos(a) * rx * g
    const py = y + Math.sin(a) * ry * g
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.strokeStyle = CONS.red
  ctx.lineWidth = w
  ctx.stroke()
}

const conspiracy: Skin = {
  key: 'conspiracy',
  bg: CONS.field,
  ink: CONS.ink,
  floor: CONS.floor,
  edge: CONS.edge,
  plank: '#3E3E3C',
  fulcrum: '#2A2A28',
  back(pen, m, v) {
    // A grainy black-and-white field: a far ridge, and a blurred dark thing in the sky on the right.
    poly(pen, RIDGE, CONS.far, 0)
    if (pen.lod <= 1) ellipse(pen, 2.0, -1.68, 0.5, 0.2, mix(CONS.field, CONS.blob, 0.35), 0)
    ellipse(pen, 2.0, -1.68, 0.32, 0.11, CONS.blob, 0)
    if (pen.lod <= 1) ellipse(pen, 2.0, -1.76, 0.13, 0.08, CONS.blob, 0)
    // The red marker: a ring round it, swelling on the slam, and an arrow pointing at it.
    const k = knock(m.since, 0.3) * Math.min(1, m.s / 1.2)
    const w = (pen.lod === 2 ? 0.09 : 0.055) * (1 + 0.5 * k)
    markerRing(pen, 2.0, -1.7, 0.62 + 0.04 * k, 0.36 + 0.03 * k, w, 3)
    if (pen.lod <= 1) {
      strokeLines(pen, CONS.red, 0.055, (ctx) => {
        ctx.moveTo(0.3, -2.25)
        ctx.quadraticCurveTo(0.85, -1.95, 1.33, -1.85)
        ctx.moveTo(1.33, -1.85)
        ctx.lineTo(1.15, -2.0)
        ctx.moveTo(1.33, -1.85)
        ctx.lineTo(1.14, -1.74)
      })
    }
    // The eye in the pyramid, doodled on the left, its rays round it.
    const px = -1.95
    const py = -1.6
    strokeLines(pen, CONS.red, pen.lod === 2 ? 0.08 : 0.05, (ctx) => {
      ctx.moveTo(px, py - 0.55)
      ctx.lineTo(px + 0.55, py + 0.35)
      ctx.lineTo(px - 0.56, py + 0.33)
      ctx.lineTo(px + 0.02, py - 0.52)
      if (pen.lod <= 1) {
        ctx.moveTo(px - 0.2, py)
        ctx.quadraticCurveTo(px, py - 0.16, px + 0.2, py)
        ctx.quadraticCurveTo(px, py + 0.14, px - 0.2, py)
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i - 2) * 0.42
          ctx.moveTo(px + Math.cos(a) * 0.68, py - 0.12 + Math.sin(a) * 0.68)
          ctx.lineTo(px + Math.cos(a) * 0.9, py - 0.12 + Math.sin(a) * 0.9)
        }
      }
    })
    if (pen.lod <= 1) circle(pen, px, py - 0.01, 0.05, CONS.red, 0)
    // The player's dark bar along the top.
    const by = v.y0
    rect(pen, v.x0 - 0.1, by - 0.1, v.x1 - v.x0 + 0.2, 0.42, CONS.bar, 0)
    if (pen.lod <= 1) {
      round(pen, -0.9, by + 0.08, 1.8, 0.16, 0.08, CONS.barMid, 0)
      circle(pen, v.x1 - 0.3, by + 0.16, 0.09, CONS.barLight, 0)
      fillPath(pen, CONS.barLight, (ctx) => {
        for (let i = 0; i < 3; i++) ctx.rect(v.x0 + 0.2, by + 0.09 + i * 0.05, 0.22, 0.025)
      })
    }
  },
  front(pen, _m, v) {
    // The running time, in its black box in the corner.
    if (pen.lod <= 1) round(pen, v.x1 - 0.62, v.y1 - 0.32, 0.46, 0.2, 0.04, rgba(CONS.bar, 0.85), 0)
  },
  weight(pen) {
    // A stone pyramid, its capstone lifted off, an eye in it.
    const h = WEIGHT_H
    poly(pen, [[-0.18, 0], [0.18, 0], [0.09, -h * 0.55], [-0.09, -h * 0.55]], CONS.stone)
    if (pen.lod === 0) strokeLines(pen, CONS.stoneDeep, pen.lw * 0.7, (ctx) => {
      ctx.moveTo(-0.15, -h * 0.18)
      ctx.lineTo(0.15, -h * 0.18)
      ctx.moveTo(-0.12, -h * 0.37)
      ctx.lineTo(0.12, -h * 0.37)
    })
    poly(pen, [[-0.08, -h * 0.64], [0.08, -h * 0.64], [0, -h]], CONS.stone)
    ellipse(pen, 0, -h * 0.76, 0.04, 0.022, CONS.eye, 0)
    if (pen.lod <= 1) circle(pen, 0, -h * 0.76, 0.013, CONS.ink, 0)
  },
}

/* ------------------------------------------------------------------ the salt flats */

const SALT = {
  sky: '#2C58A4',
  skyLow: '#5F8FCC',
  haze: '#A9C4E4',
  range: '#8A6448',
  rangeFar: '#A88468',
  salt: '#EEEBE2',
  saltEdge: '#DAD4C6',
  crack: '#BDB4A2',
  streak: '#E6EEF8',
  plank: '#9C7A56',
  purple: '#7A4EA8',
  purpleDeep: '#56347E',
  ink: '#262B3A',
}

const RANGE_FAR: Pt[] = [[-3.6, 0.05], [-3.6, -0.55], [-3.0, -0.8], [-2.5, -0.62], [-1.6, -0.35], [-0.5, -0.28], [0.6, -0.32], [1.6, -0.5], [3.6, -0.4], [3.6, 0.05]]
const RANGE: Pt[] = [[1.3, 0.05], [1.55, -0.3], [1.9, -0.62], [2.2, -1.02], [2.45, -1.12], [2.75, -0.88], [3.05, -0.98], [3.6, -0.6], [3.6, 0.05]]
const RANGE_L: Pt[] = [[-3.6, 0.05], [-3.6, -0.7], [-3.05, -0.92], [-2.6, -0.66], [-2.2, -0.4], [-1.6, -0.12], [-1.4, 0.05]]

/** The crust's cracks: rows of jittered points, the rows closer together towards the horizon. */
const CRACK_ROWS: number[] = [0.12, 0.3, 0.58]
const CRACK_COLS = 12
const CRACKS: Pt[][] = CRACK_ROWS.map((y, r) => {
  const pts: Pt[] = []
  for (let i = 0; i <= CRACK_COLS; i++) {
    const x = -3.6 + i * 0.6 + (r % 2) * 0.3 + (hash(i, r, 41) - 0.5) * 0.3
    pts.push([x, y + (hash(i, r, 42) - 0.5) * 0.08 * (r + 1)])
  }
  return pts
})

const saltflat: Skin = {
  key: 'saltflat',
  bg: SALT.sky,
  ink: SALT.ink,
  floor: SALT.salt,
  edge: SALT.saltEdge,
  plank: SALT.plank,
  fulcrum: SALT.purpleDeep,
  back(pen, m, v) {
    // The deep sky paling to the horizon, a far range, and a nearer brown range rising on either side.
    rect(pen, v.x0 - 0.1, -1.3, v.x1 - v.x0 + 0.2, 1.35, SALT.skyLow, 0)
    rect(pen, v.x0 - 0.1, -0.6, v.x1 - v.x0 + 0.2, 0.65, SALT.haze, 0)
    poly(pen, RANGE_FAR, SALT.rangeFar, 0)
    poly(pen, RANGE, SALT.range, 0)
    poly(pen, RANGE_L, SALT.range, 0)
    // Wind, in long thin streaks running across the sky.
    if (pen.lod <= 1) strokeLines(pen, rgba(SALT.streak, 0.55), pen.lw * 0.9, (ctx) => {
      for (let i = 0; i < 6; i++) {
        const span = v.x1 - v.x0 + 2
        const x = v.x0 - 1 + ((hash(i, 7) * span + m.t * (0.5 + 0.3 * hash(i, 8))) % span)
        const y = -2.6 + hash(i, 9) * 1.7
        ctx.moveTo(x, y)
        ctx.lineTo(x + 0.6 + 0.4 * hash(i, 10), y)
      }
    })
  },
  front(pen, _m, v) {
    // The crust, broken into its polygons.
    if (pen.lod > 1) return
    strokeLines(pen, SALT.crack, pen.lw * (pen.lod === 0 ? 0.9 : 1.2), (ctx) => {
      for (let r = 0; r < CRACKS.length; r++) {
        const row = CRACKS[r]
        if (row[0][1] > v.y1 + 0.1) break
        ctx.moveTo(row[0][0], row[0][1])
        for (let i = 1; i < row.length; i++) ctx.lineTo(row[i][0], row[i][1])
        if (pen.lod > 0) continue
        const prev = r > 0 ? CRACKS[r - 1] : null
        for (let i = 0; i < row.length; i++) {
          ctx.moveTo(row[i][0], row[i][1])
          if (prev) ctx.lineTo(prev[i][0] + 0.15, prev[i][1])
          else ctx.lineTo(row[i][0] + 0.1, 0.07)
        }
      }
    })
  },
  weight(pen) {
    // A small purple duffel on its end, its strap looped over the top.
    const h = WEIGHT_H
    if (pen.lod <= 1) {
      pen.ctx.beginPath()
      pen.ctx.ellipse(0, -h * 0.8, 0.09, h * 0.22, 0, Math.PI, Math.PI * 2)
      pen.ctx.strokeStyle = SALT.purpleDeep
      pen.ctx.lineWidth = 0.035
      pen.ctx.stroke()
    }
    round(pen, -0.15, -h * 0.8, 0.3, h * 0.8, 0.09, SALT.purple)
    if (pen.lod <= 1) rect(pen, -0.15, -h * 0.5, 0.3, 0.04, SALT.purpleDeep, 0)
  },
}

/* ------------------------------------------------------------------ the boulder, dropped into the laundromat */

const DAWNWASH = {
  wall: '#8D9AAF',
  wallLow: '#A6B1C2',
  window: '#C6D4E8',
  dawn: '#E4ECF6',
  tile: '#C2C9D5',
  tileDeep: '#A1AAB9',
  washer: '#D3D8E0',
  steel: '#8994A4',
  glass: '#62748C',
  boulder: '#2D3036',
  sheen: '#4A505A',
  cop: '#1D2944',
  badge: '#B8C2D2',
  ink: '#1C2230',
}

const BOULDER: Pt[] = [[-3.15, 0], [-3.2, -0.42], [-3.0, -0.95], [-2.6, -1.3], [-2.05, -1.38], [-1.62, -1.12], [-1.38, -0.62], [-1.36, 0]]

/** A police officer, a plain silhouette, standing at x, a little hop in `dy`. */
function officer(pen: Pen, x: number, dy: number, s: number): void {
  const { ctx } = pen
  ctx.beginPath()
  ctx.moveTo(x - 0.17 * s, dy)
  ctx.lineTo(x - 0.2 * s, -0.95 * s + dy)
  ctx.quadraticCurveTo(x, -1.08 * s + dy, x + 0.2 * s, -0.95 * s + dy)
  ctx.lineTo(x + 0.17 * s, dy)
  ctx.closePath()
  ctx.moveTo(x + 0.11 * s, -1.14 * s + dy)
  ctx.arc(x, -1.14 * s + dy, 0.11 * s, 0, Math.PI * 2)
  shape(pen, DAWNWASH.cop, 0.7)
  // The cap: crown and peak.
  round(pen, x - 0.12 * s, -1.33 * s + dy, 0.24 * s, 0.11 * s, 0.03, DAWNWASH.cop, 0)
  rect(pen, x - 0.17 * s, -1.24 * s + dy, 0.2 * s, 0.03 * s, DAWNWASH.cop, 0)
  if (pen.lod === 0) circle(pen, x - 0.08 * s, -0.78 * s + dy, 0.03, DAWNWASH.badge, 0)
}

const boulder: Skin = {
  key: 'boulder',
  bg: DAWNWASH.wall,
  ink: DAWNWASH.ink,
  floor: DAWNWASH.tile,
  edge: DAWNWASH.tileDeep,
  plank: '#6C7686',
  fulcrum: '#4A5262',
  back(pen, m, v) {
    // The cold dawn in a high window, the lower wall, and the washers' bases along the left.
    rect(pen, v.x0 - 0.1, -1.0, v.x1 - v.x0 + 0.2, 1.05, DAWNWASH.wallLow, 0)
    rect(pen, 1.55, -2.65, 1.3, 0.85, DAWNWASH.window, 0.8)
    if (pen.lod <= 1) {
      rect(pen, 1.6, -2.6, 1.2, 0.3, DAWNWASH.dawn, 0)
      line(pen, 2.2, -2.65, 2.2, -1.8, DAWNWASH.steel, 0.04)
    }
    for (const x of [-3.45, -2.7, -1.95]) {
      rect(pen, x, -1.0, 0.72, 1.0, DAWNWASH.washer, 0.8)
      if (pen.lod <= 1) circle(pen, x + 0.36, -0.55, 0.24, DAWNWASH.glass, 0.7)
    }
    // The boulder, huge and smooth, sat on the tiles where it fell.
    poly(pen, BOULDER, DAWNWASH.boulder)
    if (pen.lod <= 1) ellipse(pen, -2.45, -1.0, 0.32, 0.12, DAWNWASH.sheen, 0, -0.45)
    // Two officers on the right, staring at it; they start when the plank lands.
    const dy = -0.05 * Math.max(0, ring(m, 0.3, 0.2))
    officer(pen, 2.0, dy, 1)
    officer(pen, 2.55, dy * 0.6, 1.04)
  },
  front(pen, _m, v) {
    // The floor's tiles, chequered.
    if (pen.lod > 0) return
    fillPath(pen, DAWNWASH.tileDeep, (ctx) => {
      for (let r = 0; r < 3; r++) {
        const y = 0.07 + r * 0.26
        if (y > v.y1) break
        for (let x = Math.floor(v.x0 / 0.6) * 0.6 + (r % 2) * 0.3; x < v.x1; x += 0.6) ctx.rect(x, y, 0.3, 0.26)
      }
    })
  },
  weight(pen) {
    // A smooth dark stone.
    const h = WEIGHT_H
    ellipse(pen, 0, -h * 0.45, 0.17, h * 0.45, DAWNWASH.boulder)
    if (pen.lod <= 1) ellipse(pen, -0.05, -h * 0.66, 0.06, 0.03, DAWNWASH.sheen, 0, -0.4)
  },
}

/* ------------------------------------------------------------------ the movie star, alone in the dark */

const SPOT = {
  black: '#050507',
  floor: '#0C0C12',
  edge: '#1B1B26',
  beam: '#5C9CFF',
  silver: '#DCE2EC',
  silverDim: '#7C8496',
  plank: '#A9B0BE',
  diamond: '#E8F3FF',
  diamondDeep: '#9DB9DC',
  ink: '#C9D2E0',
}

/** The sequins, glinting either side of the beam: x, y, size. */
const SEQUINS: [number, number, number][] = []
for (let i = 0; i < 36; i++) {
  const s = i % 2 ? 1 : -1
  SEQUINS.push([s * (1.45 + hash(i, 1, 61) * 1.9), -0.2 - hash(i, 2, 61) * 2.7, 0.03 + 0.06 * hash(i, 3, 61)])
}

const spotlight: Skin = {
  key: 'spotlight',
  bg: SPOT.black,
  ink: SPOT.ink,
  floor: SPOT.floor,
  edge: SPOT.edge,
  plank: SPOT.plank,
  fulcrum: '#3A3E4C',
  back(pen, m, v) {
    // The one blue beam, from high above.
    beam(pen, 0, v.y0 - 0.3, 0, 0.05, 0.5, 2.7, SPOT.beam, 0.4)
    // A field of sequins in the dark either side, twinkling, and all flaring on the slam.
    const k = knock(m.since, 0.25) * Math.min(1, m.s / 1.2)
    const n = pen.lod === 2 ? 10 : SEQUINS.length
    for (const [c, lit] of [[SPOT.silverDim, false], [SPOT.silver, true]] as const) {
      fillPath(pen, c, (ctx) => {
        for (let i = 0; i < n; i++) {
          const [x, y, s0] = SEQUINS[i]
          const tw = 0.5 + 0.5 * Math.sin(m.t * (1.3 + hash(i, 4, 61)) + i * 2.1)
          if ((tw > 0.55) !== lit) continue
          const s = s0 * (pen.lod === 2 ? 1.4 : 0.8) * (0.7 + 0.5 * tw + 0.8 * k)
          ctx.moveTo(x, y - s * 2)
          ctx.lineTo(x + s * 0.4, y - s * 0.4)
          ctx.lineTo(x + s * 2, y)
          ctx.lineTo(x + s * 0.4, y + s * 0.4)
          ctx.lineTo(x, y + s * 2)
          ctx.lineTo(x - s * 0.4, y + s * 0.4)
          ctx.lineTo(x - s * 2, y)
          ctx.lineTo(x - s * 0.4, y - s * 0.4)
          ctx.closePath()
        }
      })
    }
  },
  front(pen, _m, _v) {
    // The beam's pool on the floor.
    ellipse(pen, 0, 0.22, 1.5, 0.13, rgba(SPOT.beam, 0.28), 0)
  },
  weight(pen) {
    // A big diamond: its table, crown and pavilion.
    const h = WEIGHT_H
    const top = -h
    const girdle = -h * 0.66
    poly(pen, [[0, 0], [0.19, girdle], [0.11, top], [-0.11, top], [-0.19, girdle]], SPOT.diamond)
    if (pen.lod <= 1) {
      poly(pen, [[0, 0], [0.19, girdle], [0.06, girdle]], SPOT.diamondDeep, 0)
      poly(pen, [[0.11, top], [0.19, girdle], [0.06, girdle]], SPOT.diamondDeep, 0)
      line(pen, -0.19, girdle, 0.19, girdle, SPOT.diamondDeep, pen.lw)
    }
  },
}

/* ------------------------------------------------------------------ the maid, at the IRS */

const MAID = {
  wall: '#CFC2A6',
  wallDeep: '#B8A988',
  carpet: '#3A4466',
  carpetDeep: '#2C3450',
  blinds: '#ECE4D0',
  sky: '#9DB8D4',
  desk: '#5A3926',
  deskTop: '#7A5136',
  leather: '#2C2220',
  cart: '#4A5058',
  bucket: '#E7B52E',
  bucketDeep: '#B6861A',
  mop: '#DCD4C2',
  handle: '#9A7448',
  bag: '#2B2F36',
  ink: '#2A2018',
}

const maid: Skin = {
  key: 'maid',
  bg: MAID.wall,
  ink: MAID.ink,
  floor: MAID.carpet,
  edge: MAID.carpetDeep,
  plank: MAID.deskTop,
  fulcrum: MAID.cart,
  back(pen, m, v) {
    // Wainscot low on the wall.
    rect(pen, v.x0 - 0.1, -0.85, v.x1 - v.x0 + 0.2, 0.9, MAID.wallDeep, 0)
    // The window with its blinds, high on the left, and the executive's chair and big desk under it.
    rect(pen, -3.0, -2.75, 1.4, 1.05, MAID.sky, 0.8)
    if (pen.lod <= 1) fillPath(pen, MAID.blinds, (ctx) => {
      for (let i = 0; i < (pen.lod === 0 ? 8 : 4); i++) ctx.rect(-3.0, -2.75 + i * (pen.lod === 0 ? 0.13 : 0.26), 1.4, pen.lod === 0 ? 0.08 : 0.16)
    })
    round(pen, -2.65, -1.55, 0.7, 1.0, 0.16, MAID.leather)
    rect(pen, -3.2, -0.82, 1.75, 0.1, MAID.deskTop)
    rect(pen, -3.1, -0.72, 1.55, 0.72, MAID.desk, 0.8)
    if (pen.lod <= 1) {
      rect(pen, -1.95, -0.62, 0.35, 0.5, mix(MAID.desk, MAID.deskTop, 0.4), 0.6)
      rect(pen, -2.85, -0.92, 0.4, 0.1, MAID.blinds, 0.6)
    }
    // The janitor's cart on the right, a bag on its side, and the yellow bucket with a mop in it, swaying.
    const cx = 1.95
    rect(pen, cx, -1.05, 0.75, 0.06, MAID.cart, 0.8)
    rect(pen, cx, -0.42, 0.75, 0.06, MAID.cart, 0.8)
    if (pen.lod <= 1) {
      fillPath(pen, MAID.cart, (ctx) => {
        ctx.rect(cx, -1.05, 0.05, 0.98)
        ctx.rect(cx + 0.7, -1.05, 0.05, 0.98)
      })
      for (const wx of [cx + 0.08, cx + 0.67]) circle(pen, wx, -0.06, 0.06, MAID.bag, 0)
      round(pen, cx + 0.1, -0.99, 0.5, 0.57, 0.1, MAID.bag, 0)
      rect(pen, cx + 0.15, -1.25, 0.18, 0.2, '#5E86B8', 0.6)
    }
    const bx = 1.6
    const sw = 0.12 * ring(m, 0.5, 0.5)
    const tipx = bx + 0.1 + Math.sin(sw) * 1.4
    line(pen, bx, -0.3, tipx, -1.7, MAID.handle, 0.045)
    poly(pen, [[bx - 0.24, -0.45], [bx + 0.24, -0.45], [bx + 0.2, 0], [bx - 0.2, 0]], MAID.bucket)
    if (pen.lod <= 1) rect(pen, bx - 0.05, -0.62, 0.3, 0.17, MAID.bucketDeep, 0.7)
  },
  front(pen, _m, v) {
    // The carpet's pile, in rows.
    if (pen.lod === 0) strokeLines(pen, MAID.carpetDeep, pen.lw * 0.8, (ctx) => {
      for (const y of [0.25, 0.5]) {
        if (y > v.y1) break
        ctx.moveTo(v.x0, y)
        ctx.lineTo(v.x1, y)
      }
    })
  },
  weight(pen) {
    // A mop bucket, its wringer on top.
    const h = WEIGHT_H
    poly(pen, [[-0.15, 0], [0.15, 0], [0.18, -h * 0.66], [-0.18, -h * 0.66]], MAID.bucket)
    rect(pen, -0.05, -h, 0.16, h * 0.34, MAID.bucketDeep, 0.8)
    if (pen.lod <= 1) {
      circle(pen, -0.11, -0.03, 0.03, MAID.bag, 0)
      circle(pen, 0.11, -0.03, 0.03, MAID.bag, 0)
      line(pen, -0.13, -h * 0.45, 0.13, -h * 0.45, MAID.bucketDeep, pen.lw * 1.2)
    }
  },
}

/* ------------------------------------------------------------------ the cat-headed news anchor */

const NEWS = {
  studio: '#0E2350',
  deep: '#081638',
  panel: '#18397A',
  screen: '#2B6CC0',
  land: '#BFE0FF',
  red: '#C8283C',
  desk: '#DCE4EE',
  deskShade: '#9AA8BC',
  floor: '#13254A',
  monitor: '#151A24',
  cat: '#121212',
  mug: '#F2F2F2',
  ink: '#E6EEF8',
}

/** The world map's land, as blobs: x, y, rx, ry (in the screen's own unit box). */
const LAND: [number, number, number, number][] = [
  [-0.62, -0.25, 0.2, 0.18], [-0.52, 0.22, 0.08, 0.2], [0.0, -0.28, 0.12, 0.1], [0.06, 0.12, 0.1, 0.22], [0.42, -0.2, 0.28, 0.17], [0.62, 0.32, 0.1, 0.07],
]

const anchor: Skin = {
  key: 'anchor',
  bg: NEWS.studio,
  ink: NEWS.ink,
  floor: NEWS.floor,
  edge: NEWS.red,
  plank: NEWS.desk,
  fulcrum: NEWS.panel,
  back(pen, m, v) {
    // Lit panels down the studio's sides.
    fillPath(pen, NEWS.panel, (ctx) => {
      ctx.rect(-3.4, v.y0 - 0.1, 0.5, -v.y0 + 0.1)
      ctx.rect(2.9, v.y0 - 0.1, 0.5, -v.y0 + 0.1)
    })
    // The big screen high behind, the world on it; it brightens on the slam.
    const f = flashOf(m, 1.0, 0.2)
    const sx = 0
    const sy = -2.2
    const W = 1.3
    const H = 0.36
    rect(pen, sx - W - 0.06, sy - H - 0.06, 2 * W + 0.12, 2 * H + 0.12, NEWS.deep, 0)
    rect(pen, sx - W, sy - H, 2 * W, 2 * H, mix(NEWS.screen, NEWS.land, 0.25 * f), 0.8)
    fillPath(pen, NEWS.land, (ctx) => {
      for (const [x, y, rx, ry] of LAND) {
        ctx.moveTo(sx + (x + rx) * W, sy + y * H * 2)
        ctx.ellipse(sx + x * W, sy + y * H * 2, rx * W, ry * H * 2, 0, 0, Math.PI * 2)
      }
    })
    if (pen.lod <= 1) rect(pen, sx - W, sy + H - 0.12, 2 * W, 0.12, NEWS.red, 0)
    // The anchor's curved desk on the left, a red band along its front.
    const { ctx } = pen
    ctx.beginPath()
    ctx.moveTo(-3.3, -0.85)
    ctx.quadraticCurveTo(-2.3, -0.98, -1.45, -0.78)
    ctx.lineTo(-1.5, 0)
    ctx.lineTo(-3.3, 0)
    ctx.closePath()
    shape(pen, NEWS.desk)
    ctx.beginPath()
    ctx.moveTo(-3.3, -0.55)
    ctx.quadraticCurveTo(-2.3, -0.66, -1.48, -0.48)
    ctx.lineTo(-1.49, -0.34)
    ctx.quadraticCurveTo(-2.3, -0.52, -3.3, -0.41)
    ctx.closePath()
    shape(pen, NEWS.red, 0)
    if (pen.lod <= 1) rect(pen, -3.3, -0.12, 1.8, 0.12, NEWS.deskShade, 0)
    // A monitor on its stand on the right, the anchor's cat head dark on it.
    const mx = 2.3
    if (pen.lod <= 1) rect(pen, mx - 0.04, -1.1, 0.08, 1.1, NEWS.monitor, 0)
    rect(pen, mx - 0.55, -1.85, 1.1, 0.72, NEWS.monitor)
    rect(pen, mx - 0.48, -1.79, 0.96, 0.6, NEWS.land, 0)
    fillPath(pen, NEWS.cat, (ctx) => {
      ctx.moveTo(mx + 0.2, -1.43)
      ctx.arc(mx, -1.43, 0.2, 0, Math.PI * 2)
      ctx.moveTo(mx - 0.19, -1.5)
      ctx.lineTo(mx - 0.17, -1.74)
      ctx.lineTo(mx - 0.04, -1.6)
      ctx.closePath()
      ctx.moveTo(mx + 0.19, -1.5)
      ctx.lineTo(mx + 0.17, -1.74)
      ctx.lineTo(mx + 0.04, -1.6)
      ctx.closePath()
      ctx.rect(mx - 0.26, -1.25, 0.52, 0.06)
    })
  },
  front(pen, _m, v) {
    // The studio floor's gloss: the screen's light lying on it.
    if (pen.lod <= 1) rect(pen, -1.3, 0.16, 2.6, 0.05, rgba(NEWS.screen, 0.55), 0)
    if (pen.lod === 0 && v.y1 > 0.45) rect(pen, -1.0, 0.36, 2.0, 0.04, rgba(NEWS.screen, 0.35), 0)
  },
  weight(pen) {
    // A coffee mug with cat ears.
    const h = WEIGHT_H
    if (pen.lod <= 1) {
      pen.ctx.beginPath()
      pen.ctx.arc(0.14, -h * 0.4, 0.08, -Math.PI / 2, Math.PI / 2)
      pen.ctx.strokeStyle = NEWS.mug
      pen.ctx.lineWidth = 0.04
      pen.ctx.stroke()
    }
    poly(pen, [[-0.14, 0], [0.14, 0], [0.14, -h * 0.8], [0.1, -h], [0.05, -h * 0.8], [-0.05, -h * 0.8], [-0.1, -h], [-0.14, -h * 0.8]], NEWS.mug)
    if (pen.lod <= 1) rect(pen, -0.14, -h * 0.35, 0.28, 0.05, NEWS.red, 0)
  },
}

/* ------------------------------------------------------------------ a child's crayon drawing */

const CRAY = {
  paper: '#FBF8EE',
  sun: '#F7C51C',
  ray: '#EFA514',
  grass: '#41A33A',
  meadow: '#C6E6A8',
  sky: '#5AA0E6',
  skyWash: '#D6E8F8',
  house: '#4A6FD0',
  roof: '#8A3FB8',
  door: '#7A4A22',
  window: '#F7C51C',
  plank: '#9A6A3A',
  wax: '#2F7FD8',
  wrap: '#F4F0E4',
  ink: '#444444',
}

/** A crayon line through `pts`, every point nudged by hand; `boil` re-draws the nudges a few times a second. */
function scrawl(pen: Pen, pts: readonly Pt[], colour: string, w: number, seed: number, boil: number, closed = false): void {
  const { ctx } = pen
  const j = 0.045
  ctx.beginPath()
  for (let i = 0; i < pts.length; i++) {
    const x = pts[i][0] + (hash(i, seed, boil) - 0.5) * j
    const y = pts[i][1] + (hash(i, seed + 1, boil) - 0.5) * j
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  if (closed) ctx.closePath()
  ctx.strokeStyle = colour
  ctx.lineWidth = w
  ctx.stroke()
}

const SUN_X = -2.25
const SUN_Y = -2.0
const SUN: Pt[] = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2
  const r = 0.36 * (1 + 0.06 * Math.sin(i * 2.7))
  return [SUN_X + Math.cos(a) * r, SUN_Y + Math.sin(a) * r] as Pt
})
const HOUSE: Pt[] = [[1.65, 0], [1.66, -0.95], [2.66, -0.96], [2.65, 0]]
const ROOF: Pt[] = [[1.52, -0.92], [2.17, -1.55], [2.8, -0.93], [1.55, -0.94]]
/** The sky, scribbled across the top of the paper in a zigzag. */
const SKY_ZIG: Pt[] = Array.from({ length: 26 }, (_, i) => [-3.5 + i * 0.28, i % 2 ? -2.62 : -2.95] as Pt)
const GRASS_ZIG: Pt[] = Array.from({ length: 30 }, (_, i) => [-3.5 + i * 0.24, i % 2 ? -0.16 : 0.02] as Pt)

const crayon: Skin = {
  key: 'crayon',
  bg: CRAY.paper,
  ink: CRAY.ink,
  floor: CRAY.meadow,
  plank: CRAY.plank,
  fulcrum: CRAY.roof,
  back(pen, m, v) {
    const boil = Math.floor(m.t * 4) % 3
    // The sky, a band of blue scribble along the top.
    if (pen.lod === 2) rect(pen, v.x0 - 0.1, v.y0 - 0.1, v.x1 - v.x0 + 0.2, -2.6 - v.y0 + 0.1, CRAY.skyWash, 0)
    else {
      rect(pen, v.x0 - 0.1, v.y0 - 0.1, v.x1 - v.x0 + 0.2, -2.75 - v.y0 + 0.1, CRAY.skyWash, 0)
      scrawl(pen, SKY_ZIG, CRAY.sky, 0.04, 5, boil)
    }
    // The sun in the corner, its rays reaching further on the slam.
    const k = knock(m.since, 0.3) * Math.min(1, m.s / 1.2)
    if (pen.lod === 2) circle(pen, SUN_X, SUN_Y, 0.4, CRAY.sun, 0)
    else {
      poly(pen, SUN, CRAY.sun, 0)
      scrawl(pen, SUN, CRAY.ray, 0.04, 9, boil, true)
      const { ctx } = pen
      ctx.beginPath()
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + 0.2
        const r0 = 0.48
        const r1 = 0.72 + 0.12 * k + (hash(i, 3, boil) - 0.5) * 0.06
        ctx.moveTo(SUN_X + Math.cos(a) * r0, SUN_Y + Math.sin(a) * r0)
        ctx.lineTo(SUN_X + Math.cos(a + 0.05) * r1, SUN_Y + Math.sin(a + 0.05) * r1)
      }
      ctx.strokeStyle = CRAY.ray
      ctx.lineWidth = 0.045
      ctx.stroke()
    }
    // The house on the right: blue walls, a purple roof, a door and a window.
    if (pen.lod === 2) {
      rect(pen, 1.65, -0.95, 1.0, 0.95, CRAY.house, 0)
      poly(pen, ROOF, CRAY.roof, 0)
    } else {
      poly(pen, HOUSE, rgba(CRAY.house, 0.35), 0)
      poly(pen, ROOF, rgba(CRAY.roof, 0.45), 0)
      scrawl(pen, HOUSE, CRAY.house, 0.05, 13, boil, true)
      scrawl(pen, ROOF, CRAY.roof, 0.05, 17, boil, true)
      rect(pen, 2.25, -0.5, 0.24, 0.5, CRAY.door, 0)
      rect(pen, 1.8, -0.75, 0.28, 0.26, CRAY.window, 0)
      if (pen.lod === 0) strokeLines(pen, CRAY.house, 0.03, (ctx) => {
        ctx.moveTo(1.94, -0.75)
        ctx.lineTo(1.94, -0.49)
        ctx.moveTo(1.8, -0.62)
        ctx.lineTo(2.08, -0.62)
      })
    }
    // Grass, scribbled along the ground behind everything.
    if (pen.lod <= 1) scrawl(pen, GRASS_ZIG, CRAY.grass, 0.04, 21, boil)
  },
  front(pen, m, v) {
    // More scribble in the meadow.
    if (pen.lod > 0) return
    const boil = Math.floor(m.t * 4) % 3
    const { ctx } = pen
    ctx.beginPath()
    for (let i = 0; i < 24; i++) {
      const x = v.x0 + i * 0.3 + (hash(i, 31, boil) - 0.5) * 0.05
      const y = 0.22 + (i % 2) * 0.12
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = rgba(CRAY.grass, 0.6)
    ctx.lineWidth = 0.035
    ctx.stroke()
  },
  weight(pen) {
    // A fat crayon, standing on its end.
    const h = WEIGHT_H
    rect(pen, -0.09, -h * 0.72, 0.18, h * 0.72, CRAY.wax)
    if (pen.lod <= 1) rect(pen, -0.09, -h * 0.58, 0.18, h * 0.38, CRAY.wrap, 0.6)
    poly(pen, [[-0.09, -h * 0.72], [0.09, -h * 0.72], [0.03, -h], [-0.03, -h]], CRAY.wax)
  },
}

/* ------------------------------------------------------------------ the anime city, in the rain */

const CYBER = {
  sky: '#2B1746',
  skyHigh: '#1D0F33',
  tower: '#160B26',
  towerMid: '#25143C',
  window: '#FFD36E',
  pink: '#FF3EA5',
  cyan: '#38E6F2',
  violet: '#A060FF',
  moon: '#F4E2F2',
  rain: '#B8A8E0',
  floor: '#1C1030',
  edge: '#3A1F55',
  ink: '#E8D8FF',
}

/** The towers: x, width, top; the near ones first in `NEAR`. */
const FAR_TOWERS: [number, number, number][] = [[-3.5, 0.6, -2.1], [-2.85, 0.5, -1.7], [-0.9, 0.5, -1.15], [0.4, 0.6, -1.05], [1.5, 0.55, -1.9], [2.8, 0.7, -2.3]]
const NEAR_TOWERS: [number, number, number][] = [[-3.4, 0.75, -2.6], [-2.6, 0.95, -2.0], [1.6, 0.8, -1.55], [2.35, 1.05, -2.7]]
/** Lit windows: x, y. */
const LIT: Pt[] = []
for (let i = 0; i < 22; i++) {
  const t = NEAR_TOWERS[i % 4]
  LIT.push([t[0] + 0.1 + Math.floor(hash(i, 1, 71) * 4) * ((t[1] - 0.2) / 4), t[2] + 0.2 + Math.floor(hash(i, 2, 71) * 8) * ((-t[2] - 0.4) / 8)])
}
/** The rain: x, phase, speed. */
const RAIN: [number, number, number][] = Array.from({ length: 28 }, (_, i) => [hash(i, 1, 81), hash(i, 2, 81), 3 + 1.5 * hash(i, 3, 81)])

const cyberpunk: Skin = {
  key: 'cyberpunk',
  bg: CYBER.sky,
  ink: CYBER.ink,
  floor: CYBER.floor,
  edge: CYBER.edge,
  plank: '#3C2A5C',
  fulcrum: CYBER.towerMid,
  back(pen, m, v) {
    // The night darker overhead, the giant moon hung in it.
    rect(pen, v.x0 - 0.1, v.y0 - 0.1, v.x1 - v.x0 + 0.2, -2.0 - v.y0 + 0.1, CYBER.skyHigh, 0)
    circle(pen, 0.9, -2.3, 0.56, CYBER.moon, 0)
    if (pen.lod <= 1) circle(pen, 0.72, -2.4, 0.11, mix(CYBER.moon, CYBER.violet, 0.15), 0)
    // The towers, far and near.
    if (pen.lod <= 1) fillPath(pen, CYBER.towerMid, (ctx) => {
      for (const [x, w, t] of FAR_TOWERS) ctx.rect(x, t, w, -t)
    })
    fillPath(pen, CYBER.tower, (ctx) => {
      for (const [x, w, t] of NEAR_TOWERS) ctx.rect(x, t, w, -t)
    })
    if (pen.lod === 0) fillPath(pen, rgba(CYBER.window, 0.8), (ctx) => {
      for (const [x, y] of LIT) ctx.rect(x, y, 0.08, 0.05)
    })
    // The neon: a tall pink sign on the left, cyan bars on the right; it flickers up on the slam.
    const f = flashOf(m, 1.0, 0.14)
    const pink = mix(CYBER.pink, '#FFFFFF', 0.35 * f)
    const cyan = mix(CYBER.cyan, '#FFFFFF', 0.35 * f)
    rect(pen, -1.75, -1.85, 0.16, 1.05, pink, 0)
    rect(pen, 1.62, -1.4, 0.6, 0.12, cyan, 0)
    rect(pen, 2.45, -2.3, 0.75, 0.14, cyan, 0)
    if (pen.lod <= 1) {
      rect(pen, -3.25, -1.55, 0.45, 0.1, CYBER.violet, 0)
      rect(pen, 1.7, -1.15, 0.38, 0.08, pink, 0)
      rect(pen, 2.5, -1.9, 0.12, 0.7, pink, 0)
    }
  },
  front(pen, m, v) {
    // The neon lying on the wet street.
    if (pen.lod <= 1) {
      rect(pen, -1.75, 0.1, 0.16, 0.45, rgba(CYBER.pink, 0.3), 0)
      rect(pen, 1.62, 0.1, 0.6, 0.06, rgba(CYBER.cyan, 0.3), 0)
    }
    // Rain, slanting down over everything.
    if (pen.lod > 1) return
    const span = v.y1 - v.y0 + 0.6
    const n = pen.lod === 0 ? RAIN.length : 14
    strokeLines(pen, rgba(CYBER.rain, 0.4), pen.lw * 0.9, (ctx) => {
      for (let i = 0; i < n; i++) {
        const [hx, ph, sp] = RAIN[i]
        const x = v.x0 + hx * (v.x1 - v.x0 + 0.6)
        const y = v.y0 - 0.3 + ((ph * span + m.t * sp) % span)
        ctx.moveTo(x, y)
        ctx.lineTo(x - 0.06, y + 0.3)
      }
    })
  },
  weight(pen) {
    // A vending machine, glowing.
    const h = WEIGHT_H
    rect(pen, -0.14, -h, 0.28, h, CYBER.towerMid)
    rect(pen, -0.1, -h + 0.04, 0.14, h * 0.62, CYBER.cyan, 0)
    if (pen.lod <= 1) {
      rect(pen, 0.06, -h + 0.06, 0.04, 0.1, CYBER.pink, 0)
      rect(pen, -0.1, -0.08, 0.14, 0.04, CYBER.tower, 0)
    }
  },
}

/* ------------------------------------------------------------------ the curb, outside the smashed window */

const CURB = {
  night: '#141B2C',
  facade: '#2E2A36',
  frame: '#5C6678',
  awning: '#3D5878',
  glass: '#1E2E44',
  lit: '#6E8EAE',
  shard: '#B4CCE4',
  sodium: '#FFB547',
  post: '#2A303C',
  walk: '#4C5465',
  curb: '#7A8296',
  road: '#1C2130',
  can: '#8A94A4',
  canDeep: '#5E6878',
  bat: '#B88A55',
  ink: '#0C1018',
}

/** The hole in the window: a jagged star of a polygon. */
const HOLE: Pt[] = [[-2.3, -1.5], [-2.12, -1.22], [-1.84, -1.32], [-1.98, -1.04], [-1.7, -0.82], [-2.02, -0.86], [-2.15, -0.56], [-2.28, -0.84], [-2.62, -0.7], [-2.46, -0.98], [-2.78, -1.16], [-2.42, -1.18]]

const curb: Skin = {
  key: 'curb',
  bg: CURB.night,
  ink: CURB.ink,
  floor: CURB.walk,
  edge: CURB.curb,
  plank: '#6A5A48',
  fulcrum: CURB.post,
  back(pen, m, v) {
    // The laundromat's front on the left: its awning, the big window lit within, and the hole smashed in it.
    rect(pen, v.x0 - 0.1, -2.5, -1.35 - v.x0 + 0.1, 2.5, CURB.facade, 0)
    rect(pen, -3.2, -1.85, 1.7, 1.55, CURB.frame, 0.8)
    rect(pen, -3.12, -1.77, 1.54, 1.39, CURB.lit, 0)
    poly(pen, HOLE, CURB.glass, 0.7)
    if (pen.lod === 0) strokeLines(pen, CURB.shard, pen.lw * 0.8, (ctx) => {
      for (let i = 0; i < HOLE.length; i += 2) {
        const [x, y] = HOLE[i]
        ctx.moveTo(x, y)
        ctx.lineTo(x + (x + 2.2) * 0.7, y + (y + 1.03) * 0.7)
      }
    })
    if (pen.lod <= 1) poly(pen, [[-3.3, -2.25], [-1.4, -2.25], [-1.25, -1.95], [-3.3, -1.95]], CURB.awning, 0.8)
    // The streetlamp on the right, its sodium light falling on the pavement; it buzzes on the loud landings.
    const lx = 2.45
    const hx = 1.95
    rect(pen, lx - 0.04, -2.3, 0.08, 2.3, CURB.post, 0.6)
    if (pen.lod <= 1) strokeLines(pen, CURB.post, 0.05, (ctx) => {
      ctx.moveTo(lx, -2.28)
      ctx.quadraticCurveTo(lx, -2.48, hx + 0.1, -2.42)
    })
    const f = flashOf(m, 1.0, 0.12)
    beam(pen, hx, -2.35, hx, 0.05, 0.2, 1.4, CURB.sodium, 0.22 - 0.08 * f)
    glow(pen, hx, -2.3, 0.6, CURB.sodium, 0.55 - 0.15 * f)
    poly(pen, [[hx - 0.18, -2.3], [hx + 0.18, -2.3], [hx + 0.1, -2.45], [hx - 0.1, -2.45]], CURB.post, 0.6)
  },
  front(pen, _m, v) {
    // The kerb and the road beyond it.
    rect(pen, v.x0 - 0.1, 0.5, v.x1 - v.x0 + 0.2, Math.max(0.05, v.y1 - 0.4), CURB.road, 0)
    if (pen.lod <= 1) rect(pen, v.x0 - 0.1, 0.44, v.x1 - v.x0 + 0.2, 0.06, CURB.curb, 0)
    // Glass on the pavement under the window, and a bat lying on it under the lamp.
    if (pen.lod <= 1) fillPath(pen, CURB.shard, (ctx) => {
      for (let i = 0; i < 6; i++) {
        const x = -2.7 + i * 0.22 + hash(i, 91) * 0.1
        const y = 0.14 + hash(i, 92) * 0.2
        ctx.moveTo(x, y)
        ctx.lineTo(x + 0.06, y - 0.02)
        ctx.lineTo(x + 0.02, y + 0.04)
        ctx.closePath()
      }
    })
    if (pen.lod <= 1) {
      const { ctx } = pen
      ctx.beginPath()
      ctx.moveTo(1.7, 0.25)
      ctx.lineTo(2.35, 0.17)
      ctx.lineTo(2.36, 0.24)
      ctx.lineTo(1.7, 0.28)
      ctx.closePath()
      shape(pen, CURB.bat, 0.6)
      circle(pen, 1.68, 0.265, 0.025, CURB.bat, 0.6)
    }
  },
  weight(pen) {
    // A dented metal bin, its lid on.
    const h = WEIGHT_H
    poly(pen, [[-0.13, 0], [0.13, 0], [0.15, -h * 0.85], [-0.15, -h * 0.85]], CURB.can)
    if (pen.lod <= 1) strokeLines(pen, CURB.canDeep, pen.lw * 1.1, (ctx) => {
      for (const x of [-0.07, 0, 0.07]) {
        ctx.moveTo(x, -0.03)
        ctx.lineTo(x * 1.12, -h * 0.82)
      }
    })
    ellipse(pen, 0, -h * 0.88, 0.17, 0.04, CURB.canDeep, 0.8)
    rect(pen, -0.04, -h, 0.08, 0.06, CURB.canDeep, 0.6)
  },
}

/* ------------------------------------------------------------------ the pinky master, on the mountain */

const PEAK = {
  dawn: '#F2C4A8',
  high: '#E3AFB4',
  sun: '#FFE9C8',
  far: '#B9A4C6',
  mid: '#9582AE',
  near: '#6C5C8A',
  mist: '#F6DFD2',
  terrace: '#A2917D',
  terraceDeep: '#837260',
  post: '#8A5A34',
  postDeep: '#5E3A20',
  iron: '#34343C',
  ironLight: '#5A5A66',
  rope: '#C9A66B',
  ink: '#2E2236',
}

/** A stone pillar of a peak, rounded on top: centre x, half-width, top. */
function pillar(ctx: CanvasRenderingContext2D, x: number, w: number, top: number): void {
  ctx.moveTo(x - w, 0.05)
  ctx.lineTo(x - w * 0.9, top + w)
  ctx.quadraticCurveTo(x - w * 0.6, top, x, top)
  ctx.quadraticCurveTo(x + w * 0.6, top, x + w * 0.9, top + w)
  ctx.lineTo(x + w, 0.05)
  ctx.closePath()
}

const FAR_PILLARS: [number, number, number][] = [[-2.9, 0.3, -2.3], [-1.55, 0.22, -1.5], [-0.4, 0.3, -1.1], [0.75, 0.25, -1.25], [1.7, 0.3, -2.05], [3.1, 0.35, -2.5]]
const NEAR_PILLARS: [number, number, number][] = [[-2.45, 0.42, -2.65], [2.75, 0.45, -2.85]]
/** The weights hanging on rings from the rack: x, rope length. */
const HANGS: [number, number][] = [[1.78, 0.42], [2.05, 0.55], [2.32, 0.38]]

const pinky: Skin = {
  key: 'pinky',
  bg: PEAK.dawn,
  ink: PEAK.ink,
  floor: PEAK.terrace,
  edge: PEAK.terraceDeep,
  plank: PEAK.post,
  fulcrum: PEAK.postDeep,
  back(pen, m, v) {
    // The dawn: rose overhead, a pale sun low between the peaks.
    rect(pen, v.x0 - 0.1, v.y0 - 0.1, v.x1 - v.x0 + 0.2, -2.3 - v.y0 + 0.1, PEAK.high, 0)
    circle(pen, -0.6, -2.3, 0.3, PEAK.sun, 0)
    // Stone pillars standing out of the mist, far and near.
    fillPath(pen, PEAK.far, (ctx) => {
      for (const [x, w, t] of FAR_PILLARS) pillar(ctx, x, w, t)
    })
    if (pen.lod <= 1) rect(pen, v.x0 - 0.1, -0.7, v.x1 - v.x0 + 0.2, 0.35, rgba(PEAK.mist, 0.7), 0)
    fillPath(pen, PEAK.near, (ctx) => {
      for (const [x, w, t] of NEAR_PILLARS) pillar(ctx, x, w, t)
    })
    if (pen.lod <= 1) {
      rect(pen, v.x0 - 0.1, -0.32, v.x1 - v.x0 + 0.2, 0.37, rgba(PEAK.mist, 0.75), 0)
      // A pine clinging to the near pillar's top.
      ellipse(pen, -2.3, -2.68, 0.26, 0.06, PEAK.ink, 0)
      ellipse(pen, -2.2, -2.56, 0.18, 0.05, PEAK.ink, 0)
    }
    // The wooden training post on the left, its three arms.
    const px = -1.95
    rect(pen, px - 0.1, -1.55, 0.2, 1.55, PEAK.post)
    if (pen.lod <= 1) {
      fillPath(pen, PEAK.postDeep, (ctx) => {
        ctx.rect(px - 0.42, -1.22, 0.34, 0.06)
        ctx.rect(px + 0.08, -1.08, 0.3, 0.06)
        ctx.rect(px - 0.38, -0.62, 0.3, 0.06)
      })
      line(pen, px - 0.1, -1.38, px + 0.1, -1.38, PEAK.rope, 0.04)
    }
    // The finger rack on the right: a frame, and small iron weights hanging on rings, swinging on the slam.
    const x0 = 1.6
    const x1 = 2.5
    const bar = -1.32
    fillPath(pen, PEAK.postDeep, (ctx) => {
      ctx.rect(x0, bar - 0.04, 0.07, -bar + 0.04)
      ctx.rect(x1, bar - 0.04, 0.07, -bar + 0.04)
      ctx.rect(x0 - 0.06, bar - 0.08, x1 - x0 + 0.19, 0.08)
    })
    const sw = 0.25 * ring(m, 0.45, 0.6)
    for (let i = 0; i < HANGS.length; i++) {
      const [hx, len] = HANGS[i]
      const a = sw * (i % 2 ? -1 : 1) + 0.04 * Math.sin(m.t * 1.3 + i)
      const ex = hx + Math.sin(a) * len
      const ey = bar + Math.cos(a) * len
      if (pen.lod <= 1) {
        line(pen, hx, bar, ex, ey, PEAK.rope, 0.02)
        circle(pen, ex, ey + 0.03, 0.04, null, 0)
        pen.ctx.strokeStyle = PEAK.iron
        pen.ctx.lineWidth = 0.02
        pen.ctx.stroke()
      }
      circle(pen, ex, ey + 0.14, 0.085, PEAK.iron, 0.6)
    }
  },
  front(pen, _m, v) {
    // The terrace's flagstones.
    if (pen.lod > 0) return
    strokeLines(pen, PEAK.terraceDeep, pen.lw * 0.8, (ctx) => {
      for (let r = 0; r < 2; r++) {
        const y = 0.3 + r * 0.3
        if (y > v.y1) break
        ctx.moveTo(v.x0, y)
        ctx.lineTo(v.x1, y)
      }
      for (let x = Math.floor(v.x0 / 0.8) * 0.8; x < v.x1; x += 0.8) {
        ctx.moveTo(x, 0.07)
        ctx.lineTo(x, 0.3)
        ctx.moveTo(x + 0.4, 0.3)
        ctx.lineTo(x + 0.4, 0.6)
      }
    })
  },
  weight(pen) {
    // A small iron kettlebell, hung from a ring.
    const h = WEIGHT_H
    if (pen.lod <= 1) {
      pen.ctx.beginPath()
      pen.ctx.arc(0, -h * 0.78, 0.07, 0, Math.PI * 2)
      pen.ctx.strokeStyle = PEAK.ironLight
      pen.ctx.lineWidth = 0.035
      pen.ctx.stroke()
    } else rect(pen, -0.06, -h, 0.12, 0.1, PEAK.iron, 0)
    circle(pen, 0, -h * 0.32, h * 0.32, PEAK.iron)
    rect(pen, -0.12, -0.02, 0.24, 0.02, PEAK.iron, 0)
    if (pen.lod === 0) circle(pen, -0.04, -h * 0.4, 0.025, PEAK.ironLight, 0)
  },
}

/* ------------------------------------------------------------------ the table */

export const FLASH_SKINS = { battle, sepia, conspiracy, saltflat, boulder, spotlight, maid, anchor, crayon, cyberpunk, curb, pinky } as const satisfies Record<string, Skin>
