import { at, beam, circle, ellipse, glow, hash, line, poly, rect, rgba, round, type Pen, type Pt } from './skins-pen'
import { flashOf, ring, WEIGHT_H, type Moment, type Skin, type View } from './skins-kit'

/**
 * The lives Evelyn might have had instead, each the trade she might have kept and the shop she might have opened in
 * the morning: she could have been anyone. A baker at dawn by her oven, a florist under a striped awning, a barber
 * with her pole turning, a tailor with her dress form, a beekeeper among her hives, a potter at her wheel, a painter
 * under a skylight, a photographer in her darkroom's red light, a clockmaker among a wall of ticking clocks, a toy
 * shop's keeper, a ramen cook at her night stall, and an ice-cream parlour's.
 *
 * Each is one big silhouette at the side or up high, a wall and a floor of its own colours, and a weight from the
 * trade; the same machine works in front of every one. Floor patterns go in `front()`, under the ground's top edge.
 */

/** Rects (or any shapes) of one colour in one path, filled once. */
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

/** Fill the current path, and ink it from `lod` 1 down. */
function finish(pen: Pen, fill: string | null, ink = 1): void {
  const { ctx } = pen
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  if (ink > 0 && pen.lod <= 1) {
    ctx.strokeStyle = pen.ink
    ctx.lineWidth = pen.lw * ink
    ctx.stroke()
  }
}

/** A band right across the view, from y0 down to y1. */
function band(pen: Pen, v: View, y0: number, y1: number, fill: string): void {
  rect(pen, v.x0 - 0.1, y0, v.x1 - v.x0 + 0.2, y1 - y0, fill, 0)
}

/** Seconds since the show began at the plank's last slam: a hand that only moves on the beat. */
const lastSlam = (m: Moment): number => (Number.isFinite(m.since) ? m.t - m.since : 0)

/* ------------------------------------------------------------------ a bakery, at dawn */

const BAKE = {
  wall: '#F0C595',
  dawn: '#F9DDB0',
  dawnLow: '#F4A98A',
  sun: '#FFF1C8',
  frame: '#7A4E30',
  brick: '#9E4E34',
  brickDeep: '#6E3222',
  mouth: '#2A140C',
  fire: '#FFB347',
  ember: '#F07A2A',
  stone: '#C9B79A',
  wood: '#8A5A36',
  woodDeep: '#5A3620',
  loaf: '#C8873E',
  loafDeep: '#9A5E26',
  crust: '#E3AE62',
  basket: '#B88A4A',
  tile: '#8E5A3E',
  tileDeep: '#6E4230',
  bag: '#DCC6A2',
  ink: '#3A2216',
}

/** Loaves on the rack's shelves: x, the shelf's y, half-width, height. */
const LOAVES: readonly [number, number, number, number][] = [
  [1.85, -0.53, 0.17, 0.17], [2.25, -0.53, 0.15, 0.2], [2.64, -0.53, 0.18, 0.16],
  [1.9, -1.08, 0.22, 0.14], [2.4, -1.08, 0.18, 0.18], [2.75, -1.08, 0.12, 0.13],
]

const bakery: Skin = {
  key: 'bakery',
  bg: BAKE.wall,
  ink: BAKE.ink,
  floor: BAKE.tile,
  edge: BAKE.tileDeep,
  plank: BAKE.wood,
  fulcrum: BAKE.brickDeep,
  back(pen, m, v) {
    const { ctx } = pen
    // The dawn through a high window, the sun just up.
    if (v.y0 < -2.3) {
      rect(pen, -0.7, -2.75, 1.4, 0.7, BAKE.dawn, 0)
      rect(pen, -0.7, -2.35, 1.4, 0.3, BAKE.dawnLow, 0)
      if (pen.lod <= 1) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(-0.7, -2.75, 1.4, 0.7)
        ctx.clip()
        circle(pen, 0.2, -2.12, 0.22, BAKE.sun, 0)
        ctx.restore()
        strokeLines(pen, BAKE.frame, pen.lw * 2, (c) => {
          c.rect(-0.7, -2.75, 1.4, 0.7)
          c.moveTo(0, -2.75)
          c.lineTo(0, -2.05)
          c.moveTo(-0.7, -2.4)
          c.lineTo(0.7, -2.4)
        })
      }
    }
    // The oven on the left: a brick dome with its chimney, and the fire in its mouth.
    const ox = -2.2
    rect(pen, ox - 0.12, -2.4, 0.24, 0.8, BAKE.brickDeep, 0.8)
    ctx.beginPath()
    ctx.moveTo(ox - 0.72, 0)
    ctx.lineTo(ox - 0.72, -1.05)
    ctx.ellipse(ox, -1.05, 0.72, 0.6, 0, Math.PI, Math.PI * 2)
    ctx.lineTo(ox + 0.72, 0)
    ctx.closePath()
    finish(pen, BAKE.brick)
    if (pen.lod === 0) strokeLines(pen, BAKE.brickDeep, pen.lw * 0.7, (c) => {
      for (let r = 1; r <= 3; r++) {
        const y = -0.3 * r
        c.moveTo(ox - 0.72, y)
        c.lineTo(ox + 0.72, y)
        for (let x = ox - 0.72 + (r % 2) * 0.18 + 0.18; x < ox + 0.72; x += 0.36) {
          c.moveTo(x, y)
          c.lineTo(x, y + 0.3)
        }
      }
    })
    const f = flashOf(m, 0.9, 0.3)
    ctx.beginPath()
    ctx.moveTo(ox - 0.3, -0.18)
    ctx.lineTo(ox - 0.3, -0.55)
    ctx.arc(ox, -0.55, 0.3, Math.PI, Math.PI * 2)
    ctx.lineTo(ox + 0.3, -0.18)
    ctx.closePath()
    finish(pen, BAKE.mouth, 0.8)
    glow(pen, ox, -0.4, 0.75 + 0.2 * f, BAKE.fire, 0.6 + 0.3 * f)
    ellipse(pen, ox, -0.24, 0.22, 0.06, BAKE.ember, 0)
    rect(pen, ox - 0.42, -0.2, 0.84, 0.08, BAKE.stone, 0.7)
    // The peel, leaning on the oven's far side.
    if (pen.lod === 0) {
      line(pen, ox - 0.8, -1.5, ox - 1.05, -0.2, BAKE.woodDeep, 0.04)
      ellipse(pen, ox - 1.07, -0.12, 0.1, 0.13, BAKE.wood, 0.7)
    }
    // The rack on the right: its shelves of loaves, and a basket of baguettes standing on top.
    fillRects(pen, BAKE.woodDeep, (c) => {
      c.rect(1.6, -2.0, 0.06, 2.0)
      c.rect(2.9, -2.0, 0.06, 2.0)
      for (const y of [-0.5, -1.05, -1.6]) c.rect(1.58, y, 1.4, 0.06)
    })
    fillRects(pen, BAKE.loaf, (c) => {
      for (const [x, y, w, h] of LOAVES) {
        c.moveTo(x + w, y)
        c.ellipse(x, y, w, h, 0, 0, Math.PI, true)
        c.closePath()
      }
    })
    if (pen.lod <= 1) {
      strokeLines(pen, BAKE.ink, pen.lw * 0.8, (c) => {
        for (const [x, y, w, h] of LOAVES) {
          c.moveTo(x + w, y)
          c.ellipse(x, y, w, h, 0, 0, Math.PI, true)
        }
      })
      if (pen.lod === 0) strokeLines(pen, BAKE.crust, pen.lw * 1.2, (c) => {
        for (const [x, y, w, h] of LOAVES) {
          c.moveTo(x - w * 0.4, y - h * 0.55)
          c.lineTo(x - w * 0.1, y - h * 0.85)
          c.moveTo(x + w * 0.05, y - h * 0.6)
          c.lineTo(x + w * 0.35, y - h * 0.8)
        }
      })
    }
    // Baguettes in the basket on the top shelf.
    fillRects(pen, BAKE.loafDeep, (c) => {
      for (let i = 0; i < 4; i++) {
        const x = 2.0 + i * 0.13
        c.moveTo(x - 0.035, -1.75)
        c.lineTo(x - 0.035 + 0.04 * (i - 1.5), -2.25 + 0.04 * (i % 2))
        c.lineTo(x + 0.035 + 0.04 * (i - 1.5), -2.25 + 0.04 * (i % 2))
        c.lineTo(x + 0.035, -1.75)
      }
    })
    rect(pen, 1.9, -1.86, 0.6, 0.26, BAKE.basket, 0.8)
  },
  front(pen, _m, v) {
    // Quarry tiles.
    if (pen.lod > 1) return
    const s = pen.lod === 0 ? 0.3 : 0.6
    strokeLines(pen, BAKE.tileDeep, pen.lw, (c) => {
      for (let y = s; y < v.y1; y += s) {
        c.moveTo(v.x0, y)
        c.lineTo(v.x1, y)
      }
      for (let x = Math.floor(v.x0 / (2 * s)) * 2 * s; x < v.x1; x += 2 * s) {
        c.moveTo(x, 0.07)
        c.lineTo(x, v.y1)
      }
    })
  },
  weight(pen) {
    // A baguette standing in a paper bag.
    at(pen, 0.03, -0.14, 0.22, 1, () => {
      round(pen, -0.045, -0.23, 0.09, 0.36, 0.045, BAKE.crust, 0.8)
      if (pen.lod === 0) strokeLines(pen, BAKE.loafDeep, pen.lw, (c) => {
        for (const y of [-0.18, -0.11]) {
          c.moveTo(-0.03, y + 0.02)
          c.lineTo(0.03, y - 0.02)
        }
      })
    })
    poly(pen, [[-0.13, 0], [0.13, 0], [0.14, -0.2], [-0.14, -0.2]], BAKE.bag)
    if (pen.lod === 0) line(pen, -0.14, -0.17, 0.14, -0.17, BAKE.loafDeep, pen.lw * 0.8)
  },
}

/* ------------------------------------------------------------------ a flower shop */

const FLOR = {
  cream: '#F3EDDB',
  green: '#3E6B47',
  greenDeep: '#2C4A33',
  sage: '#B7C8A2',
  zinc: '#A3ACAE',
  zincDeep: '#737D80',
  pink: '#E98AA6',
  yellow: '#F2CB45',
  white: '#FBF8F0',
  lilac: '#A98BC8',
  leaf: '#5C8F4A',
  wood: '#9A7652',
  tile: '#5E6E62',
  tileDeep: '#4A584E',
  pot: '#B86A44',
  can: '#5E8C6A',
  ink: '#24301F',
}

