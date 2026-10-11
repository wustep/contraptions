import { HOME, HOTDOG, STAR } from '../worlds'
import { at, beam, circle, ellipse, glow, hash, line, mix, poly, rect, rgba, round, type Pen } from './skins-pen'
import { flashOf, PL, ring, TH, WEIGHT_H, type Skin, type View } from './skins-kit'

/**
 * Worlds she never saw, far from the laundromat: under the sea, on the moon, a snowy night, a beach, the far north
 * under the lights, a desert at sundown, a cherry tree in spring, and a world folded out of paper. Each is the same
 * machine in one more place, with one big thing standing behind it and its own thing for the weight.
 *
 * Their colours are their own, kept as muted as the worlds of `worlds.ts`, and borrow from them where they can.
 */

/** A few stars, scattered over the sky above `y1`, the same every frame. */
function stars(pen: Pen, n: number, y1: number, colour: string, seed: number, a = 1): void {
  const { ctx } = pen
  ctx.fillStyle = rgba(colour, a)
  for (let i = 0; i < n; i++) {
    const s = 0.018 + 0.02 * hash(i, 1, seed)
    ctx.fillRect(-2.9 + 5.8 * hash(i, 2, seed) - s / 2, -2.6 + (y1 + 2.6) * hash(i, 3, seed), s, s)
  }
}

/** Fill the current path, and ink it where the lines show. */
function fillInk(pen: Pen, fill: string, ink = 1): void {
  const { ctx } = pen
  ctx.fillStyle = fill
  ctx.fill()
  if (ink > 0 && pen.lod <= 1) {
    ctx.strokeStyle = pen.ink
    ctx.lineWidth = pen.lw * ink
    ctx.stroke()
  }
}

/* ------------------------------------------------------------------ under the sea */

const SEA = {
  water: '#2F7385',
  shaft: '#CDEDE6',
  reef: '#245A6B',
  sand: '#D8C59B',
  sandDeep: '#B9A57C',
  kelp: '#5A9461',
  kelpDeep: '#3D7350',
  fish: '#E8873A',
  fin: '#F2B45C',
  bubble: '#D6EFEA',
  ink: '#11282F',
}

/** A strand of kelp, rooted at (x, 0), leaning `sway` at its tip and rippling along its length. */
function kelp(pen: Pen, x: number, h: number, w: number, sway: number, t: number, colour: string): void {
  const { ctx } = pen
  const n = pen.lod === 0 ? 12 : 6
  ctx.beginPath()
  for (let k = 0; k <= n; k++) {
    const s = k / n
    const dx = sway * s * s + 0.06 * s * Math.sin(s * 8 - t * 1.4 + x)
    ctx.lineTo(x + dx - w * (1 - 0.65 * s) * (1 + 0.4 * Math.sin(s * 15 + x)), -h * s)
  }
  for (let k = n; k >= 0; k--) {
    const s = k / n
    const dx = sway * s * s + 0.06 * s * Math.sin(s * 8 - t * 1.4 + x)
    ctx.lineTo(x + dx + w * (1 - 0.65 * s) * (1 + 0.4 * Math.sin(s * 15 + x + 1.6)), -h * s)
  }
  ctx.closePath()
  fillInk(pen, colour, 0.7)
}

const sea: Skin = {
  key: 'sea',
  bg: SEA.water,
  ink: SEA.ink,
  floor: SEA.sand,
  edge: SEA.sandDeep,
  plank: HOME.wood,
  fulcrum: SEA.reef,
  back(pen, m, v) {
    // Light coming down through the water from the surface.
    beam(pen, -0.7, v.y0 - 0.2, -1.5, 0, 0.5, 1.5, SEA.shaft, 0.14)
    beam(pen, 0.9, v.y0 - 0.2, 0.4, 0, 0.35, 1.1, SEA.shaft, 0.1)
    // The reef, low along the far floor.
    poly(pen, [[v.x0 - 0.2, 0], [v.x0 - 0.2, -0.5], [-2.4, -0.66], [-1.8, -0.42], [-1.2, -0.3], [1.1, -0.28], [1.6, -0.48], [2.2, -0.72], [v.x1 + 0.2, -0.56], [v.x1 + 0.2, 0]], SEA.reef, 0)
    // Kelp either side, swaying, and swung by the slams.
    const sw = 0.1 * Math.sin(m.t * 0.9) + ring(m, 0.8, 0.7) * 0.2
    if (pen.lod <= 1) {
      kelp(pen, -1.55, 1.25, 0.06, sw * 0.8, m.t, SEA.kelpDeep)
      kelp(pen, 2.25, 1.5, 0.06, sw * 0.8, m.t + 2, SEA.kelpDeep)
    }
    kelp(pen, -1.95, 1.9, 0.09, sw, m.t, SEA.kelp)
    kelp(pen, 1.75, 1.75, 0.08, sw, m.t + 1, SEA.kelp)
  },
  front(pen, m, v) {
    if (pen.lod > 1) return
    // Bubbles, rising off the kelp beds.
    const n = pen.lod === 0 ? 10 : 5
    pen.ctx.fillStyle = rgba(SEA.bubble, 0.55)
    for (let i = 0; i < n; i++) {
      const sp = 0.5 + 0.3 * hash(i, 1, 4)
      const y = -((m.t * sp + hash(i, 2, 4) * 9) % (-v.y0 + 0.3))
      const x = (i % 2 ? 1.95 : -1.8) + 0.6 * (hash(i, 3, 4) - 0.5) + 0.05 * Math.sin(m.t * 3 + i)
      pen.ctx.beginPath()
      pen.ctx.arc(x, y, 0.025 + 0.025 * hash(i, 4, 4), 0, Math.PI * 2)
      pen.ctx.fill()
    }
  },
  weight(pen) {
    // A goldfish, round, standing on its tail.
    poly(pen, [[-0.13, 0], [0, -0.05], [0.13, 0], [0.04, -0.12], [-0.04, -0.12]], SEA.fin, 0.7)
    circle(pen, 0, -0.215, 0.125, SEA.fish)
    if (pen.lod <= 1) {
      poly(pen, [[-0.08, -0.31], [-0.02, -0.36], [0.03, -0.33]], SEA.fin, 0.6)
      ellipse(pen, -0.03, -0.19, 0.05, 0.025, SEA.fin, 0.6, 0.6)
      circle(pen, 0.06, -0.25, 0.03, '#FFFFFF', 0.6)
      circle(pen, 0.068, -0.25, 0.014, SEA.ink, 0)
    }
  },
}

