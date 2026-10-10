import type { Pt } from '../../../../../parts'
import { hash, knock, smooth } from '../kit'
import { BEATS, WIN, level } from '../music'
import { ctxOf, ellipse, flash, glint, glow, line, mix, path, rect, rgba, ring, shape, vgrad, type Pen } from '../pen'
import {
  armAngle,
  BAT_STRIKE,
  BELL,
  BOARD,
  BOARD_TOP,
  CAPS,
  carryHand,
  CM,
  ENDO_STEPS,
  endoBat,
  endoFace,
  endoLean,
  endoSquat,
  endoX,
  FLASH_IN,
  FLASH_WIN,
  FLOOR,
  GI,
  houseLight,
  IN_PAN,
  JUDGE,
  LAMP,
  LIGHTS_DOWN,
  NET_TOP,
  NET_X,
  PICK,
  PIVOT,
  SECTIONS,
  SERVE,
  SET,
  STEP1,
  T1,
  TURN,
  TOP,
  XL,
  XR,
} from './geo'

/**
 * Tokyo: one table under a hard white lamp in a packed arena. The stands rise into the dark in dark blues and
 * browns, the GIs' olive in one block of them; red-and-white bunting and paper lanterns; the judge's table. The table's
 * green is the darkest, richest thing in the light; everything else is the crowd, which the house lights find and
 * lose.
 */

export const C = {
  roof: '#06070A',
  roofHi: '#11131A',
  dark: '#07080B',
  riser: '#2A2622',
  riserHi: '#5A4C3E',
  wall: '#5E1A1A',
  wallHi: '#8C2A24',
  rail: '#C9C1B0',
  floorFar: '#3A2A1E',
  floorFarHi: '#6A4A30',
  floorNear: '#1A130E',
  board: '#1D3A2B',
  boardHi: '#2C5640',
  table: '#1C4A34',
  tableTop: '#245C40',
  tableEdge: '#123224',
  line: '#EDEBE2',
  leg: '#15171A',
  lamp: '#F6F4EC',
  lampShade: '#22362B',
  red: '#B8322A',
  redHi: '#D8483A',
  white: '#E6DFD0',
  olive: '#55603A',
  oliveDark: '#3B4428',
  skin: '#C99A72',
  skinDark: '#8A6448',
  hair: '#121010',
  shirt: '#E6E0D2',
  shirtShade: '#B9B2A2',
  trousers: '#1B2133',
  shoe: '#0D0D0E',
  sponge: '#ECDDB0',
  spongeEdge: '#BFA978',
  handle: '#8A6440',
  rubber: '#B3201B',
  rubberHi: '#D8392E',
  iron: '#2A2C30',
  ironHi: '#6E7278',
  brass: '#C9A04A',
  cloth: '#E9E3D6',
  suit: '#1E1F24',
  card: '#1A1A1C',
}

const CLOTHES = ['#1E2840', '#2A3350', '#3B2A22', '#4A3526', '#252A33', '#55432F', '#33405E', '#2C2420', '#B9B2A4']

const ctxRot = (pen: Pen, c: Pt, ang: number, fn: () => void): void => {
  const { p, k } = pen
  p.push()
  p.translate(c[0] * k, c[1] * k)
  p.rotate(ang)
  p.translate(-c[0] * k, -c[1] * k)
  fn()
  p.pop()
}

/* ------------------------------------------------------------------ the crowd's mood */

const HARD = BEATS.filter((b) => b.bar >= 85 && b.bar <= 88 && b.s >= 0.4).map((b) => b.t)
const ERUPT = BEATS.filter((b) => b.bar >= 89 && b.bar <= 90).map((b) => b.t)

/** How far the crowd is up off its seats, 0 to 1. */
function risen(t: number): number {
  return smooth(t, WIN, WIN + 0.25) * (1 - smooth(t, TURN - 0.3, TURN + 2.2))
}
/** The surge on the rally's hard beats, and the eruption's. */
function surge(t: number): number {
  let v = 0
  for (const h of HARD) v = Math.max(v, knock(t - h, 0.16))
  for (const h of ERUPT) v = Math.max(v, knock(t - h, 0.22))
  return v
}

function sectionOf(x: number): number {
  for (let i = 0; i < SECTIONS.length - 1; i++) if (x < SECTIONS[i + 1]) return i
  return SECTIONS.length - 2
}
const lit = (i: number, t: number): number => Math.max(0, Math.min(1.25, houseLight(Math.max(0, Math.min(7, i)), t)))
/** The lamp's spill off the table, onto the nearest of the crowd and the floor. */
const spill = (x: number, y: number): number => 0.3 * Math.exp(-(((x - NET_X) / 4.2) ** 2) - (((y - 0.5) / 1.8) ** 2))

/* ------------------------------------------------------------------ the arena (the set) */

