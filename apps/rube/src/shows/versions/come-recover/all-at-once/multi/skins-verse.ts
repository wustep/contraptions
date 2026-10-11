import { EYE_PUPIL, EYE_WHITE } from '../worlds'
import { at, beam, circle, ellipse, glow, hash, knock, line, poly, rect, rgba, round, type Pen, type Pt } from './skins-pen'
import { flashOf, ring, WEIGHT_H, type Skin } from './skins-kit'

/**
 * Places from the film itself, the ones between the jumps. The IRS lobby where Alpha Waymond swings his fanny pack,
 * Deirdre's office and her awards, Jobu's Elvis entrance, the kitchen where she put everything on a bagel, the shelf
 * where Waymond sticks his googly eyes, the wasteland outside the Alphaverse, the parking lot at night, a film set,
 * the janitor's closet where Evelyn first jumps, the elevator where she is told, the world in stop-motion clay, and
 * the corridor where a guard goes off in confetti.
 *
 * Floor patterns are laid in `front()`, under the ground's top edge, where the machine never reaches.
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

/** A googly eye: its white, and the pupil fallen to `dx`, `dy` of its radius. */
function eye(pen: Pen, x: number, y: number, r: number, dx: number, dy: number): void {
  circle(pen, x, y, r, EYE_WHITE, 0.7)
  circle(pen, x + dx * r * 0.42, y + dy * r * 0.42, r * 0.52, EYE_PUPIL, 0)
}

/* ------------------------------------------------------------------ the IRS lobby */

const LOBBY = {
  wall: '#CDC3B3',
  wainscot: '#B2A690',
  frieze: '#6E6252',
  marble: '#ECE7DE',
  vein: '#B9B2A6',
  joint: '#CFC8BC',
  skirting: '#8C8070',
  cabinet: '#2A2A30',
  water: '#5FAFD0',
  waterTop: '#8ECBE2',
  sand: '#E2CF9E',
  weed: '#5C7A3A',
  fish: '#F4C531',
  desk: '#4A3428',
  deskTop: '#7A5A44',
  screen: '#9CC8E8',
  brass: '#B8964A',
  pack: '#3C4A6A',
  strap: '#23242A',
  buckle: '#C9C9C9',
  gravel: '#9A948A',
  ink: '#2A2622',
}

const VEINS: readonly Pt[][] = [
  [[-3.4, 0.16], [-2.7, 0.3], [-2.1, 0.22], [-1.5, 0.48], [-1.0, 0.42]],
  [[0.3, 0.5], [0.9, 0.28], [1.6, 0.36], [2.2, 0.14], [3.4, 0.24]],
  [[-0.8, 0.85], [-0.2, 0.68], [0.4, 0.78]],
]

const lobby: Skin = {
  key: 'lobby',
  bg: LOBBY.wall,
  ink: LOBBY.ink,
  floor: LOBBY.marble,
  edge: LOBBY.skirting,
  plank: LOBBY.brass,
  fulcrum: LOBBY.cabinet,
  back(pen, m, v) {
    // The stone wall: a dark frieze high up, and panelled wainscot below.
    rect(pen, v.x0 - 0.1, -2.42, v.x1 - v.x0 + 0.2, 0.14, LOBBY.frieze, 0)
    rect(pen, v.x0 - 0.1, -0.85, v.x1 - v.x0 + 0.2, 0.85, LOBBY.wainscot, 0)
    if (pen.lod <= 1) line(pen, v.x0, -0.85, v.x1, -0.85, LOBBY.frieze, pen.lw * 1.4)
    // The aquarium on the left, on its black cabinet: sand, a weed, a fish going to and fro, bubbles rising.
    const x0 = -3.15
    const x1 = -1.5
    rect(pen, x0 - 0.05, -0.72, x1 - x0 + 0.1, 0.72, LOBBY.cabinet)
    rect(pen, x0, -2.05, x1 - x0, 1.33, LOBBY.water, 1.4)
    if (pen.lod <= 1) {
      rect(pen, x0, -2.05, x1 - x0, 0.1, LOBBY.waterTop, 0)
      rect(pen, x0, -0.86, x1 - x0, 0.14, LOBBY.sand, 0)
      poly(pen, [[-2.85, -0.86], [-2.9, -1.2], [-2.8, -1.45], [-2.74, -1.2], [-2.7, -0.86]], LOBBY.weed, 0.6)
      // Bubbles from the bottom corner, up to the top.
      if (pen.lod === 0) {
        strokeLines(pen, rgba('#FFFFFF', 0.85), pen.lw * 0.8, (ctx) => {
          for (let i = 0; i < 6; i++) {
            const u = (m.t * 0.32 + i / 6) % 1
            const bx = -1.75 + 0.04 * Math.sin(m.t * 3 + i * 2)
            const by = -0.9 - u * 1.05
            const r = 0.025 + 0.02 * u
            ctx.moveTo(bx + r, by)
            ctx.arc(bx, by, r, 0, Math.PI * 2)
          }
        })
      }
    }
    // The fish swims a slow length of the tank, and darts when the plank lands.
    const sw = Math.sin(m.t * 0.55)
    const fx = -2.32 + 0.48 * sw + 0.12 * ring(m, 0.4, 0.3)
    const fy = -1.45 + 0.08 * Math.sin(m.t * 1.3)
    const dir = Math.cos(m.t * 0.55) >= 0 ? 1 : -1
    at(pen, fx, fy, 0, 1, () => {
      poly(pen, [[-dir * 0.1, 0], [-dir * 0.24, -0.08], [-dir * 0.24, 0.08]], LOBBY.fish, 0.7)
      ellipse(pen, 0, 0, 0.14, 0.09, LOBBY.fish, 0.8)
      if (pen.lod === 0) circle(pen, dir * 0.07, -0.02, 0.016, EYE_PUPIL, 0)
    })
    // The security desk on the right, and its monitor.
    const dx = 1.65
    rect(pen, dx, -0.95, v.x1 - dx + 0.2, 0.95, LOBBY.desk)
    rect(pen, dx - 0.06, -1.02, v.x1 - dx + 0.3, 0.08, LOBBY.deskTop, 0.8)
    if (pen.lod <= 1) {
      rect(pen, dx + 0.1, -0.78, 0.9, 0.06, LOBBY.brass, 0)
      round(pen, 2.25, -1.48, 0.6, 0.4, 0.04, LOBBY.cabinet, 0.8)
      rect(pen, 2.3, -1.43, 0.5, 0.3, LOBBY.screen, 0)
      rect(pen, 2.5, -1.08, 0.1, 0.06, LOBBY.cabinet, 0)
    }
  },
  front(pen, _m, v) {
    // Big marble flags, and their grey veins.
    if (pen.lod > 1) return
    strokeLines(pen, LOBBY.joint, pen.lw, (ctx) => {
      for (let x = Math.floor(v.x0 / 1.2) * 1.2 + 0.6; x < v.x1; x += 1.2) {
        ctx.moveTo(x, 0.07)
        ctx.lineTo(x * 1.2, v.y1)
      }
      ctx.moveTo(v.x0, 0.55)
      ctx.lineTo(v.x1, 0.55)
    })
    if (pen.lod > 0) return
    strokeLines(pen, LOBBY.vein, pen.lw * 0.8, (ctx) => {
      for (const vein of VEINS) {
        ctx.moveTo(vein[0][0], vein[0][1])
        for (let i = 1; i < vein.length; i++) ctx.lineTo(vein[i][0], vein[i][1])
      }
    })
  },
  weight(pen) {
    // A fanny pack, bulging with aquarium gravel, its strap up in a loop and buckled.
    const h = WEIGHT_H
    if (pen.lod <= 1) {
      poly(pen, [[-0.12, -0.18], [-0.08, -h + 0.02], [0.08, -h + 0.02], [0.12, -0.18]], null, 0, false)
      pen.ctx.strokeStyle = LOBBY.strap
      pen.ctx.lineWidth = 0.035
      pen.ctx.stroke()
      rect(pen, -0.05, -h, 0.1, 0.05, LOBBY.buckle, 0.6)
    }
    poly(pen, [[-0.13, 0], [0.13, 0], [0.17, -0.07], [0.14, -0.2], [-0.14, -0.2], [-0.17, -0.07]], LOBBY.pack)
    if (pen.lod <= 1) line(pen, -0.14, -0.13, 0.14, -0.13, LOBBY.buckle, pen.lw * 1.2)
    if (pen.lod === 0) for (const [gx, gr] of [[-0.21, 0.025], [0.2, 0.02]]) circle(pen, gx, -gr, gr, LOBBY.gravel, 0.5)
  },
}

/* ------------------------------------------------------------------ Deirdre's office */

const OFFICE = {
  panel: '#BD8650',
  groove: '#9E6A38',
  rail: '#7E5028',
  carpet: '#56606E',
  skirting: '#5E3E22',
  walnut: '#6B4628',
  walnutDeep: '#3E2A1C',
  gold: '#E2B53C',
  goldDeep: '#A87E22',
  base: '#2C2A2E',
  paper: '#F4EFE2',
  frame: '#C99A3E',
  ink: '#2A1C12',
}