/* ------------------------------------------------------------------ the moon */

const MOON = {
  sky: '#0D0E15',
  dust: '#A4A39D',
  dustDeep: '#86857F',
  ridge: '#4F5056',
  ocean: '#3F7DBF',
  land: '#74A75C',
  cloud: '#F4F6F2',
  suit: '#F2F0EA',
  ring: '#9AA0A6',
  visor: STAR.gold,
  star: '#E9E6DC',
}

const moon: Skin = {
  key: 'moon',
  bg: MOON.sky,
  ink: MOON.star,
  floor: MOON.dust,
  edge: MOON.dustDeep,
  plank: MOON.ring,
  fulcrum: MOON.ridge,
  back(pen, m, v) {
    // Stars, brightening a little on the loud landings.
    if (pen.lod <= 1) stars(pen, pen.lod === 0 ? 11 : 6, -0.6, MOON.star, 11, 0.7 + 0.3 * flashOf(m, 0.9, 0.3))
    // The Earth, up over the far hills: blue, its land and its weather, in half shadow.
    const ex = -1.68
    const ey = -1.45
    const r = 0.36
    glow(pen, ex, ey, r * 1.9, MOON.ocean, 0.3)
    circle(pen, ex, ey, r, MOON.ocean, 0)
    if (pen.lod <= 1) {
      const { ctx } = pen
      ctx.save()
      ctx.beginPath()
      ctx.arc(ex, ey, r, 0, Math.PI * 2)
      ctx.clip()
      poly(pen, [[ex - 0.3, ey - 0.3], [ex - 0.05, ey - 0.28], [ex + 0.02, ey - 0.08], [ex - 0.12, ey + 0.05], [ex - 0.08, ey + 0.3], [ex - 0.24, ey + 0.2], [ex - 0.36, ey - 0.1]], MOON.land, 0)
      poly(pen, [[ex + 0.14, ey - 0.12], [ex + 0.32, ey - 0.2], [ex + 0.4, ey + 0.05], [ex + 0.22, ey + 0.16]], MOON.land, 0)
      if (pen.lod === 0) {
        line(pen, ex - 0.3, ey - 0.16, ex + 0.12, ey - 0.2, MOON.cloud, 0.04)
        line(pen, ex - 0.1, ey + 0.14, ex + 0.34, ey + 0.1, MOON.cloud, 0.035)
      }
      ellipse(pen, ex - 0.32, ey + 0.05, 0.3, 0.46, rgba(MOON.sky, 0.45), 0)
      ctx.restore()
      circle(pen, ex, ey, r, null, 0.8)
    }
    // The far hills, grey, low and round.
    poly(pen, [[v.x0 - 0.2, 0], [v.x0 - 0.2, -0.32], [-2.2, -0.46], [-1.5, -0.24], [-0.5, -0.18], [0.6, -0.2], [1.5, -0.42], [2.3, -0.34], [v.x1 + 0.2, -0.52], [v.x1 + 0.2, 0]], MOON.ridge, 0)
    // A lander on its legs, off to the right.
    if (pen.lod <= 1) {
      const lx = 1.9
      line(pen, lx - 0.2, -0.36, lx - 0.38, 0, MOON.ring, 0.035)
      line(pen, lx + 0.2, -0.36, lx + 0.38, 0, MOON.ring, 0.035)
      rect(pen, lx - 0.24, -0.62, 0.48, 0.3, MOON.visor, 0.8)
      poly(pen, [[lx - 0.18, -0.62], [lx + 0.18, -0.62], [lx + 0.12, -0.92], [lx - 0.14, -0.9]], MOON.suit, 0.8)
    }
  },
  front(pen, _m, v) {
    if (pen.lod > 1) return
    // Craters in the dust.
    for (const [x, y, r] of [[-2.05, 0.3, 0.34], [1.9, 0.45, 0.42], [-0.3, 0.62, 0.26]] as const) {
      if (y > v.y1 + 0.1) continue
      ellipse(pen, x, y, r, r * 0.2, MOON.dustDeep, 0.6)
      if (pen.lod === 0) ellipse(pen, x + r * 0.08, y + r * 0.04, r * 0.8, r * 0.13, mix(MOON.dustDeep, MOON.ridge, 0.4), 0)
    }
  },
  weight(pen) {
    // An astronaut's helmet, its gold visor down.
    rect(pen, -0.11, -0.06, 0.22, 0.06, MOON.ring, 0.7)
    circle(pen, 0, -0.2, 0.145, MOON.suit)
    ellipse(pen, 0.03, -0.205, 0.105, 0.08, MOON.visor, 0.7)
    if (pen.lod === 0) line(pen, -0.02, -0.25, 0.03, -0.27, '#FFFFFF', 0.018)
  },
}

