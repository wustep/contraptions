import { at, beam, circle, ellipse, glow, hash, knock, line, mix, poly, rect, rgba, round, type Pen, type Pt } from './skins-pen'
import { flashOf, ring, WEIGHT_H, type Skin, type View } from './skins-kit'

/**
 * Lives lived up high, or further out. Evelyn the geologist on Mars, a stranger on a planet with two moons, a hand
 * on a space station, a launch crew at the pad at dusk, a farmer under a saucer, an astronomer under her dome, a
 * watcher of the eclipse, a camper under a meteor shower, a balloonist at sunrise, a passenger on an airship, a
 * resident of the kingdom in the clouds, and a lighthouse keeper on her point. Each is one big silhouette at the side
 * or up high, a sky and a floor of its own, and a weight from its world; the same seesaw works in front of them all.
 */

/* ------------------------------------------------------------------ shared */

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

/** Where the stars are, laid once: over the whole frame, sized a little each. */
const STARS: readonly [number, number, number][] = Array.from({ length: 36 }, (_, i) => [-3.3 + 6.6 * hash(i, 2, 77), -2.9 + 2.4 * hash(i, 3, 77), 0.018 + 0.02 * hash(i, 1, 77)])

/** `n` of the stars over `y1`, one path, starting at the `from`th so two skins' skies differ. */
function stars(pen: Pen, n: number, from: number, y1: number, colour: string, a = 1): void {
  fillPath(pen, rgba(colour, a), (ctx) => {
    for (let k = 0; k < n; k++) {
      const [x, y, s] = STARS[(from + k) % STARS.length]
      if (y < y1) ctx.rect(x - s / 2, y - s / 2, s, s)
    }
  })
}

/** A bar of sky (or wall) across the whole view, from y0 to y1. */
function band(pen: Pen, v: View, y0: number, y1: number, fill: string): void {
  rect(pen, v.x0 - 0.1, y0, v.x1 - v.x0 + 0.2, y1 - y0, fill, 0)
}

/* ------------------------------------------------------------------ Mars */

const MARS = {
  sky: '#D6A25E',
  sun: '#F4E6C4',
  butte: '#A85B35',
  strata: '#94492A',
  dune: '#C68650',
  duneDeep: '#B5703F',
  sand: '#8C4325',
  sandEdge: '#A5552F',
  rover: '#ECE4D2',
  foil: '#C9A045',
  steel: '#7D7A76',
  wheel: '#3C3230',
  can: '#C9CED4',
  cap: '#7E858E',
  ink: '#3A2218',
}

const MARS_BUTTE: readonly Pt[] = [[-3.6, 0], [-3.6, -0.95], [-2.75, -1.05], [-2.55, -1.32], [-1.95, -1.32], [-1.8, -1.06], [-1.55, -0.72], [-1.38, -0.36], [-1.25, 0]]

const mars: Skin = {
  key: 'mars',
  bg: MARS.sky,
  ink: MARS.ink,
  floor: MARS.sand,
  edge: MARS.sandEdge,
  plank: MARS.steel,
  fulcrum: MARS.wheel,
  back(pen, m, v) {
    // A small pale sun, high and far.
    circle(pen, -0.6, -2.2, 0.1, MARS.sun, 0)
    // The far dunes, low across the whole plain.
    poly(pen, [[v.x0 - 0.2, 0], [v.x0 - 0.2, -0.44], [-0.9, -0.3], [0.2, -0.36], [1.2, -0.6], [2.3, -0.48], [v.x1 + 0.2, -0.6], [v.x1 + 0.2, 0]], MARS.dune, 0)
    // A butte on the left, banded.
    poly(pen, MARS_BUTTE, MARS.butte, 0.8)
    if (pen.lod === 0) strokeLines(pen, MARS.strata, pen.lw * 1.2, (ctx) => {
      ctx.moveTo(-2.7, -1.12)
      ctx.lineTo(-1.88, -1.12)
      ctx.moveTo(-3.4, -0.8)
      ctx.lineTo(-1.62, -0.8)
      ctx.moveTo(-3.4, -0.5)
      ctx.lineTo(-1.45, -0.5)
    })
    if (pen.lod <= 1) poly(pen, [[v.x0 - 0.2, 0], [v.x0 - 0.2, -0.18], [-0.6, -0.1], [1.0, -0.18], [2.0, -0.28], [v.x1 + 0.2, -0.16], [v.x1 + 0.2, 0]], MARS.duneDeep, 0)
    // The rover on the right, its mast head looking about, and nodding when the ground is struck.
    const x = 2.1
    if (pen.lod <= 1) strokeLines(pen, MARS.steel, 0.035, (ctx) => {
      ctx.moveTo(x - 0.36, -0.1)
      ctx.lineTo(x - 0.18, -0.28)
      ctx.lineTo(x + 0.36, -0.1)
      ctx.moveTo(x, -0.1)
      ctx.lineTo(x - 0.18, -0.28)
      ctx.moveTo(x - 0.22, -0.44)
      ctx.lineTo(x - 0.22, -0.9)
    })
    for (const wx of [-0.36, 0, 0.36]) circle(pen, x + wx, -0.1, 0.1, MARS.wheel, 0.7)
    rect(pen, x - 0.34, -0.42, 0.68, 0.18, MARS.foil, 0.8)
    rect(pen, x - 0.45, -0.47, 0.9, 0.05, MARS.rover, 0.7)
    at(pen, x - 0.22, -0.92, 0.25 * Math.sin(m.t * 0.4) + 0.3 * ring(m, 0.4, 0.5), 1, () => {
      rect(pen, -0.12, -0.06, 0.24, 0.11, MARS.rover, 0.7)
      if (pen.lod === 0) {
        circle(pen, 0.06, -0.005, 0.03, MARS.wheel, 0)
        circle(pen, -0.04, -0.005, 0.02, MARS.wheel, 0)
      }
    })
    if (pen.lod === 0) {
      line(pen, x + 0.25, -0.47, x + 0.32, -0.72, MARS.steel, 0.02)
      ellipse(pen, x + 0.32, -0.74, 0.06, 0.025, MARS.rover, 0.6, -0.3)
    }
  },
  front(pen, _m, v) {
    // Ripples in the dust.
    if (pen.lod > 0) return
    strokeLines(pen, MARS.strata, pen.lw * 1.1, (ctx) => {
      for (const [x, y] of [[-2.4, 0.22], [-0.6, 0.36], [1.5, 0.2], [2.6, 0.48], [-1.7, 0.6]] as const) {
        if (y > v.y1) continue
        ctx.moveTo(x - 0.35, y)
        ctx.quadraticCurveTo(x, y - 0.06, x + 0.35, y)
      }
    })
  },
  weight(pen) {
    // A sample canister, a red rock in its window.
    const h = WEIGHT_H
    rect(pen, -0.11, -0.04, 0.22, 0.04, MARS.cap, 0.7)
    round(pen, -0.085, -h + 0.05, 0.17, h - 0.09, 0.03, MARS.can)
    rect(pen, -0.045, -0.22, 0.09, 0.1, MARS.sand, 0.6)
    round(pen, -0.1, -h, 0.2, 0.07, 0.02, MARS.cap, 0.8)
    if (pen.lod === 0) line(pen, -0.06, -0.26, -0.06, -0.08, '#FFFFFF', 0.016)
  },
}

/* ------------------------------------------------------------------ a planet with two moons */

const ALIEN = {
  sky: '#6BC2D0',
  skyHigh: '#55A9C6',
  moon: '#F1BBD8',
  crater: '#D896BC',
  moonSmall: '#F7F1C6',
  hills: '#9061B2',
  ground: '#4A2C68',
  groundEdge: '#673E8C',
  stalk: '#5E2F86',
  bulb: '#C07AE6',
  bulbLit: '#F2CEFF',
  frond: '#7840A6',
  pod: '#B9F25E',
  podDeep: '#6FA83A',
  ink: '#25153A',
}

/** The tall flora on the left: where each stalk stands and where its bulb sways. */
const STALKS = [
  [-2.55, -2.62, -1.62, 0.26],
  [-2.05, -2.15, -2.02, 0.3],
  [-1.7, -1.62, -1.12, 0.19],
] as const