export function drawArena(pen: Pen, t: number, f: { x0: number; y0: number; x1: number; y1: number }): void {
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  vgrad(pen, x0, f.y0 - 1, x1, f.y1 + 1, [
    [0, C.roof, 1],
    [0.6, C.roofHi, 1],
    [1, C.roof, 1],
  ])
  // The house lights' banks up in the roof, and the haze they throw down over their sections.
  for (let i = 0; i < SECTIONS.length - 1; i++) {
    const a = SECTIONS[i]
    const b = SECTIONS[i + 1]
    if (b < x0 || a > x1) continue
    const L = Math.min(1, lit(i, t))
    if (L > 0.01) {
      vgrad(pen, a, -11, b, 0.4, [
        [0, '#E8E4D8', 0.1 * L],
        [0.7, '#E8E4D8', 0.035 * L],
        [1, '#E8E4D8', 0],
      ])
    }
    for (let j = 0; j < 4; j++) {
      const lx = a + ((b - a) * (j + 0.5)) / 4
      rect(pen, lx - 0.35, -10.15, lx + 0.35, -9.9, C.iron)
      rect(pen, lx - 0.3, -9.92, lx + 0.3, -9.84, mix('#3A3A3A', C.lamp, Math.min(1, lit(i, t))))
      glow(pen, [lx, -9.8], 1.4, C.lamp, 0.35 * Math.min(1, lit(i, t)))
    }
  }
  drawLanterns(pen, t, x0, x1, -6.6, 1.2, 0)
  drawStands(pen, t, f)
  drawCaps(pen, t)
  drawLanterns(pen, t, x0, x1, -4.3, 0.75, 1)
  // The front of the stands: a red wall with a pale rail, the bunting along it.
  const W0 = 0.3
  const W1 = 0.66
  for (let i = 0; i < SECTIONS.length - 1; i++) {
    const a = Math.max(SECTIONS[i], x0)
    const b = Math.min(SECTIONS[i + 1], x1)
    if (b <= a) continue
    const L = Math.min(1, lit(i, t)) * 0.75 + spill((a + b) / 2, 0.4) * 0.6
    rect(pen, a, W0, b, W1, mix(C.dark, C.wall, 0.25 + 0.75 * L))
    rect(pen, a, W0 - 0.05, b, W0 + 0.02, mix(C.dark, C.rail, 0.15 + 0.7 * L))
  }
  bunting(pen, t, x0, x1, W0 + 0.02, 1.1, 0.16)
  // The court's floor going back to the stands, and the near floor.
  for (let i = 0; i < SECTIONS.length - 1; i++) {
    const a = Math.max(SECTIONS[i], x0)
    const b = Math.min(SECTIONS[i + 1], x1)
    if (b <= a) continue
    const L = Math.min(1, lit(i, t)) * 0.45
    vgrad(pen, a, W1, b, FLOOR, [
      [0, mix(C.dark, C.floorFar, 0.35 + 0.65 * L), 1],
      [1, mix(C.dark, C.floorFarHi, 0.3 + 0.6 * L), 1],
    ])
  }
  for (let x = Math.ceil(x0 / 1.4) * 1.4; x < x1; x += 1.4) line(pen, [x, W1], [x + (x - NET_X) * 0.06, FLOOR], mix(C.dark, C.floorFar, 0.6), 0.35)
  glow(pen, [NET_X, FLOOR - 0.15], 4.2, C.lamp, 0.16)
  rect(pen, x0, FLOOR, x1, f.y1 + 1, C.floorNear)
  vgrad(pen, x0, FLOOR, x1, FLOOR + 1.2, [
    [0, '#3A2A1E', 1],
    [1, C.floorNear, 1],
  ])
  glow(pen, [NET_X, FLOOR + 0.05], 3.6, C.lamp, 0.12)
  drawJudges(pen, t)
  drawBoard(pen, t)
  // Flash bulbs in the stands: one as he comes in, and the arena's as it erupts.
  for (const [i, ft] of [FLASH_IN, ...FLASH_WIN].entries()) {
    const u = t - ft
    if (u < 0 || u > 0.6) continue
    const pos: Pt = i === 0 ? [1.3, -1.05] : [-3 + 12.5 * hash(i + 3, 71), -5.4 + 5 * hash(i + 3, 72)]
    const a = flash(u, 0.12)
    glow(pen, pos, 2.2, C.lamp, 0.35 * a)
    glow(pen, pos, 0.4, '#FFFFFF', a)
  }
}

/** A string of paper lanterns across the arena, sagging between its posts. */
function drawLanterns(pen: Pen, t: number, x0: number, x1: number, y: number, sc: number, s: number): void {
  const span = 4.4 * sc
  const L = Math.min(1, lit(3, t))
  for (let a = Math.floor(x0 / span) * span; a < x1; a += span) {
    const sag = (u: number) => y + 0.5 * sc * 4 * u * (1 - u)
    const pts: Pt[] = []
    for (let j = 0; j <= 12; j++) pts.push([a + (span * j) / 12, sag(j / 12)])
    path(pen, pts, '#2A2522', 0.5)
    for (let j = 1; j < 4; j++) {
      const u = j / 4
      const lx = a + span * u
      const sway = 0.03 * Math.sin(t * 1.3 + a + j)
      const ly = sag(u) + 0.12 * sc
      const red = (Math.round(a / span) + j + s) % 2 === 0
      const col = red ? C.red : C.white
      line(pen, [lx, sag(u)], [lx + sway, ly], '#2A2522', 0.4)
      glow(pen, [lx + sway, ly + 0.2 * sc], 0.7 * sc, red ? '#FF7A50' : '#FFE8C0', 0.08 + 0.16 * L)
      ellipse(pen, [lx + sway, ly + 0.2 * sc], 0.2 * sc, 0.25 * sc, mix(C.dark, col, 0.32 + 0.6 * L))
      for (const dy of [-0.08, 0, 0.08]) line(pen, [lx + sway - 0.19 * sc * Math.sqrt(1 - (dy / 0.25) ** 2), ly + (0.2 + dy) * sc], [lx + sway + 0.19 * sc * Math.sqrt(1 - (dy / 0.25) ** 2), ly + (0.2 + dy) * sc], mix(C.dark, col, 0.35), 0.3)
      rect(pen, lx + sway - 0.08 * sc, ly - 0.04 * sc, lx + sway + 0.08 * sc, ly + 0.0, '#1A1614')
      rect(pen, lx + sway - 0.08 * sc, ly + 0.43 * sc, lx + sway + 0.08 * sc, ly + 0.47 * sc, '#1A1614')
    }
  }
  bunting(pen, t, x0, x1, y + 0.05, span / 6, 0.14 * sc)
}