/* ------------------------------------------------------------------ a snowy night */

const SNOW = {
  sky: '#1E2B46',
  hill: '#3A4D6E',
  pine: '#101B2A',
  snow: '#EEF2F5',
  snowDeep: '#C9D4E0',
  cabin: '#5A3A2E',
  lamp: '#F6C76A',
  coal: '#22262B',
  carrot: '#E8873A',
}

/** A pine, three tiers of it, from the ground at x. */
function pine(pen: Pen, x: number, h: number, w: number, colour: string): void {
  poly(pen, [[x - 0.04, 0], [x - 0.04, -h * 0.12], [x - w, -h * 0.12], [x - w * 0.4, -h * 0.42], [x - w * 0.8, -h * 0.42], [x - w * 0.3, -h * 0.7], [x - w * 0.55, -h * 0.7], [x, -h], [x + w * 0.55, -h * 0.7], [x + w * 0.3, -h * 0.7], [x + w * 0.8, -h * 0.42], [x + w * 0.4, -h * 0.42], [x + w, -h * 0.12], [x + 0.04, -h * 0.12], [x + 0.04, 0]], colour, 0)
}

const snow: Skin = {
  key: 'snow',
  bg: SNOW.sky,
  ink: '#E6ECF2',
  floor: SNOW.snow,
  edge: SNOW.snowDeep,
  plank: HOME.wood,
  fulcrum: SNOW.pine,
  back(pen, m, v) {
    // The far hills, snow under the night.
    poly(pen, [[v.x0 - 0.2, 0], [v.x0 - 0.2, -0.5], [-1.6, -0.3], [-0.2, -0.22], [1.2, -0.36], [v.x1 + 0.2, -0.62], [v.x1 + 0.2, 0]], SNOW.hill, 0)
    // Pines on the left, one behind the cabin.
    pine(pen, -2.05, 1.9, 0.5, SNOW.pine)
    pine(pen, -1.55, 1.15, 0.3, SNOW.pine)
    pine(pen, 2.4, 1.7, 0.45, SNOW.pine)
    // The cabin, its roof deep in snow and its window lit.
    const cx = 1.82
    rect(pen, cx - 0.36, -0.6, 0.72, 0.6, SNOW.cabin)
    const lit = 0.9 + 0.1 * Math.sin(m.t * 7) * Math.sin(m.t * 2.3)
    if (pen.lod <= 1) glow(pen, cx, -0.33, 0.6, SNOW.lamp, 0.35 * lit)
    rect(pen, cx - 0.12, -0.45, 0.24, 0.22, mix(SNOW.cabin, SNOW.lamp, lit), pen.lod <= 1 ? 0.6 : 0)
    poly(pen, [[cx - 0.5, -0.56], [cx, -0.98], [cx + 0.5, -0.56], [cx + 0.42, -0.52], [cx, -0.86], [cx - 0.42, -0.52]], SNOW.snow, 0.8)
    if (pen.lod === 0) line(pen, cx, -0.45, cx, -0.23, SNOW.cabin, 0.025)
  },
  board(pen) {
    // A plank with the snow lying along it.
    rect(pen, -PL, -TH / 2, 2 * PL, TH, HOME.wood)
    round(pen, -PL + 0.02, -TH / 2 - 0.04, 2 * PL - 0.04, 0.07, 0.035, SNOW.snow, pen.lod <= 1 ? 0.6 : 0)
  },
  front(pen, m, v) {
    if (pen.lod > 1) return
    // Snow, falling slowly and drifting.
    const n = pen.lod === 0 ? 18 : 8
    const { ctx } = pen
    ctx.fillStyle = SNOW.snow
    for (let i = 0; i < n; i++) {
      const sp = 0.35 + 0.25 * hash(i, 1, 6)
      const y = v.y0 + ((m.t * sp + hash(i, 2, 6) * 9) % (v.y1 - v.y0 + 0.2))
      const x = v.x0 + (v.x1 - v.x0) * hash(i, 3, 6) + 0.12 * Math.sin(m.t * 0.8 + i * 1.7)
      const s = 0.018 + 0.016 * hash(i, 4, 6)
      ctx.beginPath()
      ctx.arc(x, y, s, 0, Math.PI * 2)
      ctx.fill()
    }
  },
  weight(pen) {
    // A small snowman in a red scarf.
    circle(pen, 0, -0.105, 0.105, SNOW.snow)
    circle(pen, 0, -0.255, 0.075, SNOW.snow)
    if (pen.lod <= 1) {
      rect(pen, -0.07, -0.2, 0.14, 0.035, HOME.red, 0)
      poly(pen, [[0.03, -0.265], [0.11, -0.25], [0.03, -0.245]], SNOW.carrot, 0)
      circle(pen, -0.02, -0.28, 0.012, SNOW.coal, 0)
      circle(pen, 0.035, -0.285, 0.012, SNOW.coal, 0)
    }
  },
}