const alien: Skin = {
  key: 'alien',
  bg: ALIEN.sky,
  ink: ALIEN.ink,
  floor: ALIEN.ground,
  edge: ALIEN.groundEdge,
  plank: ALIEN.stalk,
  fulcrum: ALIEN.ground,
  back(pen, m, v) {
    if (pen.lod <= 1) band(pen, v, v.y0, -2.1, ALIEN.skyHigh)
    // Two moons: a big pink one on the right, a small pale one high in the middle.
    circle(pen, 1.95, -1.9, 0.46, ALIEN.moon, 0.8)
    if (pen.lod <= 1) {
      fillPath(pen, ALIEN.crater, (ctx) => {
        for (const [cx, cy, r] of [[1.78, -2.05, 0.1], [2.1, -1.72, 0.07], [2.15, -2.1, 0.05], [1.8, -1.68, 0.04]] as const) {
          ctx.moveTo(cx + r, cy)
          ctx.arc(cx, cy, r, 0, Math.PI * 2)
        }
      })
    }
    circle(pen, -0.5, -2.08, 0.13, ALIEN.moonSmall, 0.7)
    // The rolling purple hills.
    poly(pen, [[v.x0 - 0.2, 0], [v.x0 - 0.2, -0.5], [-2.3, -0.62], [-1.2, -0.3], [0.2, -0.24], [1.3, -0.46], [2.4, -0.38], [v.x1 + 0.2, -0.56], [v.x1 + 0.2, 0]], ALIEN.hills, 0)
    // The tall flora on the left: stalks with bulbs that sway, and light up on the loud landings.
    const f = flashOf(m, 0.9, 0.3)
    const sway = 0.06 * ring(m, 0.5, 0.5)
    strokeLines(pen, ALIEN.stalk, 0.065, (ctx) => {
      for (let i = 0; i < STALKS.length; i++) {
        const [bx, tx, ty] = STALKS[i]
        const dx = 0.04 * Math.sin(m.t * 0.9 + i * 2) + sway
        ctx.moveTo(bx, 0)
        ctx.quadraticCurveTo(bx + 0.25, ty * 0.5, tx + dx, ty)
      }
    })
    const lit = mix(ALIEN.bulb, ALIEN.bulbLit, 0.15 + 0.7 * f)
    for (let i = 0; i < STALKS.length; i++) {
      const [, tx, ty, r] = STALKS[i]
      const dx = 0.04 * Math.sin(m.t * 0.9 + i * 2) + sway
      ellipse(pen, tx + dx, ty - r * 0.6, r, r * 0.85, lit, 0.8)
      if (pen.lod === 0) ellipse(pen, tx + dx - r * 0.3, ty - r * 0.85, r * 0.25, r * 0.18, ALIEN.bulbLit, 0)
    }
    // Low fronds on the right, under the big moon.
    poly(pen, [[1.6, 0], [1.7, -0.5], [1.86, -0.18], [2.0, -0.78], [2.14, -0.2], [2.34, -0.62], [2.42, -0.16], [2.66, -0.46], [2.8, 0]], ALIEN.frond, 0.8)
  },
  weight(pen) {
    // A strange pod, glowing.
    const h = WEIGHT_H
    if (pen.lod <= 1) glow(pen, 0, -h * 0.5, 0.34, ALIEN.pod, 0.5)
    poly(pen, [[-0.05, 0], [0.05, 0], [0.03, -0.05], [-0.03, -0.05]], ALIEN.podDeep, 0.6)
    ellipse(pen, 0, -h * 0.55, 0.11, h * 0.43, ALIEN.pod, 0.8)
    if (pen.lod <= 1) strokeLines(pen, ALIEN.podDeep, 0.014, (ctx) => {
      ctx.moveTo(0, -h * 0.13)
      ctx.lineTo(0, -h * 0.97)
      ctx.moveTo(-0.06, -h * 0.2)
      ctx.quadraticCurveTo(-0.1, -h * 0.55, -0.06, -h * 0.9)
      ctx.moveTo(0.06, -h * 0.2)
      ctx.quadraticCurveTo(0.1, -h * 0.55, 0.06, -h * 0.9)
    })
  },
}

/* ------------------------------------------------------------------ a space station */

const STN = {
  wall: '#D6DBE1',
  panel: '#C3CAD2',
  seam: '#A3ADB8',
  frame: '#76818E',
  space: '#0A0E1C',
  earth: '#3B7BC4',
  land: '#78A85E',
  cloud: '#F2F5F7',
  rail: '#E2B23A',
  desk: '#3A4350',
  led: '#7FE0A8',
  floor: '#6A7480',
  floorEdge: '#848E9A',
  case: '#3D4E6C',
  ink: '#2A3038',
}

const STN_BOLTS: readonly Pt[] = Array.from({ length: 8 }, (_, i): Pt => [Math.cos((i / 8) * Math.PI * 2) * 0.66, Math.sin((i / 8) * Math.PI * 2) * 0.66])

const station: Skin = {
  key: 'station',
  bg: STN.wall,
  ink: STN.ink,
  floor: STN.floor,
  edge: STN.floorEdge,
  plank: STN.frame,
  fulcrum: STN.desk,
  back(pen, m, v) {
    // The panels of the hull, seamed.
    if (pen.lod <= 1) fillPath(pen, STN.panel, (ctx) => {
      for (let x = Math.floor(v.x0 / 1.0) * 1.0; x < v.x1; x += 1.0) {
        for (let y = -0.75; y > v.y0 - 0.75; y -= 0.75) ctx.rect(x + 0.05, y + 0.05, 0.9, 0.65)
      }
    })
    // The round window on the left, and the Earth turning under it.
    const wx = -2.05
    const wy = -1.35
    circle(pen, wx, wy, 0.74, STN.frame, 1)
    circle(pen, wx, wy, 0.58, STN.space, 0.8)
    const { ctx } = pen
    ctx.save()
    ctx.beginPath()
    ctx.arc(wx, wy, 0.58, 0, Math.PI * 2)
    ctx.clip()
    circle(pen, wx + 0.45, wy + 1.0, 1.0, STN.earth, 0)
    if (pen.lod <= 1) {
      const d = ((m.t * 0.05) % 1.2) - 0.6
      fillPath(pen, STN.land, (c) => {
        c.ellipse(wx + d, wy + 0.25, 0.28, 0.1, -0.3, 0, Math.PI * 2)
        c.moveTo(wx + d + 0.8, wy + 0.42)
        c.ellipse(wx + d + 0.62, wy + 0.42, 0.22, 0.08, 0.2, 0, Math.PI * 2)
        c.moveTo(wx + d - 0.4, wy + 0.5)
        c.ellipse(wx + d - 0.6, wy + 0.5, 0.2, 0.07, 0, 0, Math.PI * 2)
      })
      if (pen.lod === 0) strokeLines(pen, STN.cloud, 0.03, (c) => {
        c.moveTo(wx - 0.5, wy + 0.18)
        c.lineTo(wx - 0.1, wy + 0.12)
        c.moveTo(wx + 0.1, wy + 0.32)
        c.lineTo(wx + 0.5, wy + 0.24)
      })
    }
    ctx.restore()
    if (pen.lod === 0) fillPath(pen, STN.seam, (c) => {
      for (const [bx, by] of STN_BOLTS) {
        c.moveTo(wx + bx + 0.025, wy + by)
        c.arc(wx + bx, wy + by, 0.025, 0, Math.PI * 2)
      }
    })
    // A console on the right, its lights winking up on the loud landings, and a yellow handrail over it.
    rect(pen, 1.6, -1.2, 1.25, 0.7, STN.desk, 0.8)
    if (pen.lod <= 1) {
      const f = flashOf(m, 0.9, 0.3)
      fillPath(pen, rgba(STN.led, 0.45 + 0.55 * f), (c) => {
        for (let i = 0; i < 5; i++) c.rect(1.72 + i * 0.22, -1.08, 0.1, 0.06)
      })
      fillPath(pen, STN.seam, (c) => {
        c.rect(1.72, -0.9, 0.5, 0.26)
        c.rect(2.34, -0.9, 0.4, 0.26)
      })
    }
    rect(pen, 1.6, -1.58, 1.25, 0.06, STN.rail, 0.7)
    if (pen.lod <= 1) fillPath(pen, STN.rail, (c) => {
      c.rect(1.7, -1.52, 0.05, 0.12)
      c.rect(2.7, -1.52, 0.05, 0.12)
    })
    // A wrench, adrift, turning slowly high on the right.
    if (pen.lod <= 1) at(pen, 2.1 + 0.08 * Math.sin(m.t * 0.3), -2.1 + 0.06 * Math.sin(m.t * 0.5), m.t * 0.35, 1, () => {
      rect(pen, -0.22, -0.03, 0.36, 0.06, STN.frame, 0.6)
      circle(pen, 0.17, 0, 0.08, STN.frame, 0.6)
      circle(pen, 0.21, 0, 0.04, STN.wall, 0)
    })
  },
  weight(pen) {
    // A tool case, its handle up and its latches yellow.
    const h = WEIGHT_H
    if (pen.lod <= 1) {
      pen.ctx.beginPath()
      pen.ctx.moveTo(-0.07, -h + 0.08)
      pen.ctx.lineTo(-0.07, -h + 0.015)
      pen.ctx.lineTo(0.07, -h + 0.015)
      pen.ctx.lineTo(0.07, -h + 0.08)
      pen.ctx.strokeStyle = STN.ink
      pen.ctx.lineWidth = 0.035
      pen.ctx.stroke()
    } else rect(pen, -0.07, -h, 0.14, 0.04, STN.ink, 0)
    round(pen, -0.16, -h + 0.08, 0.32, h - 0.08, 0.03, STN.case)
    rect(pen, -0.11, -h + 0.13, 0.05, 0.05, STN.rail, 0.6)
    rect(pen, 0.06, -h + 0.13, 0.05, 0.05, STN.rail, 0.6)
    if (pen.lod === 0) line(pen, -0.16, -0.12, 0.16, -0.12, STN.frame, 0.014)
  },
}