/** A bunch's blooms round its bucket's mouth: dx, dy, radius. */
const BUNCH: readonly [number, number, number][] = [[-0.12, -0.08, 0.08], [0.0, -0.16, 0.09], [0.12, -0.07, 0.08], [-0.06, -0.24, 0.07], [0.08, -0.25, 0.07], [0.0, -0.05, 0.07]]

/** A zinc bucket of flowers standing at x, its foot at y. */
function bucket(pen: Pen, x: number, y: number, bloom: string): void {
  const top = y - 0.3
  if (pen.lod <= 1) fillRects(pen, FLOR.leaf, (c) => {
    c.ellipse(x - 0.14, top - 0.08, 0.11, 0.05, -0.6, 0, Math.PI * 2)
    c.ellipse(x + 0.15, top - 0.1, 0.11, 0.05, 0.6, 0, Math.PI * 2)
  })
  fillRects(pen, bloom, (c) => {
    for (const [dx, dy, r] of BUNCH) {
      c.moveTo(x + dx + r, top + dy)
      c.arc(x + dx, top + dy, r, 0, Math.PI * 2)
    }
  })
  if (pen.lod === 0) strokeLines(pen, FLOR.ink, pen.lw * 0.6, (c) => {
    for (const [dx, dy, r] of BUNCH) {
      c.moveTo(x + dx + r, top + dy)
      c.arc(x + dx, top + dy, r, 0, Math.PI * 2)
    }
  })
  poly(pen, [[x - 0.14, y], [x + 0.14, y], [x + 0.18, top], [x - 0.18, top]], FLOR.zinc)
  if (pen.lod === 0) line(pen, x - 0.16, top + 0.08, x + 0.16, top + 0.08, FLOR.zincDeep, pen.lw)
}

const florist: Skin = {
  key: 'florist',
  bg: FLOR.cream,
  ink: FLOR.ink,
  floor: FLOR.tile,
  edge: FLOR.tileDeep,
  plank: FLOR.wood,
  fulcrum: FLOR.greenDeep,
  back(pen, m, v) {
    // The shopfront's fascia and its striped awning, scalloped along the bottom.
    const a0 = -2.42
    const a1 = -2.02
    band(pen, v, v.y0 - 0.1, a0, FLOR.greenDeep)
    const s = 0.22
    const x0 = Math.floor(v.x0 / (2 * s)) * 2 * s
    fillRects(pen, FLOR.cream, (c) => {
      c.rect(v.x0 - 0.1, a0, v.x1 - v.x0 + 0.2, a1 - a0)
      if (pen.lod <= 2) for (let x = x0 + s; x < v.x1; x += 2 * s) {
        c.moveTo(x + s, a1)
        c.arc(x + s / 2, a1, s / 2, 0, Math.PI)
      }
    })
    fillRects(pen, FLOR.green, (c) => {
      for (let x = x0; x < v.x1; x += 2 * s) {
        c.rect(x, a0, s, a1 - a0)
        c.moveTo(x + s, a1)
        c.arc(x + s / 2, a1, s / 2, 0, Math.PI)
      }
    })
    if (pen.lod <= 1) line(pen, v.x0, a0, v.x1, a0, FLOR.ink, pen.lw)
    // A sage dado, and its rail.
    band(pen, v, -0.75, 0, FLOR.sage)
    if (pen.lod <= 1) band(pen, v, -0.78, -0.73, FLOR.greenDeep)
    // A stepped stand on the left with its buckets.
    rect(pen, -2.95, -0.95, 0.8, 0.95, FLOR.wood, 0.8)
    rect(pen, -2.95, -0.45, 1.45, 0.45, FLOR.wood, 0.8)
    bucket(pen, -2.55, -0.95, FLOR.pink)
    bucket(pen, -1.85, -0.45, FLOR.yellow)
    if (pen.lod <= 1) bucket(pen, -2.95, -0.95, FLOR.lilac)
    // On the right a bucket of tall white lilies, and over it a plant hanging from the awning, swaying.
    const sx = 2.35
    if (pen.lod <= 1) strokeLines(pen, FLOR.leaf, 0.025, (c) => {
      for (const dx of [-0.12, -0.04, 0.05, 0.13]) {
        c.moveTo(sx + dx * 0.4, -0.35)
        c.lineTo(sx + dx * 1.8, -1.0 + Math.abs(dx))
      }
    })
    fillRects(pen, FLOR.white, (c) => {
      for (const dx of [-0.12, -0.04, 0.05, 0.13]) {
        const bx = sx + dx * 1.8
        const by = -1.0 + Math.abs(dx)
        c.moveTo(bx - 0.08, by - 0.05)
        c.lineTo(bx, by + 0.06)
        c.lineTo(bx + 0.08, by - 0.05)
        c.lineTo(bx, by - 0.02)
        c.closePath()
      }
    })
    bucket(pen, sx, 0, FLOR.white)
    const sway = 0.04 * Math.sin(m.t * 0.8) + 0.08 * ring(m, 0.9, 0.6)
    at(pen, 2.3, a1, sway, 1, () => {
      if (pen.lod <= 1) strokeLines(pen, FLOR.ink, pen.lw * 0.8, (c) => {
        c.moveTo(0, 0)
        c.lineTo(-0.2, 0.55)
        c.moveTo(0, 0)
        c.lineTo(0.2, 0.55)
      })
      if (pen.lod <= 1) strokeLines(pen, FLOR.leaf, 0.035, (c) => {
        c.moveTo(-0.18, 0.62)
        c.quadraticCurveTo(-0.32, 0.8, -0.26, 1.0)
        c.moveTo(0.16, 0.62)
        c.quadraticCurveTo(0.3, 0.75, 0.28, 0.9)
        c.moveTo(0, 0.7)
        c.quadraticCurveTo(0.05, 0.85, -0.02, 0.98)
      })
      ellipse(pen, 0, 0.52, 0.28, 0.1, FLOR.leaf, 0)
      pen.ctx.beginPath()
      pen.ctx.moveTo(-0.22, 0.55)
      pen.ctx.lineTo(0.22, 0.55)
      pen.ctx.lineTo(0.15, 0.72)
      pen.ctx.lineTo(-0.15, 0.72)
      pen.ctx.closePath()
      finish(pen, FLOR.pot, 0.8)
    })
  },
  front(pen, _m, v) {
    // Big square tiles.
    if (pen.lod > 1) return
    strokeLines(pen, FLOR.tileDeep, pen.lw, (c) => {
      for (let y = 0.4; y < v.y1; y += 0.4) {
        c.moveTo(v.x0, y)
        c.lineTo(v.x1, y)
      }
      for (let x = Math.floor(v.x0 / 0.4) * 0.4; x < v.x1; x += 0.4) {
        c.moveTo(x, 0.07)
        c.lineTo(x, v.y1)
      }
    })
  },
  weight(pen) {
    // A watering can: its body, the long spout and its rose, and the handle over the top.
    const h = WEIGHT_H
    if (pen.lod <= 1) {
      pen.ctx.beginPath()
      pen.ctx.arc(-0.03, -h * 0.62, 0.1, Math.PI, Math.PI * 2)
      pen.ctx.strokeStyle = FLOR.greenDeep
      pen.ctx.lineWidth = 0.03
      pen.ctx.stroke()
    }
    poly(pen, [[0.07, -0.06], [0.1, -0.14], [0.21, -h * 0.85], [0.17, -h * 0.88]], FLOR.can, 0.8)
    ellipse(pen, 0.2, -h * 0.88, 0.04, 0.025, FLOR.can, 0.7, -0.6)
    round(pen, -0.15, -h * 0.62, 0.24, h * 0.62, 0.04, FLOR.can)
    if (pen.lod === 0) line(pen, -0.15, -h * 0.5, 0.09, -h * 0.5, FLOR.greenDeep, pen.lw)
  },
}

/* ------------------------------------------------------------------ a barber's */

const BARB = {
  wall: '#BFD5DC',
  wainscot: '#F2EEE6',
  red: '#C8323A',
  blue: '#2F5C9A',
  white: '#F7F5F0',
  chrome: '#C9CED2',
  chromeDeep: '#8B9399',
  leather: '#2E2B2C',
  mirror: '#DCECEF',
  mirrorDeep: '#B2D0D8',
  frame: '#B38A4A',
  tile: '#EEE9DF',
  grout: '#A9A49C',
  bottles: ['#4E8FB0', '#C99A3E', '#7A5A9A'],
  wood: '#8A6A4A',
  ink: '#1E2328',
}

