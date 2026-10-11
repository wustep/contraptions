import { at, beam, circle, ellipse, glow, hash, line, mix, poly, rect, rgba, round, type Pen, type Pt } from './skins-pen'
import { flashOf, ring, WEIGHT_H, type Skin } from './skins-kit'

/**
 * Lives Evelyn might have had at play, or on a stage: the hours she never took off. An arcade after school, a
 * funfair at dusk, an ice rink, a clay court, a golf course in the late sun, a boxing ring, the municipal pool, a hot
 * spring in the snow, a disco, a rock show, a jazz club and a ballet studio. Each is one big silhouette at the side
 * or up high, a wall and a floor of its own, and a weight from its world; the same machine plays in front of them.
 *
 * Floor patterns (carpet, ice, tiles, water) are laid in `front()`, below the ground's top edge, where the machine
 * never reaches.
 */

/** Rects (or any subpaths) of one colour in one path, filled once. */
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

/** Ink round the current path, from lod 1 down. */
function inkPath(pen: Pen, w = 1): void {
  if (pen.lod > 1) return
  pen.ctx.strokeStyle = pen.ink
  pen.ctx.lineWidth = pen.lw * w
  pen.ctx.stroke()
}

/* ------------------------------------------------------------------ an arcade */

const ARC = {
  wall: '#1E1438',
  carpet: '#2A1C55',
  cab: '#3C2E7E',
  cabDeep: '#251B54',
  marquee: '#F2C14E',
  screen: '#7FE3F0',
  screenDeep: '#2C5C88',
  pink: '#F0559A',
  blue: '#4FB0F0',
  ink: '#0C0818',
}

/** The carpet's confetti, in a tile 2.4 wide: x, y, kind (0 a square, 1 a bar, 2 a diamond). */
const CONFETTI: readonly [number, number, number][] = Array.from({ length: 14 }, (_, i) => [hash(i, 1, 7) * 2.4, 0.16 + hash(i, 2, 7) * 0.62, i % 3])

/** A cabinet, its foot at x on the floor: the lit marquee, the screen, the control panel jutting out, the coin door. */
function cabinet(pen: Pen, x: number, lit: number, phase: number): void {
  const w = 0.66
  const h = 1.85
  poly(pen, [[x - w / 2, 0], [x + w / 2, 0], [x + w / 2, -h], [x - w / 2, -h]], ARC.cab)
  rect(pen, x - w / 2 + 0.04, -h + 0.04, w - 0.08, 0.26, ARC.marquee, 0.7)
  rect(pen, x - w / 2 + 0.07, -h + 0.42, w - 0.14, 0.5, mix(ARC.screen, '#FFFFFF', lit), 0.7)
  poly(pen, [[x - w / 2 - 0.05, -0.86], [x + w / 2 + 0.05, -0.86], [x + w / 2 + 0.02, -0.72], [x - w / 2 - 0.02, -0.72]], ARC.cabDeep, 0.7)
  if (pen.lod > 1) return
  // The game on the screen: a little ship going side to side under a row of invaders.
  const sx = x + 0.2 * Math.sin(phase)
  fillRects(pen, ARC.screenDeep, (ctx) => {
    ctx.rect(sx - 0.04, -h + 0.82, 0.08, 0.05)
    if (pen.lod === 0) for (let i = 0; i < 4; i++) ctx.rect(x - 0.18 + i * 0.11 + 0.03 * Math.sin(phase * 0.5), -h + 0.5, 0.06, 0.05)
  })
  // The stick and the buttons, the coin door.
  circle(pen, x - 0.14, -0.9, 0.035, ARC.pink, 0)
  fillRects(pen, ARC.blue, (ctx) => {
    ctx.moveTo(x + 0.1, -0.79)
    ctx.arc(x + 0.06, -0.79, 0.03, 0, Math.PI * 2)
    ctx.moveTo(x + 0.2, -0.79)
    ctx.arc(x + 0.16, -0.79, 0.03, 0, Math.PI * 2)
  })
  rect(pen, x - 0.1, -0.5, 0.2, 0.24, ARC.cabDeep, 0.6)
  if (pen.lod === 0) rect(pen, x - 0.02, -0.44, 0.04, 0.08, ARC.marquee, 0)
}

const arcade: Skin = {
  key: 'arcade',
  bg: ARC.wall,
  ink: ARC.ink,
  floor: ARC.carpet,
  plank: ARC.cab,
  fulcrum: ARC.cabDeep,
  back(pen, m, _v) {
    // Two cabinets either side, their screens jumping when the plank lands.
    const lit = flashOf(m, 0.9, 0.16) * 0.5
    cabinet(pen, -1.82, lit, m.t * 1.3)
    cabinet(pen, -2.56, lit, m.t * 1.1 + 2)
    cabinet(pen, 1.82, lit, m.t * 1.2 + 4)
    cabinet(pen, 2.56, lit, m.t * 1.4 + 1)
    glow(pen, 0, -2.0, 1.6, ARC.pink, 0.12)
  },
  front(pen, _m, v) {
    // The carpet: confetti of squares, bars and diamonds in three colours.
    if (pen.lod > 1) return
    const cols = [ARC.pink, ARC.marquee, ARC.blue]
    for (let k = 0; k < 3; k++) {
      fillRects(pen, cols[k], (ctx) => {
        for (let tx = Math.floor(v.x0 / 2.4) * 2.4; tx < v.x1; tx += 2.4) {
          for (let i = k; i < CONFETTI.length; i += pen.lod === 0 ? 3 : 6) {
            const [cx, cy, kind] = CONFETTI[i]
            const x = tx + cx
            const y = 0.1 + cy
            if (kind === 0) ctx.rect(x, y, 0.06, 0.06)
            else if (kind === 1) ctx.rect(x, y, 0.14, 0.035)
            else {
              ctx.moveTo(x, y - 0.05)
              ctx.lineTo(x + 0.045, y)
              ctx.lineTo(x, y + 0.05)
              ctx.lineTo(x - 0.045, y)
              ctx.closePath()
            }
          }
        }
      })
    }
  },
  weight(pen) {
    // A joystick: its box, the shaft, and the ball on top.
    const h = WEIGHT_H
    rect(pen, -0.16, -0.11, 0.32, 0.11, ARC.cabDeep, 0.8)
    if (pen.lod <= 1) circle(pen, 0.09, -0.11, 0.035, ARC.blue, 0.6)
    rect(pen, -0.03, -h + 0.08, 0.06, h - 0.19, '#C8C8D4', 0.7)
    circle(pen, 0, -h + 0.08, 0.08, ARC.marquee, 0.8)
  },
}

/* ------------------------------------------------------------------ a funfair at dusk */

const FAIR = {
  dusk: '#3B3266',
  low: '#7A5488',
  horizon: '#C88A9E',
  steel: '#E9E2F0',
  ground: '#3E3442',
  edge: '#57485A',
  cars: ['#F6D36B', '#7FD3E6', '#F29AC0'],
  bulb: '#FFE9A8',
  cone: '#F4EBD8',
  floss: '#F6A8C8',
  ink: '#1A1428',
}

const WHEEL = { x: 2.15, y: -1.85, r: 1.0, n: 8 }