/** An award: a cup on a stem, or a star on a column, on a dark base, WEIGHT_H tall. */
function award(pen: Pen, star: boolean): void {
  const h = WEIGHT_H
  rect(pen, -0.12, -0.07, 0.24, 0.07, OFFICE.base, 0.7)
  if (star) {
    rect(pen, -0.03, -0.2, 0.06, 0.13, OFFICE.gold, 0.7)
    const pts: Pt[] = []
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5
      const r = i % 2 ? 0.04 : 0.09
      pts.push([Math.cos(a) * r, -0.265 + Math.sin(a) * r])
    }
    poly(pen, pts, OFFICE.gold, 0.8)
  } else {
    poly(pen, [[-0.07, -0.07], [0.07, -0.07], [0.03, -0.12], [0.02, -0.18], [-0.02, -0.18], [-0.03, -0.12]], OFFICE.gold, 0.7)
    poly(pen, [[-0.12, -h], [0.12, -h], [0.1, -0.25], [0.04, -0.18], [-0.04, -0.18], [-0.1, -0.25]], OFFICE.gold, 0.8)
    if (pen.lod === 0) rect(pen, -0.12, -h, 0.24, 0.025, OFFICE.goldDeep, 0)
  }
}

const AWARDS: readonly [number, number, boolean][] = [[-2.85, 1.45, false], [-2.45, 1.25, true], [-2.05, 1.6, false], [-1.66, 1.2, true]]

const trophy: Skin = {
  key: 'trophy',
  bg: OFFICE.panel,
  ink: OFFICE.ink,
  floor: OFFICE.carpet,
  edge: OFFICE.skirting,
  plank: OFFICE.walnut,
  fulcrum: OFFICE.walnutDeep,
  back(pen, m, v) {
    // The panelled wall: grooves, and a rail at the dado.
    if (pen.lod <= 1) fillRects(pen, OFFICE.groove, (ctx) => {
      for (let x = Math.floor(v.x0 / 0.7) * 0.7; x < v.x1; x += 0.7) ctx.rect(x, v.y0 - 0.1, 0.035, -v.y0 + 0.1)
    })
    rect(pen, v.x0 - 0.1, -0.92, v.x1 - v.x0 + 0.2, 0.07, OFFICE.rail, 0)
    // The shelf of awards on the left; they rattle when the plank comes down.
    const sy = -1.4
    rect(pen, -3.2, sy, 1.8, 0.08, OFFICE.walnut, 0.8)
    if (pen.lod <= 1) for (const bx of [-3.0, -1.6]) poly(pen, [[bx, sy + 0.08], [bx + 0.08, sy + 0.08], [bx + 0.08, sy + 0.3]], OFFICE.walnutDeep, 0.6)
    const shake = ring(m, 0.09, 0.22) * 0.07
    for (let i = 0; i < AWARDS.length; i++) {
      const [ax, s, star] = AWARDS[i]
      at(pen, ax, sy, shake * (i % 2 ? -1 : 1), s, () => award(pen, star))
    }
    // A framed certificate high on the right.
    rect(pen, 1.75, -2.25, 0.8, 0.58, OFFICE.frame)
    if (pen.lod <= 1) {
      rect(pen, 1.82, -2.18, 0.66, 0.44, OFFICE.paper, 0)
      circle(pen, 2.15, -1.86, 0.06, OFFICE.gold, 0)
      if (pen.lod === 0) fillRects(pen, OFFICE.groove, (ctx) => {
        ctx.rect(1.92, -2.1, 0.46, 0.03)
        ctx.rect(1.98, -2.02, 0.34, 0.02)
      })
    }
    // Her desk, and the receipts on it.
    const dx = 1.65
    rect(pen, dx, -0.74, 1.6, 0.08, OFFICE.walnut)
    rect(pen, dx + 0.08, -0.66, 1.44, 0.66, OFFICE.walnutDeep, 0.8)
    rect(pen, dx + 0.15, -1.05, 0.42, 0.31, OFFICE.paper, 0.8)
    if (pen.lod <= 1) {
      fillRects(pen, OFFICE.paper, (ctx) => {
        for (let i = 0; i < 5; i++) {
          const x = dx + 0.7 + i * 0.16
          ctx.rect(x, -0.79 - 0.03 * (i % 2), 0.12, 0.05 + 0.03 * (i % 2))
        }
      })
      if (pen.lod === 0) strokeLines(pen, OFFICE.groove, pen.lw * 0.7, (ctx) => {
        for (let i = 1; i < 5; i++) {
          ctx.moveTo(dx + 0.18, -1.05 + i * 0.06)
          ctx.lineTo(dx + 0.54, -1.05 + i * 0.06)
        }
      })
    }
  },
  weight(pen) {
    // One gold star on its column.
    award(pen, true)
  },
}

/* ------------------------------------------------------------------ Jobu's Elvis entrance */

const VEGAS = {
  lame: '#C4922E',
  lameLight: '#E6C05A',
  lameDeep: '#946A1E',
  stage: '#2A1640',
  floor: '#1A1220',
  white: '#F6F0E2',
  gold: '#E8BC44',
  bulbOff: '#B89A5E',
  bulbOn: '#FFF4B8',
  glitter: '#F2E6FF',
  ink: '#1A1020',
}

/** The marquee's bulbs, round the arch from its left foot to its right. */
const BULBS: readonly Pt[] = (() => {
  const pts: Pt[] = []
  for (let i = 0; i < 5; i++) pts.push([-2.25, -0.2 - i * 0.35])
  for (let i = 1; i < 14; i++) {
    const a = Math.PI + (i / 14) * Math.PI
    pts.push([2.25 * Math.cos(a), -1.6 + 0.58 * Math.sin(a)])
  }
  for (let i = 4; i >= 0; i--) pts.push([2.25, -0.2 - i * 0.35])
  return pts
})()

const GLITTER: readonly Pt[] = Array.from({ length: 14 }, (_, i) => [-1.9 + 3.8 * hash(i, 1, 41), -2.1 + 1.9 * hash(i, 2, 41)] as Pt)

function archPath(ctx: CanvasRenderingContext2D): void {
  ctx.moveTo(-2.25, 0)
  ctx.lineTo(-2.25, -1.6)
  ctx.ellipse(0, -1.6, 2.25, 0.58, 0, Math.PI, Math.PI * 2)
  ctx.lineTo(2.25, 0)
}

const elvis: Skin = {
  key: 'elvis',
  bg: VEGAS.lame,
  ink: VEGAS.ink,
  floor: VEGAS.floor,
  edge: VEGAS.gold,
  plank: VEGAS.white,
  fulcrum: VEGAS.gold,
  back(pen, m, v) {
    // The gold lamé curtain all round, in folds.
    fillRects(pen, VEGAS.lameDeep, (ctx) => {
      for (let x = Math.floor(v.x0 / 0.36) * 0.36; x < v.x1; x += 0.36) ctx.rect(x, v.y0 - 0.1, 0.08, -v.y0 + 0.1)
    })
    if (pen.lod <= 1) fillRects(pen, VEGAS.lameLight, (ctx) => {
      for (let x = Math.floor(v.x0 / 0.36) * 0.36 + 0.18; x < v.x1; x += 0.36) ctx.rect(x, v.y0 - 0.1, 0.05, -v.y0 + 0.1)
    })
    // The stage through the arch, and its glitter.
    const { ctx } = pen
    ctx.beginPath()
    archPath(ctx)
    ctx.closePath()
    ctx.fillStyle = VEGAS.stage
    ctx.fill()
    if (pen.lod === 0) fillRects(pen, VEGAS.glitter, (c) => {
      for (let i = 0; i < GLITTER.length; i++) {
        const tw = 0.5 + 0.5 * Math.sin(m.t * 2.3 + i * 1.7)
        if (tw < 0.55) continue
        const [gx, gy] = GLITTER[i]
        const s = 0.035 * tw
        c.moveTo(gx, gy - s)
        c.lineTo(gx + s * 0.3, gy)
        c.lineTo(gx, gy + s)
        c.lineTo(gx - s * 0.3, gy)
        c.closePath()
      }
    })
    // The arch's white band, the jumpsuit's flared collar at its crown.
    ctx.beginPath()
    archPath(ctx)
    ctx.strokeStyle = VEGAS.white
    ctx.lineWidth = 0.2
    ctx.stroke()
    if (pen.lod <= 1) {
      poly(pen, [[-0.55, -2.08], [-0.78, -2.34], [-0.28, -2.21], [0, -2.18], [0.28, -2.21], [0.78, -2.34], [0.55, -2.08]], VEGAS.white, 0.8)
      if (pen.lod === 0) fillRects(pen, VEGAS.gold, (c) => {
        for (const sx of [-0.55, -0.3, 0.3, 0.55]) {
          c.moveTo(sx + 0.025, -2.17 - Math.abs(sx) * 0.08)
          c.arc(sx, -2.17 - Math.abs(sx) * 0.08, 0.025, 0, Math.PI * 2)
        }
      })
      // The bulbs, chasing round; on a loud landing they all light.
      const all = flashOf(m, 1.0, 0.2) > 0.3
      const step = Math.floor(m.t * 2.5)
      for (const on of [false, true]) {
        fillRects(pen, on ? VEGAS.bulbOn : VEGAS.bulbOff, (c) => {
          for (let i = 0; i < BULBS.length; i++) {
            const lit = all || (i + step) % 3 === 0
            if (lit !== on) continue
            const [bx, by] = BULBS[i]
            c.moveTo(bx + 0.065, by)
            c.arc(bx, by, 0.065, 0, Math.PI * 2)
          }
        })
      }
    }
  },
  weight(pen) {
    // A gold microphone on its stand.
    const h = WEIGHT_H
    ellipse(pen, 0, -0.025, 0.14, 0.035, VEGAS.gold, 0.7)
    rect(pen, -0.02, -h + 0.13, 0.04, h - 0.15, VEGAS.gold, 0.6)
    poly(pen, [[-0.035, -h + 0.15], [0.035, -h + 0.15], [0.05, -h + 0.1], [-0.05, -h + 0.1]], VEGAS.lameDeep, 0.6)
    circle(pen, 0, -h + 0.05, 0.075, VEGAS.gold, 0.8)
    if (pen.lod === 0) strokeLines(pen, VEGAS.lameDeep, pen.lw * 0.7, (c) => {
      c.moveTo(-0.07, -h + 0.05)
      c.lineTo(0.07, -h + 0.05)
      c.moveTo(0, -h - 0.02)
      c.lineTo(0, -h + 0.12)
    })
  },
}