const barber: Skin = {
  key: 'barber',
  bg: BARB.wall,
  ink: BARB.ink,
  floor: BARB.tile,
  edge: BARB.grout,
  plank: BARB.chrome,
  fulcrum: BARB.leather,
  back(pen, m, v) {
    const { ctx } = pen
    // White wainscot to the waist.
    band(pen, v, -0.8, 0, BARB.wainscot)
    if (pen.lod <= 1) band(pen, v, -0.84, -0.78, BARB.chromeDeep)
    // The mirror on the left, framed in gold, and its shelf of tonics.
    round(pen, -3.0, -2.2, 1.35, 1.15, 0.12, BARB.frame)
    rect(pen, -2.9, -2.1, 1.15, 0.95, BARB.mirror, 0.7)
    if (pen.lod <= 1) fillRects(pen, BARB.mirrorDeep, (c) => {
      c.moveTo(-2.75, -1.15)
      c.lineTo(-2.25, -2.1)
      c.lineTo(-2.05, -2.1)
      c.lineTo(-2.55, -1.15)
      c.moveTo(-2.4, -1.15)
      c.lineTo(-1.9, -2.1)
      c.lineTo(-1.82, -2.1)
      c.lineTo(-2.32, -1.15)
    })
    rect(pen, -3.05, -1.06, 1.45, 0.06, BARB.chrome, 0.7)
    if (pen.lod === 0) BARB.bottles.forEach((b, i) => {
      const bx = -2.8 + i * 0.16
      rect(pen, bx, -1.26, 0.09, 0.2, b, 0.6)
      rect(pen, bx + 0.025, -1.32, 0.04, 0.06, b, 0.6)
    })
    // The chair, side-on: its pedestal and foot, the seat, arm, back and headrest.
    const cx = -2.25
    ellipse(pen, cx, -0.03, 0.3, 0.05, BARB.chromeDeep, 0.7)
    rect(pen, cx - 0.06, -0.38, 0.12, 0.36, BARB.chrome, 0.7)
    round(pen, cx - 0.32, -0.55, 0.62, 0.18, 0.06, BARB.leather)
    round(pen, cx + 0.2, -1.2, 0.17, 0.72, 0.07, BARB.leather)
    if (pen.lod <= 1) {
      round(pen, cx + 0.22, -1.38, 0.12, 0.14, 0.05, BARB.leather, 0.8)
      rect(pen, cx - 0.3, -0.75, 0.42, 0.06, BARB.chrome, 0.7)
      line(pen, cx - 0.32, -0.42, cx - 0.5, -0.12, BARB.chromeDeep, 0.03)
      line(pen, cx - 0.58, -0.12, cx - 0.38, -0.12, BARB.chromeDeep, 0.03)
    }
    // The pole on the right, its stripes turning upwards for ever.
    const px = 2.12
    const pw = 0.36
    const y0 = -2.0
    const y1 = -0.95
    if (pen.lod <= 1) strokeLines(pen, BARB.chromeDeep, 0.035, (c) => {
      c.moveTo(px + pw, y0 + 0.1)
      c.lineTo(px + pw + 0.2, y0 + 0.1)
      c.moveTo(px + pw, y1 - 0.1)
      c.lineTo(px + pw + 0.2, y1 - 0.1)
    })
    rect(pen, px, y0, pw, y1 - y0, BARB.white, 0)
    ctx.save()
    ctx.beginPath()
    ctx.rect(px, y0, pw, y1 - y0)
    ctx.clip()
    const per = 0.34
    const off = per - ((m.t * 0.3) % per)
    for (const [colour, k] of [[BARB.red, 0], [BARB.blue, 0.5]] as const) {
      fillRects(pen, colour, (c) => {
        for (let y = y0 - per * 2 + off + k * per; y < y1 + per; y += per) {
          c.moveTo(px, y + 0.2)
          c.lineTo(px + pw, y)
          c.lineTo(px + pw, y + 0.08)
          c.lineTo(px, y + 0.28)
          c.closePath()
        }
      })
    }
    if (pen.lod === 0) line(pen, px + 0.08, y0, px + 0.08, y1, rgba(BARB.white, 0.6), 0.03)
    ctx.restore()
    if (pen.lod <= 1) {
      ctx.beginPath()
      ctx.rect(px, y0, pw, y1 - y0)
      finish(pen, null, 0.8)
    }
    rect(pen, px - 0.04, y0 - 0.08, pw + 0.08, 0.08, BARB.chrome, 0.7)
    rect(pen, px - 0.04, y1, pw + 0.08, 0.08, BARB.chrome, 0.7)
    circle(pen, px + pw / 2, y0 - 0.15, 0.08, BARB.chrome, 0.7)
  },
  front(pen, _m, v) {
    // Small white tiles.
    if (pen.lod > 1) return
    const s = pen.lod === 0 ? 0.2 : 0.4
    strokeLines(pen, BARB.grout, pen.lw * 0.8, (c) => {
      for (let y = 0.07 + s; y < v.y1; y += s) {
        c.moveTo(v.x0, y)
        c.lineTo(v.x1, y)
      }
      for (let x = Math.floor(v.x0 / s) * s; x < v.x1; x += s) {
        c.moveTo(x, 0.07)
        c.lineTo(x, v.y1)
      }
    })
  },
  weight(pen) {
    // A shaving mug, lathered, its brush standing in it.
    const h = WEIGHT_H
    if (pen.lod <= 1) {
      pen.ctx.beginPath()
      pen.ctx.arc(0.13, -h * 0.32, 0.06, -Math.PI / 2, Math.PI / 2)
      pen.ctx.strokeStyle = BARB.ink
      pen.ctx.lineWidth = 0.025
      pen.ctx.stroke()
    }
    rect(pen, 0.0, -h, 0.05, 0.14, BARB.wood, 0.7)
    ellipse(pen, 0.02, -h * 0.6, 0.12, 0.07, BARB.white, 0.7)
    round(pen, -0.13, -h * 0.58, 0.26, h * 0.58, 0.03, BARB.white)
    if (pen.lod <= 1) rect(pen, -0.13, -h * 0.32, 0.26, 0.04, BARB.blue, 0)
  },
}

/* ------------------------------------------------------------------ a tailor's */

const TAIL = {
  wall: '#2E3954',
  chalk: '#46527A',
  oak: '#AE8A5C',
  oakDeep: '#8A6A44',
  form: '#E8DCC4',
  formDeep: '#C4B396',
  stand: '#4A3628',
  shelf: '#7A5A3E',
  bolts: ['#9C3A52', '#D9B24A', '#7FA0C0', '#E9E1D0'],
  tape: '#E8C64A',
  machine: '#1A1A1E',
  gold: '#C9A24A',
  spool: '#C69A5C',
  thread: '#5E86C2',
  ink: '#161B2A',
}

/** The dress form's torso, half of it, from the neck down to the hem (mirrored for the other half). */
const FORM_HALF: readonly Pt[] = [[0.07, -1.88], [0.1, -1.8], [0.28, -1.73], [0.31, -1.58], [0.27, -1.4], [0.18, -1.15], [0.27, -0.95], [0.26, -0.8]]
const FORM: readonly Pt[] = [...FORM_HALF, ...FORM_HALF.map(([x, y]): Pt => [-x, y]).reverse()]

const tailor: Skin = {
  key: 'tailor',
  bg: TAIL.wall,
  ink: TAIL.ink,
  floor: TAIL.oak,
  edge: TAIL.oakDeep,
  plank: TAIL.oak,
  fulcrum: TAIL.stand,
  back(pen, m, v) {
    // Chalk pinstripes on the navy wall, like suiting.
    if (pen.lod === 0) strokeLines(pen, TAIL.chalk, pen.lw * 0.7, (c) => {
      for (let x = Math.floor(v.x0 / 0.25) * 0.25; x < v.x1; x += 0.25) {
        c.moveTo(x, v.y0)
        c.lineTo(x, 0)
      }
    })
    // The dress form on the left, on its pole and three feet, rocking a little when the floor is struck.
    const fx = -2.15
    at(pen, fx, 0, 0.03 * ring(m, 0.7, 0.5), 1, () => {
      if (pen.lod <= 1) strokeLines(pen, TAIL.stand, 0.04, (c) => {
        c.moveTo(0, -0.05)
        c.lineTo(-0.3, 0)
        c.moveTo(0, -0.05)
        c.lineTo(0.3, 0)
      })
      rect(pen, -0.03, -0.82, 0.06, 0.8, TAIL.stand, 0)
      poly(pen, FORM, TAIL.form)
      ellipse(pen, 0, -1.9, 0.08, 0.04, TAIL.formDeep, 0.7)
      if (pen.lod <= 1) {
        line(pen, -0.15, -1.18, 0.15, -1.18, TAIL.formDeep, 0.03)
        // The tape measure, round the neck and down both sides.
        fillRects(pen, TAIL.tape, (c) => {
          c.moveTo(-0.12, -1.83)
          c.lineTo(-0.06, -1.83)
          c.lineTo(-0.14, -1.25)
          c.lineTo(-0.2, -1.25)
          c.moveTo(0.06, -1.83)
          c.lineTo(0.12, -1.83)
          c.lineTo(0.17, -1.4)
          c.lineTo(0.11, -1.4)
        })
        if (pen.lod === 0) strokeLines(pen, TAIL.ink, pen.lw * 0.6, (c) => {
          for (let i = 1; i < 8; i++) {
            const y = -1.83 + i * 0.07
            c.moveTo(-0.09 - i * 0.011, y)
            c.lineTo(-0.13 - i * 0.011, y)
          }
        })
      }
    })
    // Cubbies of bolts on the right, high up.
    fillRects(pen, TAIL.shelf, (c) => {
      c.rect(1.58, -2.25, 1.42, 0.06)
      c.rect(1.58, -1.7, 1.42, 0.06)
      c.rect(1.58, -1.15, 1.42, 0.06)
      if (pen.lod <= 1) for (const x of [1.58, 2.06, 2.53, 2.94]) c.rect(x, -2.25, 0.05, 1.16)
    })
    TAIL.bolts.forEach((b, i) => {
      fillRects(pen, b, (c) => {
        for (const [y, k] of [[-2.19, 0], [-1.64, 1]] as const) {
          for (let j = 0; j < 3; j++) {
            if ((j + k * 2 + 4 - i) % 4 !== 0 && (j + k * 2 + 5 - i) % 4 !== 0) continue
            const cell = 1.64 + j * 0.47
            const slot = (j + k * 2 + 4 - i) % 4 === 0 ? 0 : 1
            c.rect(cell + slot * 0.19, y + 0.05, 0.17, 0.44)
          }
        }
      })
    })
    if (pen.lod === 0) strokeLines(pen, TAIL.ink, pen.lw * 0.6, (c) => {
      for (const y of [-2.14, -1.59]) for (let j = 0; j < 3; j++) for (let s = 0; s < 2; s++) c.rect(1.64 + j * 0.47 + s * 0.19, y, 0.17, 0.44)
    })
    // The cutting table under them, and the sewing machine on it.
    fillRects(pen, TAIL.shelf, (c) => {
      c.rect(1.55, -0.68, 1.5, 0.07)
      c.rect(1.62, -0.61, 0.07, 0.61)
      c.rect(2.9, -0.61, 0.07, 0.61)
    })
    const needle = pen.lod === 0 ? 0.025 * Math.abs(Math.sin(m.t * 9)) : 0
    fillRects(pen, TAIL.machine, (c) => {
      c.rect(1.82, -0.78, 0.82, 0.1)
      c.rect(2.42, -1.1, 0.16, 0.34)
      c.rect(1.9, -1.12, 0.66, 0.14)
      c.rect(1.9, -1.12, 0.13, 0.26)
    })
    if (pen.lod <= 1) {
      line(pen, 1.965, -0.86, 1.965, -0.8 + needle, TAIL.chalk, 0.012)
      circle(pen, 2.63, -0.98, 0.08, TAIL.gold, 0.7)
      if (pen.lod === 0) line(pen, 2.05, -1.05, 2.4, -1.05, TAIL.gold, pen.lw * 1.2)
    }
  },
  front(pen, _m, v) {
    // Oak boards.
    if (pen.lod > 1) return
    strokeLines(pen, TAIL.oakDeep, pen.lw, (c) => {
      for (let y = 0.22; y < v.y1; y += 0.22) {
        c.moveTo(v.x0, y)
        c.lineTo(v.x1, y)
      }
    })
  },
  weight(pen) {
    // A big spool of thread between its two wooden flanges.
    const h = WEIGHT_H
    rect(pen, -0.1, -h + 0.05, 0.2, h - 0.1, TAIL.thread)
    if (pen.lod === 0) strokeLines(pen, TAIL.ink, pen.lw * 0.5, (c) => {
      for (let y = -h + 0.09; y < -0.06; y += 0.04) {
        c.moveTo(-0.1, y)
        c.lineTo(0.1, y + 0.02)
      }
    })
    rect(pen, -0.14, -0.05, 0.28, 0.05, TAIL.spool)
    rect(pen, -0.14, -h, 0.28, 0.05, TAIL.spool)
    if (pen.lod <= 1) line(pen, 0.1, -h * 0.5, 0.17, -h * 0.05, TAIL.thread, 0.012)
  },
}