/* ------------------------------------------------------------------ a beach */

const BEACH = {
  sky: '#C3E5EE',
  sun: '#FBD970',
  sea: '#3E9DB8',
  seaDeep: '#2C7E9A',
  foam: '#F6F7EF',
  sand: '#EED9A6',
  sandDeep: '#DEC186',
  red: '#DE5B48',
  white: '#FBF7EC',
  pole: '#8A6A4A',
  bucket: '#3FA6A0',
  spade: HOTDOG.mustard,
  ink: '#253740',
}

const beach: Skin = {
  key: 'beach',
  bg: BEACH.sky,
  ink: BEACH.ink,
  floor: BEACH.sand,
  edge: BEACH.sandDeep,
  plank: BEACH.white,
  fulcrum: BEACH.pole,
  back(pen, m, v) {
    // The sun, high and big.
    glow(pen, 1.62, -1.55, 0.9, BEACH.sun, 0.45)
    circle(pen, 1.62, -1.55, 0.3, BEACH.sun, 0)
    // The sea, its far deep band, and the wave running up the sand.
    rect(pen, v.x0 - 0.1, -0.62, v.x1 - v.x0 + 0.2, 0.62, BEACH.sea, 0)
    rect(pen, v.x0 - 0.1, -0.62, v.x1 - v.x0 + 0.2, 0.16, BEACH.seaDeep, 0)
    if (pen.lod <= 1) {
      const { ctx } = pen
      const s = 0.36
      const off = (m.t * 0.12) % s
      ctx.beginPath()
      for (let x = v.x0 - 0.4 - off; x < v.x1 + 0.4; x += s) {
        ctx.moveTo(x, -0.1)
        ctx.quadraticCurveTo(x + s / 2, -0.2 - 0.03 * Math.sin(m.t * 1.5 + x), x + s, -0.1)
      }
      ctx.strokeStyle = BEACH.foam
      ctx.lineWidth = 0.04
      ctx.stroke()
      if (pen.lod === 0) for (const [x, y] of [[0.9, -0.38], [1.5, -0.3], [2.3, -0.42], [-0.4, -0.34]] as const) line(pen, x, y, x + 0.22, y, BEACH.foam, 0.02)
    }
    // A striped umbrella, stuck in the sand on the left, ruffled by the landings.
    const ux = -1.75
    const wob = ring(m, 0.5, 0.4) * 0.05
    line(pen, ux + 0.1, 0, ux - 0.08, -1.3, BEACH.pole, 0.05)
    at(pen, ux - 0.08, -1.3, -0.14 + wob, 1, () => {
      const { ctx } = pen
      const rx = 0.66
      const ry = 0.34
      ctx.beginPath()
      ctx.ellipse(0, 0.04, rx, ry, 0, Math.PI, Math.PI * 2)
      ctx.closePath()
      fillInk(pen, BEACH.white, 0.8)
      if (pen.lod <= 2) {
        ctx.fillStyle = BEACH.red
        for (let i = 0; i < 6; i += 2) {
          ctx.beginPath()
          ctx.moveTo(0, 0.04)
          ctx.ellipse(0, 0.04, rx, ry, 0, Math.PI + (i * Math.PI) / 6, Math.PI + ((i + 1) * Math.PI) / 6)
          ctx.closePath()
          ctx.fill()
        }
      }
    })
  },
  board(pen) {
    // A surfboard, with its stripe.
    round(pen, -PL, -TH / 2, 2 * PL, TH, TH / 2, BEACH.white)
    if (pen.lod <= 1) rect(pen, -PL + 0.1, -0.012, 2 * PL - 0.2, 0.024, BEACH.red, 0)
  },
  weight(pen) {
    // A sand bucket, a spade stuck in it.
    if (pen.lod <= 1) {
      line(pen, 0.02, -0.18, 0.1, -0.33, BEACH.spade, 0.03)
      poly(pen, [[0.08, -0.31], [0.14, -0.35], [0.13, -0.27]], BEACH.spade, 0.6)
    }
    poly(pen, [[-0.1, 0], [0.1, 0], [0.13, -0.22], [-0.13, -0.22]], BEACH.bucket)
    if (pen.lod <= 1) {
      rect(pen, -0.135, -0.24, 0.27, 0.035, mix(BEACH.bucket, BEACH.white, 0.4), 0.6)
      pen.ctx.beginPath()
      pen.ctx.arc(0, -0.2, 0.12, Math.PI * 1.1, Math.PI * 1.9)
      pen.ctx.strokeStyle = pen.ink
      pen.ctx.lineWidth = pen.lw * 0.8
      pen.ctx.stroke()
    }
  },
}

