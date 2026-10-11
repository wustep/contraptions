import { at, circle, ellipse, glow, hash, line, mix, poly, rect, rgba, round, knock, type Pen, type Pt } from './skins-pen'
import { flashOf, PL, ring, TH, WEIGHT_H, type Skin } from './skins-kit'

/**
 * Lives in other times: the same machine, set down in a century she was never born into. Noon at Giza, the
 * Colosseum's arches, a castle hall, a longship in a fjord, a pirate's deck by moonlight, a jungle with the
 * dinosaurs in it, a steampunk workshop, an art deco ballroom, a seventies living room, a googie city of tomorrow,
 * a shadow-puppet play behind its lit screen, and a Punch and Judy booth on the promenade.
 *
 * As in the other files, each is one big silhouette at the side or up high, its own sky or wall and floor, and a
 * weight from its world. Floor patterns are laid in `front()`, under the ground's top edge.
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

/** Ink the current path, from `lod` 1 down. */
function inkPath(pen: Pen, w = 1): void {
  if (pen.lod > 1) return
  pen.ctx.strokeStyle = pen.ink
  pen.ctx.lineWidth = pen.lw * w
  pen.ctx.stroke()
}

/** A polygon's points added to the current path (no begin, no fill). */
function addPoly(ctx: CanvasRenderingContext2D, pts: readonly Pt[], dx = 0, dy = 0): void {
  ctx.moveTo(pts[0][0] + dx, pts[0][1] + dy)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] + dx, pts[i][1] + dy)
  ctx.closePath()
}

/* ------------------------------------------------------------------ the pyramids at Giza, at noon */

const GIZA = {
  sky: '#BFDDE6',
  haze: '#EDE6C6',
  sun: '#FFFBEA',
  lit: '#EDC982',
  shade: '#BE8E4C',
  far: '#DCC395',
  sand: '#E9BC68',
  sandDeep: '#CF9E4E',
  frond: '#3F6E3A',
  trunk: '#8A6236',
  alabaster: '#EDE2C6',
  jackal: '#2A2622',
  gold: '#D9A93E',
  lapis: '#2F4F8F',
  ink: '#3A2814',
}

/** A palm frond, from the crown outwards along +x. */
const FROND: Pt[] = [[0, 0], [0.22, -0.07], [0.46, -0.02], [0.6, 0.12], [0.42, 0.04], [0.2, 0.03]]

const pyramids: Skin = {
  key: 'pyramids',
  bg: GIZA.sky,
  ink: GIZA.ink,
  floor: GIZA.sand,
  edge: GIZA.sandDeep,
  plank: GIZA.trunk,
  fulcrum: GIZA.shade,
  back(pen, m, v) {
    // The haze over the sand, and the sun straight overhead, too bright to look at.
    rect(pen, v.x0 - 0.1, -0.7, v.x1 - v.x0 + 0.2, 0.7, GIZA.haze, 0)
    glow(pen, -0.4, -2.7, 1.1, GIZA.sun, 0.7)
    circle(pen, -0.4, -2.7, 0.24, GIZA.sun, 0)
    // Two small pyramids far off on the left.
    poly(pen, [[-3.5, 0], [-2.75, -0.95], [-2.0, 0]], GIZA.far, 0)
    poly(pen, [[-2.25, 0], [-1.85, -0.5], [-1.45, 0]], GIZA.far, 0)
    // The great one on the right: its lit face and its shade face.
    poly(pen, [[1.3, 0], [2.35, -1.95], [2.75, 0]], GIZA.lit, 0)
    poly(pen, [[2.75, 0], [2.35, -1.95], [3.65, 0]], GIZA.shade, 0)
    if (pen.lod <= 1) {
      poly(pen, [[1.3, 0], [2.35, -1.95], [3.65, 0]], null, 0.8)
      line(pen, 2.35, -1.95, 2.75, 0, pen.ink, pen.lw * 0.6)
    }
    // Its courses, faint.
    if (pen.lod === 0) strokeLines(pen, rgba(GIZA.shade, 0.5), pen.lw * 0.6, (ctx) => {
      for (let i = 1; i < 8; i++) {
        const y = -i * 0.24
        const f = -y / 1.95
        ctx.moveTo(1.3 + 1.05 * f, y)
        ctx.lineTo(2.75 - 0.4 * f, y)
      }
    })
    // A palm, its fronds stirring when the plank lands.
    const cx = -1.72
    const cy = -1.45
    line(pen, -1.6, 0, cx, cy, GIZA.trunk, 0.07)
    if (pen.lod === 0) strokeLines(pen, mix(GIZA.trunk, GIZA.ink, 0.4), pen.lw * 0.7, (ctx) => {
      for (let i = 1; i < 7; i++) {
        const f = i / 7
        const x = -1.6 + (cx + 1.6) * f
        ctx.moveTo(x - 0.035, cy * f)
        ctx.lineTo(x + 0.035, cy * f - 0.02)
      }
    })
    const sway = 0.06 * Math.sin(m.t * 0.9) + 0.12 * ring(m, 0.5, 0.5)
    const { ctx } = pen
    ctx.beginPath()
    for (const a of [-2.9, -2.3, -1.6, -0.85, -0.25]) {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(a + sway)
      addPoly(ctx, FROND)
      ctx.restore()
    }
    ctx.fillStyle = GIZA.frond
    ctx.fill()
    inkPath(pen, 0.7)
  },
  front(pen, _m, v) {
    // Ripples in the sand.
    if (pen.lod > 0) return
    strokeLines(pen, GIZA.sandDeep, pen.lw * 0.8, (ctx) => {
      for (let i = 0; i < 9; i++) {
        const x = v.x0 + (v.x1 - v.x0) * hash(i, 1, 3)
        const y = 0.15 + 0.6 * hash(i, 2, 3)
        if (y > v.y1) continue
        ctx.moveTo(x - 0.2, y)
        ctx.quadraticCurveTo(x, y - 0.05, x + 0.2, y)
      }
    })
  },
  weight(pen) {
    // A canopic jar, its lid a jackal's head.
    const h = WEIGHT_H
    poly(pen, [[-0.09, 0], [0.09, 0], [0.125, -0.1], [0.12, -0.18], [0.085, -0.225], [-0.085, -0.225], [-0.12, -0.18], [-0.125, -0.1]], GIZA.alabaster)
    if (pen.lod <= 1) {
      rect(pen, -0.03, -0.17, 0.06, 0.12, GIZA.lapis, 0)
      line(pen, -0.11, -0.2, 0.11, -0.2, GIZA.gold, 0.02)
    }
    // The head: a dome with a snout to the left and two tall ears.
    poly(pen, [[-0.085, -0.225], [0.085, -0.225], [0.07, -0.27], [0.05, -h], [0.025, -0.285], [-0.02, -0.285], [-0.045, -h], [-0.06, -0.28], [-0.12, -0.26], [-0.075, -0.24]], GIZA.jackal, 0.8)
  },
}

/* ------------------------------------------------------------------ Rome, the Colosseum */

const ROME = {
  sky: '#5A8FCB',
  skyLow: '#9FC0E0',
  stone: '#DDBB86',
  stoneLit: '#ECD2A2',
  stoneDeep: '#B48F60',
  arch: '#6C4A30',
  cypress: '#2C4630',
  sand: '#D8C49A',
  sandDeep: '#BDA778',
  clay: '#B0623A',
  clayDeep: '#7E3F22',
  black: '#2A1C14',
  bird: '#2E3550',
  ink: '#33231A',
}

/** The Colosseum's broken rim, highest at the right. */
const ROME_WALL: Pt[] = [[1.4, 0], [1.4, -1.32], [1.62, -1.42], [1.8, -1.72], [2.08, -1.82], [2.3, -2.22], [3.7, -2.32], [3.7, 0]]
/** Its arches, three tiers: x, the tier's floor, and the arch's height; only those under the broken rim. */
const ROME_ARCHES: [number, number][] = []
for (let t = 0; t < 3; t++) {
  for (let i = 0; i < 6; i++) {
    const x = 1.52 + i * 0.36
    const yb = -0.06 - t * 0.7
    const top = yb - 0.48
    // The rim's height over this arch.
    let rim = -1.32
    for (let k = 1; k < ROME_WALL.length - 1; k++) if (ROME_WALL[k][0] <= x + 0.11) rim = ROME_WALL[k][1]
    if (top > rim + 0.08) ROME_ARCHES.push([x, yb])
  }
}