/* ------------------------------------------------------------------ the kitchen: everything on a bagel */

const KITCHEN = {
  wall: '#F4E8CC',
  tile: '#FBF8F0',
  grout: '#DCD3C0',
  cabinet: '#8FB3D6',
  cabinetDeep: '#6D93BA',
  top: '#E9E3D6',
  wood: '#D2AC78',
  woodDeep: '#A88050',
  board: '#C8955A',
  floor: '#D9B98A',
  floorDeep: '#C2A070',
  chrome: '#C9CED2',
  chromeDeep: '#8E969C',
  toast: '#D9A35A',
  salt: '#FFFFFF',
  poppy: '#3A3440',
  sesame: '#EBD8A8',
  bowl: '#4F7398',
  card: '#FFFDF6',
  bagel: '#C98F4A',
  bagelDeep: '#9E6A30',
  plate: '#FFFFFF',
  ink: '#3A2E24',
}

const bagel: Skin = {
  key: 'bagel',
  bg: KITCHEN.wall,
  ink: KITCHEN.ink,
  floor: KITCHEN.floor,
  edge: KITCHEN.floorDeep,
  plank: KITCHEN.board,
  fulcrum: KITCHEN.bowl,
  back(pen, m, v) {
    // Wall cabinets along the top.
    rect(pen, v.x0 - 0.1, v.y0 - 0.1, v.x1 - v.x0 + 0.2, -2.05 - v.y0 + 0.1, KITCHEN.cabinet, 0)
    if (pen.lod <= 1) {
      line(pen, v.x0, -2.05, v.x1, -2.05, KITCHEN.ink, pen.lw)
      strokeLines(pen, KITCHEN.cabinetDeep, pen.lw * 1.2, (ctx) => {
        for (let x = Math.floor(v.x0 / 0.9) * 0.9; x < v.x1; x += 0.9) {
          ctx.moveTo(x, v.y0)
          ctx.lineTo(x, -2.05)
        }
      })
    }
    // Two counters, each side: tiled splashback, worktop, cupboards.
    for (const [a, b] of [[v.x0 - 0.1, -1.5], [1.6, v.x1 + 0.1]] as const) {
      rect(pen, a, -1.45, b - a, 0.7, KITCHEN.tile, 0)
      if (pen.lod === 0) strokeLines(pen, KITCHEN.grout, pen.lw * 0.7, (ctx) => {
        for (const y of [-1.22, -0.98]) {
          ctx.moveTo(a, y)
          ctx.lineTo(b, y)
        }
        for (let x = Math.ceil(a / 0.24) * 0.24; x < b; x += 0.24) {
          ctx.moveTo(x, -1.45)
          ctx.lineTo(x, -0.75)
        }
      })
      rect(pen, a, -0.75, b - a, 0.75, KITCHEN.cabinet)
      rect(pen, a, -0.8, b - a, 0.08, KITCHEN.top, 0.8)
    }
    // On the left: the cutting board leant on the wall, and the open jars and shakers.
    round(pen, -3.0, -1.5, 0.55, 0.7, 0.08, KITCHEN.wood)
    if (pen.lod <= 1) circle(pen, -2.72, -1.4, 0.04, KITCHEN.wall, 0.6)
    round(pen, -2.35, -1.08, 0.18, 0.28, 0.05, KITCHEN.salt)
    round(pen, -2.12, -1.04, 0.16, 0.24, 0.05, KITCHEN.poppy)
    round(pen, -1.92, -1.12, 0.22, 0.32, 0.04, KITCHEN.sesame)
    if (pen.lod <= 1) {
      rect(pen, -2.33, -1.13, 0.14, 0.06, KITCHEN.chrome, 0.6)
      rect(pen, -2.1, -1.09, 0.12, 0.06, KITCHEN.chrome, 0.6)
      // The report card, propped against the jars, and the dog bowl.
      at(pen, -2.75, -0.8, -0.12, 1, () => rect(pen, 0, -0.32, 0.26, 0.32, KITCHEN.card, 0.7))
      if (pen.lod === 0) strokeLines(pen, KITCHEN.cabinetDeep, pen.lw * 0.7, (ctx) => {
        for (let i = 1; i < 4; i++) {
          ctx.moveTo(-2.75 + 0.05 - 0.012 * i, -0.8 - 0.32 + i * 0.08)
          ctx.lineTo(-2.75 + 0.2 - 0.012 * i, -0.8 - 0.32 + i * 0.08 - 0.02)
        }
      })
      poly(pen, [[-1.72, -0.8], [-1.56, -0.8], [-1.53, -0.92], [-1.75, -0.92]], KITCHEN.bowl, 0.7)
    }
    // On the right: the toaster, and its toast jumping up when the plank lands.
    const pop = 0.16 * Math.exp(-Math.max(0, m.since) / 0.35) * (Number.isFinite(m.since) ? 1 : 0)
    if (pen.lod <= 1) {
      rect(pen, 2.12, -1.18 - pop, 0.18, 0.2, KITCHEN.toast, 0.7)
      rect(pen, 2.38, -1.16 - pop * 0.8, 0.18, 0.2, KITCHEN.toast, 0.7)
    }
    round(pen, 2.0, -1.12, 0.68, 0.34, 0.1, KITCHEN.chrome)
    if (pen.lod <= 1) {
      rect(pen, 2.12, -1.12, 0.18, 0.03, KITCHEN.chromeDeep, 0)
      rect(pen, 2.38, -1.12, 0.18, 0.03, KITCHEN.chromeDeep, 0)
      rect(pen, 2.62, -1.0, 0.07, 0.06, KITCHEN.ink, 0)
    }
  },
  front(pen, _m, v) {
    // Floorboards.
    if (pen.lod > 0) return
    strokeLines(pen, KITCHEN.floorDeep, pen.lw * 0.8, (ctx) => {
      for (const y of [0.3, 0.55, 0.8]) {
        ctx.moveTo(v.x0, y)
        ctx.lineTo(v.x1, y)
      }
    })
  },
  weight(pen) {
    // An everything bagel, stood on its edge on a plate, seeds all over it.
    const h = WEIGHT_H
    ellipse(pen, 0, -0.025, 0.17, 0.03, KITCHEN.plate, 0.7)
    const { ctx } = pen
    const cy = -h + 0.15
    ctx.beginPath()
    ctx.ellipse(0, cy, 0.15, 0.145, 0, 0, Math.PI * 2)
    ctx.moveTo(0.045, cy)
    ctx.arc(0, cy, 0.045, 0, Math.PI * 2, true)
    ctx.fillStyle = KITCHEN.bagel
    ctx.fill('evenodd')
    if (pen.lod <= 1) {
      ctx.strokeStyle = pen.ink
      ctx.lineWidth = pen.lw
      ctx.stroke()
      fillRects(pen, KITCHEN.poppy, (c) => {
        for (let i = 0; i < 7; i++) {
          const a = i * 0.9 + 0.3
          c.rect(Math.cos(a) * 0.1, cy + Math.sin(a) * 0.1, 0.018, 0.018)
        }
      })
      fillRects(pen, KITCHEN.sesame, (c) => {
        for (let i = 0; i < 7; i++) {
          const a = i * 0.9 + 0.75
          c.rect(Math.cos(a) * 0.09, cy + Math.sin(a) * 0.09, 0.022, 0.014)
        }
      })
    }
  },
}

/* ------------------------------------------------------------------ the googly eyes */