/* ------------------------------------------------------------------ the far north, under the lights */

const NORTH = {
  sky: '#0E2A33',
  hill: '#284A57',
  green: '#7BE3A6',
  teal: '#5CCBB6',
  violet: '#A88BE0',
  tundra: '#BCD3DE',
  tundraDeep: '#94B2C2',
  igloo: '#E2ECF1',
  door: '#183440',
  tent: '#C7653F',
  brass: STAR.brass,
  flame: '#FFD166',
  glass: '#FFF1C9',
  star: '#E4EFEA',
}

/** A curtain of the lights: a band across the sky, waving, taller in some places than others. */
function curtain(pen: Pen, v: View, y: number, amp: number, tall: number, phase: number, t: number, colour: string, a: number): void {
  const { ctx } = pen
  const n = pen.lod === 0 ? 14 : 8
  const x0 = v.x0 - 0.3
  const dx = (v.x1 - v.x0 + 0.6) / n
  ctx.beginPath()
  for (let k = 0; k <= n; k++) {
    const x = x0 + k * dx
    ctx.lineTo(x, y + amp * Math.sin(x * 1.1 + phase + t * 0.3) - tall * (0.55 + 0.45 * Math.sin(x * 2.1 + phase * 2 + t * 0.45)))
  }
  for (let k = n; k >= 0; k--) {
    const x = x0 + k * dx
    ctx.lineTo(x, y + amp * Math.sin(x * 1.1 + phase + t * 0.3))
  }
  ctx.closePath()
  ctx.fillStyle = rgba(colour, a)
  ctx.fill()
}

const aurora: Skin = {
  key: 'aurora',
  bg: NORTH.sky,
  ink: NORTH.star,
  floor: NORTH.tundra,
  edge: NORTH.tundraDeep,
  plank: NORTH.tundraDeep,
  fulcrum: NORTH.hill,
  back(pen, m, v) {
    if (pen.lod <= 1) stars(pen, pen.lod === 0 ? 10 : 5, -0.8, NORTH.star, 23, 0.6)
    // The lights, in curtains across the top of the sky, brightening on the loud landings.
    const f = flashOf(m, 1.0, 0.4)
    curtain(pen, v, -1.5, 0.16, 0.45, 0, m.t, NORTH.green, 0.32 + 0.25 * f)
    curtain(pen, v, -1.85, 0.12, 0.38, 2.1, m.t, NORTH.violet, 0.26 + 0.2 * f)
    if (pen.lod <= 1) curtain(pen, v, -1.25, 0.1, 0.22, 4.3, m.t, NORTH.teal, 0.16 + 0.2 * f)
    // The far hills.
    poly(pen, [[v.x0 - 0.2, 0], [v.x0 - 0.2, -0.42], [-1.8, -0.28], [-0.4, -0.2], [1.0, -0.3], [2.0, -0.5], [v.x1 + 0.2, -0.36], [v.x1 + 0.2, 0]], NORTH.hill, 0)
    // An igloo on the left, its door toward us.
    const ix = -1.88
    const { ctx } = pen
    ctx.beginPath()
    ctx.ellipse(ix, 0, 0.58, 0.5, 0, Math.PI, Math.PI * 2)
    ctx.closePath()
    fillInk(pen, NORTH.igloo, 0.8)
    if (pen.lod === 0) {
      ctx.beginPath()
      for (const f of [0.35, 0.68]) {
        ctx.moveTo(ix - 0.58 * Math.sqrt(1 - f * f), -0.5 * f)
        ctx.lineTo(ix + 0.58 * Math.sqrt(1 - f * f), -0.5 * f)
      }
      ctx.strokeStyle = NORTH.tundraDeep
      ctx.lineWidth = pen.lw * 0.8
      ctx.stroke()
    }
    round(pen, ix + 0.22, -0.26, 0.36, 0.26, 0.12, NORTH.igloo, 0.8)
    if (pen.lod <= 1) round(pen, ix + 0.4, -0.2, 0.14, 0.2, 0.07, NORTH.door, 0)
    // A small tent on the right.
    if (pen.lod <= 1) {
      poly(pen, [[1.6, 0], [1.98, -0.6], [2.36, 0]], NORTH.tent, 0.8)
      poly(pen, [[1.9, 0], [1.98, -0.3], [2.06, 0]], NORTH.door, 0)
    }
  },
  weight(pen) {
    // A brass oil lantern, lit.
    const h = WEIGHT_H
    if (pen.lod <= 1) glow(pen, 0, -h * 0.48, 0.4, NORTH.flame, 0.4)
    rect(pen, -0.1, -0.05, 0.2, 0.05, NORTH.brass, 0.7)
    round(pen, -0.075, -h * 0.72, 0.15, h * 0.72 - 0.05, 0.04, NORTH.glass, 0.8)
    ellipse(pen, 0, -h * 0.42, 0.025, 0.05, NORTH.flame, 0)
    poly(pen, [[-0.1, -h * 0.72], [0.1, -h * 0.72], [0.05, -h * 0.86], [-0.05, -h * 0.86]], NORTH.brass, 0.7)
    if (pen.lod <= 1) {
      pen.ctx.beginPath()
      pen.ctx.arc(0, -h * 0.86, 0.06, Math.PI, Math.PI * 2)
      pen.ctx.strokeStyle = NORTH.brass
      pen.ctx.lineWidth = 0.022
      pen.ctx.stroke()
    }
  },
}