const colosseum: Skin = {
  key: 'colosseum',
  bg: ROME.sky,
  ink: ROME.ink,
  floor: ROME.sand,
  edge: ROME.sandDeep,
  plank: ROME.stoneDeep,
  fulcrum: ROME.stoneDeep,
  back(pen, m, v) {
    // The sky paling to the horizon.
    rect(pen, v.x0 - 0.1, -0.9, v.x1 - v.x0 + 0.2, 0.9, ROME.skyLow, 0)
    // A cypress on the left, and a broken column before it.
    ellipse(pen, -2.45, -1.15, 0.26, 1.15, ROME.cypress, 0.8)
    rect(pen, -1.78, -0.95, 0.3, 0.95, ROME.stoneLit, 0.8)
    poly(pen, [[-1.82, -0.95], [-1.44, -0.95], [-1.5, -1.02], [-1.6, -1.06], [-1.7, -1.01], [-1.76, -1.08]], ROME.stoneLit, 0.8)
    if (pen.lod === 0) strokeLines(pen, ROME.stoneDeep, pen.lw * 0.7, (ctx) => {
      for (const x of [-1.71, -1.63, -1.55]) {
        ctx.moveTo(x, -0.92)
        ctx.lineTo(x, -0.03)
      }
    })
    // The great wall on the right, its arches in three tiers.
    poly(pen, ROME_WALL, ROME.stone, 0.8)
    fillPath(pen, ROME.arch, (ctx) => {
      for (const [x, yb] of ROME_ARCHES) {
        ctx.moveTo(x, yb)
        ctx.lineTo(x, yb - 0.37)
        ctx.arc(x + 0.11, yb - 0.37, 0.11, Math.PI, 0)
        ctx.lineTo(x + 0.22, yb)
        ctx.closePath()
      }
    })
    if (pen.lod <= 1) strokeLines(pen, ROME.stoneDeep, pen.lw * 1.4, (ctx) => {
      for (const y of [-0.66, -1.36]) {
        ctx.moveTo(y < -1.3 ? 1.75 : 1.4, y)
        ctx.lineTo(v.x1 + 0.1, y)
      }
    })
    // Swallows wheeling high, scattering a little when the plank lands.
    if (pen.lod <= 1) {
      const k = 0.18 * ring(m, 0.6, 0.6)
      strokeLines(pen, ROME.bird, 0.025, (ctx) => {
        for (let i = 0; i < 3; i++) {
          const a = m.t * 0.35 + i * 2.1
          const x = 0.5 + Math.cos(a) * (0.9 + k)
          const y = -2.35 + Math.sin(a) * 0.22 - k * 0.5
          const w = 0.06 + 0.02 * Math.sin(m.t * 6 + i)
          ctx.moveTo(x - 0.08, y - w * 0.6)
          ctx.quadraticCurveTo(x - 0.03, y - 0.03, x, y)
          ctx.quadraticCurveTo(x + 0.03, y - 0.03, x + 0.08, y - w * 0.6)
        }
      })
    }
  },
  front(pen, _m, v) {
    // The arena's raked sand.
    if (pen.lod > 0) return
    strokeLines(pen, ROME.sandDeep, pen.lw * 0.8, (ctx) => {
      for (const y of [0.24, 0.5, 0.8]) {
        if (y > v.y1) break
        ctx.moveTo(v.x0, y)
        ctx.lineTo(v.x1, y)
      }
    })
  },
  weight(pen) {
    // An amphora on a little foot, a black band round its shoulder.
    const h = WEIGHT_H
    if (pen.lod <= 1) {
      const { ctx } = pen
      ctx.beginPath()
      for (const s of [-1, 1]) {
        ctx.moveTo(s * 0.04, -h + 0.04)
        ctx.quadraticCurveTo(s * 0.13, -h + 0.03, s * 0.1, -h + 0.13)
      }
      ctx.strokeStyle = ROME.clayDeep
      ctx.lineWidth = 0.024
      ctx.stroke()
    }
    poly(pen, [[-0.06, 0], [0.06, 0], [0.04, -0.03], [0.1, -0.1], [0.12, -0.17], [0.09, -0.23], [0.04, -0.26], [0.035, -h + 0.02], [0.05, -h], [-0.05, -h], [-0.035, -h + 0.02], [-0.04, -0.26], [-0.09, -0.23], [-0.12, -0.17], [-0.1, -0.1], [-0.04, -0.03]], ROME.clay)
    if (pen.lod <= 1) rect(pen, -0.112, -0.19, 0.224, 0.05, ROME.black, 0)
  },
}

/* ------------------------------------------------------------------ a castle hall */

const CASTLE = {
  wall: '#6E6862',
  mortar: '#57514C',
  window: '#B4CCDC',
  windowDeep: '#7F9CB4',
  banner: '#2C4A8E',
  bannerDeep: '#1F3468',
  gold: '#E2B848',
  rod: '#3A2A1E',
  flag: '#857560',
  flagDeep: '#6C5E4C',
  wood: '#6A4A2E',
  flame: '#FFCB5A',
  fire: '#F29632',
  steel: '#AAB1B8',
  steelDeep: '#6E7680',
  plume: '#3E5FA6',
  ink: '#211B18',
}

/** A banner hanging from its rod, a swallowtail at its foot, a gold chevron on it. */
function banner(pen: Pen, x: number, sway: number): void {
  const w = 0.56
  const top = -2.62
  const bot = -1.1
  const s = sway
  poly(pen, [[x - w / 2, top], [x + w / 2, top], [x + w / 2 + s, bot], [x + s, bot - 0.2], [x - w / 2 + s, bot]], CASTLE.banner, 0.8)
  poly(pen, [[x - w / 2 + s * 0.6, -1.85], [x + s * 0.6, -1.6], [x + w / 2 + s * 0.6, -1.85], [x + w / 2 + s * 0.6, -1.68], [x + s * 0.6, -1.43], [x - w / 2 + s * 0.6, -1.68]], CASTLE.gold, 0)
  if (pen.lod <= 1) {
    circle(pen, x + s * 0.3, -2.15, 0.09, CASTLE.gold, 0.6)
    line(pen, x - w / 2 - 0.08, top, x + w / 2 + 0.08, top, CASTLE.rod, 0.05)
  }
}

const castle: Skin = {
  key: 'castle',
  bg: CASTLE.wall,
  ink: CASTLE.ink,
  floor: CASTLE.flag,
  edge: CASTLE.flagDeep,
  plank: CASTLE.wood,
  fulcrum: CASTLE.mortar,
  back(pen, m, v) {
    // The stone, in courses.
    if (pen.lod === 0) strokeLines(pen, CASTLE.mortar, pen.lw * 0.8, (ctx) => {
      for (let r = 0; r < 12; r++) {
        const y = -0.3 - r * 0.3
        if (y < v.y0) break
        ctx.moveTo(v.x0, y)
        ctx.lineTo(v.x1, y)
        for (let x = Math.floor(v.x0 / 0.7) * 0.7 + (r % 2) * 0.35; x < v.x1; x += 0.7) {
          ctx.moveTo(x, y)
          ctx.lineTo(x, y + 0.3)
        }
      }
    })
    // A tall lancet window high up, and the daylight in it.
    poly(pen, [[-0.28, -1.95], [0.28, -1.95], [0.28, -2.55], [0.2, -2.78], [0, -2.95], [-0.2, -2.78], [-0.28, -2.55]], CASTLE.window, 1.2)
    if (pen.lod <= 1) strokeLines(pen, CASTLE.windowDeep, pen.lw * 1.2, (ctx) => {
      ctx.moveTo(0, -1.95)
      ctx.lineTo(0, -2.92)
      ctx.moveTo(-0.28, -2.4)
      ctx.lineTo(0.28, -2.4)
    })
    // The banners, stirred by the landings.
    const s = 0.05 * Math.sin(m.t * 0.7) + 0.1 * ring(m, 0.7, 0.6)
    banner(pen, -2.25, s)
    banner(pen, 2.3, -s)
    // A torch in its bracket, flaring on the loud landings.
    const f = flashOf(m, 1.0, 0.25)
    const tx = -1.55
    glow(pen, tx, -1.55, 0.7 + 0.25 * f, CASTLE.flame, 0.35 + 0.25 * f)
    if (pen.lod <= 1) line(pen, tx - 0.12, -1.12, tx, -1.28, CASTLE.rod, 0.035)
    poly(pen, [[tx - 0.05, -1.4], [tx + 0.05, -1.4], [tx + 0.025, -1.05], [tx - 0.025, -1.05]], CASTLE.wood, 0.7)
    const fl = 0.04 * Math.sin(m.t * 11) + 0.08 * f
    poly(pen, [[tx - 0.08, -1.42], [tx + 0.08, -1.42], [tx + 0.03, -1.58], [tx + fl * 0.5, -1.7 - fl], [tx - 0.04, -1.56]], CASTLE.fire, 0)
    if (pen.lod <= 1) ellipse(pen, tx, -1.48, 0.04, 0.07, CASTLE.flame, 0)
  },
  front(pen, _m, v) {
    // Flagstones.
    if (pen.lod > 0) return
    strokeLines(pen, CASTLE.flagDeep, pen.lw * 0.9, (ctx) => {
      for (let r = 0; r < 3; r++) {
        const y = 0.07 + r * 0.28
        if (y > v.y1) break
        ctx.moveTo(v.x0, y)
        ctx.lineTo(v.x1, y)
        for (let x = Math.floor(v.x0 / 0.8) * 0.8 + (r % 2) * 0.4; x < v.x1; x += 0.8) {
          ctx.moveTo(x, y)
          ctx.lineTo(x, y + 0.28)
        }
      }
    })
  },
  weight(pen) {
    // A knight's great helm, a plume on its crown.
    const h = WEIGHT_H
    if (pen.lod <= 1) ellipse(pen, 0.04, -h + 0.05, 0.11, 0.045, CASTLE.plume, 0.7, -0.35)
    else ellipse(pen, 0.04, -h + 0.05, 0.11, 0.045, CASTLE.plume, 0, -0.35)
    poly(pen, [[-0.13, 0], [0.13, 0], [0.13, -0.2], [0.09, -0.26], [0, -0.28], [-0.09, -0.26], [-0.13, -0.2]], CASTLE.steel)
    rect(pen, -0.12, -0.18, 0.24, 0.035, CASTLE.ink, 0)
    if (pen.lod <= 1) {
      rect(pen, -0.015, -0.18, 0.03, 0.16, CASTLE.steelDeep, 0)
      fillPath(pen, CASTLE.ink, (ctx) => {
        for (const x of [-0.08, -0.05, 0.05, 0.08]) for (const y of [-0.1, -0.06]) ctx.rect(x - 0.008, y, 0.016, 0.016)
      })
    }
  },
}

/* ------------------------------------------------------------------ a longship in a fjord */

const FJORD = {
  sky: '#C6D3D6',
  skyHigh: '#9DB2BA',
  cliff: '#3C4F58',
  cliffFar: '#718892',
  snow: '#EEF2F2',
  water: '#4D6E7C',
  waterLight: '#8AA9B2',
  hull: '#6A4428',
  hullDeep: '#46301E',
  sail: '#ECE2C8',
  stripe: '#9E2F3A',
  shore: '#6E665A',
  shoreDeep: '#575046',
  yellow: '#E3B23C',
  blue: '#2E5E8E',
  iron: '#8E9498',
  ink: '#1C2428',
}