const funfair: Skin = {
  key: 'funfair',
  bg: FAIR.dusk,
  ink: FAIR.ink,
  floor: FAIR.ground,
  edge: FAIR.edge,
  plank: '#5E8FC8',
  fulcrum: '#2E2850',
  back(pen, m, v) {
    // The last of the light along the bottom of the sky.
    rect(pen, v.x0 - 0.1, -1.1, v.x1 - v.x0 + 0.2, 1.1, FAIR.low, 0)
    rect(pen, v.x0 - 0.1, -0.5, v.x1 - v.x0 + 0.2, 0.5, FAIR.horizon, 0)
    // The Ferris wheel, on its A-frame, turning slowly; its cars hang level and rock when the plank lands.
    const { x, y, r, n } = WHEEL
    const a0 = m.t * 0.12
    const sw = ring(m, 0.5, 0.5) * 0.25
    poly(pen, [[x - 0.6, 0], [x - 0.5, 0], [x + 0.03, y], [x - 0.03, y]], FAIR.steel, pen.lod <= 1 ? 0.6 : 0)
    poly(pen, [[x + 0.6, 0], [x + 0.5, 0], [x - 0.03, y], [x + 0.03, y]], FAIR.steel, pen.lod <= 1 ? 0.6 : 0)
    const { ctx } = pen
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    if (pen.lod <= 1) {
      ctx.moveTo(x + r * 0.82, y)
      ctx.arc(x, y, r * 0.82, 0, Math.PI * 2)
      for (let i = 0; i < n * 2; i++) {
        const a = a0 + (i * Math.PI) / n
        ctx.moveTo(x, y)
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
      }
    }
    ctx.strokeStyle = FAIR.steel
    ctx.lineWidth = pen.lod <= 1 ? 0.035 : 0.06
    ctx.stroke()
    circle(pen, x, y, 0.09, FAIR.steel, pen.lod <= 1 ? 0.6 : 0)
    for (let k = 0; k < 3; k++) {
      fillRects(pen, FAIR.cars[k], (c) => {
        for (let i = k; i < n; i += 3) {
          const a = a0 + (i * Math.PI * 2) / n
          const cx = x + Math.cos(a) * r
          const cy = y + Math.sin(a) * r
          const dx = Math.sin(sw) * 0.14
          c.moveTo(cx - 0.13 + dx, cy + 0.08)
          c.lineTo(cx + 0.13 + dx, cy + 0.08)
          c.lineTo(cx + 0.1 + dx, cy + 0.26)
          c.lineTo(cx - 0.1 + dx, cy + 0.26)
          c.closePath()
          c.moveTo(cx + 0.02, cy)
          c.arc(cx, cy, 0.02, 0, Math.PI * 2)
        }
      })
    }
    // Bulbs round the rim.
    if (pen.lod === 0) fillRects(pen, FAIR.bulb, (c) => {
      for (let i = 0; i < 24; i++) {
        const a = a0 + (i * Math.PI * 2) / 24 + 0.13
        c.moveTo(x + Math.cos(a) * r + 0.025, y + Math.sin(a) * r)
        c.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 0.025, 0, Math.PI * 2)
      }
    })
    glow(pen, x, y, 1.4, FAIR.bulb, 0.12 + 0.2 * flashOf(m))
    // A string of lights swagged from a pole on the left.
    if (pen.lod <= 1) {
      rect(pen, -2.45, -2.3, 0.06, 2.3, '#2A2440', 0.6)
      strokeLines(pen, FAIR.ink, pen.lw * 0.7, (c) => {
        c.moveTo(-2.42, -2.25)
        c.quadraticCurveTo(-1.6, -1.6, v.x0 - 0.1, -2.0)
        c.moveTo(-2.42, -2.25)
        c.quadraticCurveTo(-1.3, -1.7, 0.4, -2.6)
      })
      fillRects(pen, FAIR.bulb, (c) => {
        for (let i = 1; i < 8; i++) {
          const t = i / 8
          const bx = (1 - t) * (1 - t) * -2.42 + 2 * (1 - t) * t * -1.3 + t * t * 0.4
          const by = (1 - t) * (1 - t) * -2.25 + 2 * (1 - t) * t * -1.7 + t * t * -2.6
          c.moveTo(bx + 0.035, by + 0.02)
          c.arc(bx, by + 0.02, 0.035, 0, Math.PI * 2)
        }
      })
    }
  },
  weight(pen) {
    // A cone of candy floss.
    const h = WEIGHT_H
    poly(pen, [[0, 0], [0.07, -h * 0.5], [-0.07, -h * 0.5]], FAIR.cone, 0.8)
    if (pen.lod <= 1) line(pen, -0.035, -h * 0.25, 0.05, -h * 0.4, FAIR.floss, 0.015)
    const { ctx } = pen
    ctx.beginPath()
    ctx.arc(-0.07, -h * 0.62, 0.09, 0, Math.PI * 2)
    ctx.moveTo(0.16, -h * 0.66)
    ctx.arc(0.07, -h * 0.66, 0.09, 0, Math.PI * 2)
    ctx.moveTo(0.11, -h * 0.82)
    ctx.arc(0, -h * 0.8, 0.11, 0, Math.PI * 2)
    ctx.fillStyle = FAIR.floss
    ctx.fill()
    inkPath(pen, 0.7)
    ctx.fill()
  },
}

/* ------------------------------------------------------------------ an ice rink */

const RINK = {
  arena: '#7F94B0',
  stands: '#66799A',
  row: '#8EA2BE',
  board: '#F4F6F8',
  rail: '#2F5FA0',
  glass: '#D8E8F2',
  ice: '#E4F0F6',
  iceDeep: '#B9D3E2',
  line: '#5A86C0',
  score: '#26303F',
  digit: '#F6D86A',
  ink: '#1E2A3C',
}

/** Scratches on the ice, in a tile 3 wide: a centre, a radius, a start angle. */
const SCRATCH: readonly [number, number, number, number][] = Array.from({ length: 10 }, (_, i) => [hash(i, 3, 5) * 3, 0.18 + hash(i, 4, 5) * 0.6, 0.3 + hash(i, 5, 5) * 0.7, hash(i, 6, 5) * 6])

const icerink: Skin = {
  key: 'icerink',
  bg: RINK.arena,
  ink: RINK.ink,
  floor: RINK.ice,
  edge: RINK.iceDeep,
  plank: RINK.rail,
  fulcrum: RINK.score,
  back(pen, m, v) {
    // The stands, rising in rows.
    if (pen.lod <= 1) fillRects(pen, RINK.stands, (c) => {
      for (let y = -1.3; y > v.y0; y -= 0.36) c.rect(v.x0 - 0.1, y - 0.18, v.x1 - v.x0 + 0.2, 0.18)
    })
    // The glass, the boards, and the blue rail along their top.
    rect(pen, v.x0 - 0.1, -1.15, v.x1 - v.x0 + 0.2, 0.6, rgba(RINK.glass, 0.55), 0)
    if (pen.lod <= 1) strokeLines(pen, rgba(RINK.board, 0.9), pen.lw * 0.8, (c) => {
      for (let x = Math.floor(v.x0 / 1.2) * 1.2 + 0.6; x < v.x1; x += 1.2) {
        c.moveTo(x, -1.15)
        c.lineTo(x, -0.58)
      }
    })
    rect(pen, v.x0 - 0.1, -0.58, v.x1 - v.x0 + 0.2, 0.58, RINK.board, 0)
    rect(pen, v.x0 - 0.1, -0.62, v.x1 - v.x0 + 0.2, 0.07, RINK.rail, 0)
    rect(pen, v.x0 - 0.1, -0.14, v.x1 - v.x0 + 0.2, 0.14, RINK.line, 0)
    if (pen.lod <= 1) line(pen, v.x0, -0.62, v.x1, -0.62, RINK.ink, pen.lw * 0.7)
    // The scoreboard, hung high over the ice, its numbers lighting when the plank lands.
    const sw = ring(m, 0.6, 0.6) * 0.03
    at(pen, 0, -3.3, sw, 1, () => {
      if (pen.lod <= 1) strokeLines(pen, RINK.ink, pen.lw * 0.7, (c) => {
        c.moveTo(-0.5, -0.5)
        c.lineTo(-0.5, 0.9)
        c.moveTo(0.5, -0.5)
        c.lineTo(0.5, 0.9)
      })
      rect(pen, -0.75, 0.85, 1.5, 0.6, RINK.score)
      rect(pen, -0.6, 1.45, 1.2, 0.12, RINK.score, pen.lod <= 1 ? 0.7 : 0)
      const f = flashOf(m, 0.9, 0.2)
      const d = mix(RINK.digit, '#FFFFFF', f * 0.6)
      fillRects(pen, d, (c) => {
        c.rect(-0.6, 0.97, 0.12, 0.36)
        c.rect(-0.4, 0.97, 0.22, 0.08)
        c.rect(-0.26, 1.05, 0.08, 0.28)
        c.rect(0.25, 0.97, 0.12, 0.36)
        c.rect(0.45, 0.97, 0.12, 0.36)
      })
      if (pen.lod === 0) fillRects(pen, RINK.rail, (c) => {
        c.rect(-0.04, 1.05, 0.08, 0.08)
        c.rect(-0.04, 1.2, 0.08, 0.08)
      })
    })
  },
  front(pen, _m, v) {
    // Scratches across the ice.
    if (pen.lod > 0) return
    strokeLines(pen, RINK.iceDeep, pen.lw * 0.8, (c) => {
      for (let tx = Math.floor(v.x0 / 3) * 3; tx < v.x1; tx += 3) {
        for (const [cx, cy, r, a] of SCRATCH) {
          const x = tx + cx
          c.moveTo(x + Math.cos(a) * r, cy + Math.sin(a) * r * 0.2)
          c.ellipse(x, cy, r, r * 0.2, 0, a, a + 0.9)
        }
      }
    })
  },
  weight(pen) {
    // An ice skate: the white boot, its laces, and the blade.
    const h = WEIGHT_H
    poly(pen, [[-0.13, -0.06], [0.16, -0.06], [0.16, -0.12], [0.03, -0.15], [0.01, -h], [-0.12, -h], [-0.14, -0.15]], RINK.board, 0.8)
    rect(pen, -0.15, -0.06, 0.33, 0.025, RINK.score, 0)
    poly(pen, [[-0.14, 0], [0.18, 0], [0.2, -0.02], [-0.14, -0.02]], '#B8C2CC', pen.lod <= 1 ? 0.6 : 0)
    if (pen.lod <= 1) fillRects(pen, RINK.ink, (c) => {
      c.rect(-0.05, -0.04, 0.02, 0.04)
      c.rect(0.09, -0.04, 0.02, 0.04)
    })
    if (pen.lod === 0) strokeLines(pen, RINK.line, pen.lw * 0.8, (c) => {
      for (let i = 0; i < 4; i++) {
        c.moveTo(-0.02, -0.17 - i * 0.04)
        c.lineTo(0.02, -0.15 - i * 0.04)
      }
    })
  },
}