const GOOGLY = {
  wall: '#FFD95A',
  shelf: '#E8A33C',
  floor: '#3B6FD8',
  edge: '#2B55AE',
  box: '#F07FB0',
  jar: '#8ED0F0',
  lid: '#3B6FD8',
  pot: '#C9784A',
  leaf: '#6CC24A',
  shade: '#FFFFFF',
  stand: '#5A4A8A',
  plank: '#5A8BEA',
  fulcrum: '#EE6FA8',
  ink: '#2A2238',
}

/** The eyes on the shelves: x, y, radius. */
const EYES: readonly [number, number, number][] = [
  [-2.85, -1.55, 0.09], [-2.66, -1.55, 0.07],
  [-2.2, -1.42, 0.07], [-2.03, -1.42, 0.07],
  [-1.72, -2.05, 0.06], [-1.58, -2.05, 0.06],
  [-2.9, -0.4, 0.1], [-2.65, -0.4, 0.1],
  [2.25, -2.0, 0.1], [2.52, -2.0, 0.1],
  [1.8, -0.75, 0.08], [1.98, -0.75, 0.08],
]

const googly: Skin = {
  key: 'googly',
  bg: GOOGLY.wall,
  ink: GOOGLY.ink,
  floor: GOOGLY.floor,
  edge: GOOGLY.edge,
  plank: GOOGLY.plank,
  fulcrum: GOOGLY.fulcrum,
  back(pen, m, _v) {
    // A shelf on the left, with a pink box, a jar, a plant; a toy chest under it.
    rect(pen, -3.3, -1.3, 1.9, 0.08, GOOGLY.shelf)
    rect(pen, -3.05, -1.78, 0.6, 0.48, GOOGLY.box)
    round(pen, -2.35, -1.66, 0.48, 0.36, 0.08, GOOGLY.jar)
    if (pen.lod <= 1) rect(pen, -2.38, -1.72, 0.54, 0.08, GOOGLY.lid, 0.7)
    poly(pen, [[-1.82, -1.3], [-1.48, -1.3], [-1.44, -1.6], [-1.86, -1.6]], GOOGLY.pot)
    poly(pen, [[-1.65, -1.6], [-1.95, -2.0], [-1.75, -2.25], [-1.65, -1.95], [-1.55, -2.3], [-1.38, -2.0], [-1.65, -1.6]], GOOGLY.leaf, 0.8)
    round(pen, -3.25, -0.7, 0.95, 0.7, 0.06, GOOGLY.jar)
    // A tall lamp on the right, and a stack of boxes beside it.
    if (pen.lod <= 1) line(pen, 2.4, -1.75, 2.4, 0, GOOGLY.stand, 0.07)
    else rect(pen, 2.36, -1.75, 0.08, 1.75, GOOGLY.stand, 0)
    ellipse(pen, 2.4, -0.02, 0.24, 0.05, GOOGLY.stand, 0.7)
    poly(pen, [[2.0, -1.72], [2.8, -1.72], [2.62, -2.28], [2.18, -2.28]], GOOGLY.shade)
    rect(pen, 1.62, -1.0, 0.55, 1.0, GOOGLY.box)
    if (pen.lod <= 1) line(pen, 1.62, -0.5, 2.17, -0.5, GOOGLY.ink, pen.lw)
    // And on everything, googly eyes, their pupils jiggling on every landing.
    const jig = ring(m, 0.16, 0.45)
    const n = pen.lod === 2 ? 6 : EYES.length
    for (let i = 0; i < n; i++) {
      const [x, y, r] = EYES[pen.lod === 2 ? i * 2 : i]
      const ph = hash(i, 3, 51) * 6.28
      const dx = 0.25 * Math.sin(m.t * 0.7 + ph) + 0.9 * jig * Math.cos(ph)
      const dy = 0.85 - 0.6 * Math.abs(jig * Math.sin(ph + 1))
      eye(pen, x, y, r, dx, dy)
    }
  },
  weight(pen) {
    // One big googly eye, on a stand.
    const h = WEIGHT_H
    rect(pen, -0.1, -0.04, 0.2, 0.04, GOOGLY.stand, 0.7)
    rect(pen, -0.015, -0.1, 0.03, 0.07, GOOGLY.stand, 0)
    eye(pen, 0, -h + 0.13, 0.13, 0.15, 0.7)
  },
}

/* ------------------------------------------------------------------ the Alphaverse, outside */

const WASTE = {
  sky: '#A39D92',
  skyHigh: '#8E887E',
  sun: '#E2DAC2',
  ruin: '#57524B',
  ruinFar: '#7A746A',
  ridge: '#8A8274',
  ground: '#857A68',
  groundEdge: '#6B6254',
  crack: '#655C4E',
  dust: '#C9C0AE',
  rust: '#8A5E3E',
  steel: '#9AA0A0',
  dark: '#3A3634',
  lamp: '#E8D27A',
  ink: '#262220',
}

/** Broken towers on the horizon: the near ones on the left, a far cluster on the right. */
const RUINS_NEAR: readonly Pt[] = [
  [-3.5, -0.2], [-3.5, -1.6], [-3.2, -1.75], [-3.05, -1.55], [-3.05, -2.25], [-2.85, -2.05], [-2.7, -2.35], [-2.55, -2.2], [-2.55, -1.3],
  [-2.3, -1.3], [-2.3, -1.85], [-2.05, -1.62], [-1.95, -1.7], [-1.95, -0.9], [-1.6, -0.9], [-1.55, -0.6], [-1.4, -0.2],
]
const RUINS_FAR: readonly Pt[] = [
  [1.5, -0.25], [1.5, -0.7], [1.75, -0.7], [1.75, -1.15], [1.9, -1.0], [2.05, -1.25], [2.05, -0.75], [2.4, -0.75], [2.4, -1.45],
  [2.55, -1.3], [2.7, -1.6], [2.85, -1.35], [2.85, -0.9], [3.5, -0.9], [3.5, -0.25],
]

const wasteland: Skin = {
  key: 'wasteland',
  bg: WASTE.sky,
  ink: WASTE.ink,
  floor: WASTE.ground,
  edge: WASTE.groundEdge,
  plank: WASTE.rust,
  fulcrum: WASTE.dark,
  back(pen, m, v) {
    // Ash sky, darker overhead; a dull sun in the haze.
    rect(pen, v.x0 - 0.1, v.y0 - 0.1, v.x1 - v.x0 + 0.2, -2.3 - v.y0 + 0.1, WASTE.skyHigh, 0)
    glow(pen, 1.6, -2.0, 1.0, WASTE.sun, 0.45)
    circle(pen, 1.6, -2.0, 0.3, WASTE.sun, 0)
    // The far ridge, and the broken towers on it.
    poly(pen, [[v.x0 - 0.1, 0], [v.x0 - 0.1, -0.3], [-1.0, -0.4], [0.5, -0.32], [2.0, -0.42], [v.x1 + 0.1, -0.3], [v.x1 + 0.1, 0]], WASTE.ridge, 0)
    poly(pen, RUINS_FAR, WASTE.ruinFar, 0.7)
    poly(pen, RUINS_NEAR, WASTE.ruin, 0.9)
    if (pen.lod === 0) fillRects(pen, WASTE.sky, (ctx) => {
      for (let i = 0; i < 6; i++) ctx.rect(-3.3 + (i % 3) * 0.25, -1.4 + Math.floor(i / 3) * 0.3, 0.09, 0.14)
      ctx.rect(-2.2, -1.5, 0.1, 0.14)
      ctx.rect(-2.2, -1.2, 0.1, 0.14)
    })
    // Dust, drifting across.
    if (pen.lod <= 1) fillRects(pen, rgba(WASTE.dust, 0.75), (ctx) => {
      const n = pen.lod === 0 ? 22 : 10
      for (let i = 0; i < n; i++) {
        const span = v.x1 - v.x0 + 0.4
        const x = v.x0 - 0.2 + ((hash(i, 1, 61) * span + m.t * (0.12 + 0.1 * hash(i, 2, 61))) % span)
        const y = -0.2 - 2.4 * hash(i, 3, 61) + 0.05 * Math.sin(m.t * 0.8 + i)
        ctx.rect(x, y, 0.03, 0.02)
      }
    })
  },
  front(pen, m, v) {
    // Cracks in the dry ground, and a puff of dust where the plank lands.
    if (pen.lod === 0) strokeLines(pen, WASTE.crack, pen.lw * 0.8, (ctx) => {
      ctx.moveTo(-3.0, 0.2)
      ctx.lineTo(-2.4, 0.35)
      ctx.lineTo(-2.1, 0.3)
      ctx.lineTo(-1.6, 0.55)
      ctx.moveTo(-2.4, 0.35)
      ctx.lineTo(-2.5, 0.6)
      ctx.moveTo(0.6, 0.45)
      ctx.lineTo(1.3, 0.3)
      ctx.lineTo(1.9, 0.5)
      ctx.lineTo(2.8, 0.38)
      ctx.moveTo(1.9, 0.5)
      ctx.lineTo(2.0, v.y1)
    })
    if (pen.lod <= 1 && m.since >= 0 && m.since < 0.8) {
      const k = 1 - m.since / 0.8
      const x = m.e ? -1.05 : 1.05
      const r = 0.1 + 0.3 * (1 - k)
      ellipse(pen, x - r * 0.6, -0.05, r, r * 0.4, rgba(WASTE.dust, 0.6 * k), 0)
      ellipse(pen, x + r * 0.6, -0.05, r, r * 0.4, rgba(WASTE.dust, 0.6 * k), 0)
    }
  },
  weight(pen) {
    // The jumping headset, built from scrap: a headband, two cups, an antenna, on a block.
    const h = WEIGHT_H
    rect(pen, -0.13, -0.05, 0.26, 0.05, WASTE.dark, 0.7)
    const { ctx } = pen
    ctx.beginPath()
    ctx.arc(0, -0.15, 0.12, Math.PI, Math.PI * 2)
    ctx.strokeStyle = WASTE.steel
    ctx.lineWidth = 0.04
    ctx.stroke()
    round(pen, -0.17, -0.2, 0.09, 0.15, 0.03, WASTE.rust, 0.7)
    round(pen, 0.08, -0.2, 0.09, 0.15, 0.03, WASTE.rust, 0.7)
    if (pen.lod <= 1) {
      line(pen, 0.05, -0.26, 0.11, -h + 0.02, WASTE.dark, 0.02)
      circle(pen, 0.11, -h + 0.02, 0.025, WASTE.lamp, 0.6)
      if (pen.lod === 0) strokeLines(pen, WASTE.dark, pen.lw, (c) => {
        c.moveTo(-0.15, -0.14)
        c.lineTo(-0.1, -0.14)
        c.moveTo(0.1, -0.11)
        c.lineTo(0.15, -0.11)
      })
    }
  },
}