/** The longship's hull, its curled prow on the right and its stern on the left, the water line at y = 0. */
const HULL: Pt[] = [[-0.78, -0.42], [-0.7, -0.2], [-0.5, -0.06], [-0.2, 0.04], [0.2, 0.04], [0.5, -0.06], [0.7, -0.22], [0.8, -0.5], [0.76, -0.64], [0.66, -0.62], [0.72, -0.5], [0.62, -0.24], [0.4, -0.14], [-0.4, -0.14], [-0.62, -0.24], [-0.7, -0.4]]

const viking: Skin = {
  key: 'viking',
  bg: FJORD.sky,
  ink: FJORD.ink,
  floor: FJORD.shore,
  edge: FJORD.shoreDeep,
  plank: FJORD.hull,
  fulcrum: FJORD.shoreDeep,
  back(pen, m, v) {
    // A cold sky, darker overhead.
    rect(pen, v.x0 - 0.1, v.y0 - 0.1, v.x1 - v.x0 + 0.2, -2.1 - v.y0 + 0.1, FJORD.skyHigh, 0)
    // The far wall of the fjord on the right, and the near cliff on the left, steep, with snow on their tops.
    poly(pen, [[0.9, -0.3], [1.6, -1.2], [2.2, -1.75], [2.7, -2.0], [3.2, -2.5], [v.x1 + 0.2, -2.6], [v.x1 + 0.2, -0.3]], FJORD.cliffFar, 0)
    poly(pen, [[v.x0 - 0.2, -0.3], [v.x0 - 0.2, -2.9], [-3.0, -2.75], [-2.55, -2.2], [-2.2, -1.5], [-1.85, -0.9], [-1.45, -0.3]], FJORD.cliff, 0.8)
    if (pen.lod <= 1) {
      poly(pen, [[2.7, -2.0], [3.2, -2.5], [v.x1 + 0.2, -2.6], [v.x1 + 0.2, -2.38], [3.2, -2.32], [2.95, -2.06]], FJORD.snow, 0)
      poly(pen, [[-3.0, -2.75], [-2.55, -2.2], [-2.38, -1.88], [-2.62, -2.08], [-2.9, -2.45], [v.x0 - 0.2, -2.6], [v.x0 - 0.2, -2.9]], FJORD.snow, 0)
    }
    // The water.
    rect(pen, v.x0 - 0.1, -0.32, v.x1 - v.x0 + 0.2, 0.32, FJORD.water, 0)
    if (pen.lod === 0) strokeLines(pen, FJORD.waterLight, pen.lw, (ctx) => {
      for (let i = 0; i < 6; i++) {
        const x = -2.8 + i * 1.1 + 0.15 * Math.sin(m.t * 0.6 + i)
        const y = -0.22 + 0.08 * (i % 2)
        ctx.moveTo(x, y)
        ctx.lineTo(x + 0.35, y)
      }
    })
    // The longship, riding the swell, its striped sail filling.
    const bob = 0.025 * Math.sin(m.t * 1.4) + 0.03 * ring(m, 0.8, 0.6)
    at(pen, 2.25, -0.18 + bob, 0.03 * Math.sin(m.t * 1.1), 1, () => {
      line(pen, 0, -0.1, 0, -1.72, FJORD.hullDeep, 0.05)
      const bl = 0.06 * Math.sin(m.t * 0.8) + 0.08 * ring(m, 0.8, 0.6)
      const sail: Pt[] = [[-0.5, -1.6], [0.5, -1.6], [0.52 + bl, -1.1], [0.48, -0.62], [-0.48, -0.62], [-0.52 + bl, -1.1]]
      poly(pen, sail, FJORD.sail, 0.8)
      fillPath(pen, FJORD.stripe, (ctx) => {
        for (const x of [-0.36, -0.08, 0.2]) ctx.rect(x, -1.6, 0.16, 0.98)
      })
      if (pen.lod <= 1) poly(pen, sail, null, 0.8)
      if (pen.lod <= 1) line(pen, -0.58, -1.6, 0.58, -1.6, FJORD.hullDeep, 0.04)
      poly(pen, HULL, FJORD.hull, 0.8)
      // Its shields along the gunwale.
      if (pen.lod <= 1) for (let i = 0; i < 5; i++) circle(pen, -0.4 + i * 0.2, -0.14, 0.07, i % 2 ? FJORD.yellow : FJORD.blue, 0.6)
    })
  },
  front(pen, _m, v) {
    // Pebbles on the shore.
    if (pen.lod > 0) return
    fillPath(pen, FJORD.shoreDeep, (ctx) => {
      for (let i = 0; i < 16; i++) {
        const x = v.x0 + (v.x1 - v.x0) * hash(i, 4, 9)
        const y = 0.14 + 0.7 * hash(i, 5, 9)
        if (y > v.y1) continue
        ctx.moveTo(x + 0.06, y)
        ctx.ellipse(x, y, 0.06, 0.03, 0, 0, Math.PI * 2)
      }
    })
  },
  weight(pen) {
    // A round shield, painted in quarters, stood on its rim.
    const r = WEIGHT_H / 2
    const cy = -r
    circle(pen, 0, cy, r, FJORD.blue)
    fillPath(pen, FJORD.yellow, (ctx) => {
      ctx.moveTo(0, cy)
      ctx.arc(0, cy, r, -Math.PI / 2, 0)
      ctx.closePath()
      ctx.moveTo(0, cy)
      ctx.arc(0, cy, r, Math.PI / 2, Math.PI)
      ctx.closePath()
    })
    circle(pen, 0, cy, 0.05, FJORD.iron, 0.7)
    if (pen.lod <= 1) circle(pen, 0, cy, r, null, 1)
  },
}

/* ------------------------------------------------------------------ a pirate ship's deck, by moonlight */

const PIRATE = {
  sky: '#2C3D6A',
  skyLow: '#47598A',
  moon: '#F4EBC8',
  sea: '#1C4A5E',
  seaLight: '#3E7488',
  deck: '#8C5E36',
  deckDeep: '#6C4526',
  rail: '#5A3820',
  railDeep: '#432916',
  mast: '#4A2E1A',
  sail: '#EADFC2',
  sailDeep: '#C9BC98',
  rope: '#C4AC84',
  flag: '#141418',
  bone: '#F0EBDD',
  gold: '#E8B83C',
  chest: '#7A4A26',
  chestDeep: '#563218',
  ink: '#120F18',
}

const pirate: Skin = {
  key: 'pirate',
  bg: PIRATE.sky,
  ink: PIRATE.ink,
  floor: PIRATE.deck,
  edge: PIRATE.deckDeep,
  plank: PIRATE.rail,
  fulcrum: PIRATE.railDeep,
  back(pen, m, v) {
    // The sky paler at the sea's edge, and the moon.
    rect(pen, v.x0 - 0.1, -1.4, v.x1 - v.x0 + 0.2, 1.4, PIRATE.skyLow, 0)
    glow(pen, 0.7, -2.45, 0.7, PIRATE.moon, 0.35)
    circle(pen, 0.7, -2.45, 0.2, PIRATE.moon, 0)
    // The sea over the rail, heaving gently.
    const swell = 0.05 * Math.sin(m.t * 0.8)
    rect(pen, v.x0 - 0.1, -0.95 + swell, v.x1 - v.x0 + 0.2, 0.95 - swell, PIRATE.sea, 0)
    if (pen.lod === 0) strokeLines(pen, PIRATE.seaLight, pen.lw, (ctx) => {
      for (let i = 0; i < 5; i++) {
        const x = -2.9 + i * 1.3 + 0.2 * Math.sin(m.t * 0.5 + i * 2)
        ctx.moveTo(x, -0.8 + swell)
        ctx.lineTo(x + 0.4, -0.8 + swell)
      }
    })
    // The bulwark: planks to waist height, and the rail along its top.
    rect(pen, v.x0 - 0.1, -0.5, v.x1 - v.x0 + 0.2, 0.5, PIRATE.railDeep, 0)
    rect(pen, v.x0 - 0.1, -0.58, v.x1 - v.x0 + 0.2, 0.09, PIRATE.rail, pen.lod <= 1 ? 0.8 : 0)
    if (pen.lod === 0) strokeLines(pen, PIRATE.ink, pen.lw * 0.7, (ctx) => {
      for (const y of [-0.33, -0.16]) {
        ctx.moveTo(v.x0, y)
        ctx.lineTo(v.x1, y)
      }
    })
    // The mainmast on the left: its shrouds, its yard and its sail, bellying on the landings.
    const mx = -2.0
    if (pen.lod <= 1) strokeLines(pen, PIRATE.rope, pen.lw * 0.9, (ctx) => {
      for (const x of [-2.75, -2.5, -1.5, -1.3]) {
        ctx.moveTo(mx, -2.9)
        ctx.lineTo(x, -0.58)
      }
    })
    rect(pen, mx - 0.07, -3.2, 0.14, 3.2, PIRATE.mast, 0.8)
    const b = 0.08 * Math.sin(m.t * 0.6) + 0.12 * ring(m, 0.9, 0.6)
    const { ctx } = pen
    ctx.beginPath()
    ctx.moveTo(mx - 0.68, -2.32)
    ctx.lineTo(mx + 0.68, -2.32)
    ctx.quadraticCurveTo(mx + 0.82 + b, -1.75, mx + 0.62, -1.18)
    ctx.quadraticCurveTo(mx, -1.08 - b, mx - 0.62, -1.18)
    ctx.quadraticCurveTo(mx - 0.82 - b, -1.75, mx - 0.68, -2.32)
    ctx.fillStyle = PIRATE.sail
    ctx.fill()
    inkPath(pen, 0.8)
    if (pen.lod <= 1) {
      line(pen, mx, -2.3, mx, -1.15, PIRATE.sailDeep, 0.03)
      line(pen, mx - 0.78, -2.34, mx + 0.78, -2.34, PIRATE.mast, 0.06)
    }
    // The ship's wheel on the right, turning a little with the sea.
    const wx = 2.25
    const wy = -0.95
    rect(pen, wx - 0.06, wy, 0.12, -wy, PIRATE.mast, 0.8)
    const a = 0.3 * Math.sin(m.t * 0.4) + 0.25 * ring(m, 0.9, 0.7)
    strokeLines(pen, PIRATE.chest, 0.05, (c) => {
      for (let i = 0; i < 8; i++) {
        const t = a + (i * Math.PI) / 4
        c.moveTo(wx + Math.cos(t) * 0.12, wy + Math.sin(t) * 0.12)
        c.lineTo(wx + Math.cos(t) * 0.52, wy + Math.sin(t) * 0.52)
      }
    })
    ctx.beginPath()
    ctx.arc(wx, wy, 0.4, 0, Math.PI * 2)
    ctx.strokeStyle = PIRATE.chest
    ctx.lineWidth = 0.07
    ctx.stroke()
    circle(pen, wx, wy, 0.1, PIRATE.chestDeep, 0.7)
    // The black flag over it, on its staff.
    if (pen.lod <= 1) line(pen, 2.75, -0.58, 2.75, -2.25, PIRATE.mast, 0.04)
    const fl = 0.05 * Math.sin(m.t * 3)
    poly(pen, [[2.75, -2.25], [2.75, -1.8], [2.2, -1.82 + fl], [2.22, -2.27 - fl]], PIRATE.flag, 0.6)
    if (pen.lod <= 1) {
      circle(pen, 2.48, -2.08, 0.08, PIRATE.bone, 0)
      strokeLines(pen, PIRATE.bone, 0.03, (c) => {
        c.moveTo(2.36, -1.88)
        c.lineTo(2.6, -1.98)
        c.moveTo(2.36, -1.98)
        c.lineTo(2.6, -1.88)
      })
    }
  },
  front(pen, _m, v) {
    // The deck planks.
    if (pen.lod > 0) return
    strokeLines(pen, PIRATE.deckDeep, pen.lw * 0.8, (ctx) => {
      for (const y of [0.2, 0.36, 0.55, 0.76]) {
        if (y > v.y1) break
        ctx.moveTo(v.x0, y)
        ctx.lineTo(v.x1, y)
      }
    })
  },
  weight(pen) {
    // A treasure chest, banded in gold, a coin's gleam at its lip.
    poly(pen, [[-0.15, -0.2], [0.15, -0.2], [0.15, -0.25], [0.1, -0.31], [0, -0.33], [-0.1, -0.31], [-0.15, -0.25]], PIRATE.chestDeep)
    rect(pen, -0.15, -0.2, 0.3, 0.2, PIRATE.chest)
    fillPath(pen, PIRATE.gold, (ctx) => {
      for (const x of [-0.11, 0.08]) ctx.rect(x, -0.32, 0.03, 0.32)
      ctx.rect(-0.03, -0.17, 0.06, 0.06)
    })
    if (pen.lod === 0) circle(pen, 0.04, -0.21, 0.025, PIRATE.gold, 0.5)
  },
}