/* ------------------------------------------------------------------ a clay court */

const CLAY = {
  stand: '#DCD3C0',
  standDeep: '#C4BAA4',
  screen: '#1F4A36',
  screenLine: '#2D6049',
  clay: '#C4673E',
  line: '#F2EFE6',
  clayDeep: '#A9552F',
  chair: '#F2EFE6',
  post: '#16301F',
  ball: '#D9E24A',
  can: '#D6E2E6',
  ink: '#1C2A22',
}

const tennis: Skin = {
  key: 'tennis',
  bg: CLAY.stand,
  ink: CLAY.ink,
  floor: CLAY.clay,
  edge: CLAY.line,
  plank: '#8A6A48',
  fulcrum: CLAY.screen,
  back(pen, m, v) {
    // The crowd's stand above, in rows, and the dark green windscreen behind the court.
    if (pen.lod <= 1) fillRects(pen, CLAY.standDeep, (c) => {
      for (let y = -1.7; y > v.y0; y -= 0.3) c.rect(v.x0 - 0.1, y - 0.1, v.x1 - v.x0 + 0.2, 0.1)
    })
    rect(pen, v.x0 - 0.1, -1.4, v.x1 - v.x0 + 0.2, 1.4, CLAY.screen, 0)
    if (pen.lod <= 1) rect(pen, v.x0 - 0.1, -1.44, v.x1 - v.x0 + 0.2, 0.05, CLAY.line, 0)
    // The umpire's high chair on the left: two legs, the rungs, the seat up top.
    const cx = -2.15
    fillRects(pen, CLAY.chair, (c) => {
      c.rect(cx - 0.3, -1.5, 0.06, 1.5)
      c.rect(cx + 0.24, -1.5, 0.06, 1.5)
      c.rect(cx - 0.36, -1.58, 0.72, 0.1)
      c.rect(cx + 0.24, -2.05, 0.06, 0.5)
      c.rect(cx - 0.3, -2.05, 0.06, 0.5)
      if (pen.lod <= 1) for (let i = 1; i < 5; i++) c.rect(cx - 0.27, -i * 0.3, 0.54, 0.04)
    })
    if (pen.lod <= 1) rect(pen, cx - 0.3, -1.9, 0.6, 0.06, CLAY.chair, 0)
    // The net on the right, its white tape, and a ball bouncing on the clay beyond it when the plank lands.
    const nx = 1.55
    rect(pen, nx, -0.55, v.x1 - nx + 0.2, 0.55, rgba(CLAY.post, 0.6), 0)
    if (pen.lod === 0) strokeLines(pen, rgba(CLAY.line, 0.3), pen.lw * 0.6, (c) => {
      for (let x = nx + 0.1; x < v.x1; x += 0.1) {
        c.moveTo(x, -0.5)
        c.lineTo(x, 0)
      }
      for (let y = -0.4; y < 0; y += 0.1) {
        c.moveTo(nx, y)
        c.lineTo(v.x1, y)
      }
    })
    rect(pen, nx, -0.6, v.x1 - nx + 0.2, 0.07, CLAY.line, 0)
    rect(pen, nx - 0.04, -0.68, 0.08, 0.68, CLAY.post, pen.lod <= 1 ? 0.6 : 0)
    const k = Number.isFinite(m.since) ? Math.exp(-m.since / 0.6) : 0
    const by = -0.07 - 0.7 * k * Math.abs(Math.cos(m.since * 6))
    circle(pen, 2.35, by, 0.07, CLAY.ball, pen.lod <= 1 ? 0.6 : 0)
  },
  front(pen, _m, v) {
    // Brushed clay, and a slide mark.
    if (pen.lod > 0) return
    strokeLines(pen, CLAY.clayDeep, pen.lw * 0.7, (c) => {
      for (let y = 0.22; y < v.y1; y += 0.16) {
        c.moveTo(v.x0, y)
        c.lineTo(v.x1, y)
      }
    })
    ellipse(pen, -1.9, 0.32, 0.5, 0.05, rgba(CLAY.clayDeep, 0.8), 0)
  },
  weight(pen) {
    // A clear can of three balls, its grey lid.
    const h = WEIGHT_H
    rect(pen, -0.1, -h + 0.04, 0.2, h - 0.04, rgba(CLAY.can, 0.9), 0.8)
    fillRects(pen, CLAY.ball, (c) => {
      for (let i = 0; i < 3; i++) {
        c.moveTo(0.085, -0.05 - i * 0.095)
        c.arc(0, -0.05 - i * 0.095, 0.085, 0, Math.PI * 2)
      }
    })
    if (pen.lod === 0) strokeLines(pen, CLAY.line, pen.lw * 0.8, (c) => {
      for (let i = 0; i < 3; i++) {
        c.moveTo(-0.07, -0.08 - i * 0.095)
        c.quadraticCurveTo(0, -0.02 - i * 0.095, 0.07, -0.08 - i * 0.095)
      }
    })
    round(pen, -0.115, -h, 0.23, 0.05, 0.02, '#8C949A', 0.8)
  },
}

/* ------------------------------------------------------------------ a golf course, late in the day */

const GOLF = {
  sky: '#F1DCAA',
  far: '#9DB49A',
  trees: '#4E7448',
  near: '#7CB05E',
  fairway: '#66A84C',
  stripe: '#74B658',
  sand: '#EAD49C',
  flag: '#2C3E7A',
  pin: '#F2F0E6',
  tee: '#C89A5A',
  ball: '#FBFBF6',
  ink: '#283422',
}