/** Red and white pennants on a line. */
function bunting(pen: Pen, t: number, x0: number, x1: number, y: number, step: number, h: number): void {
  const L = 0.4 + 0.6 * Math.min(1, lit(3, t))
  let n = Math.floor(x0 / step)
  for (let x = n * step; x < x1; x += step, n++) {
    const wob = 0.02 * Math.sin(t * 2 + n)
    const col = n % 2 === 0 ? C.red : C.white
    shape(pen, [[x + 0.02, y], [x + step - 0.02, y], [x + step / 2 + wob, y + h * 1.6]], mix(C.dark, col, 0.35 + 0.55 * L))
  }
  line(pen, [x0, y], [x1, y], '#2A2522', 0.4)
}

/** The tiers, rising into the dark, and everyone on them. */
function drawStands(pen: Pen, t: number, f: { x0: number; y0: number; x1: number; y1: number }): void {
  const ROW = 0.56
  const SEAT = 0.4
  const up = risen(t)
  const sg = surge(t)
  const lv = level(t)
  const ctx = ctxOf(pen.p)
  const k = pen.k
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineWidth = pen.w * 1.6
  for (let r = 24; r >= 0; r--) {
    const y = 0.3 - r * ROW
    if (y < f.y0 - 0.6 || y - ROW > f.y1) continue
    const fade = Math.exp(-r / 10)
    // The riser of this row, section by section.
    for (let i = 0; i < SECTIONS.length - 1; i++) {
      const a = Math.max(SECTIONS[i], f.x0 - 1)
      const b = Math.min(SECTIONS[i + 1], f.x1 + 1)
      if (b <= a) continue
      const L = Math.min(1, lit(i, t)) * fade * 0.7 + spill((a + b) / 2, y) * fade
      rect(pen, a, y - ROW, b, y, mix(C.dark, C.riser, 0.12 + 0.8 * L))
      rect(pen, a, y - 0.06, b, y, mix(C.dark, C.riserHi, 0.2 + 0.8 * L))
    }
    // The aisles between sections.
    for (const a of SECTIONS) if (a > f.x0 - 1 && a < f.x1 + 1) rect(pen, a - 0.12, y - ROW, a + 0.12, y, C.dark)
    // The people.
    for (let j = Math.floor((f.x0 - 1) / SEAT); j * SEAT < f.x1 + 1; j++) {
      const hx = j * SEAT + (hash(j, r, 3) - 0.5) * 0.12
      const sec = sectionOf(hx)
      if (SECTIONS.some((a) => Math.abs(hx - a) < 0.22)) continue
      if (hash(j, r, 5) < 0.06) continue
      const gi = hx > GI[0] && hx < GI[1] && r < GI[2] && hash(j, r, 9) < 0.86
      const L = Math.min(1.15, lit(sec, t)) * fade * 0.68 + spill(hx, y) * fade
      const tone = (c: string) => mix(C.dark, c, 0.05 + 0.85 * Math.min(1, L))
      // Up: the GIs from the first serve, everyone at the smash; the surges on the beats.
      const stand = gi ? Math.max(smooth(t, SERVE - 0.3, SERVE + 0.2) * (1 - smooth(t, TURN, TURN + 3)), up) : up
      const ph = hash(j, r, 7)
      const bob = (0.05 * sg * (0.5 + ph) + 0.03 * lv * Math.sin(t * 7 + ph * 6)) * (stand > 0.3 || gi ? 1 : 0.5)
      const yy = y - 0.12 - stand * 0.22 - bob
      const body = gi ? C.olive : CLOTHES[Math.floor(hash(j, r, 11) * CLOTHES.length)]
      // Arms up, cheering, when they are up.
      if ((up > 0.3 && ph > 0.4) || (gi && stand > 0.3 && (up > 0.3 || sg * (0.4 + ph) > 0.35))) {
        const wave = Math.sin(t * 9 + ph * 12) * 0.06
        const ax = ph > 0.7 ? 1 : -1
        ctx.strokeStyle = pen.tone(tone(body))
        ctx.beginPath()
        ctx.moveTo((hx + ax * 0.12) * k, (yy - 0.18) * k)
        ctx.lineTo((hx + ax * 0.2 + wave) * k, (yy - 0.62 - 0.08 * sg) * k)
        if (ph > 0.75 || gi) {
          ctx.moveTo((hx - ax * 0.12) * k, (yy - 0.18) * k)
          ctx.lineTo((hx - ax * 0.16 - wave) * k, (yy - 0.58) * k)
        }
        ctx.stroke()
      }
      // The crowd is a thousand people: drawn straight onto the canvas, not through p5's shapes.
      ctx.fillStyle = pen.tone(tone(body))
      ctx.beginPath()
      ctx.moveTo((hx - 0.16) * k, yy * k)
      ctx.lineTo((hx - 0.15) * k, (yy - 0.2) * k)
      ctx.lineTo((hx - 0.08) * k, (yy - 0.26) * k)
      ctx.lineTo((hx + 0.08) * k, (yy - 0.26) * k)
      ctx.lineTo((hx + 0.15) * k, (yy - 0.2) * k)
      ctx.lineTo((hx + 0.16) * k, yy * k)
      ctx.fill()
      const head: Pt = [hx, yy - 0.36]
      ctx.fillStyle = pen.tone(tone(hash(j, r, 13) > 0.2 ? C.skin : C.skinDark))
      ctx.beginPath()
      ctx.ellipse(head[0] * k, head[1] * k, 0.095 * k, 0.105 * k, 0, 0, Math.PI * 2)
      ctx.fill()
      if (gi && !capUp(j, r, t)) {
        // The garrison cap, unless it is in the air.
        ctx.fillStyle = pen.tone(tone(C.oliveDark))
        ctx.beginPath()
        ctx.moveTo((head[0] - 0.1) * k, (head[1] - 0.05) * k)
        ctx.lineTo((head[0] + 0.1) * k, (head[1] - 0.06) * k)
        ctx.lineTo((head[0] + 0.07) * k, (head[1] - 0.13) * k)
        ctx.lineTo((head[0] - 0.09) * k, (head[1] - 0.11) * k)
        ctx.fill()
      } else {
        ctx.fillStyle = pen.tone(tone(C.hair))
        ctx.beginPath()
        ctx.ellipse(head[0] * k, (head[1] - (gi ? 0.06 : 0.05)) * k, 0.095 * k, (gi ? 0.06 : 0.065) * k, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  ctx.restore()
}

/** Which GIs throw their caps, and when. */
function capThrow(j: number, r: number): number | null {
  if (r > 4) return null
  const h = hash(j, r, 17)
  if (h > 0.5) return null
  return CAPS[Math.floor(h * 8) % CAPS.length]
}
function capUp(j: number, r: number, t: number): boolean {
  const c = capThrow(j, r)
  return c !== null && t >= c
}

/** The caps in the air: up off the GIs' heads, turning, and down somewhere among them. */
function drawCaps(pen: Pen, t: number): void {
  if (t < WIN || t > WIN + 6) return
  const ROW = 0.56
  const SEAT = 0.4
  for (let r = 0; r <= 4; r++) {
    for (let j = Math.floor(GI[0] / SEAT); j * SEAT < GI[1]; j++) {
      const c = capThrow(j, r)
      if (c === null || t < c) continue
      const u = t - c
      const hx = j * SEAT + (hash(j, r, 3) - 0.5) * 0.12
      const y0 = 0.3 - r * ROW - 0.12 - 0.22 - 0.42
      const vy = -5.2 - 1.6 * hash(j, r, 19)
      const vx = (hash(j, r, 21) - 0.5) * 1.6
      const yy = y0 + vy * u + 6 * u * u
      if (u > 0.4 && yy > y0 + 0.2) continue
      const pos: Pt = [hx + vx * u, yy]
      ctxRot(pen, pos, u * (6 + 6 * hash(j, r, 23)), () => {
        shape(pen, [[pos[0] - 0.13, pos[1] + 0.03], [pos[0] + 0.13, pos[1] + 0.02], [pos[0] + 0.09, pos[1] - 0.07], [pos[0] - 0.11, pos[1] - 0.05]], C.oliveDark)
      })
    }
  }
}

/** The judges' table on the floor: a cloth, two judges, the flip-cards (bars, no figures), the bell. */
function drawJudges(pen: Pen, t: number): void {
  const [a, b] = JUDGE
  const top = FLOOR - 0.95
  const L = Math.min(1, lit(2, t)) * 0.6 + 0.35
  const tone = (c: string) => mix(C.dark, c, L)
  // The judges behind it, seated.
  for (const [jx, s] of [[a + 0.5, 0], [b - 0.55, 1]] as const) {
    const lean = s === 0 ? 0 : 0.04 * Math.sin(t * 0.8)
    shape(pen, [[jx - 0.28, top], [jx - 0.25, top - 0.72], [jx - 0.12, top - 0.84], [jx + 0.12, top - 0.84], [jx + 0.25, top - 0.72], [jx + 0.28, top]], tone(C.suit))
    shape(pen, [[jx - 0.05, top - 0.84], [jx + 0.05, top - 0.84], [jx, top - 0.62]], tone(C.cloth))
    ellipse(pen, [jx + lean, top - 1.07], 0.17, 0.2, tone(C.skin))
    ellipse(pen, [jx + lean, top - 1.17], 0.17, 0.11, tone(C.hair))
  }
  // The cloth, with its red skirt band.
  rect(pen, a - 0.1, top, b + 0.1, FLOOR - 0.12, tone(C.cloth))
  rect(pen, a - 0.1, FLOOR - 0.42, b + 0.1, FLOOR - 0.22, tone(C.red))
  rect(pen, a - 0.1, top, b + 0.1, top + 0.05, tone('#FFFFFF'))
  for (let x = a + 0.1; x < b; x += 0.32) line(pen, [x, top + 0.08], [x + 0.02, FLOOR - 0.13], mix(C.dark, C.cloth, L * 0.8), 0.4)
  rect(pen, a - 0.05, FLOOR - 0.12, a + 0.05, FLOOR, tone(C.leg))
  rect(pen, b - 0.05, FLOOR - 0.12, b + 0.05, FLOOR, tone(C.leg))
  // The flip-cards: Endo's on the left, Marty's on the right, bars for points.
  const cx = (a + b) / 2
  shape(pen, [[cx - 0.4, top], [cx - 0.33, top - 0.55], [cx + 0.33, top - 0.55], [cx + 0.4, top]], tone(C.iron))
  for (const [side, n] of [[-1, 10], [1, t >= WIN ? 11 : 10]] as const) {
    const x0c = cx + (side < 0 ? -0.31 : 0.03)
    rect(pen, x0c, top - 0.5, x0c + 0.28, top - 0.05, tone(C.card))
    for (let q = 0; q < n; q++) {
      const col = q % 6
      const row = Math.floor(q / 6)
      const fresh = side > 0 && q === 10 ? flash(t - WIN, 0.4) : 0
      rect(pen, x0c + 0.035 + col * 0.04, top - 0.44 + row * 0.2, x0c + 0.06 + col * 0.04, top - 0.28 + row * 0.2, mix(C.dark, fresh > 0 ? mix(C.white, C.redHi, fresh) : C.white, L))
    }
  }
  // The bell, rung for the exhibition.
  const swing = 0.45 * ring(t - BELL, 3, 0.35)
  const bx = b - 0.12
  ctxRot(pen, [bx, top - 0.3], swing, () => {
    rect(pen, bx - 0.025, top - 0.42, bx + 0.025, top - 0.2, tone(C.handle))
    shape(pen, [[bx - 0.14, top], [bx - 0.1, top - 0.14], [bx - 0.06, top - 0.2], [bx + 0.06, top - 0.2], [bx + 0.1, top - 0.14], [bx + 0.14, top]], tone(C.brass))
  })
  glint(pen, [bx + 0.05, top - 0.12], 0.14, '#FFF4D0', 0.9 * flash(t - BELL, 0.25))
}

/** The barrier boards behind Endo, which the smash hits. */
function drawBoard(pen: Pen, t: number): void {
  const [a, b] = BOARD
  const L = Math.min(1, lit(5, t)) * 0.6 + 0.3
  const hit = ring(t - 190.451, 9, 0.18)
  shape(pen, [[a + hit * 0.03, BOARD_TOP], [b + 0.18, BOARD_TOP - 0.22], [b + 0.18, FLOOR - 0.2], [a, FLOOR]], mix(C.dark, C.board, L))
  shape(pen, [[a + hit * 0.03, BOARD_TOP], [b, BOARD_TOP - 0.04], [b, FLOOR], [a, FLOOR]], mix(C.dark, C.boardHi, L))
  rect(pen, a - 0.08, FLOOR - 0.04, b + 0.25, FLOOR, C.leg)
}

/* ------------------------------------------------------------------ the match (the part) */

/** The lamp over the table: its cord, its shade, and its hard cone of white light on the green. */
export function drawLamp(pen: Pen, t: number): void {
  const [lx, ly] = LAMP
  const k = pen.k
  const ctx = ctxOf(pen.p)
  // The cone.
  const g = ctx.createLinearGradient(0, (ly + 0.2) * k, 0, TOP * k)
  g.addColorStop(0, rgba(pen, C.lamp, 0.22))
  g.addColorStop(1, rgba(pen, C.lamp, 0.05))
  ctx.save()
  ctx.beginPath()
  ctx.moveTo((lx - 0.3) * k, (ly + 0.22) * k)
  ctx.lineTo((lx + 0.3) * k, (ly + 0.22) * k)
  ctx.lineTo((XR + 0.6) * k, TOP * k)
  ctx.lineTo((XL - 0.6) * k, TOP * k)
  ctx.closePath()
  ctx.fillStyle = g
  ctx.fill()
  ctx.restore()
  line(pen, [lx, ly - 12], [lx, ly - 0.2], '#0E0F12', 0.9)
  shape(pen, [[lx - 0.08, ly - 0.22], [lx + 0.08, ly - 0.22], [lx + 0.42, ly + 0.22], [lx - 0.42, ly + 0.22]], C.lampShade, 0.4, '#0A0B0C')
  rect(pen, lx - 0.42, ly + 0.19, lx + 0.42, ly + 0.24, '#E8E6DE')
  glow(pen, [lx, ly + 0.25], 1.0, C.lamp, 0.55)
  ellipse(pen, [lx, ly + 0.23], 0.16, 0.07, '#FFFFFF')
  void t
}

/** The table: the trestle legs, the slab, the green top with its white lines, the net. */
export function drawTable(pen: Pen, t: number): void {
  // Legs and their cross rail.
  for (const x of [XL + 0.35, XR - 0.35]) {
    rect(pen, x - 0.05, TOP + 0.08, x + 0.05, FLOOR, C.leg)
    rect(pen, x - 0.28, FLOOR - 0.04, x + 0.28, FLOOR, C.leg)
  }
  for (const x of [NET_X - 0.4, NET_X + 0.4]) rect(pen, x - 0.04, TOP + 0.08, x + 0.04, FLOOR, C.leg)
  rect(pen, XL + 0.35, FLOOR - 0.6, XR - 0.35, FLOOR - 0.54, C.leg)
  // The top seen a little from above (the ball sits on its near half), the slab's edge.
  const T0y = TOP - 0.16
  shape(pen, [[XL + 0.06, T0y], [XR - 0.06, T0y], [XR, TOP], [XL, TOP]], C.tableTop)
  glow(pen, [NET_X, TOP - 0.05], 3.1, C.lamp, 0.22)
  rect(pen, XL, TOP, XR, TOP + 0.09, C.table)
  rect(pen, XL, TOP + 0.07, XR, TOP + 0.09, C.tableEdge)
  // The lines: the edge, both end lines, the centre line.
  line(pen, [XL, TOP], [XR, TOP], C.line, 0.8)
  line(pen, [XL + 0.06, T0y], [XR - 0.06, T0y], mix(C.tableTop, C.line, 0.6), 0.5)
  line(pen, [XL, TOP], [XL + 0.06, T0y], C.line, 0.9)
  line(pen, [XR, TOP], [XR - 0.06, T0y], C.line, 0.9)
  line(pen, [XL + 0.03, (TOP + T0y) / 2], [XR - 0.03, (TOP + T0y) / 2], mix(C.tableTop, C.line, 0.75), 0.4)
  // The net: its posts at the near edge and the mesh, edge-on, a little turned.
  const nx = NET_X
  rect(pen, nx - 0.05, NET_TOP, nx + 0.05, TOP, '#0E1A14')
  for (let y = NET_TOP + 0.05; y < TOP; y += 0.06) line(pen, [nx - 0.05, y], [nx + 0.05, y - 0.02], '#3A4A42', 0.3)
  line(pen, [nx - 0.06, NET_TOP], [nx + 0.06, NET_TOP - 0.03], C.line, 1.1)
  rect(pen, nx - 0.02, NET_TOP - 0.04, nx + 0.02, TOP + 0.09, '#9A9C98')
  void t
}

/** Marty's own bat: a red-rubber bat on a sprung, hinged arm clamped to his end; the pan he serves from. */
export function drawSprungBat(pen: Pen, t: number): void {
  const φ = armAngle(t)
  const v: Pt = [BAT_STRIKE[0] - PIVOT[0], BAT_STRIKE[1] - PIVOT[1]]
  const len = Math.hypot(v[0], v[1])
  const a0 = Math.atan2(v[1], v[0])
  const a = a0 + φ
  const tip: Pt = [PIVOT[0] + Math.cos(a) * len, PIVOT[1] + Math.sin(a) * len]
  const mid: Pt = [PIVOT[0] + Math.cos(a) * len * 0.45, PIVOT[1] + Math.sin(a) * len * 0.45]
  // The clamp on the table's end and its bracket down to the pivot.
  rect(pen, XL - 0.1, TOP - 0.06, XL + 0.12, TOP - 0.01, C.iron)
  rect(pen, XL - 0.1, TOP + 0.1, XL + 0.12, TOP + 0.15, C.iron)
  rect(pen, XL - 0.1, TOP - 0.06, XL - 0.05, PIVOT[1] + 0.05, C.iron)
  line(pen, [XL - 0.08, PIVOT[1]], [PIVOT[0], PIVOT[1]], C.iron, 1.6)
  // The spring from the bracket to the arm: coils that stretch as it cocks.
  const s0: Pt = [XL - 0.07, TOP + 0.02]
  const pts: Pt[] = []
  const n = 9
  const dx = mid[0] - s0[0]
  const dy = mid[1] - s0[1]
  const dl = Math.hypot(dx, dy) || 1
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const w = i === 0 || i === n ? 0 : (i % 2 ? 1 : -1) * 0.06
    pts.push([s0[0] + dx * u - (dy / dl) * w, s0[1] + dy * u + (dx / dl) * w])
  }
  path(pen, pts, C.ironHi, 0.8)
  // The pan, on its little lever: it dips under him while he waits to serve.
  const dip = t >= IN_PAN && t < SERVE ? 0.05 + 0.03 * ring(t - IN_PAN, 7, 0.15) : 0.02 * ring(t - SERVE, 9, 0.12)
  const pan: Pt = [CM[0], CM[1] + 0.135 + dip]
  line(pen, [XL - 0.06, TOP - 0.02], [pan[0] + 0.05, pan[1] + 0.03], C.iron, 0.9)
  shape(pen, [[pan[0] - 0.12, pan[1] - 0.04], [pan[0] + 0.12, pan[1] - 0.04], [pan[0] + 0.08, pan[1] + 0.03], [pan[0] - 0.08, pan[1] + 0.03]], C.brass, 0.3, '#5A4520')
  // The arm and the bat.
  line(pen, PIVOT, tip, C.iron, 2.0)
  line(pen, PIVOT, tip, C.ironHi, 0.5)
  ellipse(pen, PIVOT, 0.06, 0.06, C.ironHi)
  ctxRot(pen, tip, a + Math.PI / 2, () => {
    ellipse(pen, tip, 0.12, 0.235, '#4A2A18')
    ellipse(pen, [tip[0] + 0.025, tip[1]], 0.1, 0.225, C.rubber)
    ellipse(pen, [tip[0] + 0.04, tip[1] - 0.06], 0.035, 0.09, C.rubberHi)
  })
  // On the smash, a crack of light off the rubber.
  glint(pen, [CM[0] - 0.05, CM[1]], 0.35, '#FFFFFF', flash(t - WIN, 0.09))
}

/* ------------------------------------------------------------------ Endo */

function ik(a: Pt, b: Pt, l1: number, l2: number, bend: number): Pt {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 1e-3)
  const ang = Math.atan2(dy, dx)
  const c = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d || 1)))
  const off = Math.acos(c) * bend
  return [a[0] + Math.cos(ang + off) * l1, a[1] + Math.sin(ang + off) * l1]
}