/* ------------------------------------------------------------------ the age of the dinosaurs */

const DINO = {
  sky: '#D4DE9E',
  skyHigh: '#B9CC86',
  volcano: '#5A4844',
  volcanoDeep: '#463632',
  lava: '#F2A23A',
  smoke: '#8E8A80',
  beast: '#4F6650',
  canopy: '#5E8448',
  canopyDeep: '#4A6E3A',
  fern: '#2F5A2A',
  floor: '#6A7A3A',
  floorDeep: '#55632C',
  egg: '#EFE6CC',
  speck: '#8A7A58',
  ink: '#1E2618',
}

/** A fern, a fan of fronds from its root, as one path. */
function fern(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, flip: number): void {
  for (const a of [-2.6, -2.1, -1.6, -1.15, -0.7]) {
    const t = flip > 0 ? a : -Math.PI - a
    const ex = x + Math.cos(t) * 0.75 * s
    const ey = y + Math.sin(t) * 0.75 * s
    const nx = -Math.sin(t) * 0.07 * s
    const ny = Math.cos(t) * 0.07 * s
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo((x + ex) / 2 + nx, (y + ey) / 2 + ny - 0.1 * s, ex, ey)
    ctx.quadraticCurveTo((x + ex) / 2 - nx, (y + ey) / 2 - ny - 0.1 * s, x, y)
  }
}

const dinosaurs: Skin = {
  key: 'dinosaurs',
  bg: DINO.sky,
  ink: DINO.ink,
  floor: DINO.floor,
  edge: DINO.floorDeep,
  plank: DINO.volcanoDeep,
  fulcrum: DINO.volcano,
  back(pen, m, v) {
    rect(pen, v.x0 - 0.1, v.y0 - 0.1, v.x1 - v.x0 + 0.2, -2.0 - v.y0 + 0.1, DINO.skyHigh, 0)
    // The volcano on the left, smoking, puffing harder on the loud landings.
    const f = flashOf(m, 1.0, 0.5)
    if (pen.lod <= 1) {
      fillPath(pen, rgba(DINO.smoke, 0.75), (ctx) => {
        for (let i = 0; i < 4; i++) {
          const u = (m.t * 0.12 + i / 4) % 1
          const r = 0.14 + 0.22 * u + 0.08 * f
          const x = -2.3 + 0.35 * u + 0.05 * Math.sin(m.t + i)
          const y = -2.05 - 1.1 * u
          ctx.moveTo(x + r, y)
          ctx.arc(x, y, r, 0, Math.PI * 2)
        }
      })
    } else circle(pen, -2.2, -2.35, 0.3, DINO.smoke, 0)
    glow(pen, -2.3, -1.98, 0.5 + 0.3 * f, DINO.lava, 0.4 + 0.3 * f)
    poly(pen, [[-3.6, -0.2], [-2.5, -1.98], [-2.1, -1.98], [-1.3, -0.2]], DINO.volcano, 0.8)
    if (pen.lod <= 1) poly(pen, [[-2.42, -1.98], [-2.18, -1.98], [-2.28, -1.6], [-2.4, -1.2], [-2.5, -1.25], [-2.36, -1.62]], DINO.lava, 0)
    // The jungle's canopy, low behind everything.
    if (pen.lod <= 1) fillPath(pen, DINO.canopyDeep, (ctx) => {
      for (let i = 0; i < 9; i++) {
        const x = v.x0 + 0.2 + i * ((v.x1 - v.x0) / 8)
        const r = 0.28 + 0.12 * hash(i, 7, 2)
        ctx.moveTo(x + r, -0.15)
        ctx.arc(x, -0.15, r, 0, Math.PI * 2)
      }
    })
    rect(pen, v.x0 - 0.1, -0.22, v.x1 - v.x0 + 0.2, 0.22, DINO.canopy, 0)
    // A long-necked giant on the right, grazing high, its head slowly nodding.
    const nod = 0.06 * Math.sin(m.t * 0.5) + 0.05 * ring(m, 0.9, 0.6)
    const hx = 1.72
    const hy = -1.9 + nod
    const { ctx } = pen
    ctx.beginPath()
    ctx.moveTo(1.95, -0.55)
    ctx.quadraticCurveTo(1.62, -1.15, hx + 0.02, hy + 0.08)
    ctx.lineTo(hx + 0.14, hy + 0.08)
    ctx.quadraticCurveTo(1.86, -1.15, 2.25, -0.75)
    // The body, the tail sweeping right.
    ctx.quadraticCurveTo(2.7, -0.95, 3.0, -0.6)
    ctx.quadraticCurveTo(3.4, -0.35, 3.75, -0.3)
    ctx.quadraticCurveTo(3.2, -0.25, 2.95, -0.35)
    ctx.lineTo(2.95, 0)
    ctx.lineTo(2.78, 0)
    ctx.lineTo(2.75, -0.3)
    ctx.lineTo(2.2, -0.3)
    ctx.lineTo(2.18, 0)
    ctx.lineTo(2.0, 0)
    ctx.lineTo(1.98, -0.4)
    ctx.closePath()
    ctx.moveTo(hx + 0.24, hy)
    ctx.ellipse(hx + 0.06, hy, 0.18, 0.09, -0.1, 0, Math.PI * 2)
    ctx.fillStyle = DINO.beast
    ctx.fill()
    if (pen.lod === 0) circle(pen, hx - 0.03, hy - 0.02, 0.018, DINO.ink, 0)
  },
  front(pen, _m, v) {
    // Ferns at the edges of the clearing.
    if (pen.lod > 1) return
    fillPath(pen, DINO.fern, (ctx) => {
      fern(ctx, v.x0 + 0.25, 0.12, 0.9, 1)
      fern(ctx, v.x1 - 0.25, 0.12, 0.9, -1)
    })
  },
  weight(pen) {
    // A dinosaur's egg, speckled.
    const h = WEIGHT_H
    ellipse(pen, 0, -h / 2, 0.12, h / 2, DINO.egg)
    if (pen.lod <= 1) fillPath(pen, DINO.speck, (ctx) => {
      for (const [x, y, r] of [[-0.05, -0.22, 0.018], [0.04, -0.27, 0.014], [0.06, -0.13, 0.02], [-0.03, -0.08, 0.015], [0.0, -0.17, 0.012]] as const) {
        ctx.moveTo(x + r, y)
        ctx.arc(x, y, r, 0, Math.PI * 2)
      }
    })
  },
}

/* ------------------------------------------------------------------ a steampunk workshop */

const STEAM = {
  wall: '#4C3D35',
  seam: '#3A2E28',
  rivet: '#7C6650',
  brass: '#C99A3E',
  brassLight: '#E8C46A',
  brassDeep: '#8A6424',
  copper: '#B86C3E',
  copperDeep: '#7E4424',
  gauge: '#EDE3C8',
  needle: '#2A1A12',
  steam: '#ECE8E0',
  grate: '#2E2925',
  grateEdge: '#4A3E36',
  hat: '#2E2420',
  lens: '#86BDB8',
  ink: '#1A120E',
}