/* ------------------------------------------------------------------ a launch pad at dusk */

const PAD = {
  sky: '#2F3D6B',
  mauve: '#6E5A86',
  low: '#D9AE90',
  shore: '#262A40',
  tower: '#272A36',
  body: '#ECEAE2',
  dark: '#24262E',
  pad: '#3C3C46',
  concrete: '#6A6664',
  concreteEdge: '#827D79',
  steam: '#F2F0EC',
  nose: '#3E6FB8',
  star: '#E8E4EE',
  ink: '#E8E4EE',
}

const rocket: Skin = {
  key: 'rocket',
  bg: PAD.sky,
  ink: PAD.ink,
  floor: PAD.concrete,
  edge: PAD.concreteEdge,
  plank: PAD.pad,
  fulcrum: PAD.tower,
  back(pen, m, v) {
    // Dusk: the last light low, mauve over it, the first stars.
    band(pen, v, -1.15, 0, PAD.mauve)
    band(pen, v, -0.5, 0, PAD.low)
    if (pen.lod <= 1) {
      stars(pen, pen.lod === 0 ? 10 : 5, 0, -1.6, PAD.star, 0.8)
      poly(pen, [[v.x0 - 0.2, 0], [v.x0 - 0.2, -0.12], [-1.2, -0.08], [0.6, -0.14], [v.x1 + 0.2, -0.1], [v.x1 + 0.2, 0]], PAD.shore, 0)
    }
    // The gantry, a lattice tower, with its arms out to the rocket.
    const gx = 1.58
    const gw = 0.24
    if (pen.lod === 2) rect(pen, gx, -2.55, gw, 2.55, PAD.tower, 0)
    else {
      strokeLines(pen, PAD.tower, 0.045, (ctx) => {
        ctx.moveTo(gx, 0)
        ctx.lineTo(gx, -2.55)
        ctx.moveTo(gx + gw, 0)
        ctx.lineTo(gx + gw, -2.55)
        for (let y = 0; y > -2.5; y -= 0.3) {
          ctx.moveTo(gx, y)
          ctx.lineTo(gx + gw, y - 0.3)
          ctx.moveTo(gx + gw, y)
          ctx.lineTo(gx, y - 0.3)
        }
      })
      fillPath(pen, PAD.tower, (ctx) => {
        ctx.rect(gx - 0.04, -2.6, gw + 0.08, 0.08)
        ctx.rect(gx + gw, -2.08, 0.28, 0.05)
        ctx.rect(gx + gw, -1.28, 0.28, 0.05)
      })
    }
    // The rocket, on its pad.
    const x = 2.3
    const w = 0.36
    rect(pen, x - 0.48, -0.4, 0.96, 0.4, PAD.pad, 0.8)
    poly(pen, [[x - w / 2, -0.75], [x - w / 2 - 0.16, -0.42], [x + w / 2 + 0.16, -0.42], [x + w / 2, -0.75]], PAD.dark, 0.8)
    rect(pen, x - w / 2, -2.4, w, 1.98, PAD.body, 0.8)
    poly(pen, [[x - w / 2, -2.4], [x - w / 4, -2.68], [x, -2.85], [x + w / 4, -2.68], [x + w / 2, -2.4]], PAD.body, 0.8)
    if (pen.lod <= 1) fillPath(pen, PAD.dark, (ctx) => {
      ctx.rect(x - w / 2, -1.6, w, 0.08)
      ctx.rect(x - w / 2, -2.4, w, 0.06)
      ctx.rect(x - w / 2, -1.0, w, 0.05)
    })
    // Vapour off the pad, gathering into a cloud of steam on the loud landings.
    const k = knock(m.since, 0.7) * Math.min(1, m.s / 1.4)
    if (k > 0.02) {
      const grow = 1 - k
      fillPath(pen, rgba(PAD.steam, 0.8 * k), (ctx) => {
        for (const [dx, dy, r] of [[-0.3, -0.18, 0.2], [0.05, -0.24, 0.26], [0.36, -0.16, 0.2]] as const) {
          const R = r * (0.7 + 1.1 * grow)
          ctx.moveTo(x + dx * (1 + grow) + R, -0.1 + dy * (1 + grow))
          ctx.arc(x + dx * (1 + grow), -0.1 + dy * (1 + grow), R, 0, Math.PI * 2)
        }
      })
    }
    if (pen.lod === 0) {
      const u = (m.t * 0.4) % 1
      circle(pen, x + 0.3 + 0.15 * u, -0.45 - 0.5 * u, 0.06 + 0.1 * u, rgba(PAD.steam, 0.45 * (1 - u)), 0)
    }
  },
  weight(pen) {
    // A model rocket, on its fins.
    const h = WEIGHT_H
    poly(pen, [[-0.05, -0.1], [-0.11, 0], [0.11, 0], [0.05, -0.1]], PAD.nose, 0.7)
    rect(pen, -0.05, -h + 0.08, 0.1, h - 0.08, PAD.body, 0.8)
    poly(pen, [[-0.05, -h + 0.08], [0, -h], [0.05, -h + 0.08]], PAD.nose, 0.7)
    if (pen.lod <= 1) circle(pen, 0, -0.18, 0.022, PAD.nose, 0)
  },
}

/* ------------------------------------------------------------------ a farm, and a saucer over it */

const FARM = {
  sky: '#0F2135',
  hills: '#1B3427',
  field: '#2C3A20',
  fieldEdge: '#3A4A2A',
  barn: '#7C2E28',
  roof: '#3E2A2A',
  trim: '#E9E2D2',
  silo: '#8E9298',
  siloCap: '#5F656C',
  loft: '#F2D27A',
  ufo: '#AEB6BE',
  dome: '#9BE4D2',
  beam: '#D2F7A2',
  light: '#F7E38A',
  hay: '#D8B460',
  star: '#E6EBF0',
  churn: '#BCC2C8',
  churnDeep: '#7E868E',
  ink: '#E3E8EE',
}