const golf: Skin = {
  key: 'golf',
  bg: GOLF.sky,
  ink: GOLF.ink,
  floor: GOLF.fairway,
  plank: GOLF.tee,
  fulcrum: '#4A6A3A',
  back(pen, m, v) {
    const { ctx } = pen
    // Far hills, blue with the distance, rolling across.
    ctx.beginPath()
    ctx.moveTo(v.x0 - 0.1, 0)
    for (let x = v.x0 - 0.1; x < v.x1 + 0.4; x += 0.4) ctx.lineTo(x, -0.95 - 0.22 * Math.sin(x * 0.9 + 1) - 0.1 * Math.sin(x * 2.1))
    ctx.lineTo(v.x1 + 0.4, 0)
    ctx.closePath()
    ctx.fillStyle = GOLF.far
    ctx.fill()
    // A clump of trees on the left horizon.
    fillRects(pen, GOLF.trees, (c) => {
      for (const [x, y, r] of [[-2.7, -1.15, 0.32], [-2.3, -1.3, 0.38], [-1.9, -1.1, 0.3]] as const) {
        c.moveTo(x + r, y)
        c.arc(x, y, r, 0, Math.PI * 2)
      }
      c.rect(-2.9, -1.1, 1.3, 0.6)
    })
    // The green, a low mound on the right, and the pin with its flag flying.
    ellipse(pen, 2.1, 0, 1.4, 0.42, GOLF.near, pen.lod <= 1 ? 0.7 : 0)
    const px = 2.05
    rect(pen, px - 0.025, -2.2, 0.05, 1.82, GOLF.pin, pen.lod <= 1 ? 0.6 : 0)
    const fl = 0.05 * Math.sin(m.t * 2.3) + ring(m, 0.3, 0.4) * 0.07
    poly(pen, [[px + 0.025, -2.2], [px + 0.62, -2.04 + fl], [px + 0.58, -1.96 + fl * 1.2], [px + 0.025, -1.84]], GOLF.flag, pen.lod <= 1 ? 0.7 : 0)
    if (pen.lod <= 1) ellipse(pen, px, -0.38, 0.1, 0.025, GOLF.ink, 0)
  },
  front(pen, _m, v) {
    // Mowing stripes, and a bunker on the left.
    if (pen.lod <= 1) fillRects(pen, GOLF.stripe, (c) => {
      for (let x = Math.floor(v.x0 / 1.2) * 1.2; x < v.x1; x += 1.2) {
        c.moveTo(x, 0.07)
        c.lineTo(x + 0.6, 0.07)
        c.lineTo(x + 0.85, v.y1 + 0.1)
        c.lineTo(x + 0.25, v.y1 + 0.1)
        c.closePath()
      }
    })
    ellipse(pen, -2.1, 0.38, 0.75, 0.14, GOLF.sand, pen.lod <= 1 ? 0.7 : 0)
  },
  weight(pen) {
    // A golf ball on its tee.
    const h = WEIGHT_H
    poly(pen, [[-0.015, 0], [0.015, 0], [0.03, -0.11], [0.07, -0.13], [-0.07, -0.13], [-0.03, -0.11]], GOLF.tee, 0.7)
    circle(pen, 0, -h + 0.11, 0.11, GOLF.ball)
    if (pen.lod === 0) fillRects(pen, '#D8DCD4', (c) => {
      for (const [dx, dy] of [[-0.04, -0.04], [0.03, -0.05], [0.05, 0.02], [-0.02, 0.03], [0.0, -0.0], [-0.06, 0.0]] as const) {
        c.moveTo(dx + 0.013, -h + 0.11 + dy)
        c.arc(dx, -h + 0.11 + dy, 0.013, 0, Math.PI * 2)
      }
    })
  },
}

/* ------------------------------------------------------------------ a boxing ring */

const BOX = {
  hall: '#1C1C22',
  crowd: '#2A2A32',
  canvas: '#E2DCCD',
  apron: '#22357A',
  post: '#B8BCC4',
  padBlue: '#2E4FA8',
  padWine: '#8E2A3A',
  rope: '#F2F0EA',
  shade: '#3C3C44',
  light: '#FFF2CC',
  lace: '#F2F0EA',
  ink: '#0E0E12',
}

const boxing: Skin = {
  key: 'boxing',
  bg: BOX.hall,
  ink: BOX.ink,
  floor: BOX.canvas,
  plank: '#3A4458',
  fulcrum: BOX.apron,
  back(pen, m, v) {
    // The crowd in the dark, a row of heads and shoulders.
    if (pen.lod <= 1) fillRects(pen, BOX.crowd, (c) => {
      for (let i = 0; i < 18; i++) {
        const x = v.x0 + (i + 0.5) * ((v.x1 - v.x0) / 18)
        const y = -1.35 - 0.1 * hash(i, 9, 1)
        c.moveTo(x + 0.1, y)
        c.arc(x, y, 0.1, 0, Math.PI * 2)
        c.rect(x - 0.17, y + 0.08, 0.34, 0.4)
      }
    })
    // The lamp over the ring, swinging a little on its cord when the plank lands, and its light falling.
    const sw = ring(m, 0.9, 0.8) * 0.06
    const lx = Math.sin(sw) * 0.6
    beam(pen, lx, -2.45, lx * 0.3, 0.05, 0.6, 3.6, BOX.light, 0.22)
    if (pen.lod <= 1) line(pen, 0, v.y0 - 0.1, lx, -2.75, BOX.post, pen.lw)
    at(pen, lx, -2.75, sw, 1, () => {
      poly(pen, [[-0.12, 0], [0.12, 0], [0.38, 0.3], [-0.38, 0.3]], BOX.shade, pen.lod <= 1 ? 0.8 : 0)
      ellipse(pen, 0, 0.3, 0.3, 0.05, BOX.light, 0)
    })
    // The corner posts and their pads, and the three ropes slung between.
    for (const [x, pad] of [[-2.25, BOX.padBlue], [2.25, BOX.padWine]] as const) {
      rect(pen, x - 0.05, -1.25, 0.1, 1.25, BOX.post, pen.lod <= 1 ? 0.6 : 0)
      round(pen, x - 0.11, -1.2, 0.22, 0.86, 0.06, pad, pen.lod <= 1 ? 0.7 : 0)
    }
    const sag = ring(m, 0.4, 0.4) * 0.03
    strokeLines(pen, BOX.rope, pen.lod <= 1 ? 0.035 : 0.05, (c) => {
      for (const y of [-0.42, -0.74, -1.06]) {
        for (const [a, b] of [[v.x0 - 0.1, -2.25], [2.25, v.x1 + 0.1]] as const) {
          c.moveTo(a, y)
          c.lineTo(b, y)
        }
        c.moveTo(-2.25, y)
        c.quadraticCurveTo(0, y + 0.06 + sag, 2.25, y)
      }
    })
  },
  front(pen, _m, v) {
    // The apron skirting the ring, blue, with a white stripe.
    rect(pen, v.x0 - 0.1, 0.3, v.x1 - v.x0 + 0.2, v.y1 - 0.2, BOX.apron, 0)
    if (pen.lod <= 1) rect(pen, v.x0 - 0.1, 0.36, v.x1 - v.x0 + 0.2, 0.04, BOX.rope, 0)
  },
  weight(pen) {
    // A boxing glove, standing on its cuff.
    const h = WEIGHT_H
    rect(pen, -0.1, -0.1, 0.2, 0.1, BOX.lace, 0.8)
    const { ctx } = pen
    ctx.beginPath()
    ctx.moveTo(-0.11, -0.1)
    ctx.bezierCurveTo(-0.18, -0.18, -0.17, -h, -0.02, -h)
    ctx.bezierCurveTo(0.14, -h, 0.16, -0.24, 0.12, -0.18)
    ctx.lineTo(0.11, -0.1)
    ctx.closePath()
    ctx.fillStyle = BOX.padWine
    ctx.fill()
    inkPath(pen, 0.8)
    ellipse(pen, 0.12, -0.2, 0.05, 0.075, BOX.padWine, 0.7, -0.3)
    if (pen.lod === 0) line(pen, -0.06, -0.1, 0.06, -0.1, BOX.ink, 0.012)
  },
}

/* ------------------------------------------------------------------ a swimming pool */

const POOL = {
  wall: '#E2EEEC',
  grout: '#C4DAD8',
  band: '#2E7FB8',
  window: '#F8FCFC',
  sky: '#BFDDEA',
  steel: '#9AA4AC',
  board: '#F0EEE6',
  deck: '#F2F4F2',
  water: '#3EA6D6',
  ripple: '#7CCBEA',
  floatA: '#F2C94C',
  floatB: '#2E5FA8',
  ring: '#F27FA0',
  ink: '#1E3A48',
}