/** A gear's outline round a hole, as one path, to be filled even-odd. */
function cog(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, n: number, hole: number, a: number): void {
  const k = n * 4
  for (let i = 0; i < k; i++) {
    const t = a + ((i + 0.5 * (i % 2)) / k) * Math.PI * 2
    const r = (i >> 1) % 2 ? R * 0.82 : R
    if (i === 0) ctx.moveTo(x + Math.cos(t) * r, y + Math.sin(t) * r)
    else ctx.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r)
  }
  ctx.closePath()
  ctx.moveTo(x + hole, y)
  ctx.arc(x, y, hole, 0, Math.PI * 2, true)
}

const steampunk: Skin = {
  key: 'steampunk',
  bg: STEAM.wall,
  ink: STEAM.ink,
  floor: STEAM.grate,
  edge: STEAM.grateEdge,
  plank: STEAM.copperDeep,
  fulcrum: STEAM.brassDeep,
  back(pen, m, v) {
    // Iron plates, seamed and riveted.
    if (pen.lod === 0) {
      strokeLines(pen, STEAM.seam, pen.lw * 1.2, (ctx) => {
        for (const y of [-1.0, -2.0]) {
          ctx.moveTo(v.x0, y)
          ctx.lineTo(v.x1, y)
        }
        for (let x = Math.floor(v.x0 / 1.1) * 1.1; x < v.x1; x += 1.1) {
          ctx.moveTo(x, v.y0)
          ctx.lineTo(x, 0)
        }
      })
      fillPath(pen, STEAM.rivet, (ctx) => {
        for (let x = Math.floor(v.x0 / 0.275) * 0.275; x < v.x1; x += 0.275) {
          for (const y of [-1.06, -2.06]) {
            ctx.moveTo(x + 0.02, y)
            ctx.arc(x, y, 0.02, 0, Math.PI * 2)
          }
        }
      })
    }
    // Two gears on the left, meshed, turning; they lurch on each landing.
    const { ctx } = pen
    const a = m.t * 0.3 + 0.2 * (1 - knock(m.since, 0.3))
    ctx.beginPath()
    cog(ctx, -2.15, -1.35, 0.72, 12, 0.18, a)
    ctx.fillStyle = STEAM.brass
    ctx.fill('evenodd')
    inkPath(pen, 0.8)
    ctx.beginPath()
    cog(ctx, -1.48, -2.25, 0.38, 7, 0.08, -a * (12 / 7) + 0.25)
    ctx.fillStyle = STEAM.copper
    ctx.fill('evenodd')
    inkPath(pen, 0.8)
    if (pen.lod <= 1) {
      circle(pen, -2.15, -1.35, 0.32, null, 0.8)
      strokeLines(pen, STEAM.brassDeep, 0.05, (c) => {
        for (let i = 0; i < 4; i++) {
          const t = a + (i * Math.PI) / 2
          c.moveTo(-2.15 + Math.cos(t) * 0.18, -1.35 + Math.sin(t) * 0.18)
          c.lineTo(-2.15 + Math.cos(t) * 0.5, -1.35 + Math.sin(t) * 0.5)
        }
      })
    }
    // Pipes on the right, an elbow up top, a valve, and steam when the plank lands.
    strokeLines(pen, STEAM.copper, 0.16, (c) => {
      c.moveTo(1.9, 0.05)
      c.lineTo(1.9, -2.05)
      c.lineTo(v.x1 + 0.2, -2.05)
      c.moveTo(2.75, 0.05)
      c.lineTo(2.75, -1.35)
    })
    if (pen.lod <= 1) {
      fillPath(pen, STEAM.brass, (c) => {
        for (const [x, y] of [[1.9, -0.6], [1.9, -2.05], [2.75, -0.6]] as const) c.rect(x - 0.12, y - 0.05, 0.24, 0.1)
        c.rect(2.4, -2.17, 0.1, 0.24)
      })
    }
    // A pressure gauge, its needle jumping on the landings.
    const gx = 2.33
    const gy = -1.3
    circle(pen, gx, gy, 0.34, STEAM.brass)
    circle(pen, gx, gy, 0.26, STEAM.gauge, 0.6)
    const s = Math.min(1, m.s / 2)
    const n = -2.4 + 1.6 * knock(m.since, 0.6) * (0.4 + 0.6 * s) + 0.08 * Math.sin(m.t * 2)
    line(pen, gx, gy, gx + Math.cos(n) * 0.21, gy + Math.sin(n) * 0.21, STEAM.needle, 0.035)
    if (pen.lod === 0) strokeLines(pen, STEAM.needle, pen.lw * 0.8, (c) => {
      for (let i = 0; i < 7; i++) {
        const t = -2.6 + i * 0.36
        c.moveTo(gx + Math.cos(t) * 0.2, gy + Math.sin(t) * 0.2)
        c.lineTo(gx + Math.cos(t) * 0.25, gy + Math.sin(t) * 0.25)
      }
    })
    // Steam from the valve, as the plank lands.
    if (pen.lod <= 1 && m.since >= 0 && m.since < 1.2) {
      const u = m.since / 1.2
      fillPath(pen, rgba(STEAM.steam, 0.55 * (1 - u)), (c) => {
        for (let i = 0; i < 3; i++) {
          const r = 0.08 + 0.18 * u + 0.04 * i
          const x = 2.45 + 0.12 * i * u
          const y = -2.25 - 0.35 * u - 0.14 * i
          c.moveTo(x + r, y)
          c.arc(x, y, r, 0, Math.PI * 2)
        }
      })
    }
  },
  front(pen, _m, v) {
    // The floor's grating.
    if (pen.lod > 0) return
    strokeLines(pen, STEAM.grateEdge, pen.lw, (ctx) => {
      for (let x = Math.floor(v.x0 / 0.25) * 0.25; x < v.x1; x += 0.25) {
        ctx.moveTo(x, 0.07)
        ctx.lineTo(x, v.y1)
      }
    })
  },
  board(pen) {
    // A copper bar, riveted in brass.
    rect(pen, -PL, -TH / 2, 2 * PL, TH, STEAM.copperDeep)
    if (pen.lod <= 1) fillPath(pen, STEAM.brassLight, (ctx) => {
      for (let i = 0; i < 6; i++) {
        const x = -PL + 0.12 + i * ((2 * PL - 0.24) / 5)
        ctx.moveTo(x + 0.02, 0)
        ctx.arc(x, 0, 0.02, 0, Math.PI * 2)
      }
    })
  },
  weight(pen) {
    // A top hat with brass goggles on its band.
    const h = WEIGHT_H
    ellipse(pen, 0, -0.04, 0.16, 0.035, STEAM.hat)
    poly(pen, [[-0.1, -0.05], [0.1, -0.05], [0.11, -h], [-0.11, -h]], STEAM.hat)
    rect(pen, -0.102, -0.13, 0.204, 0.05, STEAM.brass, 0)
    for (const x of [-0.05, 0.05]) {
      circle(pen, x, -0.105, 0.045, STEAM.brassDeep, 0.6)
      if (pen.lod <= 1) circle(pen, x, -0.105, 0.03, STEAM.lens, 0)
    }
  },
}

/* ------------------------------------------------------------------ an art deco ballroom */

const DECO = {
  black: '#16130F',
  panel: '#221D17',
  gold: '#D8B25C',
  goldDeep: '#9C7A34',
  goldLight: '#F2D88E',
  marble: '#2C2722',
  vein: '#4A4034',
  glass: '#F3E6B4',
  fizz: '#FFF6D8',
  ink: '#0C0A08',
}

/** A stepped pilaster: a ziggurat top over a tall shaft, gold lines up its face. */
function pilaster(pen: Pen, x: number): void {
  poly(pen, [[x - 0.38, 0], [x - 0.38, -1.9], [x - 0.27, -1.9], [x - 0.27, -2.1], [x - 0.16, -2.1], [x - 0.16, -2.3], [x - 0.05, -2.3], [x - 0.05, -2.5], [x + 0.05, -2.5], [x + 0.05, -2.3], [x + 0.16, -2.3], [x + 0.16, -2.1], [x + 0.27, -2.1], [x + 0.27, -1.9], [x + 0.38, -1.9], [x + 0.38, 0]], DECO.panel, 0)
  strokeLines(pen, DECO.gold, pen.lod <= 1 ? pen.lw * 1.3 : 0.04, (ctx) => {
    ctx.moveTo(x - 0.38, 0)
    ctx.lineTo(x - 0.38, -1.9)
    ctx.lineTo(x - 0.27, -1.9)
    ctx.lineTo(x - 0.27, -2.1)
    ctx.lineTo(x - 0.16, -2.1)
    ctx.lineTo(x - 0.16, -2.3)
    ctx.lineTo(x - 0.05, -2.3)
    ctx.lineTo(x - 0.05, -2.5)
    ctx.lineTo(x + 0.05, -2.5)
    ctx.lineTo(x + 0.05, -2.3)
    ctx.lineTo(x + 0.16, -2.3)
    ctx.lineTo(x + 0.16, -2.1)
    ctx.lineTo(x + 0.27, -2.1)
    ctx.lineTo(x + 0.27, -1.9)
    ctx.lineTo(x + 0.38, -1.9)
    ctx.lineTo(x + 0.38, 0)
    if (pen.lod > 1) return
    for (const dx of [-0.16, 0, 0.16]) {
      ctx.moveTo(x + dx, -0.15)
      ctx.lineTo(x + dx, -1.75)
    }
  })
  // A small fan over the shaft.
  if (pen.lod <= 1) {
    const { ctx } = pen
    ctx.beginPath()
    ctx.moveTo(x - 0.22, -1.72)
    ctx.arc(x, -1.72, 0.22, Math.PI, 0)
    ctx.closePath()
    ctx.fillStyle = DECO.gold
    ctx.fill()
  }
}

/** One coupe of champagne, its foot at x, y and `w` across the bowl. */
function coupe(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  const r = w / 2
  ctx.moveTo(x - r * 0.62, y)
  ctx.lineTo(x + r * 0.62, y)
  ctx.lineTo(x + r * 0.14, y - 0.016)
  ctx.lineTo(x + r * 0.14, y - 0.05)
  ctx.quadraticCurveTo(x + r, y - 0.055, x + r, y - 0.11)
  ctx.lineTo(x - r, y - 0.11)
  ctx.quadraticCurveTo(x - r, y - 0.055, x - r * 0.14, y - 0.05)
  ctx.lineTo(x - r * 0.14, y - 0.016)
  ctx.closePath()
}