const ufo: Skin = {
  key: 'ufo',
  bg: FARM.sky,
  ink: FARM.ink,
  floor: FARM.field,
  edge: FARM.fieldEdge,
  plank: FARM.roof,
  fulcrum: FARM.siloCap,
  back(pen, m, v) {
    if (pen.lod <= 1) stars(pen, pen.lod === 0 ? 12 : 6, 4, -0.8, FARM.star, 0.7)
    poly(pen, [[v.x0 - 0.2, 0], [v.x0 - 0.2, -0.36], [-1.6, -0.5], [-0.2, -0.26], [1.2, -0.4], [v.x1 + 0.2, -0.3], [v.x1 + 0.2, 0]], FARM.hills, 0)
    // The silo on the left.
    rect(pen, -2.55, -1.55, 0.5, 1.55, FARM.silo, 0.8)
    ellipse(pen, -2.3, -1.55, 0.25, 0.2, FARM.siloCap, 0.8)
    if (pen.lod === 0) strokeLines(pen, FARM.siloCap, pen.lw, (ctx) => {
      for (const y of [-1.2, -0.85, -0.5]) {
        ctx.moveTo(-2.55, y)
        ctx.lineTo(-2.05, y)
      }
    })
    // The saucer, hovering over the barn, its beam on the roof: brighter on the loud landings.
    const f = flashOf(m, 0.9, 0.35)
    const ux = 2.22 + 0.06 * Math.sin(m.t * 0.7)
    const uy = -1.98 + 0.04 * Math.sin(m.t * 1.1)
    beam(pen, ux, uy + 0.06, 2.22, -1.0, 0.3, 1.05, FARM.beam, 0.42 + 0.3 * f)
    // The barn: red, a gambrel roof, white trim, and a lit loft.
    rect(pen, 1.68, -0.78, 1.1, 0.78, FARM.barn, 0.8)
    poly(pen, [[1.6, -0.76], [1.76, -1.12], [2.23, -1.32], [2.7, -1.12], [2.86, -0.76]], FARM.roof, 0.8)
    rect(pen, 2.1, -1.05, 0.24, 0.18, FARM.loft, 0.6)
    if (pen.lod <= 1) {
      rect(pen, 1.98, -0.52, 0.5, 0.52, FARM.roof, 0)
      strokeLines(pen, FARM.trim, 0.03, (ctx) => {
        ctx.rect(1.98, -0.52, 0.5, 0.52)
        ctx.moveTo(1.98, -0.52)
        ctx.lineTo(2.48, 0)
        ctx.moveTo(2.48, -0.52)
        ctx.lineTo(1.98, 0)
      })
    }
    // A bale of hay, rising in the beam.
    if (pen.lod === 0) {
      const u = (m.t * 0.12) % 1
      at(pen, 2.22, -1.4 - 0.45 * u, u * 2.4, 1, () => rect(pen, -0.06, -0.04, 0.12, 0.08, rgba(FARM.hay, Math.min(1, (1 - u) * 3)), 0))
    }
    ellipse(pen, ux, uy - 0.06, 0.18, 0.13, FARM.dome, 0.7)
    ellipse(pen, ux, uy, 0.5, 0.1, FARM.ufo, 0.8)
    if (pen.lod === 0) for (let i = 0; i < 5; i++) {
      const on = 0.5 + 0.5 * Math.sin(m.t * 3 - i * 1.3)
      circle(pen, ux - 0.34 + i * 0.17, uy + 0.03, 0.025, rgba(FARM.light, 0.3 + 0.7 * on), 0)
    }
  },
  weight(pen) {
    // A milk churn.
    const h = WEIGHT_H
    poly(pen, [[-0.11, 0], [0.11, 0], [0.11, -0.19], [0.06, -0.26], [0.06, -h + 0.04], [-0.06, -h + 0.04], [-0.06, -0.26], [-0.11, -0.19]], FARM.churn)
    round(pen, -0.08, -h, 0.16, 0.05, 0.02, FARM.churnDeep, 0.7)
    if (pen.lod <= 1) {
      rect(pen, -0.11, -0.06, 0.22, 0.025, FARM.churnDeep, 0)
      strokeLines(pen, FARM.churnDeep, 0.02, (ctx) => {
        ctx.moveTo(-0.06, -0.24)
        ctx.lineTo(-0.12, -0.24)
        ctx.lineTo(-0.12, -0.19)
        ctx.moveTo(0.06, -0.24)
        ctx.lineTo(0.12, -0.24)
        ctx.lineTo(0.12, -0.19)
      })
    }
  },
}

/* ------------------------------------------------------------------ an observatory */

const OBS = {
  wall: '#5C6576',
  drum: '#475062',
  rib: '#4A5363',
  slit: '#0D1328',
  star: '#EEF0F6',
  tube: '#E6E2D8',
  tubeDeep: '#B9B4A8',
  mount: '#2E333D',
  floor: '#6B4D35',
  floorEdge: '#52392A',
  brass: '#C99B40',
  brassDeep: '#8E6A28',
  sun: '#F2C14E',
  planet: '#6E9BC9',
  ink: '#1F232B',
}

/** Stars seen through the slit: across it, and down it. */
const SLIT_STARS: readonly Pt[] = Array.from({ length: 10 }, (_, i): Pt => [hash(i, 1, 31), -2.9 + 1.05 * hash(i, 2, 31)])

const observatory: Skin = {
  key: 'observatory',
  bg: OBS.wall,
  ink: OBS.ink,
  floor: OBS.floor,
  edge: OBS.floorEdge,
  plank: OBS.tubeDeep,
  fulcrum: OBS.mount,
  back(pen, m, v) {
    // The drum wall below, and the dome's ribs above it, leaning in to the top.
    band(pen, v, -0.95, 0, OBS.drum)
    if (pen.lod <= 1) strokeLines(pen, OBS.rib, 0.05, (ctx) => {
      for (const x of [-3.0, -2.2, -1.4, 1.4, 2.2, 3.0]) {
        ctx.moveTo(x, -0.95)
        ctx.lineTo(x * 0.35, v.y0 - 0.2)
      }
      ctx.moveTo(v.x0, -0.95)
      ctx.lineTo(v.x1, -0.95)
    })
    // The slit, open on the stars, which wheel slowly past.
    poly(pen, [[-0.6, v.y0 - 0.1], [0.6, v.y0 - 0.1], [0.42, -1.8], [-0.42, -1.8]], OBS.slit, 1)
    if (pen.lod <= 1) fillPath(pen, OBS.star, (ctx) => {
      for (const [h, y] of SLIT_STARS) {
        if (y < v.y0 || y > -1.86) continue
        const half = 0.38 + 0.15 * (-1.8 - y)
        const x = -half + ((h + m.t * 0.015) % 1) * 2 * half
        ctx.rect(x - 0.012, y - 0.012, 0.024, 0.024)
      }
    })
    // The telescope on its pier, on the right, looking up at the slit and tracking.
    rect(pen, 2.1, -1.05, 0.3, 1.05, OBS.mount, 0.8)
    poly(pen, [[2.0, -1.0], [2.5, -1.0], [2.42, -1.3], [2.08, -1.3]], OBS.mount, 0.8)
    const a = Math.atan2(-1.35, -1.95) + 0.03 * Math.sin(m.t * 0.2)
    at(pen, 2.25, -1.25, a, 1, () => {
      rect(pen, -0.6, -0.2, 2.25, 0.4, OBS.tube, 1)
      rect(pen, 1.25, -0.22, 0.42, 0.44, OBS.tubeDeep, 1)
      if (pen.lod <= 1) {
        rect(pen, -0.75, -0.06, 0.15, 0.12, OBS.mount, 0.6)
        rect(pen, 0.2, -0.2, 0.08, 0.4, OBS.tubeDeep, 0)
      }
      if (pen.lod === 0) rect(pen, 0.05, -0.32, 0.6, 0.1, OBS.tubeDeep, 0.6)
    })
  },
  front(pen, _m, v) {
    // The floorboards.
    if (pen.lod > 0) return
    strokeLines(pen, OBS.floorEdge, pen.lw, (ctx) => {
      for (let y = 0.22; y < v.y1; y += 0.18) {
        ctx.moveTo(v.x0, y)
        ctx.lineTo(v.x1, y)
      }
    })
  },
  weight(pen) {
    // A brass orrery: the sun on its stem, a ring, a world on the ring.
    const h = WEIGHT_H
    round(pen, -0.12, -0.05, 0.24, 0.05, 0.015, OBS.brassDeep, 0.7)
    rect(pen, -0.015, -0.2, 0.03, 0.15, OBS.brass, 0)
    if (pen.lod <= 1) {
      pen.ctx.beginPath()
      pen.ctx.ellipse(0, -0.21, 0.15, 0.045, 0, 0, Math.PI * 2)
      pen.ctx.strokeStyle = OBS.brass
      pen.ctx.lineWidth = 0.02
      pen.ctx.stroke()
      circle(pen, 0.13, -0.19, 0.03, OBS.planet, 0.5)
    }
    circle(pen, 0, -0.24, 0.07, OBS.sun, 0.7)
    circle(pen, 0, -h + 0.015, 0.018, OBS.brass, 0)
    if (pen.lod <= 1) line(pen, 0, -0.31, 0, -h + 0.02, OBS.brass, 0.015)
  },
}