/* ------------------------------------------------------------------ a beekeeper's meadow */

const BEE = {
  sky: '#F4D27E',
  skyHigh: '#F7E2A6',
  sun: '#FFF6D2',
  hill: '#B9B65C',
  meadow: '#86A044',
  meadowDeep: '#6C8636',
  hive: '#F2EBDA',
  hiveBlue: '#A9C3D4',
  roof: '#7A6A58',
  slot: '#3A2C18',
  leg: '#6A5440',
  honey: '#E8A42A',
  honeyDeep: '#B87418',
  bee: '#2A2218',
  wing: '#FFFFFF',
  clover: '#E6A2C2',
  daisy: '#FBF8EE',
  foxglove: '#B77AB8',
  wood: '#A27A4C',
  ink: '#3A2C18',
}

/** A hive: its stand, `n` boxes stacked, and the roof, standing at x. */
function hive(pen: Pen, x: number, n: number): void {
  const w = 0.6
  const bh = 0.27
  fillRects(pen, BEE.leg, (c) => {
    c.rect(x - w / 2 + 0.04, -0.14, 0.05, 0.14)
    c.rect(x + w / 2 - 0.09, -0.14, 0.05, 0.14)
    c.rect(x - w / 2 - 0.02, -0.18, w + 0.04, 0.05)
  })
  for (let i = 0; i < n; i++) rect(pen, x - w / 2, -0.18 - (i + 1) * bh, w, bh, i % 2 ? BEE.hiveBlue : BEE.hive)
  const top = -0.18 - n * bh
  poly(pen, [[x - w / 2 - 0.06, top], [x + w / 2 + 0.06, top], [x + w / 2 + 0.02, top - 0.1], [x - w / 2 - 0.02, top - 0.1]], BEE.roof)
  rect(pen, x - 0.12, -0.24, 0.24, 0.04, BEE.slot, 0)
  if (pen.lod === 0) strokeLines(pen, BEE.ink, pen.lw * 0.6, (c) => {
    for (let i = 0; i < n; i++) {
      const y = -0.18 - (i + 0.5) * bh
      c.moveTo(x - 0.08, y)
      c.lineTo(x + 0.08, y)
    }
  })
}

const beekeeper: Skin = {
  key: 'beekeeper',
  bg: BEE.sky,
  ink: BEE.ink,
  floor: BEE.meadow,
  edge: BEE.meadowDeep,
  plank: BEE.wood,
  fulcrum: BEE.roof,
  back(pen, m, v) {
    // The high sky paler, the sun low and gold over the right, and a far hill.
    band(pen, v, v.y0 - 0.1, -2.0, BEE.skyHigh)
    glow(pen, 0.9, -2.3, 1.7, BEE.sun, 0.75)
    circle(pen, 0.9, -2.3, 0.28, BEE.sun, 0)
    poly(pen, [[v.x0 - 0.1, 0], [v.x0 - 0.1, -0.45], [-2.0, -0.6], [-0.8, -0.3], [0.6, -0.25], [1.8, -0.5], [v.x1 + 0.1, -0.35], [v.x1 + 0.1, 0]], BEE.hill, 0)
    // The hives: a tall one on the left, a short one on the right, and foxgloves by it.
    hive(pen, -2.15, 4)
    hive(pen, 2.1, 2)
    if (pen.lod <= 1) {
      line(pen, 2.75, 0, 2.75, -1.25, BEE.meadowDeep, 0.03)
      fillRects(pen, BEE.foxglove, (c) => {
        for (let i = 0; i < 5; i++) {
          const y = -1.2 + i * 0.12
          c.moveTo(2.75 + 0.05 + i * 0.008, y)
          c.ellipse(2.75, y, 0.05 + i * 0.008, 0.05, 0, 0, Math.PI * 2)
        }
      })
    }
    // Bees, drifting round the hives.
    const n = pen.lod === 0 ? 12 : pen.lod === 1 ? 8 : 4
    const pos = (i: number): Pt => {
      const a = m.t * (0.5 + 0.13 * (i % 4)) + i * 2.3
      const cx = i % 2 ? -2.1 : 2.15
      const cy = i % 2 ? -1.55 : -1.0
      return [cx + Math.cos(a) * (0.55 + 0.08 * (i % 3)), cy + Math.sin(a * 1.7) * 0.32]
    }
    if (pen.lod === 0) fillRects(pen, rgba(BEE.wing, 0.85), (c) => {
      for (let i = 0; i < n; i++) {
        const [x, y] = pos(i)
        c.moveTo(x + 0.03, y - 0.035)
        c.arc(x, y - 0.035, 0.03, 0, Math.PI * 2)
      }
    })
    fillRects(pen, BEE.bee, (c) => {
      for (let i = 0; i < n; i++) {
        const [x, y] = pos(i)
        c.moveTo(x + 0.04, y)
        c.ellipse(x, y, 0.04, 0.028, 0, 0, Math.PI * 2)
      }
    })
  },
  front(pen, _m, v) {
    // Clover and daisies in the grass.
    if (pen.lod > 1) return
    for (const [colour, s] of [[BEE.clover, 1], [BEE.daisy, 2]] as const) {
      fillRects(pen, colour, (c) => {
        for (let i = 0; i < (pen.lod === 0 ? 18 : 8); i++) {
          const x = v.x0 + hash(i, s, 7) * (v.x1 - v.x0)
          const y = 0.14 + hash(i, s, 9) * Math.max(0.05, v.y1 - 0.2)
          c.moveTo(x + 0.035, y)
          c.arc(x, y, 0.035, 0, Math.PI * 2)
        }
      })
    }
  },
  weight(pen) {
    // A jar of honey under its cloth cap, a dipper standing in it.
    const h = WEIGHT_H
    if (pen.lod <= 1) line(pen, 0.04, -h * 0.6, 0.1, -h, BEE.wood, 0.025)
    ellipse(pen, 0.105, -h + 0.02, 0.03, 0.045, BEE.wood, 0.6, 0.3)
    round(pen, -0.13, -h * 0.66, 0.26, h * 0.66, 0.06, BEE.honey)
    if (pen.lod <= 1) rect(pen, -0.07, -h * 0.5, 0.06, h * 0.32, rgba(BEE.sun, 0.5), 0)
    poly(pen, [[-0.14, -h * 0.64], [0.14, -h * 0.64], [0.1, -h * 0.76], [-0.1, -h * 0.76]], BEE.hive)
    if (pen.lod <= 1) line(pen, -0.12, -h * 0.66, 0.12, -h * 0.66, BEE.honeyDeep, 0.02)
  },
}

/* ------------------------------------------------------------------ a potter's studio */

const POT = {
  wall: '#C9BDAA',
  wallDeep: '#B5A892',
  shelf: '#6E5A48',
  clay: '#B8754A',
  clayWet: '#9A5A38',
  glazeBlue: '#4F7A9A',
  glazeCream: '#EDE4D0',
  glazeOlive: '#8E9A5A',
  kiln: '#8D9196',
  kilnDeep: '#5E6268',
  heat: '#FFB25A',
  pan: '#6A6E74',
  floor: '#6F655C',
  floorDeep: '#5C534B',
  slip: '#B89C80',
  ink: '#2C241E',
}

/** Pot profiles: half a pot's outline from the foot up, height 1. */
const PROFILES: readonly (readonly Pt[])[] = [
  // A jug: a full belly, a narrow neck, a lip.
  [[0.2, 0], [0.38, -0.3], [0.36, -0.55], [0.15, -0.8], [0.14, -0.92], [0.2, -1]],
  // A bowl: wide and low.
  [[0.25, 0], [0.55, -0.25], [0.7, -0.55], [0.72, -0.6]],
  // A tall bottle.
  [[0.18, 0], [0.24, -0.45], [0.22, -0.6], [0.08, -0.78], [0.07, -0.95], [0.1, -1]],
  // A jar: straight-sided, shouldered.
  [[0.28, 0], [0.32, -0.65], [0.22, -0.82], [0.22, -0.92], [0.26, -1]],
]
const POTS: readonly Pt[][] = PROFILES.map((h) => [...h, ...h.map(([x, y]): Pt => [-x, y]).reverse()])

/** The shelves' pots: which profile, x, the shelf's y, size, glaze. */
const SHELF_POTS: readonly [number, number, number, number, string][] = [
  [0, -2.75, -0.55, 0.42, POT.glazeBlue], [2, -2.35, -0.55, 0.48, POT.glazeCream], [3, -1.92, -0.55, 0.34, POT.clay],
  [1, -2.65, -1.15, 0.3, POT.glazeOlive], [3, -2.15, -1.15, 0.4, POT.glazeBlue], [0, -1.72, -1.15, 0.36, POT.clay],
  [2, -2.78, -1.75, 0.4, POT.clay], [0, -2.3, -1.75, 0.34, POT.glazeCream], [1, -1.85, -1.75, 0.26, POT.glazeBlue],
]