export interface EndoPose {
  hip: Pt
  shoulder: Pt
  head: Pt
  face: number
}

export function endoPose(t: number): EndoPose {
  const x = endoX(t)
  const face = endoFace(t)
  const lean = endoLean(t)
  const q = endoSquat(t)
  const hip: Pt = [x - face * 0.08 * q, FLOOR - 1.55 + 0.85 * q]
  const dir: Pt = [face * Math.sin(lean), -Math.cos(lean)]
  return { hip, shoulder: [hip[0] + dir[0] * 1.0, hip[1] + dir[1] * 1.0], head: [hip[0] + dir[0] * 1.38, hip[1] + dir[1] * 1.38], face }
}

/** His free hand: at his side, or reaching down for the ball, carrying it, and letting it go. */
export function endoFreeHand(t: number, pose: EndoPose): Pt {
  const hang: Pt = [pose.shoulder[0] - pose.face * 0.05, pose.shoulder[1] + 1.1]
  if (t >= PICK && t <= SET) return carryHand(t)
  if (t > STEP1 && t < PICK) {
    const u = smooth(t, STEP1, PICK)
    const c = carryHand(PICK)
    return [hang[0] + (c[0] - hang[0]) * u, hang[1] + (c[1] - hang[1]) * u]
  }
  if (t > SET && t < SET + 0.4) {
    const u = smooth(t, SET, SET + 0.4)
    const c = carryHand(SET)
    return [c[0] + (hang[0] - c[0]) * u, c[1] + (hang[1] - c[1]) * u]
  }
  return hang
}