/* ------------------------------------------------------------------ a total eclipse */

const ECL = {
  sky: '#161C33',
  mid: '#3A3656',
  low: '#9A6E5E',
  hills: '#1E2337',
  field: '#37412C',
  fieldEdge: '#465336',
  disc: '#07080E',
  corona: '#F6F0DC',
  tree: '#121624',
  box: '#B88C5C',
  boxDeep: '#8A6440',
  screen: '#F2EAD8',
  ink: '#E2DFEA',
}

/** The corona's streamers, long and short, round the dark disc. */
const CORONA: readonly Pt[] = Array.from({ length: 16 }, (_, i): Pt => {
  const a = (i / 16) * Math.PI * 2 + 0.2
  const r = i % 2 ? 0.34 + 0.04 * hash(i, 2, 5) : 0.44 + 0.4 * hash(i, 1, 5)
  return [Math.cos(a) * r, Math.sin(a) * r]
})

const eclipse: Skin = {
  key: 'eclipse',
  bg: ECL.sky,
  ink: ECL.ink,
  floor: ECL.field,
  edge: ECL.fieldEdge,
  plank: ECL.boxDeep,
  fulcrum: ECL.hills,
  back(pen, m, v) {
    // The daytime dark: a dusk all round the horizon, deep blue overhead.
    band(pen, v, -1.2, 0, ECL.mid)
    band(pen, v, -0.5, 0, ECL.low)
    if (pen.lod <= 1) fillPath(pen, ECL.corona, (ctx) => {
      for (const [x, y] of [[-1.4, -2.3], [-0.2, -2.1], [0.7, -2.55]] as const) ctx.rect(x - 0.02, y - 0.02, 0.04, 0.04)
    })
    // The sun gone black, the corona round it, and a bead of light at its rim that flares on the loud landings.
    const sx = 1.9
    const sy = -1.85
    glow(pen, sx, sy, 1.05, ECL.corona, 0.6)
    if (pen.lod <= 1) {
      const { ctx } = pen
      ctx.beginPath()
      for (let i = 0; i < CORONA.length; i++) {
        const [x, y] = CORONA[i]
        if (i === 0) ctx.moveTo(sx + x, sy + y)
        else ctx.lineTo(sx + x, sy + y)
      }
      ctx.closePath()
      ctx.fillStyle = rgba(ECL.corona, 0.55)
      ctx.fill()
    }
    circle(pen, sx, sy, 0.3, ECL.disc, 0)
    const b = flashOf(m, 0.9, 0.35)
    circle(pen, sx - 0.2, sy + 0.22, 0.025 + 0.045 * b, rgba('#FFFFFF', 0.55 + 0.45 * b), 0)
    // The hills, and a lone tree on the left one.
    poly(pen, [[v.x0 - 0.2, 0], [v.x0 - 0.2, -0.5], [-2.3, -0.72], [-1.6, -0.5], [-0.8, -0.18], [0.6, -0.14], [1.6, -0.3], [2.6, -0.22], [v.x1 + 0.2, -0.34], [v.x1 + 0.2, 0]], ECL.hills, 0)
    rect(pen, -2.27, -1.05, 0.06, 0.36, ECL.tree, 0)
    if (pen.lod === 2) circle(pen, -2.24, -1.18, 0.26, ECL.tree, 0)
    else fillPath(pen, ECL.tree, (ctx) => {
      for (const [x, y, r] of [[-2.24, -1.28, 0.2], [-2.42, -1.1, 0.16], [-2.06, -1.1, 0.17], [-2.24, -1.05, 0.14]] as const) {
        ctx.moveTo(x + r, y)
        ctx.arc(x, y, r, 0, Math.PI * 2)
      }
    })
  },
  weight(pen) {
    // A pinhole box: the crescent caught on its paper screen.
    const h = WEIGHT_H
    rect(pen, -0.12, -h + 0.06, 0.24, h - 0.06, ECL.box)
    poly(pen, [[-0.12, -h + 0.06], [-0.07, -h], [0.15, -h], [0.12, -h + 0.06]], ECL.boxDeep, 0.8)
    rect(pen, -0.08, -0.22, 0.16, 0.14, ECL.screen, 0.6)
    circle(pen, 0, -0.15, 0.045, ECL.disc, 0)
    circle(pen, 0.018, -0.155, 0.04, ECL.screen, 0)
    if (pen.lod <= 1) circle(pen, 0.04, -h + 0.03, 0.012, ECL.disc, 0)
  },
}

/* ------------------------------------------------------------------ a meteor shower over the desert */

const MET = {
  sky: '#2B1D46',
  skyLow: '#413062',
  mesaFar: '#35264F',
  mesa: '#1F1633',
  sand: '#A68C69',
  sandEdge: '#BBA17B',
  streak: '#FFF1D6',
  tail: '#B9A6E8',
  rock: '#3A3436',
  ember: '#F2B04A',
  star: '#E8E2F2',
  ink: '#E9E3F2',
}

/** The meteors: where each starts, its phase in the shower's cycle, and the length of its tail. */
const METEORS = Array.from({ length: 6 }, (_, i) => ({ x: 0.2 + 2.6 * hash(i, 1, 13), y: -2.45 + 0.55 * hash(i, 2, 13), ph: (i + 0.5 * hash(i, 3, 13)) / 6, len: 0.4 + 0.4 * hash(i, 4, 13) }))

const METEORITE: readonly Pt[] = [[-0.13, 0], [0.14, 0], [0.16, -0.08], [0.12, -0.2], [0.05, -0.27], [-0.04, -0.25], [-0.12, -0.18], [-0.16, -0.08]]

const meteor: Skin = {
  key: 'meteor',
  bg: MET.sky,
  ink: MET.ink,
  floor: MET.sand,
  edge: MET.sandEdge,
  plank: MET.rock,
  fulcrum: MET.mesa,
  back(pen, m, v) {
    if (pen.lod <= 1) {
      band(pen, v, -0.9, 0, MET.skyLow)
      stars(pen, pen.lod === 0 ? 14 : 7, 9, -0.9, MET.star, 0.75)
    }
    // The shower: streaks across the sky from the upper right, each one a moment long, brighter on the loud landings.
    const f = flashOf(m, 0.9, 0.3)
    const n = pen.lod === 0 ? 6 : pen.lod === 1 ? 4 : 2
    const P = 2.6
    const dx = -0.86
    const dy = 0.5
    for (let i = 0; i < n; i++) {
      const s = METEORS[i]
      const u = (((m.t / P + s.ph) % 1) + 1) % 1
      if (u > 0.5) continue
      const p = u / 0.5
      const a = Math.sin(p * Math.PI) * (0.75 + 0.25 * f)
      const hx = s.x + dx * 1.6 * p
      const hy = s.y + dy * 1.6 * p
      const L = s.len * Math.min(1, p * 3)
      line(pen, hx - dx * L * 2, hy - dy * L * 2, hx - dx * L * 0.6, hy - dy * L * 0.6, rgba(MET.tail, a * 0.45), 0.018)
      line(pen, hx - dx * L * 0.6, hy - dy * L * 0.6, hx, hy, rgba(MET.streak, a), 0.03)
    }
    // The far mesas, a butte on the left, and a hoodoo on the right.
    poly(pen, [[v.x0 - 0.2, 0], [v.x0 - 0.2, -0.4], [-1.0, -0.4], [-0.8, -0.28], [0.8, -0.28], [1.0, -0.46], [1.6, -0.46], [1.75, -0.3], [v.x1 + 0.2, -0.3], [v.x1 + 0.2, 0]], MET.mesaFar, 0)
    poly(pen, [[v.x0 - 0.2, 0], [v.x0 - 0.2, -1.25], [-2.35, -1.25], [-2.2, -1.1], [-2.0, -0.6], [-1.65, -0.3], [-1.45, 0]], MET.mesa, 0.8)
    poly(pen, [[1.95, 0], [2.0, -0.5], [2.08, -0.62], [2.02, -0.95], [2.1, -1.1], [2.36, -1.1], [2.42, -0.92], [2.34, -0.6], [2.44, -0.4], [2.5, 0]], MET.mesa, 0.8)
    ellipse(pen, 2.24, -1.16, 0.26, 0.09, MET.mesa, 0.8)
  },
  weight(pen) {
    // A fallen meteorite, still warm in its cracks.
    if (pen.lod <= 1) glow(pen, 0, -0.1, 0.3, MET.ember, 0.3)
    poly(pen, METEORITE, MET.rock)
    if (pen.lod <= 1) strokeLines(pen, MET.ember, 0.018, (ctx) => {
      ctx.moveTo(-0.08, -0.03)
      ctx.lineTo(-0.02, -0.12)
      ctx.lineTo(0.06, -0.15)
      ctx.lineTo(0.08, -0.22)
      ctx.moveTo(-0.02, -0.12)
      ctx.lineTo(-0.06, -0.2)
    })
  },
}