const potter: Skin = {
  key: 'potter',
  bg: POT.wall,
  ink: POT.ink,
  floor: POT.floor,
  edge: POT.floorDeep,
  plank: POT.slip,
  fulcrum: POT.shelf,
  back(pen, m, _v) {
    // Shelves of pots on the left, waiting for the kiln and back from it.
    fillRects(pen, POT.shelf, (c) => {
      for (const y of [-0.55, -1.15, -1.75]) c.rect(-3.05, y, 1.5, 0.06)
      c.rect(-1.6, -2.2, 0.06, 2.2)
    })
    for (const [k, x, y, s, glaze] of SHELF_POTS) {
      if (pen.lod > 1 && s < 0.36) continue
      at(pen, x, y, 0, s, () => poly(pen, POTS[k], glaze, 1 / s))
    }
    // The kiln on the right, its spy-hole glowing.
    const kx = 2.65
    rect(pen, kx - 0.04, -0.15, 0.08, 0.15, POT.kilnDeep, 0)
    round(pen, kx - 0.42, -1.05, 0.84, 0.92, 0.08, POT.kiln)
    rect(pen, kx - 0.46, -1.15, 0.92, 0.12, POT.kilnDeep, 0.8)
    if (pen.lod <= 1) {
      strokeLines(pen, POT.kilnDeep, pen.lw * 1.4, (c) => {
        c.moveTo(kx - 0.42, -0.75)
        c.lineTo(kx + 0.42, -0.75)
        c.moveTo(kx - 0.42, -0.42)
        c.lineTo(kx + 0.42, -0.42)
      })
      glow(pen, kx - 0.15, -0.6, 0.25, POT.heat, 0.8)
      circle(pen, kx - 0.15, -0.6, 0.04, POT.heat, 0.5)
    }
    // The wheel, in front of it: the splash pan on its legs and the clay going round.
    const wx = 1.95
    fillRects(pen, POT.pan, (c) => {
      c.rect(wx - 0.3, -0.25, 0.05, 0.25)
      c.rect(wx + 0.25, -0.25, 0.05, 0.25)
    })
    poly(pen, [[wx - 0.38, -0.48], [wx + 0.38, -0.48], [wx + 0.3, -0.22], [wx - 0.3, -0.22]], POT.pan)
    ellipse(pen, wx, -0.5, 0.25, 0.04, POT.kilnDeep, 0.6)
    poly(pen, [[wx - 0.17, -0.52], [wx + 0.17, -0.52], [wx + 0.13, -0.75], [wx + 0.16, -0.9], [wx - 0.16, -0.9], [wx - 0.13, -0.75]], POT.clayWet)
    if (pen.lod <= 1) strokeLines(pen, POT.clay, pen.lw * 1.2, (c) => {
      for (let k = 0; k < 3; k++) {
        const y = -0.6 - k * 0.1
        const x = wx + Math.sin(m.t * 7 + k * 2.1) * 0.12
        c.moveTo(x, y)
        c.lineTo(x, y - 0.05)
      }
    })
  },
  front(pen, _m, v) {
    // Clay dried on the concrete.
    if (pen.lod > 0) return
    fillRects(pen, POT.slip, (c) => {
      for (let i = 0; i < 14; i++) {
        const x = v.x0 + hash(i, 3, 1) * (v.x1 - v.x0)
        const y = 0.15 + hash(i, 4, 1) * Math.max(0.05, v.y1 - 0.25)
        c.moveTo(x + 0.06, y)
        c.ellipse(x, y, 0.06 + 0.05 * hash(i, 5), 0.025, 0, 0, Math.PI * 2)
      }
    })
  },
  weight(pen) {
    // A blue-glazed jug.
    const s = WEIGHT_H
    at(pen, 0, 0, 0, s, () => poly(pen, POTS[0], POT.glazeBlue, 1 / s))
    if (pen.lod <= 1) line(pen, -0.11, -s * 0.38, 0.11, -s * 0.38, POT.glazeCream, 0.025)
  },
}

/* ------------------------------------------------------------------ a painter's studio */

const PAINT = {
  wall: '#ECE8DE',
  ceiling: '#D6CFC0',
  sky: '#BFD8EC',
  cloud: '#F6F8FA',
  frame: '#5E5A55',
  wood: '#9C7A52',
  woodDeep: '#6E5236',
  canvas: '#F8F5EE',
  blue: '#3E62B0',
  yellow: '#F0C43A',
  rose: '#D9608A',
  green: '#6BA34E',
  boards: '#A89A86',
  boardsDeep: '#928470',
  tin: '#B9BEC2',
  light: '#FFF6D8',
  ink: '#2A2724',
}

/** Paint on the floor: x, y, radius, which colour. */
const SPLATS: readonly [number, number, number, number][] = [
  [-2.9, 0.25, 0.08, 0], [-2.2, 0.45, 0.12, 1], [-1.5, 0.2, 0.06, 2], [-0.6, 0.55, 0.09, 3], [0.4, 0.3, 0.07, 0],
  [1.2, 0.6, 0.11, 2], [1.9, 0.22, 0.08, 1], [2.6, 0.5, 0.1, 3], [3.2, 0.3, 0.07, 2], [-3.3, 0.6, 0.1, 1],
]

const painter: Skin = {
  key: 'painter',
  bg: PAINT.wall,
  ink: PAINT.ink,
  floor: PAINT.boards,
  edge: PAINT.boardsDeep,
  plank: PAINT.wood,
  fulcrum: PAINT.woodDeep,
  back(pen, m, v) {
    const { ctx } = pen
    // The sloped ceiling and its skylight, a cloud crossing it, and the light falling in.
    band(pen, v, v.y0 - 0.1, -1.95, PAINT.ceiling)
    const win: Pt[] = [[-1.0, -2.02], [1.0, -2.02], [1.25, -2.85], [-1.25, -2.85]]
    poly(pen, win, PAINT.sky, 0)
    if (pen.lod <= 1) {
      ctx.save()
      poly(pen, win, null, 0)
      ctx.clip()
      const cx = -1.6 + (((m.t * 0.08) % 3.2) + 3.2) % 3.2
      ellipse(pen, cx, -2.4, 0.35, 0.1, PAINT.cloud, 0)
      ellipse(pen, cx + 0.2, -2.48, 0.2, 0.08, PAINT.cloud, 0)
      ctx.restore()
      strokeLines(pen, PAINT.frame, pen.lw * 2, (c) => {
        c.moveTo(win[0][0], win[0][1])
        for (const p of win) c.lineTo(p[0], p[1])
        c.closePath()
        c.moveTo(0, -2.02)
        c.lineTo(0, -2.85)
        c.moveTo(-1.12, -2.44)
        c.lineTo(1.12, -2.44)
      })
      beam(pen, 0, -2.02, -0.9, 0, 2.0, 3.0, PAINT.light, 0.22)
    }
    // The easel on the left, and the painting on it.
    const ex = -2.2
    strokeLines(pen, PAINT.woodDeep, 0.05, (c) => {
      c.moveTo(ex, -2.2)
      c.lineTo(ex - 0.4, 0)
      c.moveTo(ex, -2.2)
      c.lineTo(ex + 0.4, 0)
      c.moveTo(ex, -2.1)
      c.lineTo(ex, 0)
      c.moveTo(ex - 0.5, -0.98)
      c.lineTo(ex + 0.5, -0.98)
    })
    rect(pen, ex - 0.6, -2.0, 1.2, 0.98, PAINT.canvas)
    ctx.save()
    ctx.beginPath()
    ctx.rect(ex - 0.6, -2.0, 1.2, 0.98)
    ctx.clip()
    circle(pen, ex - 0.22, -1.5, 0.3, PAINT.blue, 0)
    rect(pen, ex + 0.08, -1.88, 0.38, 0.5, PAINT.yellow, 0)
    if (pen.lod <= 1) {
      line(pen, ex - 0.5, -1.15, ex + 0.5, -1.35, PAINT.rose, 0.08)
      if (pen.lod === 0) circle(pen, ex + 0.3, -1.25, 0.08, PAINT.green, 0)
    }
    ctx.restore()
    if (pen.lod <= 1) {
      ctx.beginPath()
      ctx.rect(ex - 0.6, -2.0, 1.2, 0.98)
      finish(pen, null)
    }
    // Canvases leaning against the wall on the right, backs out.
    for (let i = 0; i < 3; i++) {
      const x = 1.65 + i * 0.32
      const h = 1.3 - i * 0.22
      const pts: Pt[] = [[x, 0], [x + 0.75, 0], [x + 0.9, -h], [x + 0.15, -h]]
      poly(pen, pts, i % 2 ? PAINT.wood : PAINT.canvas)
      if (pen.lod === 0) line(pen, x + 0.08, -h / 2, x + 0.83, -h / 2, PAINT.woodDeep, 0.03)
    }
  },
  front(pen, _m, _v) {
    // Splashes of paint on the boards.
    if (pen.lod > 1) return
    const colours = [PAINT.blue, PAINT.yellow, PAINT.rose, PAINT.green]
    colours.forEach((colour, k) => {
      fillRects(pen, colour, (c) => {
        for (const [x, y, r, j] of SPLATS) {
          if (j !== k) continue
          c.moveTo(x + r, y)
          c.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI * 2)
          if (pen.lod === 0) {
            c.moveTo(x + r * 1.5 + 0.025, y - 0.02)
            c.arc(x + r * 1.5, y - 0.02, 0.025, 0, Math.PI * 2)
          }
        }
      })
    })
  },
  weight(pen) {
    // A tin of blue paint, a drip down its side, the brush standing in it.
    const h = WEIGHT_H
    if (pen.lod <= 1) line(pen, 0.02, -0.2, 0.1, -h, PAINT.wood, 0.03)
    rect(pen, 0.085, -h - 0.02, 0.04, 0.05, PAINT.blue, 0.6)
    rect(pen, -0.13, -0.24, 0.26, 0.24, PAINT.tin)
    ellipse(pen, 0, -0.24, 0.13, 0.035, PAINT.blue, 0.8)
    rect(pen, -0.08, -0.24, 0.05, 0.12, PAINT.blue, 0)
    if (pen.lod <= 1) line(pen, -0.13, -0.05, 0.13, -0.05, PAINT.frame, pen.lw)
  },
}

/* ------------------------------------------------------------------ a darkroom */

const DARK = {
  wall: '#2B0E12',
  floor: '#170709',
  floorEdge: '#2A1013',
  safe: '#FF3A2E',
  lens: '#C8282A',
  housing: '#100607',
  print: '#E8BFB4',
  image: '#6A262A',
  string: '#8A4A46',
  peg: '#C9907E',
  bench: '#3E1A1C',
  tray: '#5A2628',
  enlarger: '#120A0A',
  metal: '#4E2E2E',
  camera: '#241C1C',
  silver: '#B49A96',
  ink: '#E9B4A6',
}

/** Where the prints hang along the line. */
const PRINTS = [-2.75, -2.05, -1.35, -0.55, 0.3, 1.1, 1.85, 2.6]