export function drawEndo(pen: Pen, t: number): void {
  if (t > T1 + 0.5) return
  const pose = endoPose(t)
  const { hip, shoulder, head, face } = pose
  const x = endoX(t)
  // Feet: a stance, and a lift on each step.
  const lift = (i: number) => {
    let v = 0
    ENDO_STEPS.forEach((s, j) => {
      if (j % 2 !== i) return
      const u = (t - (s - 0.28)) / 0.28
      if (u > 0 && u < 1) v = Math.max(v, Math.sin(Math.PI * u) * 0.14)
    })
    return v
  }
  const q = endoSquat(t)
  const lunge = smooth(t, 189.9, 190.08) * (1 - smooth(t, 190.3, 191.0))
  const feet: Pt[] = [
    [x - face * (0.22 + 0.1 * q), FLOOR - lift(0)],
    [x + face * (0.24 + 0.12 * q + 0.35 * lunge), FLOOR - lift(1)],
  ]
  const lh = Math.min(1, Math.max(lit(4, t), lit(5, t)))
  const near = Math.exp(-(((x - NET_X) / 3.6) ** 2))
  const light = 0.2 + 0.8 * Math.max(lh * 0.85, near)
  const tone = (c: string, f = 1) => mix(C.dark, c, 0.78 * light * f)
  // The far leg and arm first, darker.
  const legs = feet.map((ft) => ({ ft, knee: ik(hip, [ft[0], ft[1] - 0.06], 0.82, 0.8, face > 0 ? -1 : 1) }))
  const leg = (l: { ft: Pt; knee: Pt }, f: number) => {
    line(pen, hip, l.knee, tone(C.trousers, f), 5.2)
    line(pen, l.knee, [l.ft[0], l.ft[1] - 0.08], tone(C.trousers, f), 4.6)
    shape(pen, [[l.ft[0] - 0.1 * face, l.ft[1] - 0.1], [l.ft[0] + 0.2 * face, l.ft[1] - 0.06], [l.ft[0] + 0.22 * face, l.ft[1]], [l.ft[0] - 0.1 * face, l.ft[1]]], C.shoe)
  }
  leg(legs[0], 0.8)
  const free = endoFreeHand(t, pose)
  const fElbow = ik(shoulder, free, 0.6, 0.6, face > 0 ? 1 : -1)
  line(pen, shoulder, fElbow, tone(C.shirtShade, 0.9), 3.6)
  line(pen, fElbow, free, tone(C.skin, 0.9), 2.8)
  ellipse(pen, free, 0.06, 0.06, tone(C.skin, 0.9))
  leg(legs[1], 1)
  // The torso: white shirt, a little lit by the lamp on the side toward it.
  const d: Pt = [(shoulder[0] - hip[0]) / 1.0, (shoulder[1] - hip[1]) / 1.0]
  const n: Pt = [-d[1], d[0]]
  const w0 = 0.2
  const w1 = 0.27
  shape(pen, [[hip[0] + n[0] * w0, hip[1] + n[1] * w0], [shoulder[0] + n[0] * w1, shoulder[1] + n[1] * w1], [shoulder[0] - n[0] * w1, shoulder[1] - n[1] * w1], [hip[0] - n[0] * w0, hip[1] - n[1] * w0]], tone(C.shirt))
  shape(pen, [[hip[0] + n[0] * w0 * 1.05, hip[1] + n[1] * w0 * 1.05 + 0.02], [hip[0] - n[0] * w0 * 1.05, hip[1] - n[1] * w0 * 1.05 + 0.02], [hip[0] - n[0] * w0 + d[0] * 0.15, hip[1] - n[1] * w0 + d[1] * 0.15], [hip[0] + n[0] * w0 + d[0] * 0.15, hip[1] + n[1] * w0 + d[1] * 0.15]], tone(C.trousers))
  // Head: the hair dark and short, the face turned the way he faces.
  line(pen, [shoulder[0] + d[0] * 0.05, shoulder[1] + d[1] * 0.05], [head[0] - d[0] * 0.12, head[1] - d[1] * 0.12], tone(C.skin), 3)
  ctxRot(pen, head, Math.atan2(d[1], d[0]) + Math.PI / 2, () => {
    // Upright, this frame is the world's: his face is on the side he faces, the hair over the top and the back.
    const fx = face
    ellipse(pen, [head[0] + fx * 0.01, head[1]], 0.19, 0.22, tone(C.skin))
    shape(pen, [[head[0] - fx * 0.2, head[1] + 0.06], [head[0] - fx * 0.21, head[1] - 0.1], [head[0] - fx * 0.12, head[1] - 0.21], [head[0] + fx * 0.04, head[1] - 0.24], [head[0] + fx * 0.17, head[1] - 0.16], [head[0] + fx * 0.19, head[1] - 0.08], [head[0] + fx * 0.02, head[1] - 0.1], [head[0] - fx * 0.06, head[1] + 0.02], [head[0] - fx * 0.12, head[1] + 0.12]], tone(C.hair))
    ellipse(pen, [head[0] - fx * 0.08, head[1] + 0.0], 0.035, 0.05, tone(C.skinDark))
  })
  // The bat arm, and the thick pale sponge bat.
  const bat = endoBat(t)
  const batC: Pt = bat ?? [shoulder[0] + face * 0.12, shoulder[1] + 1.25]
  const toS: Pt = [shoulder[0] - batC[0], shoulder[1] - batC[1]]
  const ls = Math.hypot(toS[0], toS[1]) || 1
  const hand: Pt = [batC[0] + (toS[0] / ls) * 0.3, batC[1] + (toS[1] / ls) * 0.3]
  const elbow = ik(shoulder, hand, 0.6, 0.6, face > 0 ? -1 : 1)
  line(pen, shoulder, elbow, tone(C.shirt), 4)
  line(pen, elbow, hand, tone(C.skin), 3)
  const ang = Math.atan2(toS[1], toS[0])
  line(pen, batC, [hand[0] + (toS[0] / ls) * 0.06, hand[1] + (toS[1] / ls) * 0.06], tone(C.handle, 1.2), 2.6)
  ctxRot(pen, batC, ang + Math.PI / 2, () => {
    const wv = bat ? 1 : 0.55
    ellipse(pen, [batC[0] + 0.035 * wv, batC[1]], 0.1 * wv, 0.225, tone(C.handle, 1.1))
    ellipse(pen, [batC[0] - 0.02 * wv, batC[1]], 0.1 * wv, 0.225, tone(C.spongeEdge, 1.2))
    ellipse(pen, [batC[0] - 0.045 * wv, batC[1]], 0.075 * wv, 0.21, tone(C.sponge, 1.25))
  })
  ellipse(pen, hand, 0.065, 0.065, tone(C.skin))
}