/* ------------------------------------------------------------------ hot-air balloons at sunrise */

const BAL = {
  sky: '#F2E1A6',
  skyHigh: '#EFCDB4',
  sun: '#FFF5D6',
  hillFar: '#A8A6CF',
  hillNear: '#7C8FAE',
  meadow: '#6E9A50',
  meadowEdge: '#86B064',
  blue: '#2F6EA8',
  cream: '#F2ECDC',
  plum: '#7A4E9A',
  gold: '#E8B43C',
  rose: '#D97A9A',
  basket: '#9C6E3A',
  basketDeep: '#6E4A24',
  flame: '#FFC24A',
  ink: '#3A3040',
}

/** A balloon, its envelope's centre at (x, y), `r` across: gores of two colours, its basket hung under it. */
function envelope(pen: Pen, x: number, y: number, r: number, c1: string, c2: string, flame: number): void {
  const { ctx } = pen
  const my = y + r * 1.28
  const trace = () => {
    ctx.beginPath()
    ctx.arc(x, y, r, 0.6, Math.PI - 0.6, true)
    ctx.lineTo(x - r * 0.3, my)
    ctx.lineTo(x + r * 0.3, my)
    ctx.closePath()
  }
  trace()
  ctx.fillStyle = c1
  ctx.fill()
  if (pen.lod <= 1) {
    ctx.save()
    ctx.clip()
    ellipse(pen, x, y + r * 0.25, r * 0.62, r * 1.5, c2, 0)
    ellipse(pen, x, y + r * 0.25, r * 0.24, r * 1.5, c1, 0)
    ctx.restore()
    trace()
    ctx.strokeStyle = pen.ink
    ctx.lineWidth = pen.lw * 0.8
    ctx.stroke()
    strokeLines(pen, pen.ink, pen.lw * 0.7, (c) => {
      c.moveTo(x - r * 0.3, my)
      c.lineTo(x - r * 0.22, my + r * 0.2)
      c.moveTo(x + r * 0.3, my)
      c.lineTo(x + r * 0.22, my + r * 0.2)
    })
  }
  if (flame > 0.02) ellipse(pen, x, my + r * 0.02, r * 0.07, r * 0.14 * (0.6 + flame), rgba(BAL.flame, Math.min(1, flame * 1.5)), 0)
  rect(pen, x - r * 0.22, my + r * 0.2, r * 0.44, r * 0.3, BAL.basket, 0.7)
}

const balloon: Skin = {
  key: 'balloon',
  bg: BAL.sky,
  ink: BAL.ink,
  floor: BAL.meadow,
  edge: BAL.meadowEdge,
  plank: BAL.basket,
  fulcrum: BAL.basketDeep,
  back(pen, m, v) {
    if (pen.lod <= 1) band(pen, v, v.y0, -2.05, BAL.skyHigh)
    // The sun just up over the far hills.
    glow(pen, -1.2, -0.55, 1.3, BAL.sun, 0.7)
    circle(pen, -1.2, -0.55, 0.28, BAL.sun, 0)
    // The valley: far hills high at the sides, nearer ones lower, the river's gap between.
    poly(pen, [[v.x0 - 0.2, 0], [v.x0 - 0.2, -0.95], [-2.4, -0.82], [-1.6, -0.48], [-0.4, -0.3], [0.8, -0.42], [1.8, -0.78], [2.7, -0.9], [v.x1 + 0.2, -0.8], [v.x1 + 0.2, 0]], BAL.hillFar, 0)
    poly(pen, [[v.x0 - 0.2, 0], [v.x0 - 0.2, -0.5], [-2.0, -0.42], [-1.0, -0.16], [0.6, -0.12], [1.9, -0.36], [v.x1 + 0.2, -0.48], [v.x1 + 0.2, 0]], BAL.hillNear, 0)
    // The balloons, bobbing: a big one on the left, its burner lit on the loud landings, one on the right, one far.
    const f = flashOf(m, 0.9, 0.3)
    if (pen.lod <= 1) envelope(pen, 0.75, -2.16 + 0.03 * Math.sin(m.t * 0.4 + 2), 0.15, BAL.rose, BAL.cream, 0)
    envelope(pen, 2.12, -1.6 + 0.05 * Math.sin(m.t * 0.5 + 1), 0.36, BAL.plum, BAL.gold, 0)
    envelope(pen, -2.05, -2.0 + 0.05 * Math.sin(m.t * 0.45), 0.5, BAL.blue, BAL.cream, f)
  },
  weight(pen) {
    // A wicker basket, its ropes cut short.
    const h = WEIGHT_H
    if (pen.lod <= 1) strokeLines(pen, BAL.basketDeep, 0.02, (ctx) => {
      ctx.moveTo(-0.12, -0.22)
      ctx.lineTo(-0.09, -h)
      ctx.moveTo(0.12, -0.22)
      ctx.lineTo(0.09, -h)
      ctx.moveTo(-0.1, -h + 0.02)
      ctx.lineTo(0.1, -h + 0.02)
    })
    poly(pen, [[-0.13, 0], [0.13, 0], [0.15, -0.22], [-0.15, -0.22]], BAL.basket)
    rect(pen, -0.16, -0.25, 0.32, 0.04, BAL.basketDeep, 0.7)
    if (pen.lod === 0) strokeLines(pen, BAL.basketDeep, 0.012, (ctx) => {
      for (const y of [-0.07, -0.14]) {
        ctx.moveTo(-0.14, y)
        ctx.lineTo(0.14, y)
      }
      for (const x of [-0.07, 0, 0.07]) {
        ctx.moveTo(x, -0.21)
        ctx.lineTo(x, 0)
      }
    })
  },
}

/* ------------------------------------------------------------------ an airship over a city in the clouds */

const AIR = {
  sky: '#A8B9CA',
  skyHigh: '#97ABBF',
  cloud: '#EEF2F5',
  cloudFar: '#D5DEE7',
  tower: '#66717F',
  towerDeep: '#535D6B',
  window: '#F2D68A',
  hull: '#CDC6AE',
  rib: '#A39B80',
  fin: '#8F876C',
  gondola: '#5C4734',
  roof: '#4E5866',
  roofEdge: '#66707D',
  leather: '#7A4A2A',
  leatherDeep: '#55321C',
  strap: '#C9A564',
  ink: '#262C36',
}

/** The city's towers, left and right: x, width, top. */
const TOWERS = [
  [-3.2, 0.42, -1.1],
  [-2.75, 0.36, -1.75],
  [-2.36, 0.3, -1.3],
  [-1.98, 0.28, -0.9],
  [1.62, 0.3, -1.0],
  [1.96, 0.4, -1.45],
  [2.6, 0.38, -1.15],
] as const