const COUPES: [number, number][] = [[-0.106, 0], [0, 0], [0.106, 0], [-0.053, -0.112], [0.053, -0.112], [0, -0.224]]

const artdeco: Skin = {
  key: 'artdeco',
  bg: DECO.black,
  ink: DECO.ink,
  floor: DECO.marble,
  edge: DECO.goldDeep,
  plank: DECO.goldDeep,
  fulcrum: DECO.panel,
  back(pen, m, _v) {
    // A great sunburst fan, up high over the floor, its rays brightening on the loud landings.
    const f = flashOf(m, 1.0, 0.3)
    const cy = -1.95
    const { ctx } = pen
    ctx.beginPath()
    ctx.moveTo(1.35, cy)
    ctx.arc(0, cy, 1.35, 0, Math.PI, true)
    ctx.closePath()
    ctx.fillStyle = DECO.panel
    ctx.fill()
    fillPath(pen, mix(DECO.goldDeep, DECO.goldLight, 0.25 + 0.6 * f), (c) => {
      const n = 9
      for (let i = 0; i < n; i++) {
        const a0 = Math.PI + (i / n) * Math.PI + 0.06
        const a1 = Math.PI + ((i + 1) / n) * Math.PI - 0.06
        c.moveTo(Math.cos(a0) * 0.5, cy + Math.sin(a0) * 0.5)
        c.lineTo(Math.cos(a0) * 1.3, cy + Math.sin(a0) * 1.3)
        c.lineTo(Math.cos(a1) * 1.3, cy + Math.sin(a1) * 1.3)
        c.lineTo(Math.cos(a1) * 0.5, cy + Math.sin(a1) * 0.5)
        c.closePath()
      }
    })
    ctx.beginPath()
    ctx.moveTo(0.42, cy)
    ctx.arc(0, cy, 0.42, 0, Math.PI, true)
    ctx.closePath()
    ctx.fillStyle = DECO.gold
    ctx.fill()
    line(pen, -1.45, cy, 1.45, cy, DECO.gold, pen.lod <= 1 ? 0.03 : 0.05)
    // Stepped pilasters at either side.
    pilaster(pen, -2.15)
    pilaster(pen, 2.15)
  },
  front(pen, _m, v) {
    // Gold inlay in the black marble: a band, and chevrons along it.
    if (pen.lod > 0) return
    strokeLines(pen, DECO.goldDeep, pen.lw, (ctx) => {
      ctx.moveTo(v.x0, 0.3)
      ctx.lineTo(v.x1, 0.3)
      for (let x = Math.floor(v.x0 / 0.6) * 0.6; x < v.x1; x += 0.6) {
        ctx.moveTo(x, 0.42)
        ctx.lineTo(x + 0.3, 0.32)
        ctx.lineTo(x + 0.6, 0.42)
      }
    })
  },
  weight(pen) {
    // A tower of champagne coupes, three tiers, each brimming.
    fillPath(pen, DECO.glass, (ctx) => {
      for (const [x, y] of COUPES) coupe(ctx, x, y, 0.11)
    })
    fillPath(pen, DECO.gold, (ctx) => {
      for (const [x, y] of COUPES) {
        ctx.rect(x - 0.055, y - 0.11, 0.11, 0.022)
      }
    })
    if (pen.lod <= 1) {
      pen.ctx.beginPath()
      for (const [x, y] of COUPES) coupe(pen.ctx, x, y, 0.11)
      inkPath(pen, 0.6)
    }
    if (pen.lod === 0) fillPath(pen, DECO.fizz, (ctx) => {
      for (const [x, y] of [[0, -0.37], [0.03, -0.355], [-0.025, -0.36]] as const) {
        ctx.moveTo(x + 0.008, y)
        ctx.arc(x, y, 0.008, 0, Math.PI * 2)
      }
    })
  },
}

/* ------------------------------------------------------------------ a seventies living room */

const SEV = {
  panel: '#7A4C2A',
  groove: '#5E3A1E',
  orange: '#D9762E',
  mustard: '#D9A637',
  cream: '#EED9AE',
  brown: '#4A2A14',
  sofa: '#C8962E',
  sofaDeep: '#9C7020',
  chrome: '#C2C6CA',
  shade: '#E9A23A',
  lamp: '#FFE0A0',
  shag: '#A9622A',
  shagDeep: '#8A4C1E',
  glass: '#7E4A98',
  lava: '#F4B23A',
  ink: '#2A160A',
}

const seventies: Skin = {
  key: 'seventies',
  bg: SEV.panel,
  ink: SEV.ink,
  floor: SEV.shag,
  edge: SEV.shagDeep,
  plank: SEV.brown,
  fulcrum: SEV.groove,
  back(pen, m, v) {
    // Wood panelling, grooved.
    if (pen.lod <= 1) strokeLines(pen, SEV.groove, pen.lod === 0 ? pen.lw * 1.2 : pen.lw * 1.6, (ctx) => {
      const step = pen.lod === 0 ? 0.32 : 0.64
      for (let x = Math.floor(v.x0 / step) * step; x < v.x1; x += step) {
        ctx.moveTo(x, v.y0)
        ctx.lineTo(x, 0)
      }
    })
    // A supergraphic up high: three broad stripes, orange, mustard, cream, swooping down at the right.
    const bands: [string, number][] = [[SEV.orange, -2.62], [SEV.mustard, -2.42], [SEV.cream, -2.22]]
    for (const [c, y] of bands) {
      const { ctx } = pen
      ctx.beginPath()
      ctx.moveTo(v.x0 - 0.2, y)
      ctx.lineTo(1.3, y)
      ctx.arc(1.3, y + 1.2, 1.2, -Math.PI / 2, -0.25)
      ctx.lineTo(1.3 + Math.cos(-0.25) * 1.0, y + 1.2 + Math.sin(-0.25) * 1.0)
      ctx.arc(1.3, y + 1.2, 1.0, -0.25, -Math.PI / 2, true)
      ctx.lineTo(v.x0 - 0.2, y + 0.2)
      ctx.closePath()
      ctx.fillStyle = c
      ctx.fill()
    }
    // A low mustard sofa on the right.
    round(pen, 1.55, -0.95, 1.9, 0.6, 0.12, SEV.sofa)
    round(pen, 1.5, -0.5, 2.0, 0.34, 0.08, SEV.sofaDeep)
    if (pen.lod <= 1) {
      round(pen, 1.42, -0.72, 0.22, 0.6, 0.1, SEV.sofa, 0.8)
      strokeLines(pen, SEV.sofaDeep, pen.lw, (ctx) => {
        for (const x of [2.2, 2.85]) {
          ctx.moveTo(x, -0.9)
          ctx.lineTo(x, -0.52)
        }
      })
    }
    // An arc lamp on the left, its dome swinging a little when the plank lands.
    const lx = -2.65
    const sx = -1.62
    const { ctx } = pen
    ctx.beginPath()
    ctx.moveTo(lx, 0)
    ctx.lineTo(lx, -1.6)
    ctx.quadraticCurveTo(lx + 0.05, -2.2, sx, -2.0)
    ctx.strokeStyle = SEV.chrome
    ctx.lineWidth = 0.05
    ctx.stroke()
    ellipse(pen, lx, -0.03, 0.22, 0.05, SEV.chrome, 0.7)
    const sw = 0.1 * ring(m, 0.8, 0.8) + 0.02 * Math.sin(m.t * 0.7)
    at(pen, sx, -2.0, sw, 1, () => {
      if (pen.lod <= 1) line(pen, 0, 0, 0, 0.32, SEV.chrome, 0.02)
      glow(pen, 0, 0.55, 0.6, SEV.lamp, 0.35)
      const c = pen.ctx
      c.beginPath()
      c.moveTo(-0.28, 0.5)
      c.quadraticCurveTo(-0.24, 0.3, 0, 0.3)
      c.quadraticCurveTo(0.24, 0.3, 0.28, 0.5)
      c.closePath()
      c.fillStyle = SEV.shade
      c.fill()
      inkPath(pen, 0.8)
    })
  },
  front(pen, _m, v) {
    // The shag, in tufts.
    if (pen.lod > 0) return
    strokeLines(pen, SEV.shagDeep, pen.lw * 1.4, (ctx) => {
      for (let i = 0; i < 36; i++) {
        const x = v.x0 + (v.x1 - v.x0) * hash(i, 3, 70)
        const y = 0.14 + 0.7 * hash(i, 4, 70)
        if (y > v.y1) continue
        ctx.moveTo(x - 0.03, y + 0.05)
        ctx.lineTo(x, y)
        ctx.lineTo(x + 0.03, y + 0.05)
      }
    })
  },
  weight(pen) {
    // A lava lamp, its wax risen in blobs.
    const h = WEIGHT_H
    poly(pen, [[-0.06, -0.1], [0.06, -0.1], [0.085, -0.18], [0.04, -0.3], [-0.04, -0.3], [-0.085, -0.18]], SEV.glass)
    if (pen.lod <= 1) fillPath(pen, SEV.lava, (ctx) => {
      for (const [x, y, r] of [[-0.01, -0.14, 0.04], [0.02, -0.21, 0.025], [-0.015, -0.26, 0.018]] as const) {
        ctx.moveTo(x + r, y)
        ctx.arc(x, y, r, 0, Math.PI * 2)
      }
    })
    poly(pen, [[-0.11, 0], [0.11, 0], [0.06, -0.1], [-0.06, -0.1]], SEV.chrome)
    poly(pen, [[-0.04, -0.3], [0.04, -0.3], [0.025, -h], [-0.025, -h]], SEV.chrome, 0.8)
  },
}

/* ------------------------------------------------------------------ the city of tomorrow, as it was imagined */