/* ------------------------------------------------------------------ the desert, at sundown */

const WEST = {
  plum: '#6A2E58',
  magenta: '#B4487A',
  coral: '#E57A62',
  apricot: '#F3B478',
  gold: '#F8D898',
  sun: '#FDEBB8',
  mesa: '#5A2843',
  mesaFar: '#8E4260',
  cactus: '#3A2131',
  dust: '#D27E48',
  dustDeep: '#B5623A',
  boot: '#8A4A2A',
  bootDeep: '#5E2F1A',
  weed: '#7A5236',
  ink: '#2E1622',
}

const western: Skin = {
  key: 'western',
  bg: WEST.gold,
  ink: WEST.ink,
  floor: WEST.dust,
  edge: WEST.dustDeep,
  plank: WEST.boot,
  fulcrum: WEST.mesa,
  back(pen, m, v) {
    // The sky in its bands, going down from the plum overhead to the gold over the ground.
    const w = v.x1 - v.x0 + 0.2
    rect(pen, v.x0 - 0.1, v.y0 - 0.1, w, -2.2 - v.y0 + 0.1, WEST.plum, 0)
    rect(pen, v.x0 - 0.1, -2.2, w, 0.4, WEST.magenta, 0)
    rect(pen, v.x0 - 0.1, -1.8, w, 0.45, WEST.coral, 0)
    rect(pen, v.x0 - 0.1, -1.35, w, 0.55, WEST.apricot, 0)
    // The sun going down between the mesas.
    circle(pen, 1.3, -0.5, 0.38, WEST.sun, 0)
    // Mesas: a far one on the right, a near one on the left.
    poly(pen, [[1.95, 0], [2.1, -0.82], [2.3, -0.9], [v.x1 + 0.2, -0.9], [v.x1 + 0.2, 0]], WEST.mesaFar, 0)
    poly(pen, [[v.x0 - 0.2, 0], [v.x0 - 0.2, -1.3], [-2.2, -1.3], [-2.05, -1.18], [-1.95, -0.7], [-1.72, -0.55], [-1.5, 0]], WEST.mesa, 0)
    // A saguaro, arms up, on the right.
    const cx = 1.85
    round(pen, cx - 0.09, -1.55, 0.18, 1.55, 0.09, WEST.cactus, 0)
    round(pen, cx - 0.36, -1.12, 0.14, 0.5, 0.07, WEST.cactus, 0)
    round(pen, cx - 0.36, -0.72, 0.3, 0.13, 0.065, WEST.cactus, 0)
    round(pen, cx + 0.2, -1.3, 0.14, 0.58, 0.07, WEST.cactus, 0)
    round(pen, cx, -0.84, 0.34, 0.13, 0.065, WEST.cactus, 0)
    // A tumbleweed, rolling along, and hopping when the ground is struck.
    if (pen.lod <= 1) {
      const span = 7.2
      const x = 3.6 - ((m.t * 0.45) % span)
      const r = 0.13
      const y = -r - Math.abs(ring(m, 0.5, 0.3)) * 0.18
      at(pen, x, y, -x / r, 1, () => {
        circle(pen, 0, 0, r, rgba(WEST.weed, 0.35), 0.7)
        if (pen.lod === 0) {
          ellipse(pen, 0, 0, r * 0.9, r * 0.4, null, 0.6)
          ellipse(pen, 0, 0, r * 0.4, r * 0.9, null, 0.6, 0.6)
        }
      })
    }
  },
  weight(pen) {
    // A cowboy boot, stitched, on its heel.
    const h = WEIGHT_H
    poly(pen, [[-0.11, 0], [-0.11, -h], [0.04, -h], [0.035, -0.13], [0.12, -0.09], [0.2, -0.035], [0.19, 0]], WEST.boot)
    rect(pen, -0.11, -0.04, 0.08, 0.04, WEST.bootDeep, pen.lod <= 1 ? 0.6 : 0)
    if (pen.lod <= 1) {
      poly(pen, [[-0.11, -h], [0.04, -h], [0.04, -h * 0.82], [-0.035, -h * 0.9], [-0.11, -h * 0.82]], WEST.bootDeep, 0.6)
      if (pen.lod === 0) line(pen, -0.07, -h * 0.65, -0.01, -h * 0.35, HOTDOG.mustard, 0.015)
    }
  },
}

/* ------------------------------------------------------------------ spring, under a cherry tree */