const airship: Skin = {
  key: 'airship',
  bg: AIR.sky,
  ink: AIR.ink,
  floor: AIR.roof,
  edge: AIR.roofEdge,
  plank: AIR.gondola,
  fulcrum: AIR.towerDeep,
  back(pen, m, v) {
    if (pen.lod <= 1) band(pen, v, v.y0, -2.5, AIR.skyHigh)
    // The city's towers, standing up out of the clouds, a spire on the tallest and a mooring mast on the right.
    fillPath(pen, AIR.tower, (ctx) => {
      for (const [x, w, top] of TOWERS) ctx.rect(x, top, w, -top)
      ctx.moveTo(-2.75, -1.75)
      ctx.lineTo(-2.57, -2.25)
      ctx.lineTo(-2.39, -1.75)
      ctx.rect(2.13, -1.9, 0.06, 0.45)
    })
    if (pen.lod <= 1) circle(pen, 2.16, -1.92, 0.05, AIR.towerDeep, 0)
    if (pen.lod === 0) fillPath(pen, AIR.window, (ctx) => {
      for (let i = 0; i < TOWERS.length; i++) {
        const [x, w, top] = TOWERS[i]
        for (let k = 0; k < 3; k++) if (hash(i, k, 3) > 0.4) ctx.rect(x + w * (0.2 + 0.4 * (k % 2)), top + 0.15 + k * 0.22, 0.05, 0.07)
      }
    })
    // The clouds the city stands in, drifting.
    const d = (m.t * 0.04) % 0.5
    fillPath(pen, AIR.cloud, (ctx) => {
      ctx.rect(v.x0 - 0.1, -0.42, v.x1 - v.x0 + 0.2, 0.42)
      for (let x = Math.floor(v.x0 / 0.5) * 0.5 - 0.5 + d; x < v.x1 + 0.5; x += 0.5) {
        const r = 0.24 + 0.08 * Math.sin(x * 3.1)
        ctx.moveTo(x + r, -0.42)
        ctx.arc(x, -0.42, r, 0, Math.PI * 2)
      }
    })
    // The airship, high, nosing slowly along.
    const ax = 0.75 + 0.15 * Math.sin(m.t * 0.12)
    const ay = -2.2
    poly(pen, [[ax - 1.2, ay - 0.08], [ax - 1.62, ay - 0.36], [ax - 1.58, ay], [ax - 1.62, ay + 0.36], [ax - 1.2, ay + 0.08]], AIR.fin, 0.8)
    rect(pen, ax + 0.05, ay + 0.3, 0.42, 0.13, AIR.gondola, 0.7)
    ellipse(pen, ax, ay, 1.45, 0.36, AIR.hull)
    if (pen.lod === 0) {
      strokeLines(pen, AIR.rib, pen.lw, (ctx) => {
        for (const k of [0.35, 0.7]) ctx.ellipse(ax, ay, 1.45 * k, 0.36, 0, 0, Math.PI * 2)
        ctx.moveTo(ax - 1.45, ay)
        ctx.lineTo(ax + 1.45, ay)
      })
      ellipse(pen, ax - 1.66, ay, 0.02, 0.14 * Math.abs(Math.sin(m.t * 9)), AIR.ink, 0)
    }
  },
  weight(pen) {
    // A leather suitcase, strapped, its handle up.
    const h = WEIGHT_H
    if (pen.lod <= 1) {
      pen.ctx.beginPath()
      pen.ctx.moveTo(-0.06, -0.26)
      pen.ctx.quadraticCurveTo(0, -h - 0.02, 0.06, -0.26)
      pen.ctx.strokeStyle = AIR.leatherDeep
      pen.ctx.lineWidth = 0.03
      pen.ctx.stroke()
    }
    round(pen, -0.16, -0.27, 0.32, 0.27, 0.035, AIR.leather)
    if (pen.lod <= 1) fillPath(pen, AIR.strap, (ctx) => {
      ctx.rect(-0.1, -0.27, 0.03, 0.27)
      ctx.rect(0.07, -0.27, 0.03, 0.27)
    })
    if (pen.lod === 0) circle(pen, -0.02, -0.14, 0.035, AIR.cloud, 0.5)
  },
}

/* ------------------------------------------------------------------ the kingdom in the clouds */

const HEAV = {
  sky: '#E4CDE8',
  skyHigh: '#D6BCE6',
  ray: '#FFF6D8',
  cloud: '#FBF8FC',
  cloudShade: '#EADDF0',
  gold: '#D8A83C',
  goldDeep: '#A87A22',
  goldLight: '#F4D98A',
  marble: '#F2EDF4',
  ink: '#5B4870',
}

const clouds: Skin = {
  key: 'clouds',
  bg: HEAV.sky,
  ink: HEAV.ink,
  floor: HEAV.cloud,
  edge: HEAV.cloudShade,
  plank: HEAV.gold,
  fulcrum: HEAV.marble,
  back(pen, m, v) {
    if (pen.lod <= 1) band(pen, v, v.y0, -2.2, HEAV.skyHigh)
    // Light falling on the gates from above, and their glow, which swells on the loud landings.
    const f = flashOf(m, 0.9, 0.4)
    if (pen.lod <= 1) beam(pen, 2.6, v.y0, 2.2, -0.5, 0.5, 1.4, HEAV.ray, 0.55)
    glow(pen, 2.2, -1.0, 1.1, HEAV.ray, 0.55 + 0.35 * f)
    // The far cloud banks, drifting.
    const d = (m.t * 0.03) % 0.6
    fillPath(pen, HEAV.cloudShade, (ctx) => {
      ctx.rect(v.x0 - 0.1, -0.4, v.x1 - v.x0 + 0.2, 0.4)
      for (let x = Math.floor(v.x0 / 0.6) * 0.6 - 0.6 + d; x < v.x1 + 0.6; x += 0.6) {
        const r = 0.22 + 0.1 * Math.sin(x * 2.3 + 1)
        ctx.moveTo(x + r, -0.4)
        ctx.arc(x, -0.4, r, 0, Math.PI * 2)
      }
    })
    // A castle far off on its own cloud, high on the left.
    if (pen.lod <= 1) {
      fillPath(pen, HEAV.goldLight, (ctx) => {
        ctx.rect(-2.55, -1.8, 0.5, 0.22)
        ctx.rect(-2.42, -2.07, 0.2, 0.27)
        ctx.moveTo(-2.45, -2.07)
        ctx.lineTo(-2.32, -2.27)
        ctx.lineTo(-2.19, -2.07)
        ctx.rect(-2.6, -1.93, 0.1, 0.13)
        ctx.rect(-2.1, -1.93, 0.1, 0.13)
      })
      fillPath(pen, HEAV.cloud, (ctx) => {
        for (const [x, r] of [[-2.6, 0.16], [-2.3, 0.2], [-2.0, 0.15]] as const) {
          ctx.moveTo(x + r, -1.59)
          ctx.arc(x, -1.59, r, 0, Math.PI * 2)
        }
      })
    }
    // The gates, gold, on the right: two pillars, an arch, the bars.
    const gl = 1.62
    const gr = 2.62
    const cx = (gl + gr) / 2
    const R = (gr - gl) / 2
    if (pen.lod <= 1) strokeLines(pen, HEAV.gold, 0.035, (ctx) => {
      for (let x = gl + 0.18; x < gr - 0.1; x += 0.15) {
        ctx.moveTo(x, -0.4)
        ctx.lineTo(x, -1.4 - Math.sqrt(Math.max(0, R * R - (x - cx) * (x - cx))) * 0.8 + 0.05)
      }
      ctx.moveTo(gl, -0.85)
      ctx.lineTo(gr, -0.85)
    })
    pen.ctx.beginPath()
    pen.ctx.ellipse(cx, -1.4, R - 0.05, R * 0.8, 0, Math.PI, Math.PI * 2)
    pen.ctx.strokeStyle = HEAV.gold
    pen.ctx.lineWidth = 0.08
    pen.ctx.stroke()
    rect(pen, gl - 0.09, -1.5, 0.18, 1.1, HEAV.gold, 0.8)
    rect(pen, gr - 0.09, -1.5, 0.18, 1.1, HEAV.gold, 0.8)
    circle(pen, gl, -1.58, 0.09, HEAV.goldLight, 0.7)
    circle(pen, gr, -1.58, 0.09, HEAV.goldLight, 0.7)
    // The cloud the gates stand on.
    fillPath(pen, HEAV.cloud, (ctx) => {
      for (const [x, y, r] of [[1.55, -0.38, 0.24], [1.9, -0.45, 0.28], [2.3, -0.42, 0.3], [2.7, -0.4, 0.26], [2.95, -0.3, 0.2]] as const) {
        ctx.moveTo(x + r, y)
        ctx.arc(x, y, r, 0, Math.PI * 2)
      }
    })
  },
  front(pen, _m, v) {
    // Puffs in the cloud floor.
    if (pen.lod > 1) return
    fillPath(pen, HEAV.cloudShade, (ctx) => {
      for (const [x, y, r] of [[-2.5, 0.3, 0.3], [-0.9, 0.48, 0.26], [0.8, 0.32, 0.28], [2.3, 0.5, 0.32], [-1.8, 0.75, 0.3]] as const) {
        if (y - r * 0.5 > v.y1) continue
        ctx.moveTo(x + r, y)
        ctx.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI * 2)
      }
    })
  },
  weight(pen) {
    // A small gold harp.
    const h = WEIGHT_H
    if (pen.lod <= 1) strokeLines(pen, HEAV.goldDeep, 0.01, (ctx) => {
      for (let i = 0; i < 4; i++) {
        const x = -0.06 + i * 0.045
        ctx.moveTo(x, -h + 0.06 + i * 0.012)
        ctx.lineTo(x, -0.04 - i * 0.065)
      }
    })
    rect(pen, -0.12, -h + 0.02, 0.04, h - 0.02, HEAV.gold, 0.7)
    poly(pen, [[-0.1, 0], [0.04, 0], [0.15, -0.28], [0.1, -0.3]], HEAV.gold, 0.7)
    const { ctx } = pen
    ctx.beginPath()
    ctx.moveTo(-0.12, -h + 0.02)
    ctx.quadraticCurveTo(0.0, -h + 0.12, 0.14, -0.3)
    ctx.strokeStyle = HEAV.gold
    ctx.lineWidth = 0.04
    ctx.stroke()
    rect(pen, -0.13, -0.03, 0.2, 0.03, HEAV.goldDeep, 0)
  },
}