const darkroom: Skin = {
  key: 'darkroom',
  bg: DARK.wall,
  ink: DARK.ink,
  floor: DARK.floor,
  edge: DARK.floorEdge,
  plank: DARK.metal,
  fulcrum: DARK.bench,
  back(pen, m, v) {
    // The safelight on the right wall, and its red light.
    const sx = 2.3
    const sy = -1.45
    glow(pen, sx, sy, 2.0, DARK.safe, 0.42 + 0.1 * flashOf(m, 1.2, 0.3))
    rect(pen, sx - 0.25, sy - 0.18, 0.5, 0.36, DARK.housing, 0)
    round(pen, sx - 0.2, sy - 0.13, 0.4, 0.26, 0.04, DARK.lens, 0.7)
    // The bench under it and the three trays on it.
    fillRects(pen, DARK.bench, (c) => {
      c.rect(1.55, -0.72, 1.6, 0.08)
      c.rect(1.62, -0.64, 0.07, 0.64)
      c.rect(2.95, -0.64, 0.07, 0.64)
    })
    if (pen.lod <= 1) fillRects(pen, DARK.tray, (c) => {
      for (let i = 0; i < 3; i++) c.rect(1.65 + i * 0.47, -0.8, 0.42, 0.08)
    })
    // The enlarger on the left: its baseboard, column, head and lens looking down.
    const ex = -2.2
    fillRects(pen, DARK.bench, (c) => {
      c.rect(-3.1, -0.72, 1.6, 0.08)
      c.rect(-2.95, -0.64, 0.07, 0.64)
      c.rect(-1.65, -0.64, 0.07, 0.64)
    })
    fillRects(pen, DARK.enlarger, (c) => {
      c.rect(ex - 0.5, -0.78, 0.9, 0.06)
      c.rect(ex + 0.25, -2.25, 0.08, 1.5)
      c.rect(ex - 0.32, -1.85, 0.6, 0.32)
      c.moveTo(ex - 0.22, -1.53)
      c.lineTo(ex + 0.18, -1.53)
      c.lineTo(ex + 0.08, -1.3)
      c.lineTo(ex - 0.12, -1.3)
      c.rect(ex - 0.08, -1.3, 0.12, 0.1)
    })
    if (pen.lod <= 1) {
      rect(pen, ex - 0.32, -1.85, 0.6, 0.32, null, 0.8)
      rect(pen, ex - 0.35, -0.8, 0.5, 0.03, DARK.print, 0)
    }
    // The line across the top, and the prints hanging from it to dry, stirring when the floor is struck.
    const ly = -2.2
    if (pen.lod <= 1) line(pen, v.x0, ly, v.x1, ly, DARK.string, pen.lw)
    if (pen.lod > 1) {
      fillRects(pen, DARK.print, (c) => {
        for (const x of PRINTS) c.rect(x - 0.15, ly + 0.02, 0.3, 0.38)
      })
      return
    }
    const r = ring(m, 0.8, 0.6)
    for (let i = 0; i < PRINTS.length; i++) {
      const x = PRINTS[i]
      at(pen, x, ly, (0.05 + 0.04 * hash(i, 2)) * r + 0.02 * Math.sin(m.t * 0.6 + i), 1, () => {
        rect(pen, -0.15, 0.02, 0.3, 0.38, DARK.print, 0.7)
        rect(pen, -0.11, 0.06, 0.22, 0.26, DARK.image, 0)
        if (pen.lod === 0) circle(pen, -0.03 + 0.08 * hash(i, 3), 0.17, 0.05, DARK.print, 0)
        rect(pen, -0.025, -0.04, 0.05, 0.1, DARK.peg, 0)
      })
    }
  },
  weight(pen) {
    // An old camera: its body, the lens, the finder on top.
    const h = WEIGHT_H
    rect(pen, -0.06, -h, 0.12, 0.08, DARK.camera, 0.7)
    round(pen, -0.15, -h + 0.07, 0.3, h - 0.07, 0.03, DARK.camera)
    if (pen.lod <= 1) rect(pen, -0.15, -h + 0.07, 0.3, 0.05, DARK.silver, 0.6)
    circle(pen, 0, -h * 0.4, 0.085, DARK.silver, 0.8)
    circle(pen, 0, -h * 0.4, 0.05, DARK.housing, 0)
    if (pen.lod === 0) circle(pen, -0.015, -h * 0.4 - 0.015, 0.012, DARK.ink, 0)
  },
}

/* ------------------------------------------------------------------ a clockmaker's */

const CLOCK = {
  wall: '#4C4F34',
  wallDeep: '#3D402A',
  brass: '#C99A3E',
  brassDeep: '#8E6A28',
  face: '#F2E8CF',
  walnut: '#6A4228',
  walnutDeep: '#45291A',
  hand: '#1E1A16',
  glass: '#2E2A1E',
  floor: '#2E241C',
  floorDeep: '#241C16',
  ink: '#1A1610',
}

/** The wall of clocks: x, y, radius, and how fast its hand goes. */
const CLOCKS: readonly [number, number, number, number][] = [
  [1.85, -1.95, 0.24, 1.1], [2.55, -1.75, 0.32, -0.7], [1.95, -1.2, 0.28, 0.9], [2.75, -0.95, 0.2, 1.4],
  [2.3, -0.45, 0.17, -1.2], [-0.95, -2.2, 0.2, 0.8], [0.1, -2.25, 0.22, -1.0], [1.1, -2.2, 0.18, 1.3],
]

/** A gear's outline, square-toothed, round a hole, as one path. */
function gearPath(pen: Pen, x: number, y: number, R: number, n: number, hole: number, a: number): void {
  const { ctx } = pen
  ctx.beginPath()
  const k = n * 4
  for (let i = 0; i < k; i++) {
    const t = a + (i / k) * Math.PI * 2
    const r = (i >> 1) % 2 ? R * 0.82 : R
    if (i === 0) ctx.moveTo(x + Math.cos(t) * r, y + Math.sin(t) * r)
    else ctx.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r)
  }
  ctx.closePath()
  ctx.moveTo(x + hole, y)
  ctx.arc(x, y, hole, 0, Math.PI * 2, true)
}

const clockmaker: Skin = {
  key: 'clockmaker',
  bg: CLOCK.wall,
  ink: CLOCK.ink,
  floor: CLOCK.floor,
  edge: CLOCK.floorDeep,
  plank: CLOCK.walnut,
  fulcrum: CLOCK.brassDeep,
  back(pen, m, _v) {
    const { ctx } = pen
    // A gear on the wall low on the right, turning slowly behind the clocks.
    if (pen.lod <= 1) {
      gearPath(pen, 2.95, -0.35, 0.42, 9, 0.1, m.t * 0.2)
      ctx.fillStyle = CLOCK.wallDeep
      ctx.fill('evenodd')
    }
    // The grandfather clock on the left: its base, trunk and hood, the face and the pendulum swinging.
    const gx = -2.15
    fillRects(pen, CLOCK.walnut, (c) => {
      c.rect(gx - 0.4, -0.5, 0.8, 0.5)
      c.rect(gx - 0.3, -1.5, 0.6, 1.0)
      c.rect(gx - 0.4, -2.1, 0.8, 0.62)
      c.moveTo(gx - 0.4, -2.1)
      c.ellipse(gx, -2.1, 0.4, 0.2, 0, Math.PI, Math.PI * 2)
    })
    if (pen.lod <= 1) strokeLines(pen, CLOCK.ink, pen.lw, (c) => {
      c.rect(gx - 0.4, -0.5, 0.8, 0.5)
      c.rect(gx - 0.3, -1.48, 0.6, 0.98)
      c.moveTo(gx - 0.4, -1.48)
      c.lineTo(gx - 0.4, -2.1)
      c.ellipse(gx, -2.1, 0.4, 0.2, 0, Math.PI, Math.PI * 2)
      c.lineTo(gx + 0.4, -1.48)
      c.closePath()
    })
    rect(pen, gx - 0.16, -1.42, 0.32, 0.82, CLOCK.glass, 0)
    const sw = 0.22 * Math.sin(m.t * Math.PI)
    const bx = gx + Math.sin(sw) * 0.62
    const by = -1.4 + Math.cos(sw) * 0.62
    if (pen.lod <= 1) line(pen, gx, -1.4, bx, by, CLOCK.brassDeep, 0.02)
    circle(pen, bx, by, 0.08, CLOCK.brass, 0.7)
    circle(pen, gx, -1.8, 0.29, CLOCK.brass, 0)
    circle(pen, gx, -1.8, 0.24, CLOCK.face, 0.7)
    // The wall of clocks: brass rims, faces, and hands that tick on the beat.
    const n = pen.lod > 1 ? 5 : CLOCKS.length
    fillRects(pen, CLOCK.brass, (c) => {
      for (let i = 0; i < n; i++) {
        const [x, y, r] = CLOCKS[i]
        c.moveTo(x + r, y)
        c.arc(x, y, r, 0, Math.PI * 2)
      }
    })
    fillRects(pen, CLOCK.face, (c) => {
      for (let i = 0; i < n; i++) {
        const [x, y, r] = CLOCKS[i]
        c.moveTo(x + r * 0.8, y)
        c.arc(x, y, r * 0.8, 0, Math.PI * 2)
      }
    })
    if (pen.lod > 1) return
    const tick = lastSlam(m)
    const kick = 0.06 * ring(m, 0.14, 0.1)
    strokeLines(pen, CLOCK.hand, pen.lw * 1.6, (c) => {
      const hands: [number, number, number, number][] = [[gx, -1.8, 0.24, 0.3], ...CLOCKS.slice(0, n)]
      for (let i = 0; i < hands.length; i++) {
        const [x, y, r, sp] = hands[i]
        const a = hash(i, 1) * 6.28 + tick * sp + kick
        const b = hash(i, 2) * 6.28 + tick * sp * 0.08
        c.moveTo(x, y)
        c.lineTo(x + Math.sin(a) * r * 0.7, y - Math.cos(a) * r * 0.7)
        c.moveTo(x, y)
        c.lineTo(x + Math.sin(b) * r * 0.45, y - Math.cos(b) * r * 0.45)
      }
    })
    if (pen.lod === 0) strokeLines(pen, CLOCK.ink, pen.lw * 0.8, (c) => {
      for (const [x, y, r] of CLOCKS) {
        c.moveTo(x + r, y)
        c.arc(x, y, r, 0, Math.PI * 2)
      }
    })
  },
  front(pen, _m, v) {
    // Dark floorboards.
    if (pen.lod > 1) return
    strokeLines(pen, CLOCK.floorDeep, pen.lw * 1.2, (c) => {
      for (let y = 0.2; y < v.y1; y += 0.2) {
        c.moveTo(v.x0, y)
        c.lineTo(v.x1, y)
      }
    })
  },
  weight(pen) {
    // A mantel clock: an arched walnut case on its plinth, the brass-rimmed face.
    const h = WEIGHT_H
    const { ctx } = pen
    rect(pen, -0.16, -0.05, 0.32, 0.05, CLOCK.walnutDeep, 0.7)
    ctx.beginPath()
    ctx.moveTo(-0.14, -0.05)
    ctx.lineTo(-0.14, -h * 0.55)
    ctx.ellipse(0, -h * 0.55, 0.14, h * 0.45, 0, Math.PI, Math.PI * 2)
    ctx.lineTo(0.14, -0.05)
    ctx.closePath()
    finish(pen, CLOCK.walnut)
    circle(pen, 0, -h * 0.55, 0.095, CLOCK.brass, 0)
    circle(pen, 0, -h * 0.55, 0.075, CLOCK.face, 0.6)
    if (pen.lod <= 1) strokeLines(pen, CLOCK.hand, 0.015, (c) => {
      c.moveTo(0, -h * 0.55)
      c.lineTo(0, -h * 0.55 - 0.06)
      c.moveTo(0, -h * 0.55)
      c.lineTo(0.04, -h * 0.55 + 0.01)
    })
  },
}