/* ------------------------------------------------------------------ the parking lot at night */

const LOT = {
  night: '#131A28',
  far: '#1E2638',
  window: '#5A5440',
  asphalt: '#34363C',
  curb: '#55575C',
  paint: '#DCD6C2',
  sodium: '#F2A23A',
  pole: '#3A4050',
  car: '#2C3548',
  carLit: '#6A5A44',
  glass: '#1A2030',
  tyre: '#0E1016',
  cone: '#F28C28',
  coneDeep: '#B85E14',
  white: '#F4F0E6',
  concrete: '#9A9890',
  stop: '#E8C23A',
  ink: '#0B0E15',
}

const parking: Skin = {
  key: 'parking',
  bg: LOT.night,
  ink: LOT.ink,
  floor: LOT.asphalt,
  edge: LOT.curb,
  plank: LOT.concrete,
  fulcrum: LOT.stop,
  back(pen, m, v) {
    // A low block of offices beyond the lot, a few windows still lit.
    rect(pen, v.x0 - 0.1, -0.85, v.x1 - v.x0 + 0.2, 0.85, LOT.far, 0)
    if (pen.lod <= 1) fillRects(pen, LOT.window, (ctx) => {
      for (let i = 0; i < 12; i++) {
        if (hash(i, 1, 71) < 0.5) continue
        ctx.rect(-3.2 + i * 0.55, -0.7 + 0.28 * (i % 2), 0.22, 0.14)
      }
    })
    // Two sodium lamps on tall poles, their light falling in cones; one buzzes when the plank lands.
    const buzz = 0.12 * knock(m.since, 0.12) * (Math.sin(m.since * 60) > 0 ? 1 : 0)
    for (const [x, d] of [[-2.35, 1], [2.45, -1]] as const) {
      const hx = x + d * 0.38
      beam(pen, hx, -2.32, hx, 0.05, 0.25, 1.8, LOT.sodium, (x < 0 ? 0.32 - buzz : 0.32))
      rect(pen, x - 0.04, -2.4, 0.08, 2.4, LOT.pole, 0.7)
      rect(pen, x, -2.42, d * 0.45, 0.05, LOT.pole, 0)
      round(pen, hx - 0.15, -2.42, 0.3, 0.1, 0.04, LOT.sodium, 0.7)
    }
    // A car parked under the left lamp, lit along its roof.
    const cx = -2.45
    poly(pen, [[cx - 0.95, -0.12], [cx - 0.95, -0.45], [cx - 0.55, -0.52], [cx - 0.3, -0.85], [cx + 0.4, -0.85], [cx + 0.7, -0.5], [cx + 1.0, -0.42], [cx + 1.02, -0.12]], LOT.car)
    if (pen.lod <= 1) {
      poly(pen, [[cx - 0.22, -0.55], [cx - 0.08, -0.78], [cx + 0.34, -0.78], [cx + 0.55, -0.55]], LOT.glass, 0.6)
      line(pen, cx - 0.28, -0.86, cx + 0.38, -0.86, LOT.carLit, 0.03)
    }
    circle(pen, cx - 0.55, -0.12, 0.15, LOT.tyre, 0)
    circle(pen, cx + 0.62, -0.12, 0.15, LOT.tyre, 0)
  },
  front(pen, _m, v) {
    // The bays' painted lines, running away from us.
    if (pen.lod > 1) return
    fillRects(pen, LOT.paint, (ctx) => {
      for (let x = Math.floor(v.x0 / 1.3) * 1.3 + 0.65; x < v.x1 + 1; x += 1.3) {
        ctx.moveTo(x - 0.025, 0.08)
        ctx.lineTo(x + 0.025, 0.08)
        ctx.lineTo(x * 1.3 + 0.04, v.y1 + 0.1)
        ctx.lineTo(x * 1.3 - 0.04, v.y1 + 0.1)
        ctx.closePath()
      }
    })
  },
  weight(pen) {
    // A traffic cone.
    const h = WEIGHT_H
    rect(pen, -0.15, -0.04, 0.3, 0.04, LOT.coneDeep, 0.7)
    poly(pen, [[-0.11, -0.04], [0.11, -0.04], [0.025, -h], [-0.025, -h]], LOT.cone)
    if (pen.lod <= 1) fillRects(pen, LOT.white, (ctx) => {
      ctx.moveTo(-0.085, -0.1)
      ctx.lineTo(0.085, -0.1)
      ctx.lineTo(0.07, -0.15)
      ctx.lineTo(-0.07, -0.15)
      ctx.closePath()
      ctx.moveTo(-0.055, -0.2)
      ctx.lineTo(0.055, -0.2)
      ctx.lineTo(0.042, -0.245)
      ctx.lineTo(-0.042, -0.245)
      ctx.closePath()
    })
  },
}

/* ------------------------------------------------------------------ the film set */

const SET = {
  stage: '#1D1D22',
  green: '#3CB54A',
  greenDeep: '#2F9A3C',
  marker: '#E8F2E0',
  floor: '#56524C',
  tapeY: '#E8C23A',
  tapeP: '#F07FB0',
  crane: '#5A5E66',
  craneDeep: '#3A3D44',
  camera: '#22242A',
  tally: '#E23B3B',
  lamp: '#3A3D44',
  light: '#FFF2D0',
  cable: '#0E0E12',
  ply: '#C9A66B',
  box: '#A87A44',
  slate: '#1A1A1E',
  white: '#F2F2EE',
  ink: '#111114',
}