/* ------------------------------------------------------------------ a lighthouse on its point */

const LIGHT = {
  sky: '#26354A',
  sea: '#1B2A3A',
  foam: '#8FA6B8',
  rock: '#3B3937',
  rockLight: '#55524E',
  shore: '#4A4744',
  shoreEdge: '#5D5954',
  tower: '#ECE7DC',
  stripe: '#A23C34',
  cap: '#22242C',
  lamp: '#FFE6A0',
  boat: '#121A26',
  star: '#DDE4EC',
  bell: '#C99B40',
  bellDeep: '#8E6A28',
  ink: '#E2E6EC',
}

/** The tower's half-width at height y: wide at its foot on the rocks, narrow under the lamp. */
const LH_X = -2.2
const LH_Y0 = -0.76
const LH_Y1 = -1.82
const lhw = (y: number): number => 0.25 - (0.09 * (y - LH_Y0)) / (LH_Y1 - LH_Y0)

const lighthouse: Skin = {
  key: 'lighthouse',
  bg: LIGHT.sky,
  ink: LIGHT.ink,
  floor: LIGHT.shore,
  edge: LIGHT.shoreEdge,
  plank: LIGHT.rockLight,
  fulcrum: LIGHT.rock,
  back(pen, m, v) {
    if (pen.lod <= 1) stars(pen, pen.lod === 0 ? 10 : 5, 20, -0.9, LIGHT.star, 0.6)
    // The sea, and its swell.
    band(pen, v, -0.5, 0, LIGHT.sea)
    if (pen.lod === 0) strokeLines(pen, LIGHT.foam, pen.lw * 0.9, (ctx) => {
      for (let i = 0; i < 6; i++) {
        const x = -1.0 + ((i * 0.83 + m.t * 0.05) % 4.4)
        const y = -0.4 + 0.07 * (i % 3)
        ctx.moveTo(x, y)
        ctx.lineTo(x + 0.22, y)
      }
    })
    // A boat far out on the right, rocking.
    if (pen.lod <= 1) at(pen, 2.3, -0.5, 0.06 * Math.sin(m.t * 0.8), 1, () => {
      poly(pen, [[-0.24, -0.08], [0.24, -0.08], [0.17, 0.02], [-0.17, 0.02]], LIGHT.boat, 0)
      line(pen, 0, -0.08, 0, -0.42, LIGHT.boat, 0.025)
      poly(pen, [[0.02, -0.4], [0.18, -0.12], [0.02, -0.12]], LIGHT.boat, 0)
      circle(pen, 0, -0.43, 0.022, LIGHT.lamp, 0)
    })
    // The rocky point on the left.
    poly(pen, [[v.x0 - 0.2, 0], [v.x0 - 0.2, -0.7], [-2.85, -0.8], [-2.5, -0.92], [-1.95, -0.88], [-1.72, -0.68], [-1.5, -0.42], [-1.32, 0]], LIGHT.rock, 0.8)
    // The tower: white, two red bands, its gallery and lamp room, and the cap.
    const y0 = LH_Y0
    const y1 = LH_Y1
    poly(pen, [[LH_X - lhw(y0), y0], [LH_X + lhw(y0), y0], [LH_X + lhw(y1), y1], [LH_X - lhw(y1), y1]], LIGHT.tower, 0.8)
    for (const [a, b] of [[-1.06, -1.24], [-1.46, -1.62]] as const) poly(pen, [[LH_X - lhw(a), a], [LH_X + lhw(a), a], [LH_X + lhw(b), b], [LH_X - lhw(b), b]], LIGHT.stripe, 0)
    rect(pen, LH_X - 0.21, y1 - 0.05, 0.42, 0.05, LIGHT.cap, 0)
    const ly = y1 - 0.15
    // The light going round: a beam swinging out across the frame and back, the lamp brightest when it faces us.
    const a = m.t * 0.9
    const c = Math.cos(a)
    const face = 1 - Math.abs(c)
    const f = flashOf(m, 1.0, 0.3)
    glow(pen, LH_X, ly, 0.45 + 0.5 * face, LIGHT.lamp, 0.35 + 0.4 * face + 0.15 * f)
    rect(pen, LH_X - 0.11, y1 - 0.25, 0.22, 0.2, LIGHT.lamp, 0.6)
    poly(pen, [[LH_X - 0.15, y1 - 0.25], [LH_X + 0.15, y1 - 0.25], [LH_X, y1 - 0.43]], LIGHT.cap, 0)
    if (pen.lod <= 1) beam(pen, LH_X, ly, LH_X + 4.6 * c, ly + 0.2 * Math.abs(c), 0.12, 0.35 + 0.9 * face, LIGHT.lamp, 0.5 * (0.3 + 0.7 * Math.abs(c)))
    if (pen.lod === 0) line(pen, LH_X, y1 - 0.43, LH_X, y1 - 0.5, LIGHT.cap, 0.02)
  },
  front(pen, _m, v) {
    // Stones on the shore.
    if (pen.lod > 0) return
    fillPath(pen, LIGHT.rock, (ctx) => {
      for (const [x, y, r] of [[-2.6, 0.25, 0.14], [-1.5, 0.45, 0.1], [0.4, 0.3, 0.08], [1.9, 0.38, 0.13], [2.7, 0.22, 0.08]] as const) {
        if (y > v.y1) continue
        ctx.moveTo(x + r, y)
        ctx.ellipse(x, y, r, r * 0.5, 0, 0, Math.PI * 2)
      }
    })
  },
  weight(pen) {
    // A ship's bell, brass.
    const h = WEIGHT_H
    if (pen.lod <= 1) {
      pen.ctx.beginPath()
      pen.ctx.arc(0, -h + 0.035, 0.035, 0, Math.PI * 2)
      pen.ctx.strokeStyle = LIGHT.bellDeep
      pen.ctx.lineWidth = 0.02
      pen.ctx.stroke()
    }
    poly(pen, [[-0.14, -0.03], [0.14, -0.03], [0.11, -0.09], [0.09, -0.24], [0.05, -0.29], [-0.05, -0.29], [-0.09, -0.24], [-0.11, -0.09]], LIGHT.bell)
    rect(pen, -0.15, -0.05, 0.3, 0.035, LIGHT.bellDeep, 0.6)
    circle(pen, 0, -0.02, 0.025, LIGHT.bellDeep, 0)
    if (pen.lod === 0) line(pen, -0.05, -0.24, -0.08, -0.1, '#F6E2A8', 0.016)
  },
}

export const SKY_SKINS = {
  mars,
  alien,
  station,
  rocket,
  ufo,
  observatory,
  eclipse,
  meteor,
  balloon,
  airship,
  clouds,
  lighthouse,
} as const satisfies Record<string, Skin>