const SPRING = {
  dusk: '#C6CAE3',
  haze: '#AAB2D2',
  branch: '#4A3336',
  petal: '#F4BFCC',
  petalDeep: '#E393AA',
  petalLight: '#FBE3E8',
  moss: '#8DAE72',
  mossDeep: '#6E9158',
  fan: '#C9475E',
  fanLight: '#E07A8A',
  rib: '#7A4A26',
  ink: '#3A2E3E',
}

const BLOOMS: readonly (readonly [number, number, number])[] = [[-2.6, -2.12, 1], [-2.25, -1.86, 1.1], [-1.78, -1.7, 1], [-1.95, -1.3, 0.9], [-1.3, -1.9, 0.9], [-0.92, -2.0, 0.8]]

const blossom: Skin = {
  key: 'blossom',
  bg: SPRING.dusk,
  ink: SPRING.ink,
  floor: SPRING.moss,
  edge: SPRING.mossDeep,
  plank: SPRING.rib,
  fulcrum: SPRING.mossDeep,
  back(pen, m, v) {
    // Hills, far off in the dusk.
    poly(pen, [[v.x0 - 0.2, 0], [v.x0 - 0.2, -0.3], [-1.0, -0.5], [0.4, -0.28], [1.8, -0.62], [v.x1 + 0.2, -0.45], [v.x1 + 0.2, 0]], SPRING.haze, 0)
    // The branch, reaching in from the top corner, nodding on the landings, and its twigs.
    const nod = ring(m, 0.7, 0.6) * 0.04 + 0.015 * Math.sin(m.t * 0.7)
    const rx = -3.2
    const ry = -2.6
    at(pen, rx, ry, nod, 1, () => {
      const { ctx } = pen
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(-2.1 - rx, -1.35 - ry, -0.9 - rx, -2.0 - ry)
      ctx.strokeStyle = SPRING.branch
      ctx.lineWidth = 0.12
      ctx.stroke()
      if (pen.lod <= 1) {
        ctx.beginPath()
        ctx.moveTo(-1.84 - rx, -1.78 - ry)
        ctx.quadraticCurveTo(-1.8 - rx, -1.5 - ry, -1.95 - rx, -1.32 - ry)
        ctx.moveTo(-1.38 - rx, -1.82 - ry)
        ctx.lineTo(-1.3 - rx, -1.95 - ry)
        ctx.lineWidth = 0.05
        ctx.stroke()
      }
      ctx.lineCap = 'butt'
      // Its blossom, in clusters.
      for (let i = 0; i < BLOOMS.length; i++) {
        const [bx, by, s] = BLOOMS[i]
        const x = bx - rx
        const y = by - ry
        if (pen.lod === 0) {
          circle(pen, x - 0.07 * s, y + 0.02, 0.12 * s, SPRING.petalDeep, 0.6)
          circle(pen, x + 0.05 * s, y - 0.04, 0.11 * s, SPRING.petal, 0.6)
        } else circle(pen, x, y, 0.16 * s, SPRING.petal, pen.lod <= 1 ? 0.6 : 0)
      }
    })
  },
  front(pen, m, v) {
    if (pen.lod > 1) return
    // Petals drifting down across, blown about on the loud landings.
    const n = pen.lod === 0 ? 10 : 5
    const gust = flashOf(m, 1.0, 0.45)
    const { ctx } = pen
    ctx.fillStyle = SPRING.petal
    for (let i = 0; i < n; i++) {
      const sp = 0.3 + 0.2 * hash(i, 1, 8)
      const h = v.y1 - v.y0 + 0.4
      const y = v.y0 - 0.2 + ((m.t * sp + hash(i, 2, 8) * 9) % h)
      const x = v.x0 + (v.x1 - v.x0) * hash(i, 3, 8) + 0.25 * Math.sin(m.t * 0.9 + i * 2.3) + (y - v.y0) * 0.25 + gust * 0.35 * (hash(i, 4, 8) - 0.3)
      ctx.beginPath()
      ctx.ellipse(x, y, 0.045, 0.025, m.t * (1 + hash(i, 5, 8)) + i, 0, Math.PI * 2)
      ctx.fill()
    }
  },
  weight(pen) {
    // A paper fan, opened, standing on its rivet.
    const { ctx } = pen
    const r = WEIGHT_H - 0.02
    const a0 = -Math.PI / 2 - 0.85
    const a1 = -Math.PI / 2 + 0.85
    const n = pen.lod === 0 ? 6 : 1
    for (let i = 0; i < n; i++) {
      ctx.beginPath()
      ctx.arc(0, -0.02, r, a0 + ((a1 - a0) * i) / n, a0 + ((a1 - a0) * (i + 1)) / n)
      ctx.arc(0, -0.02, r * 0.3, a0 + ((a1 - a0) * (i + 1)) / n, a0 + ((a1 - a0) * i) / n, true)
      ctx.closePath()
      ctx.fillStyle = i % 2 ? SPRING.fanLight : SPRING.fan
      ctx.fill()
    }
    if (pen.lod <= 1) {
      ctx.beginPath()
      ctx.arc(0, -0.02, r, a0, a1)
      ctx.lineTo(0, -0.02)
      ctx.closePath()
      ctx.strokeStyle = pen.ink
      ctx.lineWidth = pen.lw * 0.8
      ctx.stroke()
    }
    poly(pen, [[-0.03, 0], [0.03, 0], [0.02, -0.1], [-0.02, -0.1]], SPRING.rib, pen.lod <= 1 ? 0.6 : 0)
  },
}