const set: Skin = {
  key: 'set',
  bg: SET.stage,
  ink: SET.ink,
  floor: SET.floor,
  plank: SET.ply,
  fulcrum: SET.box,
  back(pen, m, v) {
    // The green screen, a cyc curving into the floor, its tracking crosses.
    rect(pen, -2.35, -2.45, 3.35, 2.45, SET.green, 0)
    if (pen.lod <= 1) rect(pen, -2.35, -0.3, 3.35, 0.3, SET.greenDeep, 0)
    if (pen.lod === 0) strokeLines(pen, SET.marker, pen.lw, (ctx) => {
      for (const [x, y] of [[-1.8, -2.0], [-0.6, -2.1], [0.6, -2.0], [-1.85, -0.95], [0.65, -1.0]]) {
        ctx.moveTo(x - 0.06, y - 0.06)
        ctx.lineTo(x + 0.06, y + 0.06)
        ctx.moveTo(x + 0.06, y - 0.06)
        ctx.lineTo(x - 0.06, y + 0.06)
      }
    })
    // The wire rig: cables down from the grid, swaying when the plank lands.
    if (pen.lod <= 1) {
      const sway = 0.05 * ring(m, 0.8, 0.9)
      strokeLines(pen, SET.cable, pen.lw * 1.1, (ctx) => {
        for (const x of [-0.95, -0.45]) {
          ctx.moveTo(x, v.y0)
          ctx.lineTo(x + sway, -1.95)
        }
      })
      for (const x of [-0.95, -0.45]) circle(pen, x + sway, -1.92, 0.035, SET.crane, 0.6)
    }
    // A studio lamp on its stand on the left, throwing its light in.
    beam(pen, -2.55, -1.95, -0.6, -0.4, 0.2, 1.4, SET.light, 0.26)
    if (pen.lod <= 1) strokeLines(pen, SET.lamp, 0.035, (ctx) => {
      ctx.moveTo(-2.75, -1.85)
      ctx.lineTo(-2.75, -0.3)
      ctx.lineTo(-3.0, 0)
      ctx.moveTo(-2.75, -0.3)
      ctx.lineTo(-2.5, 0)
    })
    else rect(pen, -2.79, -1.85, 0.08, 1.85, SET.lamp, 0)
    at(pen, -2.7, -1.95, 0.6, 1, () => {
      rect(pen, -0.22, -0.18, 0.36, 0.36, SET.lamp)
      rect(pen, 0.14, -0.15, 0.05, 0.3, SET.light, 0.6)
    })
    // The camera crane on the right: dolly, column, arm, counterweight, and the camera out at the end.
    rect(pen, 2.2, -0.3, 0.8, 0.26, SET.craneDeep)
    if (pen.lod <= 1) for (const x of [2.32, 2.88]) circle(pen, x, -0.05, 0.06, SET.cable, 0)
    rect(pen, 2.55, -1.3, 0.1, 1.0, SET.crane, 0.7)
    poly(pen, [[1.62, -2.18], [3.3, -1.12], [3.3, -1.02], [1.62, -2.08]], SET.crane, 0.7)
    rect(pen, 3.0, -1.25, 0.3, 0.32, SET.craneDeep, 0.7)
    rect(pen, 1.45, -2.4, 0.4, 0.24, SET.camera, 0.8)
    rect(pen, 1.3, -2.34, 0.15, 0.12, SET.camera, 0.7)
    if (pen.lod <= 1) circle(pen, 1.8, -2.45, 0.025 + 0.015 * flashOf(m, 0.9, 0.2), SET.tally, 0)
  },
  front(pen, _m, _v) {
    // Tape marks on the stage floor.
    if (pen.lod > 1) return
    fillRects(pen, SET.tapeY, (ctx) => {
      ctx.rect(-1.9, 0.18, 0.3, 0.04)
      ctx.rect(-1.77, 0.18, 0.04, 0.2)
    })
    fillRects(pen, SET.tapeP, (ctx) => {
      ctx.rect(1.6, 0.3, 0.3, 0.04)
      ctx.rect(1.73, 0.3, 0.04, 0.2)
    })
  },
  weight(pen) {
    // A clapperboard, stood up, its sticks open.
    rect(pen, -0.15, -0.24, 0.3, 0.24, SET.slate)
    if (pen.lod <= 1) {
      fillRects(pen, SET.white, (ctx) => {
        ctx.rect(-0.13, -0.15, 0.26, 0.012)
        ctx.rect(-0.13, -0.08, 0.26, 0.012)
        ctx.rect(0, -0.15, 0.012, 0.13)
      })
    }
    at(pen, -0.15, -0.25, -0.3, 1, () => {
      rect(pen, 0, -0.06, 0.32, 0.06, SET.slate, 0.8)
      if (pen.lod <= 1) fillRects(pen, SET.white, (ctx) => {
        for (let i = 0; i < 4; i++) {
          const x = 0.03 + i * 0.075
          ctx.moveTo(x, 0)
          ctx.lineTo(x + 0.035, 0)
          ctx.lineTo(x + 0.06, -0.06)
          ctx.lineTo(x + 0.025, -0.06)
          ctx.closePath()
        }
      })
    })
  },
}

/* ------------------------------------------------------------------ the janitor's closet */

const CLOSET = {
  wall: '#B9AE86',
  block: '#A39872',
  concrete: '#6E6C66',
  drain: '#4A4844',
  rack: '#7E8288',
  blue: '#3E7CC8',
  yellow: '#E8C23A',
  white: '#ECEAE2',
  pink: '#E89AB8',
  sink: '#D8D8D2',
  sinkDeep: '#A8A8A2',
  mop: '#B08A56',
  head: '#E6DFC8',
  cord: '#2A2620',
  bulb: '#FFF4D0',
  light: '#FFE2A0',
  plank: '#A88456',
  bucket: '#8E9498',
  trigger: '#F4F2EC',
  ink: '#2A2620',
}

const closet: Skin = {
  key: 'closet',
  bg: CLOSET.wall,
  ink: CLOSET.ink,
  floor: CLOSET.concrete,
  plank: CLOSET.plank,
  fulcrum: CLOSET.bucket,
  back(pen, m, v) {
    // Painted cinder blocks.
    if (pen.lod <= 1) strokeLines(pen, CLOSET.block, pen.lw, (ctx) => {
      for (let r = 0; r < 12; r++) {
        const y = -0.25 - r * 0.25
        if (y < v.y0) break
        ctx.moveTo(v.x0, y)
        ctx.lineTo(v.x1, y)
        if (pen.lod > 0) continue
        for (let x = Math.floor(v.x0 / 0.8) * 0.8 + (r % 2) * 0.4; x < v.x1; x += 0.8) {
          ctx.moveTo(x, y)
          ctx.lineTo(x, y + 0.25)
        }
      }
    })
    // Steel shelving on the left, full of bottles and jugs.
    const x0 = -3.2
    const x1 = -1.5
    const shelves = [-0.08, -0.75, -1.42, -2.09]
    if (pen.lod <= 1) {
      fillRects(pen, CLOSET.rack, (ctx) => {
        ctx.rect(x0, -2.15, 0.05, 2.15)
        ctx.rect(x1 - 0.05, -2.15, 0.05, 2.15)
        for (const y of shelves) ctx.rect(x0, y, x1 - x0, 0.05)
      })
    } else rect(pen, x0, -2.15, x1 - x0, 0.08, CLOSET.rack, 0)
    const stock: [string, (ctx: CanvasRenderingContext2D) => void][] = [
      [CLOSET.blue, (ctx) => {
        ctx.rect(-3.1, -1.18, 0.3, 0.43)
        ctx.rect(-2.3, -1.72, 0.18, 0.3)
        ctx.rect(-2.2, -0.45, 0.26, 0.37)
      }],
      [CLOSET.yellow, (ctx) => {
        ctx.rect(-2.7, -1.12, 0.36, 0.37)
        ctx.rect(-3.05, -0.5, 0.4, 0.42)
      }],
      [CLOSET.white, (ctx) => {
        ctx.rect(-2.25, -1.08, 0.16, 0.33)
        ctx.rect(-2.0, -1.08, 0.16, 0.33)
        ctx.rect(-3.05, -1.85, 0.3, 0.43)
        ctx.rect(-2.6, -0.42, 0.3, 0.34)
      }],
      [CLOSET.pink, (ctx) => {
        ctx.rect(-2.65, -1.7, 0.28, 0.28)
        ctx.rect(-2.0, -1.7, 0.18, 0.28)
      }],
    ]
    for (const [c, add] of stock) fillRects(pen, c, add)
    // The mop sink on the right, a tap over it, and the mop stood in it.
    if (pen.lod <= 1) {
      line(pen, 2.3, -0.45, 2.85, -2.0, CLOSET.mop, 0.05)
      rect(pen, 2.15, -0.95, 0.06, 0.25, CLOSET.rack, 0.6)
      rect(pen, 2.15, -0.97, 0.22, 0.06, CLOSET.rack, 0.6)
    }
    rect(pen, 1.75, -0.48, 1.3, 0.48, CLOSET.sink)
    if (pen.lod <= 1) rect(pen, 1.75, -0.48, 1.3, 0.07, CLOSET.sinkDeep, 0.6)
    // The bare bulb on its cord, swinging when the plank lands.
    const top = Math.min(v.y0, -2.6) - 0.1
    const L = -1.95 - top
    const a = 0.05 * Math.sin(m.t * 1.4) + 0.22 * ring(m, 1.1, 1.0)
    const bx = 0.25 + Math.sin(a) * L
    const by = top + Math.cos(a) * L
    glow(pen, bx, by + 0.08, 1.3, CLOSET.light, 0.4)
    if (pen.lod <= 1) line(pen, 0.25, top, bx, by, CLOSET.cord, 0.02)
    at(pen, bx, by, -a, 1, () => {
      rect(pen, -0.04, -0.02, 0.08, 0.08, CLOSET.cord, 0)
      circle(pen, 0, 0.13, 0.08, CLOSET.bulb, 0.7)
    })
  },
  front(pen, _m, _v) {
    // The floor drain.
    if (pen.lod > 1) return
    ellipse(pen, 2.0, 0.35, 0.18, 0.06, CLOSET.drain, 0.7)
  },
  weight(pen) {
    // A spray bottle, trigger and nozzle.
    const h = WEIGHT_H
    poly(pen, [[-0.1, 0], [0.1, 0], [0.1, -0.18], [0.05, -0.23], [-0.05, -0.23], [-0.1, -0.18]], CLOSET.blue)
    rect(pen, -0.04, -0.27, 0.08, 0.04, CLOSET.trigger, 0.6)
    poly(pen, [[-0.06, -0.27], [0.08, -0.27], [0.16, -0.31], [0.16, -h], [-0.05, -h]], CLOSET.trigger, 0.8)
    if (pen.lod <= 1) poly(pen, [[0.04, -0.27], [0.07, -0.18], [0.1, -0.18], [0.09, -0.27]], CLOSET.trigger, 0.6)
    if (pen.lod === 0) rect(pen, -0.08, -0.15, 0.16, 0.06, CLOSET.white, 0)
  },
}