const GOOGIE = {
  sky: '#F3E5C4',
  skyLow: '#BDE3DA',
  teal: '#2A95A3',
  tealDeep: '#1D6A76',
  cream: '#FBF3DF',
  pink: '#EC94A2',
  mustard: '#E8B842',
  chrome: '#C6D0D4',
  floor: '#B5C4C6',
  floorDeep: '#98AAAE',
  dark: '#2A3438',
  ink: '#1E2C30',
}

/** An atomic starburst: `n` spikes round a ball. */
function starburst(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, a: number): void {
  const n = 8
  for (let i = 0; i < n * 2; i++) {
    const t = a + (i / (n * 2)) * Math.PI * 2
    const r = i % 2 ? R * 0.22 : R
    if (i === 0) ctx.moveTo(x + Math.cos(t) * r, y + Math.sin(t) * r)
    else ctx.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r)
  }
  ctx.closePath()
}

const retrofuture: Skin = {
  key: 'retrofuture',
  bg: GOOGIE.sky,
  ink: GOOGIE.ink,
  floor: GOOGIE.floor,
  edge: GOOGIE.floorDeep,
  plank: GOOGIE.tealDeep,
  fulcrum: GOOGIE.dark,
  back(pen, m, v) {
    rect(pen, v.x0 - 0.1, -1.1, v.x1 - v.x0 + 0.2, 1.1, GOOGIE.skyLow, 0)
    // A flying saucer crossing high up.
    if (pen.lod <= 1) {
      const u = ((m.t * 0.08) % 1) * 1.4 - 0.2
      const x = v.x0 + (v.x1 - v.x0) * u
      const y = -2.5 + 0.06 * Math.sin(m.t * 2)
      ellipse(pen, x, y - 0.05, 0.08, 0.06, GOOGIE.chrome, 0.6)
      ellipse(pen, x, y, 0.22, 0.05, GOOGIE.pink, 0.6)
    }
    // A tower on the right, its saucer at the top, its spire with a ball.
    const tx = 2.25
    poly(pen, [[tx - 0.24, 0], [tx + 0.24, 0], [tx + 0.07, -1.85], [tx - 0.07, -1.85]], GOOGIE.cream, 0.8)
    if (pen.lod <= 1) line(pen, tx, -1.95, tx, -2.62, GOOGIE.dark, 0.03)
    ellipse(pen, tx, -2.06, 0.22, 0.16, GOOGIE.chrome, 0.8)
    ellipse(pen, tx, -1.95, 0.68, 0.15, GOOGIE.teal, 0.8)
    rect(pen, tx - 0.5, -1.97, 1.0, 0.04, GOOGIE.cream, 0)
    const f = flashOf(m, 1.0, 0.3)
    circle(pen, tx, -2.64, 0.06, mix(GOOGIE.pink, GOOGIE.cream, f), pen.lod <= 1 ? 0.6 : 0)
    // A boomerang roof on its slim posts on the left, and an atomic star turning over it.
    if (pen.lod <= 1) strokeLines(pen, GOOGIE.dark, 0.04, (ctx) => {
      for (const x of [-2.8, -2.2, -1.6]) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, -0.95 - (x + 2.8) * 0.3)
      }
    })
    rect(pen, -3.0, -0.75, 1.5, 0.75, GOOGIE.teal, 0)
    if (pen.lod <= 1) fillPath(pen, GOOGIE.cream, (ctx) => {
      for (const x of [-2.85, -2.45, -2.05]) ctx.rect(x, -0.62, 0.3, 0.4)
    })
    poly(pen, [[-3.15, -0.82], [-2.3, -1.02], [-1.4, -1.48], [-1.4, -1.36], [-2.3, -0.9], [-3.15, -0.72]], GOOGIE.pink, 0.8)
    if (pen.lod <= 1) line(pen, -2.4, -1.05, -2.4, -1.75, GOOGIE.dark, 0.03)
    fillPath(pen, GOOGIE.mustard, (ctx) => starburst(ctx, -2.4, -1.95, 0.3, m.t * 0.3))
    if (pen.lod <= 1) {
      pen.ctx.beginPath()
      starburst(pen.ctx, -2.4, -1.95, 0.3, m.t * 0.3)
      inkPath(pen, 0.6)
    }
  },
  front(pen, _m, v) {
    // Terrazzo, its chips in teal and pink.
    if (pen.lod > 0) return
    for (const [c, s] of [[GOOGIE.teal, 1], [GOOGIE.pink, 2]] as const) {
      fillPath(pen, c, (ctx) => {
        for (let i = 0; i < 12; i++) {
          const x = v.x0 + (v.x1 - v.x0) * hash(i, s, 41)
          const y = 0.14 + 0.7 * hash(i, s, 42)
          if (y > v.y1) continue
          ctx.rect(x, y, 0.06, 0.03)
        }
      })
    }
  },
  weight(pen) {
    // A little tin robot, an antenna on its head.
    const h = WEIGHT_H
    fillPath(pen, GOOGIE.dark, (ctx) => {
      ctx.rect(-0.08, -0.05, 0.05, 0.05)
      ctx.rect(0.03, -0.05, 0.05, 0.05)
    })
    round(pen, -0.11, -0.2, 0.22, 0.16, 0.03, GOOGIE.teal)
    if (pen.lod <= 1) {
      rect(pen, -0.05, -0.17, 0.1, 0.07, GOOGIE.cream, 0.5)
      strokeLines(pen, GOOGIE.chrome, 0.03, (ctx) => {
        ctx.moveTo(-0.11, -0.16)
        ctx.lineTo(-0.15, -0.08)
        ctx.moveTo(0.11, -0.16)
        ctx.lineTo(0.15, -0.08)
        ctx.moveTo(0, -0.29)
        ctx.lineTo(0, -h + 0.03)
      })
    }
    round(pen, -0.08, -0.29, 0.16, 0.1, 0.04, GOOGIE.chrome)
    circle(pen, 0, -h + 0.025, 0.025, GOOGIE.pink, 0.5)
    if (pen.lod <= 1) fillPath(pen, GOOGIE.dark, (ctx) => {
      ctx.rect(-0.045, -0.255, 0.025, 0.025)
      ctx.rect(0.02, -0.255, 0.025, 0.025)
    })
  },
}

/* ------------------------------------------------------------------ a shadow-puppet play */

const WAYANG = {
  screen: '#F1C27E',
  hot: '#FFE7B4',
  frame: '#4A2A18',
  shadow: '#24150D',
  lace: '#C99A5A',
  floor: '#3A2414',
  floorDeep: '#2A180E',
  brass: '#C8963A',
  brassDeep: '#8A6224',
  flame: '#FFD47A',
  fire: '#EE8A2E',
  ink: '#1E120C',
}

/** The gunungan, the mountain-leaf that opens and closes the play, its foot at 0, 0, as tall as 1. */
const GUNUNGAN: Pt[] = [[-0.34, 0], [0.34, 0], [0.34, -0.1], [0.42, -0.18], [0.4, -0.38], [0.3, -0.6], [0.18, -0.8], [0.06, -0.95], [0, -1], [-0.06, -0.95], [-0.18, -0.8], [-0.3, -0.6], [-0.4, -0.38], [-0.42, -0.18], [-0.34, -0.1]]

/** A wayang figure in profile, facing left, its feet at 0, 0, as tall as 1. */
const WAYANG_FIGURE: Pt[] = [
  [0.1, 0], [-0.22, 0], [-0.16, -0.05], [-0.08, -0.06], [-0.15, -0.32], [-0.05, -0.36], [-0.03, -0.53], [-0.07, -0.68],
  [-0.04, -0.76], [-0.1, -0.8], [-0.13, -0.83], [-0.07, -0.84], [-0.06, -0.89], [-0.08, -0.95], [0.0, -1.0], [0.07, -0.96],
  [0.15, -0.88], [0.1, -0.86], [0.12, -0.8], [0.04, -0.78], [0.05, -0.68], [0.09, -0.53], [0.06, -0.38], [0.18, -0.24],
  [0.26, -0.12], [0.16, -0.06],
]