/* ------------------------------------------------------------------ a toy shop */

const TOY = {
  wall: '#6A56A3',
  shelf: '#F2E6CC',
  boards: '#DFAA44',
  boardsDeep: '#C08E30',
  horse: '#F5EFE2',
  dapple: '#D8CDB5',
  mane: '#E46C9A',
  rocker: '#3A6EB4',
  saddle: '#2F8F5A',
  red: '#D94F45',
  blue: '#3E7CC8',
  yellow: '#F2C53A',
  green: '#5BAE5A',
  bear: '#A87444',
  kite: '#F2C53A',
  kite2: '#E46C9A',
  tin: '#B8C4CE',
  tinDeep: '#7E8C98',
  ink: '#22183A',
}

const toyshop: Skin = {
  key: 'toyshop',
  bg: TOY.wall,
  ink: TOY.ink,
  floor: TOY.boards,
  edge: TOY.boardsDeep,
  plank: TOY.shelf,
  fulcrum: TOY.rocker,
  back(pen, m, _v) {
    // A kite hung from the ceiling, its tail stirring.
    at(pen, 0.95, -2.35, 0.35, 1, () => {
      poly(pen, [[0, -0.3], [0.22, 0], [0, 0.42], [-0.22, 0]], TOY.kite)
      poly(pen, [[0, -0.3], [0.22, 0], [0, 0.42]], TOY.kite2, 0)
      if (pen.lod <= 1) {
        const w = 0.08 * Math.sin(m.t * 1.3) + 0.1 * ring(m, 0.7, 0.5)
        strokeLines(pen, TOY.ink, pen.lw, (c) => {
          c.moveTo(0, 0.42)
          c.quadraticCurveTo(0.15 + w, 0.65, w * 1.5, 0.9)
        })
        if (pen.lod === 0) fillRects(pen, TOY.red, (c) => {
          for (const t of [0.6, 0.78]) {
            const x = w * t * 1.2 + 0.1 * Math.sin(t * 3)
            c.moveTo(x - 0.06, 0.42 + t * 0.5 - 0.04)
            c.lineTo(x + 0.06, 0.42 + t * 0.5 + 0.04)
            c.lineTo(x + 0.06, 0.42 + t * 0.5 - 0.04)
            c.lineTo(x - 0.06, 0.42 + t * 0.5 + 0.04)
            c.closePath()
          }
        })
      }
    })
    // The rocking horse on the left, rocking.
    const hx = -2.15
    const rock = 0.06 * Math.sin(m.t * 1.6) + 0.06 * ring(m, 0.9, 0.6)
    at(pen, hx, 0, rock, 1, () => {
      const { ctx } = pen
      ctx.beginPath()
      ctx.ellipse(0, -1.6, 0.85, 1.62, 0, Math.PI * 0.32, Math.PI * 0.68)
      ctx.strokeStyle = TOY.rocker
      ctx.lineWidth = 0.09
      ctx.stroke()
      strokeLines(pen, TOY.horse, 0.07, (c) => {
        c.moveTo(-0.3, -0.75)
        c.lineTo(-0.42, -0.08)
        c.moveTo(0.3, -0.75)
        c.lineTo(0.42, -0.08)
      })
      if (pen.lod <= 1) strokeLines(pen, TOY.dapple, 0.07, (c) => {
        c.moveTo(-0.2, -0.75)
        c.lineTo(-0.27, -0.05)
        c.moveTo(0.2, -0.75)
        c.lineTo(0.27, -0.05)
      })
      // Its tail, body, neck and head, the mane, and the saddle.
      poly(pen, [[-0.45, -0.85], [-0.62, -0.75], [-0.68, -0.5], [-0.52, -0.62]], TOY.mane)
      ellipse(pen, 0, -0.85, 0.48, 0.18, TOY.horse)
      poly(pen, [[0.28, -0.95], [0.4, -1.45], [0.52, -1.5], [0.78, -1.3], [0.74, -1.2], [0.5, -1.22], [0.46, -0.85]], TOY.horse)
      poly(pen, [[0.36, -1.0], [0.26, -1.42], [0.44, -1.6], [0.46, -1.45], [0.4, -1.42], [0.48, -1.0]], TOY.mane)
      round(pen, -0.15, -1.07, 0.32, 0.12, 0.05, TOY.saddle, 0.7)
      if (pen.lod === 0) {
        circle(pen, 0.6, -1.38, 0.025, TOY.ink, 0)
        fillRects(pen, TOY.dapple, (c) => {
          for (const [x, y] of [[-0.25, -0.86], [0.08, -0.8], [-0.05, -0.92]]) {
            c.moveTo(x + 0.05, y)
            c.arc(x, y, 0.05, 0, Math.PI * 2)
          }
        })
      }
    })
    // Shelves of toys on the right: blocks, a ball, a bear, a top.
    fillRects(pen, TOY.shelf, (c) => {
      for (const y of [-0.6, -1.25, -1.9]) c.rect(1.6, y, 1.45, 0.07)
    })
    if (pen.lod <= 1) strokeLines(pen, TOY.ink, pen.lw * 0.8, (c) => {
      for (const y of [-0.6, -1.25, -1.9]) c.rect(1.6, y, 1.45, 0.07)
    })
    rect(pen, 1.72, -0.86, 0.26, 0.26, TOY.red)
    rect(pen, 2.0, -0.86, 0.26, 0.26, TOY.blue)
    rect(pen, 1.86, -1.12, 0.26, 0.26, TOY.yellow)
    circle(pen, 2.6, -0.8, 0.2, TOY.green)
    if (pen.lod <= 1) line(pen, 2.42, -0.8, 2.78, -0.8, TOY.yellow, 0.06)
    // The bear.
    fillRects(pen, TOY.bear, (c) => {
      c.moveTo(2.0, -1.52)
      c.ellipse(1.85, -1.48, 0.17, 0.2, 0, 0, Math.PI * 2)
      c.moveTo(1.98, -1.78)
      c.arc(1.85, -1.78, 0.13, 0, Math.PI * 2)
      c.moveTo(1.8, -1.9)
      c.arc(1.75, -1.9, 0.05, 0, Math.PI * 2)
      c.moveTo(2.0, -1.9)
      c.arc(1.95, -1.9, 0.05, 0, Math.PI * 2)
    })
    // The top, and a stack of rings on its peg.
    poly(pen, [[2.3, -1.28], [2.2, -1.45], [2.34, -1.6], [2.48, -1.45]], TOY.red)
    if (pen.lod <= 1) {
      round(pen, 2.62, -1.38, 0.32, 0.1, 0.05, TOY.blue, 0.7)
      round(pen, 2.66, -1.48, 0.24, 0.1, 0.05, TOY.yellow, 0.7)
      round(pen, 2.7, -1.58, 0.16, 0.1, 0.05, TOY.red, 0.7)
    }
  },
  front(pen, _m, v) {
    // Painted boards.
    if (pen.lod > 1) return
    strokeLines(pen, TOY.boardsDeep, pen.lw * 1.2, (c) => {
      for (let y = 0.25; y < v.y1; y += 0.25) {
        c.moveTo(v.x0, y)
        c.lineTo(v.x1, y)
      }
    })
  },
  weight(pen) {
    // A wind-up tin robot: its feet, body, head and aerial, and the key in its back.
    const h = WEIGHT_H
    fillRects(pen, TOY.tinDeep, (c) => {
      c.rect(-0.1, -0.06, 0.08, 0.06)
      c.rect(0.02, -0.06, 0.08, 0.06)
    })
    if (pen.lod <= 1) {
      line(pen, -0.13, -0.18, -0.19, -0.1, TOY.tinDeep, 0.03)
      line(pen, 0.13, -0.18, 0.19, -0.1, TOY.tinDeep, 0.03)
      rect(pen, -0.18, -0.2, 0.04, 0.08, TOY.yellow, 0.6)
    }
    rect(pen, -0.12, -0.22, 0.24, 0.16, TOY.tin)
    rect(pen, -0.09, -0.32, 0.18, 0.1, TOY.tin)
    if (pen.lod <= 1) {
      rect(pen, -0.06, -0.18, 0.12, 0.07, TOY.red, 0.6)
      line(pen, 0, -0.32, 0, -h - 0.02, TOY.ink, 0.015)
      circle(pen, 0, -h - 0.02, 0.022, TOY.red, 0)
      fillRects(pen, TOY.ink, (c) => {
        c.rect(-0.06, -0.29, 0.035, 0.03)
        c.rect(0.025, -0.29, 0.035, 0.03)
      })
    }
  },
}

/* ------------------------------------------------------------------ a ramen stand, at night */