/* ------------------------------------------------------------------ a world folded out of paper */

const PAPER = {
  sky: '#7F98C6',
  cream: '#F3ECDD',
  creamShade: '#D3C8B2',
  blue: '#AFC2E2',
  blueShade: '#90A6CF',
  green: '#82B28C',
  greenShade: '#5E8E6B',
  sun: '#F2C14E',
  sunShade: '#D9A23A',
  floor: '#E9DFC9',
  floorShade: '#D4C6A8',
  kraft: '#C9A57A',
  kraftShade: '#AA875E',
  crane: '#E7B04A',
  craneShade: '#C68C35',
  ink: '#26324D',
}

/** A folded peak: a light face and a shaded one, meeting on the ridge from (px, py) down to (rx, 0). */
function peak(pen: Pen, l: number, px: number, py: number, rx: number, r: number, light: string, shade: string): void {
  poly(pen, [[l, 0], [px, py], [rx, 0]], light, 0.7)
  poly(pen, [[rx, 0], [px, py], [r, 0]], shade, 0.7)
}

const origami: Skin = {
  key: 'origami',
  bg: PAPER.sky,
  ink: PAPER.ink,
  floor: PAPER.floor,
  edge: PAPER.floorShade,
  plank: PAPER.kraft,
  fulcrum: PAPER.kraftShade,
  back(pen, m, _v) {
    // A paper sun, folded in eight.
    const sx = 1.6
    const sy = -1.62
    if (pen.lod <= 1) {
      const { ctx } = pen
      for (let h = 0; h < 2; h++) {
        ctx.beginPath()
        for (let k = 0; k <= 4; k++) {
          const a = Math.PI / 8 + ((h * 4 + k) * Math.PI) / 4
          ctx.lineTo(sx + Math.cos(a) * 0.3, sy + Math.sin(a) * 0.3)
        }
        ctx.lineTo(sx, sy)
        ctx.closePath()
        fillInk(pen, h ? PAPER.sun : PAPER.sunShade, 0.6)
      }
    } else circle(pen, sx, sy, 0.28, PAPER.sun, 0)
    // Mountains on the left, a far one in blue and a near one in cream.
    peak(pen, -3.3, -2.55, -1.5, -2.4, -1.75, PAPER.blue, PAPER.blueShade)
    peak(pen, -2.85, -1.85, -1.75, -1.7, -1.2, PAPER.cream, PAPER.creamShade)
    // Trees on the right, rocking a little when the ground is struck.
    const rock = ring(m, 0.45, 0.4) * 0.05
    for (const [x, h, w] of [[1.6, 0.95, 0.28], [2.08, 1.4, 0.38], [2.55, 1.0, 0.3]] as const) {
      at(pen, x, 0, rock * (h - 0.6), 1, () => {
        if (pen.lod <= 1) rect(pen, -0.04, -0.16, 0.08, 0.16, PAPER.kraftShade, 0.6)
        peak(pen, -w, 0, -h, 0, w, PAPER.green, PAPER.greenShade)
      })
    }
  },
  board(pen) {
    // A strip of kraft paper, folded along its length.
    rect(pen, -PL, -TH / 2, 2 * PL, TH, PAPER.kraft)
    if (pen.lod <= 1) rect(pen, -PL, 0, 2 * PL, TH / 2, PAPER.kraftShade, 0)
  },
  front(pen, _m, v) {
    if (pen.lod > 1) return
    // The ground's folds.
    const b = v.y1 + 0.1
    poly(pen, [[v.x0 - 0.1, 0.07], [-1.6, 0.07], [-2.4, b], [v.x0 - 0.1, b]], PAPER.floorShade, 0)
    poly(pen, [[0.4, b], [1.5, 0.07], [2.4, 0.07], [1.9, b]], PAPER.floorShade, 0)
  },
  weight(pen) {
    // A paper crane, its wings folded up.
    poly(pen, [[-0.13, -0.1], [0, 0], [0.13, -0.1], [0, -0.14]], PAPER.craneShade, 0.7)
    poly(pen, [[0.05, -0.11], [0.12, -0.1], [0.2, -0.31], [0.17, -0.31]], PAPER.crane, 0.6)
    poly(pen, [[0.17, -0.31], [0.2, -0.31], [0.23, -0.26]], PAPER.craneShade, 0.6)
    poly(pen, [[-0.05, -0.11], [-0.12, -0.1], [-0.22, -0.27]], PAPER.crane, 0.6)
    poly(pen, [[-0.06, -0.12], [0.06, -0.12], [-0.02, -0.34]], PAPER.crane, 0.7)
    if (pen.lod <= 1) poly(pen, [[-0.02, -0.34], [0.06, -0.12], [0.01, -0.12]], PAPER.craneShade, 0)
  },
}

/* ------------------------------------------------------------------ the table */

export const FAR_SKINS = { sea, moon, snow, beach, aurora, western, blossom, origami } as const satisfies Record<string, Skin>