/* ------------------------------------------------------------------ the IRS elevator */

const LIFT = {
  steel: '#AEB3B7',
  brush: '#C2C7CA',
  side: '#959A9F',
  frame: '#7E848A',
  seam: '#3A3E44',
  panel: '#5A6066',
  button: '#D8DCDE',
  lit: '#FFE9A8',
  dark: '#26282C',
  amber: '#FFB43A',
  floor: '#3A3632',
  sill: '#C9CED2',
  rail: '#D0BF8A',
  plank: '#6E747A',
  fulcrum: '#4A4E54',
  shoe: '#F2EFE8',
  sole: '#3A3632',
  ink: '#22262A',
}

const elevator: Skin = {
  key: 'elevator',
  bg: LIFT.side,
  ink: LIFT.ink,
  floor: LIFT.floor,
  edge: LIFT.sill,
  plank: LIFT.plank,
  fulcrum: LIFT.fulcrum,
  back(pen, m, v) {
    // The doors, framed, their brushed steel and the seam where they meet.
    rect(pen, -1.62, -2.0, 3.24, 2.0, LIFT.frame, 0)
    rect(pen, -1.5, -1.9, 3.0, 1.9, LIFT.steel, 0)
    if (pen.lod === 0) strokeLines(pen, LIFT.brush, pen.lw * 0.6, (ctx) => {
      for (let x = -1.42; x < 1.5; x += 0.14) {
        ctx.moveTo(x, -1.86)
        ctx.lineTo(x, -0.04)
      }
    })
    if (pen.lod <= 1) line(pen, 0, -1.9, 0, 0, LIFT.seam, pen.lw * 1.4)
    // The floor indicator over the doors; a light walks along it, and blinks on each landing.
    rect(pen, -0.55, -2.32, 1.1, 0.24, LIFT.dark, 0.8)
    const f = flashOf(m, 0.9, 0.2)
    const at5 = Math.floor(m.t / 2.2) % 5
    if (pen.lod <= 1) {
      fillRects(pen, LIFT.panel, (ctx) => {
        for (let i = 0; i < 5; i++) if (i !== at5) ctx.rect(-0.46 + i * 0.19, -2.25, 0.1, 0.1)
      })
    }
    rect(pen, -0.46 + at5 * 0.19, -2.25, 0.1, 0.1, f > 0.3 ? '#FFFFFF' : LIFT.amber, 0)
    // The handrail along the side walls.
    rect(pen, v.x0 - 0.1, -1.0, -1.62 - v.x0 + 0.1, 0.06, LIFT.rail, 0.7)
    rect(pen, 1.62, -1.0, v.x1 - 1.62 + 0.1, 0.06, LIFT.rail, 0.7)
    // The button panel, on the right, some floors lit.
    round(pen, 1.85, -1.75, 0.34, 0.7, 0.04, LIFT.panel)
    if (pen.lod <= 1) {
      for (const lit of [false, true]) fillRects(pen, lit ? LIFT.lit : LIFT.button, (ctx) => {
        for (let i = 0; i < 8; i++) {
          if ((hash(i, 1, 81) < 0.3) !== lit) continue
          const bx = 1.95 + (i % 2) * 0.14
          const by = -1.64 + Math.floor(i / 2) * 0.15
          ctx.moveTo(bx + 0.035, by)
          ctx.arc(bx, by, 0.035, 0, Math.PI * 2)
        }
      })
    }
  },
  front(pen, _m, v) {
    // The door track in the sill.
    if (pen.lod > 1) return
    strokeLines(pen, LIFT.seam, pen.lw, (ctx) => {
      ctx.moveTo(-1.6, 0.035)
      ctx.lineTo(1.6, 0.035)
    })
    if (pen.lod === 0) strokeLines(pen, '#47423C', pen.lw * 0.8, (ctx) => {
      ctx.moveTo(v.x0, 0.4)
      ctx.lineTo(v.x1, 0.4)
    })
  },
  weight(pen) {
    // One shoe: a high-top, the wrong foot's.
    const h = WEIGHT_H
    poly(pen, [[-0.15, -0.03], [-0.15, -h], [-0.02, -h], [-0.0, -0.17], [0.1, -0.13], [0.17, -0.08], [0.17, -0.03]], LIFT.shoe)
    rect(pen, -0.16, -0.04, 0.34, 0.04, LIFT.sole, 0.7)
    if (pen.lod <= 1) {
      circle(pen, -0.1, -0.2, 0.025, LIFT.sole, 0)
      if (pen.lod === 0) strokeLines(pen, LIFT.sole, pen.lw, (ctx) => {
        for (let i = 0; i < 3; i++) {
          ctx.moveTo(-0.04 + i * 0.03, -0.28 + i * 0.05)
          ctx.lineTo(0.0 + i * 0.03, -0.25 + i * 0.05)
        }
      })
    }
  },
}

/* ------------------------------------------------------------------ the stop-motion world */

const CLAY = {
  sky: '#58B8E8',
  cloud: '#FBF6EC',
  sun: '#FFC83A',
  sunRay: '#FFAE2A',
  magenta: '#E25AA0',
  magentaDeep: '#B8407E',
  violet: '#7068D8',
  violetDeep: '#5650B0',
  lime: '#8CCB3E',
  limeDeep: '#6FAE2C',
  plank: '#F7D046',
  pebble: '#A69CC2',
  ink: '#2A2040',
}

/** A lumpy hill's outline: base corners and a bumpy dome from a to b, `h` high. */
function lumpHill(a: number, b: number, h: number, seed: number): Pt[] {
  const pts: Pt[] = [[a, 0.02]]
  const n = 14
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const x = a + (b - a) * u
    const y = -h * Math.sin(u * Math.PI) ** 0.8 + 0.04 * Math.sin(u * 23 + seed)
    pts.push([x, Math.min(0.02, y)])
  }
  pts.push([b, 0.02])
  return pts
}

const HILL_L = lumpHill(-3.8, -1.3, 1.5, 1)
const HILL_R = lumpHill(1.45, 3.9, 1.1, 4)
const HILL_M = lumpHill(-1.6, 1.8, 0.28, 7)
const PRINTS: readonly [number, number][] = [[-2.8, -0.9], [-2.2, -0.5], [-2.6, -0.3], [2.3, -0.55], [2.9, -0.35], [2.0, -0.2]]

const stopmotion: Skin = {
  key: 'stopmotion',
  bg: CLAY.sky,
  ink: CLAY.ink,
  floor: CLAY.lime,
  edge: CLAY.limeDeep,
  plank: CLAY.plank,
  fulcrum: CLAY.violet,
  back(pen, m, _v) {
    // Twelve frames a second, and each a little different: the clay boils.
    const step = Math.floor(m.t * 12)
    const t = step / 12
    const j = (i: number) => (pen.lod <= 1 ? (hash(step, i, 91) - 0.5) * 0.02 : 0)
    // The fat clay sun, its stubby rays turning, squashing when the plank lands.
    const sx = -2.1 + j(1)
    const sy = -1.85 + j(2)
    const sq = 0.12 * Math.round(ring(m, 0.3, 0.3) * 4) / 4
    if (pen.lod <= 1) fillRects(pen, CLAY.sunRay, (ctx) => {
      for (let i = 0; i < 8; i++) {
        const a = t * 0.4 + (i * Math.PI) / 4
        const rx = sx + Math.cos(a) * 0.55
        const ry = sy + Math.sin(a) * 0.55
        ctx.moveTo(rx + 0.09, ry)
        ctx.ellipse(rx, ry, 0.09, 0.09, 0, 0, Math.PI * 2)
      }
    })
    ellipse(pen, sx, sy, 0.4 * (1 + sq), 0.4 * (1 - sq), CLAY.sun, 1.6)
    // A clay cloud stepping across.
    const cx = 1.0 + ((t * 0.12) % 1.2) + j(3)
    for (const [dx, dy, r] of [[-0.22, 0, 0.16], [0, -0.08, 0.2], [0.24, 0, 0.15]]) circle(pen, cx + dx, -2.0 + dy, r, CLAY.cloud, 0)
    // The hills, pressed out by thumbs.
    poly(pen, HILL_M, CLAY.limeDeep, 1.2)
    at(pen, j(4), j(5), 0, 1, () => poly(pen, HILL_L, CLAY.magenta, 1.6))
    at(pen, j(6), j(7), 0, 1, () => poly(pen, HILL_R, CLAY.violet, 1.6))
    if (pen.lod === 0) {
      for (let i = 0; i < PRINTS.length; i++) {
        const [px, py] = PRINTS[i]
        strokeLines(pen, i < 3 ? CLAY.magentaDeep : CLAY.violetDeep, pen.lw * 0.9, (ctx) => {
          for (let k = 1; k <= 3; k++) {
            ctx.moveTo(px + 0.05 * k, py)
            ctx.ellipse(px, py, 0.05 * k, 0.035 * k, 0.3, 0, Math.PI * 1.6)
          }
        })
      }
    }
  },
  weight(pen) {
    // A clay pebble, with googly eyes.
    const h = WEIGHT_H
    poly(pen, [[-0.16, -0.01], [0.15, -0.01], [0.17, -0.12], [0.12, -0.26], [0.0, -h + 0.04], [-0.12, -0.27], [-0.17, -0.13]], CLAY.pebble, 1.3)
    if (pen.lod <= 1) {
      eye(pen, -0.05, -0.2, 0.05, 0.3, 0.6)
      eye(pen, 0.06, -0.2, 0.05, 0.3, 0.6)
    }
  },
}