const RAMEN = {
  night: '#1A1E30',
  star: '#E8E2C8',
  wood: '#7A5434',
  woodDeep: '#4E3420',
  roof: '#2A2422',
  inside: '#E8B26A',
  noren: '#2E4A8A',
  white: '#F2EEE4',
  lantern: '#D8342A',
  lanternLight: '#FF9A5A',
  cap: '#141210',
  pot: '#A0A6AC',
  potDeep: '#686E74',
  steam: '#F2F4F8',
  street: '#2E2A2C',
  streetEdge: '#3C3638',
  bowl: '#E9E3D6',
  bowlBand: '#B8342A',
  broth: '#E9B86A',
  chopstick: '#C9A06A',
  ink: '#0E0F16',
}

const STARS: readonly Pt[] = [[-2.9, -2.6], [-2.2, -2.75], [-1.5, -2.4], [-0.6, -2.7], [0.3, -2.5], [0.9, -2.8], [-2.6, -2.2], [-0.2, -2.25], [0.7, -2.1]]

const ramen: Skin = {
  key: 'ramen',
  bg: RAMEN.night,
  ink: RAMEN.ink,
  floor: RAMEN.street,
  edge: RAMEN.streetEdge,
  plank: RAMEN.wood,
  fulcrum: RAMEN.woodDeep,
  back(pen, m, _v) {
    // A few stars.
    if (pen.lod <= 1) fillRects(pen, RAMEN.star, (c) => {
      for (const [x, y] of STARS) c.rect(x, y, 0.03, 0.03)
    })
    // The stall on the right: its warm inside, the roof, the posts and the counter.
    glow(pen, 2.35, -1.3, 1.8, RAMEN.inside, 0.35)
    rect(pen, 1.55, -2.1, 1.8, 1.3, RAMEN.inside, 0)
    poly(pen, [[1.35, -2.05], [3.5, -2.05], [3.4, -2.4], [1.5, -2.4]], RAMEN.roof)
    fillRects(pen, RAMEN.woodDeep, (c) => {
      c.rect(1.52, -2.05, 0.07, 2.05)
      c.rect(3.1, -2.05, 0.07, 2.05)
    })
    rect(pen, 1.42, -0.82, 2.0, 0.1, RAMEN.wood, 0.8)
    rect(pen, 1.52, -0.72, 1.9, 0.72, RAMEN.woodDeep, 0.8)
    // The pot on the counter, and its steam rising.
    rect(pen, 2.25, -1.15, 0.5, 0.33, RAMEN.pot, 0.8)
    if (pen.lod <= 1) {
      rect(pen, 2.2, -1.18, 0.6, 0.05, RAMEN.potDeep, 0.6)
      fillRects(pen, rgba(RAMEN.steam, 0.55), (c) => {
        for (let k = 0; k < 3; k++) {
          const u = (m.t * 0.35 + k / 3) % 1
          const x = 2.5 + 0.08 * Math.sin(m.t * 1.5 + k * 2)
          const y = -1.25 - u * 0.75
          const r = 0.06 + 0.08 * u
          c.moveTo(x + r, y)
          c.arc(x, y, r, 0, Math.PI * 2)
        }
      })
    }
    // The noren, three panels hanging from the eave, stirring.
    for (let i = 0; i < 3; i++) {
      const x = 1.62 + i * 0.5
      const s = 0.03 * Math.sin(m.t * 0.9 + i * 1.3)
      poly(pen, [[x, -2.05], [x + 0.46, -2.05], [x + 0.46 + s, -1.5], [x + s, -1.5]], RAMEN.noren)
      if (pen.lod <= 1) circle(pen, x + 0.23 + s * 0.5, -1.75, 0.08, RAMEN.white, 0)
    }
    // The red lantern on the left, hung from its post, swinging a little.
    strokeLines(pen, RAMEN.woodDeep, 0.07, (c) => {
      c.moveTo(-2.7, 0)
      c.lineTo(-2.7, -2.25)
      c.lineTo(-1.95, -2.25)
    })
    glow(pen, -2.1, -1.65, 1.0, RAMEN.lanternLight, 0.45)
    at(pen, -2.1, -2.25, 0.04 * Math.sin(m.t * 0.7) + 0.06 * ring(m, 0.9, 0.5), 1, () => {
      if (pen.lod <= 1) line(pen, 0, 0, 0, 0.18, RAMEN.cap, 0.02)
      ellipse(pen, 0, 0.6, 0.27, 0.38, RAMEN.lantern)
      if (pen.lod === 0) strokeLines(pen, RAMEN.bowlBand, pen.lw * 0.8, (c) => {
        for (const y of [0.4, 0.52, 0.64, 0.76]) {
          const w = 0.27 * Math.sqrt(1 - ((y - 0.6) / 0.38) ** 2)
          c.moveTo(-w, y)
          c.lineTo(w, y)
        }
      })
      fillRects(pen, RAMEN.cap, (c) => {
        c.rect(-0.12, 0.2, 0.24, 0.06)
        c.rect(-0.12, 0.94, 0.24, 0.06)
      })
    })
  },
  front(pen, _m, _v) {
    // The lantern's light, wet on the street.
    if (pen.lod > 1) return
    ellipse(pen, -2.1, 0.3, 0.3, 0.06, rgba(RAMEN.lantern, 0.35), 0)
    ellipse(pen, 2.35, 0.25, 0.6, 0.05, rgba(RAMEN.inside, 0.2), 0)
  },
  weight(pen) {
    // A bowl of ramen, chopsticks across it.
    const h = WEIGHT_H
    if (pen.lod <= 1) strokeLines(pen, RAMEN.chopstick, 0.02, (c) => {
      c.moveTo(-0.06, -0.15)
      c.lineTo(0.08, -h)
      c.moveTo(-0.02, -0.15)
      c.lineTo(0.13, -h + 0.02)
    })
    rect(pen, -0.06, -0.03, 0.12, 0.03, RAMEN.bowl, 0.6)
    const { ctx } = pen
    ctx.beginPath()
    ctx.moveTo(-0.16, -0.17)
    ctx.ellipse(0, -0.17, 0.16, 0.14, 0, Math.PI, 0, true)
    ctx.closePath()
    finish(pen, RAMEN.bowl)
    if (pen.lod <= 1) line(pen, -0.15, -0.12, 0.15, -0.12, RAMEN.bowlBand, 0.025)
    ellipse(pen, 0, -0.17, 0.16, 0.03, RAMEN.broth, 0.6)
  },
}

/* ------------------------------------------------------------------ an ice-cream parlour */

const ICE = {
  cream: '#FDF0E6',
  pink: '#F7C6D3',
  pinkDeep: '#E89AB0',
  mint: '#A8DCCB',
  mintDeep: '#86C6B2',
  lemon: '#F8E4A0',
  choc: '#7A4A36',
  cone: '#D9A35E',
  coneDeep: '#B07E3E',
  cherry: '#C8233A',
  white: '#FFFFFF',
  glass: '#E2F0F2',
  pole: '#B9B4B8',
  ink: '#5A3A40',
}

const icecream: Skin = {
  key: 'icecream',
  bg: ICE.cream,
  ink: ICE.ink,
  floor: ICE.mint,
  edge: ICE.mintDeep,
  plank: ICE.pinkDeep,
  fulcrum: ICE.lemon,
  back(pen, m, v) {
    // Candy stripes up the wall.
    const s = 0.3
    fillRects(pen, ICE.pink, (c) => {
      for (let x = Math.floor(v.x0 / (2 * s)) * 2 * s; x < v.x1; x += 2 * s) c.rect(x, v.y0 - 0.1, s, -v.y0 + 0.1)
    })
    // The big cone sign on the left, on its pole, wobbling when the floor is struck.
    const sx = -2.15
    rect(pen, sx - 0.04, -0.9, 0.08, 0.9, ICE.pole, 0.7)
    at(pen, sx, -0.9, 0.05 * ring(m, 0.5, 0.4), 1, () => {
      poly(pen, [[0, 0], [0.3, -0.7], [-0.3, -0.7]], ICE.cone)
      if (pen.lod <= 1) strokeLines(pen, ICE.coneDeep, pen.lw * 1.2, (c) => {
        c.moveTo(-0.2, -0.6)
        c.lineTo(0.08, -0.2)
        c.moveTo(0.0, -0.7)
        c.lineTo(0.17, -0.42)
        c.moveTo(0.2, -0.6)
        c.lineTo(-0.08, -0.2)
        c.moveTo(0.0, -0.7)
        c.lineTo(-0.17, -0.42)
      })
      circle(pen, 0, -0.85, 0.3, ICE.pinkDeep)
      circle(pen, 0, -1.25, 0.26, ICE.mint)
      circle(pen, 0.04, -1.56, 0.08, ICE.cherry, 0.8)
    })
    // The freezer counter on the right, its glass top, and the tubs inside.
    const kx = 1.6
    rect(pen, kx, -0.75, v.x1 - kx + 0.2, 0.75, ICE.white)
    if (pen.lod <= 1) rect(pen, kx, -0.4, v.x1 - kx + 0.2, 0.08, ICE.pinkDeep, 0)
    poly(pen, [[kx, -0.75], [kx + 0.15, -1.15], [v.x1 + 0.1, -1.15], [v.x1 + 0.1, -0.75]], ICE.glass, 0.8)
    const tubs = [ICE.pinkDeep, ICE.choc, ICE.lemon, ICE.mint]
    tubs.forEach((t, i) => ellipse(pen, kx + 0.32 + i * 0.36, -0.88, 0.15, 0.06, t, 0.6))
  },
  weight(pen) {
    // A sundae: its tulip glass on a stem, two scoops, cream and a cherry, and a long spoon.
    const h = WEIGHT_H
    if (pen.lod <= 1) line(pen, 0.05, -0.18, 0.13, -h, ICE.pole, 0.02)
    ellipse(pen, 0, -0.015, 0.09, 0.02, ICE.glass, 0.6)
    rect(pen, -0.015, -0.1, 0.03, 0.09, ICE.glass, 0)
    circle(pen, -0.05, -0.2, 0.065, ICE.pinkDeep, 0.6)
    circle(pen, 0.05, -0.2, 0.065, ICE.choc, 0.6)
    poly(pen, [[-0.04, -0.09], [0.04, -0.09], [0.13, -0.2], [-0.13, -0.2]], ICE.glass)
    ellipse(pen, 0, -0.26, 0.07, 0.045, ICE.white, 0.6)
    circle(pen, 0, -0.31, 0.03, ICE.cherry, 0.6)
  },
}

export const SHOP_SKINS = { bakery, florist, barber, tailor, beekeeper, potter, painter, darkroom, clockmaker, toyshop, ramen, icecream } as const satisfies Record<string, Skin>