/** His fingers over the ball while he carries it. */
export function drawEndoOver(pen: Pen, t: number): void {
  if (t < PICK || t > SET + 0.05) return
  const h = carryHand(Math.min(t, SET))
  const face = endoFace(t)
  shape(pen, [[h[0] - 0.12, h[1] - 0.1], [h[0] + 0.06 * face, h[1] - 0.16], [h[0] + 0.16 * face, h[1] - 0.04], [h[0] + 0.1 * face, h[1] + 0.02], [h[0] - 0.08, h[1] - 0.02]], mix(C.dark, C.skin, 0.62))
}

/* ------------------------------------------------------------------ the eruption */

/** Streamers, red and white, thrown down from the stands at the smash; they lie on the floor after. */
export function drawStreamers(pen: Pen, t: number): void {
  if (t < WIN) return
  const g = 2.4
  for (let i = 0; i < 26; i++) {
    const t0 = WIN + 0.05 + (i % 8) * 0.27 + hash(i, 41) * 0.15
    if (t < t0) continue
    const p0: Pt = [-2.5 + 12 * hash(i, 42), -3.2 + 2.4 * hash(i, 43)]
    const v: Pt = [(hash(i, 44) - 0.5) * 2.2, -2.2 - 1.5 * hash(i, 45)]
    const land = 0.75 + 0.65 * hash(i, 46)
    const posAt = (u: number): Pt => {
      const yy = p0[1] + v[1] * u + 0.5 * g * u * u
      return [p0[0] + v[0] * u * Math.exp(-u * 0.5), Math.min(yy, land)]
    }
    const u = t - t0
    const col = i % 2 ? C.red : C.white
    const pts: Pt[] = []
    // When it comes down it lies along the floor where it fell.
    const uLand = (-v[1] + Math.sqrt(v[1] * v[1] + 2 * g * (land - p0[1]))) / g
    const down = posAt(uLand)
    const side = hash(i, 47) > 0.5 ? 1 : -1
    for (let j = 0; j < 14; j++) {
      const s = Math.max(0, u - j * 0.06)
      if (u > uLand + 0.4) {
        pts.push([down[0] + side * (j - 7) * 0.07 + Math.sin(j * 1.3 + i) * 0.04, land + Math.sin(j * 0.8 + i) * 0.03])
        continue
      }
      const [px, py] = posAt(s)
      const w = Math.sin(s * 9 + j * 0.9 + i) * 0.1
      const settle = smooth(u, uLand, uLand + 0.4)
      const flat: Pt = [down[0] + side * (j - 7) * 0.07, land]
      const air: Pt = [px + w, py - j * 0.015]
      pts.push([air[0] + (flat[0] - air[0]) * settle, air[1] + (flat[1] - air[1]) * settle])
    }
    const fade = 1 - smooth(t, LIGHTS_DOWN[0], LIGHTS_DOWN[3] + 0.5) * 0.7
    path(pen, pts, mix(C.dark, col, 0.85 * fade), 1.1)
  }
}