/* ------------------------------------------------------------------ the confetti guard */

const HALL = {
  wall: '#9A9EA4',
  dado: '#7C8188',
  recess: '#5C6168',
  far: '#878C93',
  light: '#F4F6F2',
  door: '#5E6670',
  doorDeep: '#454C55',
  glass: '#B8CCD8',
  reader: '#2A2E34',
  ok: '#7BE07A',
  lino: '#B8B4AA',
  linoEdge: '#5E646C',
  plank: '#6E7680',
  fulcrum: '#4A5058',
  popper: '#E8B83A',
  ink: '#22262C',
}

const CONFETTI = ['#F6D04D', '#F27EB8', '#5CC8E8', '#A88CE6', '#FFFFFF'] as const

/** The burst's pieces: direction and speed, colour, spin, phase. */
const PIECES = Array.from({ length: 34 }, (_, i) => {
  const a = -Math.PI / 2 + (hash(i, 1, 7) - 0.5) * 3.0
  const sp = 0.5 + 1.0 * hash(i, 2, 7)
  return { vx: Math.cos(a) * sp * 1.1, vy: Math.sin(a) * sp * 0.55, c: i % CONFETTI.length, spin: (hash(i, 3, 7) - 0.5) * 12, ph: hash(i, 4, 7) * 6.28 }
})

const BURST_X = -2.05
const BURST_Y = -1.55

const confetti: Skin = {
  key: 'confetti',
  bg: HALL.wall,
  ink: HALL.ink,
  floor: HALL.lino,
  edge: HALL.linoEdge,
  plank: HALL.plank,
  fulcrum: HALL.fulcrum,
  back(pen, m, v) {
    // The grey corridor: a dado, a tube light overhead, and the corridor going off on the left.
    rect(pen, v.x0 - 0.1, -0.85, v.x1 - v.x0 + 0.2, 0.85, HALL.dado, 0)
    round(pen, -1.0, -2.55, 2.0, 0.1, 0.05, HALL.light, 0.8)
    rect(pen, -3.1, -2.05, 1.2, 2.05, HALL.far)
    rect(pen, -2.95, -1.92, 0.9, 1.92, HALL.recess, pen.lod <= 1 ? 0.6 : 0)
    if (pen.lod <= 1) rect(pen, -2.95, -0.7, 0.9, 0.08, HALL.far, 0)
    // The security door on the right: wire glass, push bar, and the card reader beside it.
    rect(pen, 1.62, -2.05, 1.0, 2.05, HALL.doorDeep)
    rect(pen, 1.7, -1.97, 0.84, 1.97, HALL.door, 0.7)
    if (pen.lod <= 1) {
      rect(pen, 1.92, -1.75, 0.4, 0.5, HALL.glass, 0.7)
      if (pen.lod === 0) strokeLines(pen, HALL.doorDeep, pen.lw * 0.6, (ctx) => {
        for (let i = 1; i < 4; i++) {
          ctx.moveTo(1.92 + i * 0.1, -1.75)
          ctx.lineTo(1.92 + i * 0.1, -1.25)
          ctx.moveTo(1.92, -1.75 + i * 0.125)
          ctx.lineTo(2.32, -1.75 + i * 0.125)
        }
      })
      rect(pen, 1.75, -0.98, 0.74, 0.07, HALL.doorDeep, 0.6)
    }
    rect(pen, 2.75, -1.25, 0.16, 0.24, HALL.reader, 0.7)
    if (pen.lod <= 1) circle(pen, 2.83, -1.2, 0.025, HALL.ok, 0)
    // A slow fall of confetti from before, down the walls.
    if (pen.lod <= 1) {
      for (let c = 0; c < 3; c++) fillRects(pen, CONFETTI[c], (ctx) => {
        for (let i = c; i < 12; i += 3) {
          const x = (i % 2 ? 1 : -1) * (1.45 + 1.6 * hash(i, 5, 7)) + 0.06 * Math.sin(m.t * 1.7 + i)
          const y = v.y0 + (((m.t * 0.18 + hash(i, 6, 7)) % 1) * (-v.y0))
          ctx.rect(x, y, 0.045, 0.03 * Math.abs(Math.cos(m.t * 2 + i)) + 0.008)
        }
      })
    }
  },
  front(pen, m, _v) {
    // Confetti on the floor, from earlier.
    if (pen.lod <= 1) {
      for (let c = 0; c < 4; c++) fillRects(pen, CONFETTI[c], (ctx) => {
        for (let i = c; i < 16; i += 4) ctx.rect(-3.2 + 6.4 * hash(i, 8, 7), 0.1 + 0.6 * hash(i, 9, 7), 0.05, 0.025)
      })
    }
    // The burst: it goes off when the plank lands, and the pieces flutter down.
    const s = m.since
    if (!(s >= 0 && s < 5)) return
    if (pen.lod <= 1 && s < 0.25) {
      const k = 1 - s / 0.25
      const r0 = 0.1 + 0.4 * (1 - k)
      strokeLines(pen, rgba('#FFFFFF', k), 0.03, (ctx) => {
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4 + 0.2
          ctx.moveTo(BURST_X + Math.cos(a) * r0, BURST_Y + Math.sin(a) * r0)
          ctx.lineTo(BURST_X + Math.cos(a) * (r0 + 0.15), BURST_Y + Math.sin(a) * (r0 + 0.15))
        }
      })
    }
    const out = 1 - Math.exp(-s / 0.2)
    const n = pen.lod === 2 ? 12 : PIECES.length
    for (let c = 0; c < CONFETTI.length; c++) {
      fillRects(pen, CONFETTI[c], (ctx) => {
        for (let i = 0; i < n; i++) {
          const p = PIECES[i]
          if (p.c !== c) continue
          const x = BURST_X + p.vx * out + 0.06 * Math.sin(s * 5 + p.ph) * Math.min(1, s * 2)
          const y = BURST_Y + p.vy * out + 0.32 * s
          if (y > -0.02) continue
          const a = p.ph + p.spin * s
          const w = 0.05
          const h = 0.024 + 0.016 * Math.cos(p.spin * s * 0.7)
          const ca = Math.cos(a)
          const sa = Math.sin(a)
          ctx.moveTo(x + ca * w - sa * h, y + sa * w + ca * h)
          ctx.lineTo(x - ca * w - sa * h, y - sa * w + ca * h)
          ctx.lineTo(x - ca * w + sa * h, y - sa * w - ca * h)
          ctx.lineTo(x + ca * w + sa * h, y + sa * w - ca * h)
          ctx.closePath()
        }
      })
    }
  },
  weight(pen) {
    // A party popper, mouth up, its streamers out.
    const h = WEIGHT_H
    poly(pen, [[-0.03, 0], [0.03, 0], [0.12, -0.24], [-0.12, -0.24]], HALL.popper)
    if (pen.lod <= 1) {
      fillRects(pen, CONFETTI[1], (ctx) => {
        ctx.moveTo(-0.055, -0.08)
        ctx.lineTo(0.055, -0.08)
        ctx.lineTo(0.07, -0.12)
        ctx.lineTo(-0.07, -0.12)
        ctx.closePath()
        ctx.moveTo(-0.09, -0.16)
        ctx.lineTo(0.09, -0.16)
        ctx.lineTo(0.105, -0.2)
        ctx.lineTo(-0.105, -0.2)
        ctx.closePath()
      })
      strokeLines(pen, CONFETTI[2], 0.02, (ctx) => {
        ctx.moveTo(-0.05, -0.24)
        ctx.quadraticCurveTo(-0.14, -0.3, -0.09, -h)
        ctx.moveTo(0.04, -0.24)
        ctx.quadraticCurveTo(0.12, -0.28, 0.1, -h + 0.01)
      })
      circle(pen, 0, -h + 0.01, 0.025, CONFETTI[0], 0)
    }
    ellipse(pen, 0, -0.24, 0.12, 0.03, HALL.ink, 0)
  },
}

export const VERSE_SKINS = {
  lobby,
  trophy,
  elvis,
  bagel,
  googly,
  wasteland,
  parking,
  set,
  closet,
  elevator,
  stopmotion,
  confetti,
} as const satisfies Record<string, Skin>