const pool: Skin = {
  key: 'pool',
  bg: POOL.wall,
  ink: POOL.ink,
  floor: POOL.water,
  edge: POOL.deck,
  plank: POOL.board,
  fulcrum: POOL.steel,
  back(pen, m, v) {
    // Tiles, and a band of dark blue ones along the bottom.
    if (pen.lod === 0) strokeLines(pen, POOL.grout, pen.lw * 0.6, (c) => {
      for (let y = -0.25; y > -1.9; y -= 0.25) {
        c.moveTo(v.x0, y)
        c.lineTo(v.x1, y)
      }
      for (let x = Math.floor(v.x0 / 0.25) * 0.25; x < v.x1; x += 0.25) {
        c.moveTo(x, -1.9)
        c.lineTo(x, 0)
      }
    })
    rect(pen, v.x0 - 0.1, -0.3, v.x1 - v.x0 + 0.2, 0.12, POOL.band, 0)
    // High windows, the sky in them.
    if (pen.lod <= 1) for (let x = Math.floor((v.x0 + 0.4) / 1.3) * 1.3 - 0.4; x < v.x1; x += 1.3) rect(pen, x, -2.85, 0.9, 0.6, POOL.sky, 0.7)
    // The diving board on its tower, on the left; it bounces when the plank lands.
    const tx = -2.35
    fillRects(pen, POOL.steel, (c) => {
      c.rect(tx - 0.2, -1.45, 0.06, 1.45)
      c.rect(tx + 0.14, -1.45, 0.06, 1.45)
      if (pen.lod <= 1) for (let i = 1; i < 6; i++) c.rect(tx - 0.2, -i * 0.25, 0.4, 0.035)
    })
    if (pen.lod <= 1) strokeLines(pen, POOL.steel, 0.03, (c) => {
      c.moveTo(tx - 0.17, -1.45)
      c.lineTo(tx - 0.17, -1.85)
      c.lineTo(tx + 0.3, -1.85)
      c.lineTo(tx + 0.3, -1.5)
    })
    const b = ring(m, 0.25, 0.4) * 0.08
    poly(pen, [[tx - 0.3, -1.52], [tx + 0.2, -1.52], [-1.4, -1.53 + b], [-1.4, -1.47 + b], [tx + 0.2, -1.45], [tx - 0.3, -1.45]], POOL.board, pen.lod <= 1 ? 0.8 : 0)
    // The ladder out of the pool on the right: two handrails.
    strokeLines(pen, POOL.steel, pen.lod <= 1 ? 0.04 : 0.06, (c) => {
      for (const x of [2.0, 2.45]) {
        c.moveTo(x, 0)
        c.lineTo(x, -0.55)
        c.quadraticCurveTo(x, -0.8, x - 0.25, -0.8)
        c.lineTo(x - 0.3, -0.72)
      }
    })
  },
  front(pen, m, v) {
    // Ripples on the water, and a lane rope of floats.
    if (pen.lod <= 1) strokeLines(pen, POOL.ripple, pen.lw * 1.2, (c) => {
      for (let r = 0; r < 3; r++) {
        const y = 0.22 + r * 0.24
        if (y > v.y1) break
        const ph = m.t * 1.2 + r * 1.7
        c.moveTo(v.x0, y)
        for (let x = v.x0; x < v.x1 + 0.3; x += 0.3) c.lineTo(x, y + 0.025 * Math.sin(x * 4 + ph))
      }
    })
    if (pen.lod > 1) return
    for (let k = 0; k < 2; k++) {
      fillRects(pen, k ? POOL.floatB : POOL.floatA, (c) => {
        const y = 0.36
        for (let x = Math.floor(v.x0 / 0.2) * 0.2 + k * 0.1; x < v.x1; x += 0.2) {
          c.moveTo(x + 0.045, y)
          c.ellipse(x, y, 0.045, 0.03, 0, 0, Math.PI * 2)
        }
      })
    }
  },
  weight(pen) {
    // A rubber ring, on its edge, striped.
    const h = WEIGHT_H
    const { ctx } = pen
    ctx.lineWidth = 0.11
    ctx.beginPath()
    ctx.arc(0, -h / 2, h / 2 - 0.055, 0, Math.PI * 2)
    ctx.strokeStyle = POOL.ring
    ctx.stroke()
    if (pen.lod <= 1) {
      ctx.strokeStyle = POOL.deck
      for (let i = 0; i < 4; i++) {
        ctx.beginPath()
        ctx.arc(0, -h / 2, h / 2 - 0.055, (i * Math.PI) / 2 + 0.3, (i * Math.PI) / 2 + 0.75)
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.arc(0, -h / 2, h / 2, 0, Math.PI * 2)
      ctx.moveTo(h / 2 - 0.11, -h / 2)
      ctx.arc(0, -h / 2, h / 2 - 0.11, 0, Math.PI * 2)
      inkPath(pen, 0.8)
    }
  },
}

/* ------------------------------------------------------------------ a hot spring in the snow */

const ONSEN = {
  sky: '#A396AA',
  mountain: '#6E7290',
  cap: '#F2F0F4',
  stone: '#56504C',
  rock: '#4A4442',
  rockLight: '#6C6460',
  cedar: '#B47C4A',
  cedarDeep: '#7A5030',
  hoop: '#3A3432',
  water: '#9ED0D0',
  steam: '#F6F4F4',
  towel: '#F4F2EE',
  ink: '#2A2426',
}

/** A wooden tub or bucket's body, its rim at y0 and its foot at 0, tapering in. */
function tub(pen: Pen, x: number, w0: number, w1: number, y0: number, hoops: readonly number[]): void {
  poly(pen, [[x - w1 / 2, 0], [x + w1 / 2, 0], [x + w0 / 2, y0], [x - w0 / 2, y0]], ONSEN.cedar)
  if (pen.lod > 1) return
  if (pen.lod === 0) strokeLines(pen, ONSEN.cedarDeep, pen.lw * 0.6, (c) => {
    for (let i = 1; i < 6; i++) {
      const f = i / 6 - 0.5
      c.moveTo(x + f * w0, y0)
      c.lineTo(x + f * w1, 0)
    }
  })
  strokeLines(pen, ONSEN.hoop, Math.abs(y0) * 0.08, (c) => {
    for (const k of hoops) {
      const w = w1 + (w0 - w1) * k
      c.moveTo(x - w / 2, y0 * k)
      c.lineTo(x + w / 2, y0 * k)
    }
  })
}

const onsen: Skin = {
  key: 'onsen',
  bg: ONSEN.sky,
  ink: ONSEN.ink,
  floor: ONSEN.stone,
  edge: ONSEN.rockLight,
  plank: ONSEN.cedar,
  fulcrum: ONSEN.rock,
  back(pen, m, _v) {
    // The mountain far off on the left, its cap of snow.
    poly(pen, [[-3.8, -0.6], [-2.1, -2.55], [-1.75, -2.25], [-1.45, -2.4], [0.2, -0.6]], ONSEN.mountain, 0)
    poly(pen, [[-2.1, -2.55], [-1.75, -2.25], [-1.45, -2.4], [-1.2, -2.12], [-1.45, -2.02], [-1.7, -2.12], [-1.95, -1.96], [-2.25, -2.12], [-2.5, -2.03]], ONSEN.cap, pen.lod <= 1 ? 0.6 : 0)
    // Rocks round the bath's edge on the left, snow on their tops.
    ellipse(pen, -2.5, -0.05, 0.6, 0.42, ONSEN.rock)
    ellipse(pen, -1.75, 0, 0.42, 0.28, ONSEN.rockLight)
    if (pen.lod <= 1) {
      ellipse(pen, -2.55, -0.4, 0.34, 0.08, ONSEN.cap, 0)
      ellipse(pen, -1.78, -0.24, 0.22, 0.05, ONSEN.cap, 0)
    }
    // The cedar bath on the right, full, and steam rising off it.
    const bx = 2.2
    tub(pen, bx, 1.4, 1.25, -0.62, [0.25, 0.8])
    ellipse(pen, bx, -0.62, 0.7, 0.09, ONSEN.cedarDeep, pen.lod <= 1 ? 0.7 : 0)
    ellipse(pen, bx, -0.6, 0.62, 0.06, ONSEN.water, 0)
    const k = 1 + 0.4 * flashOf(m, 0.9, 0.4)
    const n = pen.lod === 0 ? 5 : 3
    for (let i = 0; i < n; i++) {
      const u = (m.t * 0.18 + i / n) % 1
      const sx = bx - 0.45 + (i / n) * 0.9 + 0.15 * Math.sin(m.t * 0.7 + i * 2)
      const sy = -0.75 - u * 1.6
      ellipse(pen, sx, sy, (0.16 + u * 0.3) * k, (0.1 + u * 0.12) * k, rgba(ONSEN.steam, 0.55 * (1 - u)), 0)
    }
  },
  weight(pen) {
    // A wooden bucket, a towel folded over its rim.
    const h = WEIGHT_H
    tub(pen, 0, 0.3, 0.24, -h + 0.04, [0.2, 0.75])
    ellipse(pen, 0, -h + 0.04, 0.15, 0.03, ONSEN.cedarDeep, 0.7)
    poly(pen, [[-0.08, -h + 0.02], [0.17, -h + 0.04], [0.17, -h + 0.2], [0.12, -h + 0.2], [0.12, -h + 0.06], [-0.08, -h + 0.06]], ONSEN.towel, 0.7)
  },
}

/* ------------------------------------------------------------------ a disco */

const DISCO = {
  wall: '#2C1244',
  floor: '#3A1A50',
  tiles: ['#F05AA8', '#F2C94C', '#5AC8F0', '#A06AF0'],
  dark: '#24103A',
  ball: '#D4D8E2',
  ballDeep: '#8A90A0',
  spot: '#FFF6E0',
  gold: '#E8B84A',
  goldDeep: '#A8782A',
  ink: '#120820',
}

/** Where the mirror ball throws its spots: an angle, a reach and a size, each. */
const SPOTS: readonly [number, number, number][] = Array.from({ length: 18 }, (_, i) => [hash(i, 1, 11) * Math.PI * 2, 0.9 + hash(i, 2, 11) * 2.0, 0.035 + hash(i, 3, 11) * 0.035])

const disco: Skin = {
  key: 'disco',
  bg: DISCO.wall,
  ink: DISCO.ink,
  floor: DISCO.floor,
  plank: DISCO.gold,
  fulcrum: DISCO.tiles[3],
  back(pen, m, v) {
    // Light columns either side, their squares lighting up the column in turn.
    const step = Math.floor(m.t * 1.5)
    for (const x of [-2.2, 2.2]) {
      rect(pen, x - 0.28, -2.4, 0.56, 2.4, DISCO.dark, pen.lod <= 1 ? 0.7 : 0)
      for (let k = 0; k < 4; k++) {
        fillRects(pen, DISCO.tiles[k], (c) => {
          for (let r = 0; r < 7; r++) {
            if ((r + step + (x > 0 ? 2 : 0)) % 4 !== k) continue
            c.rect(x - 0.2, -2.32 + r * 0.33, 0.4, 0.26)
          }
        })
      }
    }
    // The mirror ball, high and turning, throwing spots of light round the room.
    const bx = 0
    const by = -2.35
    const turn = m.t * 0.35
    if (pen.lod <= 1) line(pen, bx, v.y0 - 0.1, bx, by - 0.3, DISCO.ballDeep, pen.lw)
    const f = flashOf(m, 0.9, 0.2)
    fillRects(pen, rgba(DISCO.spot, 0.45 + 0.35 * f), (c) => {
      for (let i = 0; i < SPOTS.length; i += pen.lod <= 1 ? 1 : 3) {
        const [a0, d, s] = SPOTS[i]
        const a = a0 + turn
        const x = bx + Math.cos(a) * d * 1.3
        const y = by + 0.9 + Math.sin(a) * d * 0.55
        if (y > -0.05) continue
        c.moveTo(x + s, y)
        c.arc(x, y, s, 0, Math.PI * 2)
      }
    })
    circle(pen, bx, by, 0.3, DISCO.ball)
    if (pen.lod <= 1) {
      const { ctx } = pen
      ctx.save()
      ctx.beginPath()
      ctx.arc(bx, by, 0.3, 0, Math.PI * 2)
      ctx.clip()
      strokeLines(pen, DISCO.ballDeep, pen.lw * 0.6, (c) => {
        for (const y of [-0.2, -0.1, 0, 0.1, 0.2]) {
          c.moveTo(bx - 0.3, by + y)
          c.lineTo(bx + 0.3, by + y)
        }
        for (let i = 0; i < 6; i++) {
          const x = Math.sin(turn * 2 + i * 0.52) * 0.3
          c.moveTo(bx + x, by - 0.3)
          c.lineTo(bx + x, by + 0.3)
        }
      })
      ctx.restore()
      circle(pen, bx, by, 0.3, null, 0.8)
    }
    glow(pen, bx, by, 0.7, DISCO.spot, 0.2 + 0.4 * f)
  },
  front(pen, m, v) {
    // The floor: squares lit from below, changing on the beat.
    const s = pen.lod <= 1 ? 0.4 : 0.8
    const step = Math.floor(m.t * 1.5)
    const rows = pen.lod <= 1 ? 3 : 1
    for (let k = 0; k < 4; k++) {
      fillRects(pen, DISCO.tiles[k], (c) => {
        for (let r = 0; r < rows; r++) {
          const y = 0.1 + r * 0.32
          if (y > v.y1) break
          let j = Math.floor(v.x0 / s)
          for (let x = j * s; x < v.x1; x += s, j++) {
            if (Math.floor(hash(j, r, step) * 4) !== k) continue
            c.rect(x + 0.03, y, s - 0.06, 0.26)
          }
        }
      })
    }
  },
  weight(pen) {
    // A gold platform shoe: the sole, the high heel, the strap.
    const h = WEIGHT_H
    poly(pen, [[-0.16, 0], [0.04, 0], [0.04, -0.07], [-0.02, -0.08], [-0.16, -0.08]], DISCO.goldDeep, 0.8)
    poly(pen, [[0.09, 0], [0.15, 0], [0.16, -0.24], [0.08, -0.24]], DISCO.goldDeep, 0.8)
    poly(pen, [[-0.16, -0.08], [-0.02, -0.08], [0.08, -0.22], [0.16, -0.24], [0.16, -0.3], [0.07, -0.3], [-0.05, -0.2], [-0.16, -0.18]], DISCO.gold, 0.8)
    rect(pen, 0.07, -h, 0.05, 0.08, DISCO.gold, 0.7)
    if (pen.lod === 0) fillRects(pen, DISCO.spot, (c) => {
      c.rect(-0.1, -0.15, 0.025, 0.025)
      c.rect(0.02, -0.21, 0.025, 0.025)
    })
  },
}

/* ------------------------------------------------------------------ a rock show */

const ROCK = {
  dark: '#200A0E',
  amp: '#18161A',
  grille: '#38343A',
  cone: '#4A464E',
  trim: '#C8C6CC',
  truss: '#77737C',
  can: '#2A282E',
  amber: '#F2A63A',
  stage: '#2A2226',
  edge: '#3E3438',
  sunburst: '#D88A2E',
  burst: '#6A2A12',
  ink: '#0A0608',
}

/** A stack: two cabinets and the head on top, its left edge at x. */
function stack(pen: Pen, x: number, pump: number): void {
  const w = 0.92
  for (let i = 0; i < 2; i++) {
    const y = -(i + 1) * 0.58
    rect(pen, x, y, w, 0.58, ROCK.amp, pen.lod <= 1 ? 0.7 : 0)
    rect(pen, x + 0.05, y + 0.05, w - 0.1, 0.48, ROCK.grille, 0)
    if (pen.lod === 0) fillRects(pen, ROCK.cone, (c) => {
      for (const [dx, dy] of [[0.25, 0.15], [0.67, 0.15], [0.25, 0.42], [0.67, 0.42]] as const) {
        const r = 0.11 * (1 + pump * 0.15)
        c.moveTo(x + dx + r, y + dy)
        c.arc(x + dx, y + dy, r, 0, Math.PI * 2)
      }
    })
  }
  rect(pen, x + 0.02, -1.42, w - 0.04, 0.26, ROCK.amp, pen.lod <= 1 ? 0.7 : 0)
  if (pen.lod <= 1) {
    rect(pen, x + 0.08, -1.34, w - 0.16, 0.04, ROCK.trim, 0)
    fillRects(pen, ROCK.amber, (c) => {
      for (let i = 0; i < 5; i++) c.rect(x + 0.12 + i * 0.15, -1.25, 0.04, 0.04)
    })
  }
}

const rockconcert: Skin = {
  key: 'rockconcert',
  bg: ROCK.dark,
  ink: ROCK.ink,
  floor: ROCK.stage,
  edge: ROCK.edge,
  plank: '#4A4650',
  fulcrum: ROCK.amp,
  back(pen, m, v) {
    // The light rig across the top, its cans, and one beam cutting down through the haze, swaying.
    const ty = -2.6
    const sw = 0.5 * Math.sin(m.t * 0.4)
    const f = flashOf(m, 0.9, 0.2)
    beam(pen, -0.6, ty + 0.2, 0.5 + sw, 0.05, 0.12, 1.3, ROCK.amber, 0.28 + 0.3 * f)
    fillRects(pen, ROCK.truss, (c) => {
      c.rect(v.x0 - 0.1, ty - 0.12, v.x1 - v.x0 + 0.2, 0.04)
      c.rect(v.x0 - 0.1, ty + 0.08, v.x1 - v.x0 + 0.2, 0.04)
    })
    if (pen.lod === 0) strokeLines(pen, ROCK.truss, pen.lw * 0.8, (c) => {
      for (let x = Math.floor(v.x0 / 0.3) * 0.3; x < v.x1; x += 0.3) {
        c.moveTo(x, ty - 0.1)
        c.lineTo(x + 0.15, ty + 0.1)
        c.lineTo(x + 0.3, ty - 0.1)
      }
    })
    for (const x of [-2.2, -1.4, -0.6, 0.6, 1.4, 2.2]) {
      at(pen, x, ty + 0.12, x === -0.6 ? 0.45 : x * 0.12, 1, () => {
        poly(pen, [[-0.08, 0], [0.08, 0], [0.11, 0.24], [-0.11, 0.24]], ROCK.can, pen.lod <= 1 ? 0.7 : 0)
        if (pen.lod <= 1) rect(pen, -0.1, 0.22, 0.2, 0.03, x === -0.6 ? mix(ROCK.amber, '#FFFFFF', f) : ROCK.burst, 0)
      })
    }
    // The amp stacks either side, their cones pumping on the slam.
    stack(pen, -2.7, f)
    stack(pen, 1.78, f)
  },
  weight(pen) {
    // An electric guitar standing on its stand.
    const h = WEIGHT_H
    strokeLines(pen, ROCK.trim, 0.02, (c) => {
      c.moveTo(-0.13, 0)
      c.lineTo(0, -0.12)
      c.lineTo(0.13, 0)
      c.moveTo(0, -0.12)
      c.lineTo(0, -0.02)
    })
    rect(pen, -0.018, -h + 0.03, 0.036, h - 0.15, '#3A2414', 0.6)
    poly(pen, [[-0.03, -h + 0.04], [0.03, -h + 0.04], [0.04, -h - 0.02], [-0.025, -h]], ROCK.amp, 0.6)
    const { ctx } = pen
    ctx.beginPath()
    ctx.moveTo(0.02, -0.17)
    ctx.bezierCurveTo(0.08, -0.24, 0.15, -0.2, 0.12, -0.13)
    ctx.bezierCurveTo(0.1, -0.08, 0.14, -0.04, 0.1, 0.0)
    ctx.bezierCurveTo(0.05, 0.03, -0.08, 0.03, -0.11, -0.02)
    ctx.bezierCurveTo(-0.14, -0.06, -0.1, -0.1, -0.11, -0.14)
    ctx.bezierCurveTo(-0.13, -0.2, -0.06, -0.21, -0.02, -0.17)
    ctx.closePath()
    ctx.fillStyle = ROCK.sunburst
    ctx.fill()
    inkPath(pen, 0.8)
    if (pen.lod <= 1) {
      rect(pen, -0.05, -0.08, 0.1, 0.02, ROCK.amp, 0)
      rect(pen, -0.05, -0.13, 0.1, 0.02, ROCK.amp, 0)
    }
  },
}

/* ------------------------------------------------------------------ a jazz club */

const JAZZ = {
  blue: '#1C3262',
  deep: '#14244A',
  smoke: '#B8C8E8',
  floor: '#3A2620',
  edge: '#4E342A',
  bass: '#8A4C26',
  bassDeep: '#4E2A16',
  string: '#E8DCC0',
  table: '#16182A',
  candle: '#F4E8C8',
  flame: '#F6C45A',
  brass: '#D8A440',
  brassDeep: '#9A6A20',
  ink: '#0C1222',
}

/** The bass's outline, a unit tall, its foot at 0: the lower bout, the waist, the upper bout, one side, bottom up. */
const BASS: readonly Pt[] = [[0, 0], [0.24, -0.02], [0.33, -0.12], [0.33, -0.3], [0.24, -0.42], [0.22, -0.5], [0.27, -0.6], [0.24, -0.7], [0.1, -0.76], [0, -0.77]]

const jazz: Skin = {
  key: 'jazz',
  bg: JAZZ.blue,
  ink: JAZZ.ink,
  floor: JAZZ.floor,
  edge: JAZZ.edge,
  plank: JAZZ.bassDeep,
  fulcrum: JAZZ.table,
  back(pen, m, _v) {
    // A pool of light on the bandstand, on the right.
    glow(pen, 2.1, -1.1, 1.7, JAZZ.smoke, 0.2)
    // Smoke, curling slowly up.
    if (pen.lod <= 1) strokeLines(pen, rgba(JAZZ.smoke, 0.18), 0.05, (c) => {
      for (let i = 0; i < 3; i++) {
        const x = -1.9 + i * 1.6
        const y = -1.9 - 0.3 * i + 0.1 * Math.sin(m.t * 0.3 + i)
        c.moveTo(x - 0.6, y)
        c.bezierCurveTo(x - 0.2, y - 0.3 + 0.1 * Math.sin(m.t * 0.5 + i), x + 0.2, y + 0.3, x + 0.6, y - 0.05)
      }
    })
    // The upright bass, standing on its pin, rocking a little when the plank lands.
    const sw = ring(m, 0.5, 0.5) * 0.03
    at(pen, 2.05, -0.05, sw, 1.55, () => {
      const { ctx } = pen
      rect(pen, -0.035, -1.35, 0.07, 0.62, JAZZ.bassDeep, pen.lod <= 1 ? 0.6 : 0)
      circle(pen, 0, -1.37, 0.06, JAZZ.bassDeep, pen.lod <= 1 ? 0.6 : 0)
      ctx.beginPath()
      ctx.moveTo(BASS[0][0], BASS[0][1])
      for (let i = 1; i < BASS.length; i++) ctx.lineTo(BASS[i][0], BASS[i][1])
      for (let i = BASS.length - 2; i >= 0; i--) ctx.lineTo(-BASS[i][0], BASS[i][1])
      ctx.closePath()
      ctx.fillStyle = JAZZ.bass
      ctx.fill()
      if (pen.lod <= 1) {
        ctx.strokeStyle = JAZZ.ink
        ctx.lineWidth = pen.lw / 1.55
        ctx.stroke()
        strokeLines(pen, JAZZ.string, pen.lw * 0.5, (c) => {
          for (const x of [-0.03, -0.01, 0.01, 0.03]) {
            c.moveTo(x, -0.18)
            c.lineTo(x * 0.6, -1.3)
          }
        })
        rect(pen, -0.06, -0.24, 0.12, 0.04, JAZZ.bassDeep, 0)
      }
      if (pen.lod === 0) strokeLines(pen, JAZZ.bassDeep, pen.lw * 0.8, (c) => {
        for (const s of [-1, 1]) {
          c.moveTo(s * 0.12, -0.42)
          c.quadraticCurveTo(s * 0.16, -0.32, s * 0.11, -0.24)
        }
      })
      rect(pen, -0.01, 0, 0.02, 0.05, JAZZ.ink, 0)
    })
    // A small round table at the left, a candle on it, flickering.
    const tx = -2.1
    fillRects(pen, JAZZ.table, (c) => {
      c.rect(tx - 0.03, -0.7, 0.06, 0.7)
      c.rect(tx - 0.2, -0.03, 0.4, 0.03)
      c.ellipse(tx, -0.7, 0.42, 0.06, 0, 0, Math.PI * 2)
    })
    rect(pen, tx - 0.04, -0.94, 0.08, 0.22, JAZZ.candle, pen.lod <= 1 ? 0.6 : 0)
    const fl = 1 + 0.12 * Math.sin(m.t * 11) + 0.08 * Math.sin(m.t * 17)
    ellipse(pen, tx, -1.0, 0.035, 0.06 * fl, JAZZ.flame, 0)
    glow(pen, tx, -1.0, 0.55 * fl, JAZZ.flame, 0.3)
    if (pen.lod <= 1) {
      // A glass on the table, and a chair back behind it.
      rect(pen, tx + 0.18, -0.86, 0.08, 0.13, rgba(JAZZ.smoke, 0.5), 0.5)
      strokeLines(pen, JAZZ.table, 0.05, (c) => {
        c.moveTo(tx - 0.62, 0)
        c.lineTo(tx - 0.62, -1.05)
        c.moveTo(tx - 0.62, -0.5)
        c.lineTo(tx - 0.35, -0.5)
        c.lineTo(tx - 0.35, 0)
      })
    }
  },
  weight(pen) {
    // A saxophone, standing on its bell.
    const h = WEIGHT_H
    const { ctx } = pen
    const path = (): void => {
      ctx.beginPath()
      ctx.moveTo(-0.02, -h + 0.03)
      ctx.lineTo(-0.02, -0.1)
      ctx.quadraticCurveTo(-0.02, -0.02, 0.05, -0.04)
      ctx.lineTo(0.1, -0.12)
    }
    if (pen.lod <= 1) {
      path()
      ctx.strokeStyle = pen.ink
      ctx.lineWidth = 0.07 + pen.lw * 1.6
      ctx.stroke()
    }
    path()
    ctx.strokeStyle = JAZZ.brass
    ctx.lineWidth = 0.07
    ctx.stroke()
    ellipse(pen, 0.11, -0.13, 0.065, 0.035, JAZZ.brassDeep, 0.8, -0.6)
    line(pen, -0.02, -h + 0.03, 0.06, -h - 0.0, JAZZ.brassDeep, 0.025)
    if (pen.lod === 0) fillRects(pen, JAZZ.brassDeep, (c) => {
      for (let i = 0; i < 4; i++) {
        c.moveTo(0.025, -0.14 - i * 0.04)
        c.arc(0.015, -0.14 - i * 0.04, 0.012, 0, Math.PI * 2)
      }
    })
  },
}

/* ------------------------------------------------------------------ a ballet studio */

const BALLET = {
  wall: '#F0D6D4',
  wallDeep: '#E2BEBE',
  mirror: '#D4E0E6',
  mirrorLight: '#EEF4F6',
  frame: '#C2A4A2',
  window: '#FBF6EE',
  sky: '#CDE2EE',
  mullion: '#E8D8D4',
  barre: '#B88A5A',
  bracket: '#8A8E96',
  floor: '#D9C3A2',
  board: '#C8AE88',
  satin: '#F2BDB4',
  ribbon: '#E8A8A4',
  sun: '#FFF4DA',
  ink: '#5A3E44',
}

/** A tall arched window, centred at x, its sill at y0. */
function archWindow(pen: Pen, x: number, y0: number): void {
  const w = 0.42
  const h = 1.05
  const { ctx } = pen
  ctx.beginPath()
  ctx.moveTo(x - w, y0)
  ctx.lineTo(x - w, y0 - h)
  ctx.arc(x, y0 - h, w, Math.PI, 0)
  ctx.lineTo(x + w, y0)
  ctx.closePath()
  ctx.fillStyle = BALLET.sky
  ctx.fill()
  if (pen.lod > 1) return
  inkPath(pen, 0.8)
  strokeLines(pen, BALLET.mullion, 0.035, (c) => {
    c.moveTo(x, y0)
    c.lineTo(x, y0 - h - w)
    c.moveTo(x - w, y0 - h * 0.5)
    c.lineTo(x + w, y0 - h * 0.5)
    c.moveTo(x - w, y0 - h)
    c.lineTo(x + w, y0 - h)
  })
}

const ballet: Skin = {
  key: 'ballet',
  bg: BALLET.wall,
  ink: BALLET.ink,
  floor: BALLET.floor,
  edge: BALLET.board,
  plank: BALLET.barre,
  fulcrum: BALLET.bracket,
  back(pen, m, v) {
    // Tall arched windows high on either side, and the sun slanting in from the left one.
    archWindow(pen, -2.15, -1.55)
    archWindow(pen, 2.15, -1.55)
    beam(pen, -2.15, -2.1, -0.9, 0.05, 0.7, 1.6, BALLET.sun, 0.35 + 0.05 * Math.sin(m.t * 0.6))
    // The mirror wall, panel by panel, below them.
    rect(pen, v.x0 - 0.1, -1.4, v.x1 - v.x0 + 0.2, 1.26, BALLET.mirror, 0)
    rect(pen, v.x0 - 0.1, -0.14, v.x1 - v.x0 + 0.2, 0.14, BALLET.wallDeep, 0)
    if (pen.lod <= 1) {
      strokeLines(pen, BALLET.frame, pen.lw * 1.2, (c) => {
        c.moveTo(v.x0, -1.4)
        c.lineTo(v.x1, -1.4)
        for (let x = Math.floor(v.x0 / 1.3) * 1.3 + 0.65; x < v.x1; x += 1.3) {
          c.moveTo(x, -1.4)
          c.lineTo(x, -0.14)
        }
      })
    }
    if (pen.lod === 0) strokeLines(pen, BALLET.mirrorLight, 0.05, (c) => {
      for (let x = Math.floor(v.x0 / 1.3) * 1.3 + 0.9; x < v.x1; x += 1.3) {
        c.moveTo(x, -0.5)
        c.lineTo(x + 0.3, -1.1)
        c.moveTo(x + 0.15, -0.4)
        c.lineTo(x + 0.3, -0.7)
      }
    })
    // The barre along the mirror on its brackets; it hums when the plank lands.
    const hum = ring(m, 0.12, 0.25) * 0.01
    if (pen.lod <= 1) fillRects(pen, BALLET.bracket, (c) => {
      for (let x = Math.floor(v.x0 / 1.3) * 1.3 + 0.3; x < v.x1; x += 1.3) c.rect(x - 0.02, -0.98, 0.04, 0.22)
    })
    rect(pen, v.x0 - 0.1, -1.0 + hum, v.x1 - v.x0 + 0.2, 0.05, BALLET.barre, 0)
    if (pen.lod <= 1) line(pen, v.x0, -0.95 + hum, v.x1, -0.95 + hum, BALLET.ink, pen.lw * 0.6)
  },
  front(pen, _m, v) {
    // The maple boards.
    if (pen.lod > 0) return
    strokeLines(pen, BALLET.board, pen.lw * 0.7, (c) => {
      for (let y = 0.2; y < v.y1; y += 0.14) {
        c.moveTo(v.x0, y)
        c.lineTo(v.x1, y)
      }
    })
  },
  weight(pen) {
    // A pair of pointe shoes, up on their toes, their ribbons trailing.
    const h = WEIGHT_H
    for (const x of [-0.07, 0.07]) {
      const { ctx } = pen
      ctx.beginPath()
      ctx.moveTo(x - 0.03, 0)
      ctx.lineTo(x + 0.03, 0)
      ctx.quadraticCurveTo(x + 0.07, -0.12, x + 0.06, -h * 0.8)
      ctx.quadraticCurveTo(x, -h * 0.86, x - 0.06, -h * 0.8)
      ctx.quadraticCurveTo(x - 0.07, -0.12, x - 0.03, 0)
      ctx.closePath()
      ctx.fillStyle = BALLET.satin
      ctx.fill()
      inkPath(pen, 0.8)
    }
    if (pen.lod <= 1) strokeLines(pen, BALLET.ribbon, 0.018, (c) => {
      c.moveTo(-0.08, -h * 0.78)
      c.quadraticCurveTo(-0.16, -h * 0.95, -0.04, -h)
      c.moveTo(0.08, -h * 0.78)
      c.quadraticCurveTo(0.18, -h * 0.92, 0.14, -h * 0.5)
    })
  },
}

/* ------------------------------------------------------------------ the table */

export const PLAY_SKINS = { arcade, funfair, icerink, tennis, golf, boxing, pool, onsen, disco, rockconcert, jazz, ballet } as const satisfies Record<string, Skin>