const shadow: Skin = {
  key: 'shadow',
  bg: WAYANG.screen,
  ink: WAYANG.ink,
  floor: WAYANG.floor,
  edge: WAYANG.floorDeep,
  plank: WAYANG.frame,
  fulcrum: WAYANG.floorDeep,
  back(pen, m, v) {
    // The lamp's light on the screen, from behind it, breathing.
    glow(pen, 0, -1.3, 2.8, WAYANG.hot, 0.55 + 0.04 * Math.sin(m.t * 1.7))
    // The screen's frame across the top.
    if (v.y0 < -2.7) rect(pen, v.x0 - 0.1, v.y0 - 0.1, v.x1 - v.x0 + 0.2, -2.72 - v.y0 + 0.1, WAYANG.frame, 0)
    // The gunungan on the left, stood in the banana log, its lacework at close range.
    at(pen, -2.15, -0.05, 0.03 * ring(m, 0.8, 0.6), 2.2, () => {
      poly(pen, GUNUNGAN, WAYANG.shadow, 0)
      if (pen.lod === 0) fillPath(pen, WAYANG.lace, (ctx) => {
        for (let i = 0; i < 5; i++) {
          const y = -0.2 - i * 0.14
          const w = 0.26 - i * 0.04
          ctx.moveTo(-w, y)
          ctx.lineTo(0, y - 0.06)
          ctx.lineTo(w, y)
          ctx.lineTo(0, y - 0.03)
          ctx.closePath()
        }
        ctx.rect(-0.015, -0.85, 0.03, 0.8)
      })
    })
    // A figure on the right, facing the play, its arm on its rod raised with the beat.
    const s = 1.85
    const bob = -0.05 * knock(m.since, 0.3)
    at(pen, 2.25, -0.08 + bob, 0, s, () => {
      poly(pen, WAYANG_FIGURE, WAYANG.shadow, 0)
      const lift = 0.5 * knock(m.since, 0.35) + 0.1 * Math.sin(m.t * 0.8)
      const sx = -0.03
      const sy = -0.74
      const ex = sx - 0.12 * Math.cos(1.2 - lift)
      const ey = sy + 0.14 * Math.sin(1.2 - lift)
      const hx = ex - 0.16 * Math.cos(0.5 - lift)
      const hy = ey + 0.1 * Math.sin(0.5 - lift) - 0.1 * lift
      const { ctx } = pen
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(ex, ey)
      ctx.lineTo(hx, hy)
      ctx.moveTo(0.04, -0.74)
      ctx.lineTo(0.12, -0.52)
      ctx.lineTo(0.06, -0.36)
      ctx.strokeStyle = WAYANG.shadow
      ctx.lineWidth = 0.022
      ctx.stroke()
      if (pen.lod <= 1) {
        ctx.beginPath()
        ctx.moveTo(hx, hy)
        ctx.lineTo(hx + 0.05, 0.1)
        ctx.moveTo(0.06, -0.36)
        ctx.lineTo(0.1, 0.1)
        ctx.moveTo(0, -0.05)
        ctx.lineTo(0, 0.1)
        ctx.lineWidth = 0.008
        ctx.stroke()
      }
    })
  },
  weight(pen) {
    // The oil lamp that lights the play, burning.
    const h = WEIGHT_H
    if (pen.lod <= 1) glow(pen, 0.04, -h + 0.06, 0.35, WAYANG.flame, 0.45)
    poly(pen, [[-0.09, 0], [0.09, 0], [0.04, -0.04], [0.03, -0.14], [-0.03, -0.14], [-0.04, -0.04]], WAYANG.brass)
    poly(pen, [[-0.13, -0.14], [0.08, -0.14], [0.14, -0.2], [0.06, -0.24], [-0.1, -0.24], [-0.15, -0.2]], WAYANG.brass)
    if (pen.lod <= 1) line(pen, -0.12, -0.17, 0.12, -0.17, WAYANG.brassDeep, 0.015)
    ellipse(pen, 0.08, -0.29, 0.035, 0.06, WAYANG.fire, 0.6)
    if (pen.lod <= 1) ellipse(pen, 0.08, -0.28, 0.015, 0.03, WAYANG.flame, 0)
  },
}

/* ------------------------------------------------------------------ a Punch and Judy booth on the promenade */

const PUNCH = {
  sky: '#5D6F9E',
  skyLow: '#8C9BC0',
  red: '#C3313E',
  cream: '#F3E8D2',
  frame: '#2B3666',
  curtain: '#8E1E32',
  dark: '#1F1A2A',
  gold: '#E7B940',
  boards: '#B89868',
  boardsDeep: '#97794E',
  face: '#F2CBA4',
  judy: '#4F7FC2',
  post: '#2A2E40',
  lamp: '#FFE9A8',
  flags: ['#E7B940', '#F3E8D2', '#4F7FC2', '#C3313E'],
  drum: '#3E5FA8',
  ink: '#1A1824',
}

/** A hand puppet popping over the playboard: its gown, its head, and its hat or its bonnet. */
function handPuppet(pen: Pen, x: number, y: number, judy: boolean, tilt: number): void {
  at(pen, x, y, tilt, 1, () => {
    poly(pen, [[-0.14, 0.3], [0.14, 0.3], [0.1, 0], [-0.1, 0]], judy ? PUNCH.judy : PUNCH.red, 0.7)
    circle(pen, 0, -0.1, 0.11, PUNCH.face, 0.7)
    if (judy) poly(pen, [[-0.14, -0.08], [-0.12, -0.2], [0, -0.25], [0.12, -0.2], [0.14, -0.08], [0.06, -0.16], [-0.06, -0.16]], PUNCH.judy, 0.7)
    else {
      poly(pen, [[-0.11, -0.15], [0.11, -0.15], [0.16, -0.36], [0.05, -0.3]], PUNCH.red, 0.7)
      poly(pen, [[-0.09, -0.11], [-0.2, -0.04], [-0.08, -0.06]], PUNCH.face, 0.6)
    }
  })
}

const puppet: Skin = {
  key: 'puppet',
  bg: PUNCH.sky,
  ink: PUNCH.ink,
  floor: PUNCH.boards,
  edge: PUNCH.boardsDeep,
  plank: PUNCH.frame,
  fulcrum: PUNCH.post,
  back(pen, m, v) {
    rect(pen, v.x0 - 0.1, -0.9, v.x1 - v.x0 + 0.2, 0.9, PUNCH.skyLow, 0)
    // Bunting strung across the top, swinging on the landings.
    if (pen.lod <= 1) {
      const sw = 0.05 * ring(m, 0.7, 0.7)
      const y0 = -2.35
      const sag = (x: number) => y0 + 0.12 * (1 - (x / 3.4) ** 2) + sw * (1 - (x / 3.4) ** 2)
      line(pen, v.x0, sag(v.x0), 0, sag(0), PUNCH.dark, pen.lw)
      line(pen, 0, sag(0), v.x1, sag(v.x1), PUNCH.dark, pen.lw)
      for (let c = 0; c < PUNCH.flags.length; c++) {
        fillPath(pen, PUNCH.flags[c], (ctx) => {
          for (let i = 0; i < 16; i++) {
            if (i % PUNCH.flags.length !== c) continue
            const x = -3.4 + i * 0.45
            if (x < v.x0 - 0.3 || x > v.x1) continue
            const y = sag(x + 0.1)
            ctx.moveTo(x, y)
            ctx.lineTo(x + 0.24, y)
            ctx.lineTo(x + 0.12 + sw, y + 0.24)
            ctx.closePath()
          }
        })
      }
    }
    // A lamppost on the left, lit.
    glow(pen, -2.3, -1.85, 0.5, PUNCH.lamp, 0.4)
    rect(pen, -2.34, -1.75, 0.08, 1.75, PUNCH.post, 0.6)
    rect(pen, -2.42, -0.12, 0.24, 0.12, PUNCH.post, 0)
    circle(pen, -2.3, -1.88, 0.15, PUNCH.lamp, 0.7)
    // The booth on the right, striped, its playboard and its curtains.
    const bx0 = 1.55
    const bx1 = 3.05
    rect(pen, bx0, -1.95, bx1 - bx0, 1.95, PUNCH.cream, 0)
    fillPath(pen, PUNCH.red, (ctx) => {
      for (let i = 0; i < 6; i += 2) ctx.rect(bx0 + i * 0.25, -1.95, 0.25, 1.95)
    })
    if (pen.lod <= 1) rect(pen, bx0, -1.95, bx1 - bx0, 1.95, null, 0.8)
    // The proscenium: a roof with a gold crest.
    poly(pen, [[bx0 - 0.1, -1.95], [bx1 + 0.1, -1.95], [bx1 + 0.1, -2.1], [2.3, -2.45], [bx0 - 0.1, -2.1]], PUNCH.frame, 0.8)
    circle(pen, 2.3, -2.45, 0.08, PUNCH.gold, 0.6)
    // The opening, dark, with the curtains drawn back.
    rect(pen, 1.72, -1.8, 1.16, 0.7, PUNCH.dark, 0)
    // The puppets, popping up in turn on the beat.
    const k = knock(m.since, 0.3)
    const up = 0.12 * k
    const { ctx } = pen
    ctx.save()
    ctx.beginPath()
    ctx.rect(1.72, -1.8, 1.16, 0.7)
    ctx.clip()
    handPuppet(pen, 2.08, -1.25 - (m.e ? up : 0) + 0.02 * Math.sin(m.t * 2), false, m.e ? -0.25 * k : 0.05)
    handPuppet(pen, 2.55, -1.25 - (m.e ? 0 : up) + 0.02 * Math.sin(m.t * 2 + 1), true, m.e ? -0.05 : 0.25 * k)
    ctx.restore()
    poly(pen, [[1.72, -1.8], [1.98, -1.8], [1.8, -1.5], [1.86, -1.1], [1.72, -1.1]], PUNCH.curtain, 0.6)
    poly(pen, [[2.88, -1.8], [2.62, -1.8], [2.8, -1.5], [2.74, -1.1], [2.88, -1.1]], PUNCH.curtain, 0.6)
    rect(pen, 1.62, -1.12, 1.36, 0.08, PUNCH.gold, 0.6)
  },
  front(pen, _m, v) {
    // The promenade's boards.
    if (pen.lod > 0) return
    strokeLines(pen, PUNCH.boardsDeep, pen.lw * 0.8, (ctx) => {
      for (let x = Math.floor(v.x0 / 0.45) * 0.45; x < v.x1; x += 0.45) {
        ctx.moveTo(x, 0.07)
        ctx.lineTo(x - 0.12, v.y1)
      }
    })
  },
  weight(pen) {
    // A small drum, its cords in a zigzag, its sticks crossed on its head.
    if (pen.lod <= 1) strokeLines(pen, PUNCH.dark, 0.02, (ctx) => {
      ctx.moveTo(-0.1, -0.33)
      ctx.lineTo(0.07, -0.23)
      ctx.moveTo(0.1, -0.33)
      ctx.lineTo(-0.07, -0.23)
    })
    rect(pen, -0.13, -0.22, 0.26, 0.2, PUNCH.drum)
    ellipse(pen, 0, -0.22, 0.13, 0.035, PUNCH.cream, 0.7)
    rect(pen, -0.13, -0.035, 0.26, 0.035, PUNCH.red, 0.6)
    if (pen.lod <= 1) strokeLines(pen, PUNCH.gold, 0.015, (ctx) => {
      ctx.moveTo(-0.13, -0.18)
      for (let i = 1; i <= 6; i++) ctx.lineTo(-0.13 + i * 0.0433, i % 2 ? -0.05 : -0.18)
    })
  },
}

export const PAST_SKINS = {
  pyramids,
  colosseum,
  castle,
  viking,
  pirate,
  dinosaurs,
  steampunk,
  artdeco,
  seventies,
  retrofuture,
  shadow,
  puppet,
} as const satisfies Record<string, Skin>
