import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, frame, hash, scenery } from '../kit'
import { level, SEAM } from '../music'
import { CALCIFER, ROOM, WASTES } from '../worlds'
import {
  beltSlack,
  bellowsAt,
  BELLOWS,
  calciferAt,
  CHAIR,
  ENGINE,
  flywheelAt,
  inMorning,
  latchLift,
  LEVER,
  leverAt,
  LOG,
  morningLight,
  onChair,
  PAN,
  panAt,
  PULL,
  pullAt,
  PUMP,
  pumpAt,
  rock,
  SHAFT,
  shaftAt,
  shuttersAt,
  steamAt,
  STOOL,
  TABLE,
  TROLLEY,
} from './morning-rig'

/**
 * The castle's one room (canonical: the door builder's; the plank builder's hearth part plays in it too). A doll's
 * house cut open, left to right: the table (and a stool at its end) and the bell-pull, the door with the colour dial
 * (drawn by whichever part is in the room, with `drawDoor` at `ROOM_AT.door`: its opening, dial and view are theirs),
 * the rocking chair and the bellows, the hearth where Calcifer lives (his log at `ROOM_AT.log`; he is drawn by the
 * parts), the steam engine over the mantel, the window with its shutters, the sink and its pump, and the stair up on
 * the right. Under the ceiling, the line shaft the engine drives, and the rail a trolley runs a pan along.
 *
 * Coordinates are cells from the room's origin, which the score puts at `ROOM_ORIGIN` in the room world: a ball
 * standing on the floor has its centre at y = 0 (the floor's surface is y = 0.13). Visited twice: the morning
 * (151.998 → 178.051: dark but for the fire, then the shutters open on the morning) and the war (237.0 → 243.635:
 * night, the window red). Everything the machine does is by show time (`morning-rig.ts`); outside the morning it is
 * at rest, or running on with the war.
 */

export const ROOM_AT = {
  floor: 0,
  ground: 0.13,
  ceil: -4.3,
  /** The walls' inner faces. */
  wallL: -4.6,
  wallR: 11.6,
  /** The door's sill (the opening centred on this x). */
  door: [0.3, 0.13] as Pt,
  /** The table's top: its ends and its height. */
  table: [TABLE.x0, TABLE.x1, TABLE.top] as [number, number, number],
  /** The hearth: the fireplace's opening (x0, x1, top), and the log Calcifer sits on (his base). */
  hearth: [1.9, 3.7, -1.5] as [number, number, number],
  log: LOG,
  /** The sink's rim, and the window over it (x0, x1, y0, y1). */
  sink: [5.9, 7.1, -0.75] as [number, number, number],
  window: [5.8, 7.2, -3.2, -1.7] as [number, number, number, number],
  /** The stair: from the floor at x0 up to the landing at x1, y. */
  stair: [8.0, 10.6, -3.4] as [number, number, number],
  /** The rocking chair by the hearth: where someone sitting in it has their centre when it is still. */
  chair: [1.6, -0.43] as Pt,
}

/** Where the room stands in the room world. */
export const ROOM_ORIGIN: Pt = [0, 0]

/** How lit the room is at show time `t`: 0 dark (the fire alone), 1 full morning. */
export function morningAt(t: number): number {
  return morningLight(t)
}
/** The war's red through the window, 0..1. */
export const warAt = (t: number): number => (t > SEAM.hearth - 2 && t < SEAM.plank + 1 ? 1 : 0)

/** The cells the room covers, for its standing piece. */
export const ROOM_BOX = { x0: -7, y0: -7, x1: 14, y1: 3 }

/* ------------------------------------------------------------------ drawing */

const R = ROOM_AT
const IRON = WASTES.iron
const IRON_DARK = WASTES.ironDark
const BRASS = WASTES.brass
const WATER = ROOM.window
const HERB_DRY = mixHex(ROOM.copper, ROOM.plasterShade, 0.45)
/** How high the pan's bail rises over its rim, to the ring the trolley's chain holds. */
const BAIL = 0.22

/** How a colour looks in the room's light at the moment (dark before the shutters open; reddened in the war). */
export type Tone = (hex: string) => string
type C = { k: number; weight: number }

/** The room's light at `t`: how to tone a colour, and the ink. */
export function roomTone(t: number, ink: string): { tone: Tone; ink: string; dark: number } {
  const day = morningLight(t)
  const war = warAt(t)
  const dark = 0.78 * (1 - day) * (inMorning(t) || war ? 1 : 0.3)
  return { tone: (hex) => mixHex(mixHex(hex, ROOM.night, dark), ROOM.brickDark, war * 0.28), ink: mixHex(ink, ROOM.night, dark * 0.3), dark }
}

/**
 * A soft blob of smoke or steam: a few offset lobes, no outline, denser in the middle and fading at the edge; never
 * one clean disc (a round thing reads as a ball).
 */
export function puff(p: p5, k: number, x: number, y: number, r: number, color: string, a: number, seed = 0): void {
  if (a <= 0.01 || r <= 0.005) return
  p.noStroke()
  const lobes: [number, number, number][] = [
    [-0.45, 0.2, 0.7],
    [0.4, 0.15, 0.75],
    [0.05, -0.35, 0.8],
    [0, 0.05, 1],
  ]
  for (const [s, f] of [[1, 0.26], [0.7, 0.4]] as const) {
    p.fill(alpha(p, color, a * f))
    for (const [dx, dy, rr] of lobes) {
      const j = 0.15 * Math.sin(seed * 3.1 + dx * 7)
      p.ellipse((x + (dx + j) * r) * k, (y + dy * r) * k, 2 * r * s * rr * k, 1.7 * r * s * rr * k)
    }
  }
}

export const room = scenery<null>({
  name: 'room',
  draw: (p, _s, c) => {
    const { k, weight: W, t } = c
    const X = (v: number) => v * k
    const f = frame(p, k)
    const day = morningLight(t)
    const war = warAt(t)
    const morningNow = inMorning(t)
    const { tone, ink } = roomTone(t, c.ink)
    const inkT = (a: number) => alpha(p, ink, a)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    p.push()
    p.rectMode(p.CORNER)

    // Outside the room (seen past its cut walls): the dark.
    p.noStroke()
    p.fill(mixHex(ROOM.soot, ROOM.night, 0.5))
    p.rect(X(f.x0), X(f.y0), X(f.x1 - f.x0), X(f.y1 - f.y0))

    // The back wall: plaster, a wainscot of boards below, and the soot of years over the hearth.
    p.fill(tone(ROOM.plaster))
    p.rect(X(R.wallL), X(R.ceil), X(R.wallR - R.wallL), X(R.ground - R.ceil))
    p.fill(tone(ROOM.plasterShade))
    p.rect(X(R.wallL), X(-0.95), X(R.wallR - R.wallL), X(R.ground + 0.95))
    p.stroke(alpha(p, ink, 0.14))
    p.strokeWeight(W * 0.45)
    for (let x = R.wallL + 0.45, i = 0; x < R.wallR; x += 0.45 + 0.08 * Math.sin(i * 2.7), i++) p.line(X(x), X(-0.9), X(x), X(R.ground))
    p.stroke(alpha(p, ink, 0.6))
    p.strokeWeight(W * 0.8)
    p.line(X(R.wallL), X(-0.95), X(R.wallR), X(-0.95))
    p.noStroke()
    for (let i = 0; i < 6; i++) {
      p.fill(alpha(p, tone(ROOM.soot), 0.05))
      p.ellipse(X(2.8 + (i - 2.5) * 0.25), X(-3.4 + i * 0.1), X(4.2 - i * 0.35), X(2.2 - i * 0.2))
    }

    drawWindow(p, c, tone, ink, t, day, war)
    drawStair(p, c, tone, ink)
    drawTable(p, c, tone, ink)
    drawHearth(p, c, tone, ink, t)
    drawEngine(p, c, tone, ink, t)
    drawShaft(p, c, tone, ink, t)
    drawSink(p, c, tone, ink, t)
    drawChair(p, c, tone, ink, t)
    drawPull(p, c, tone, ink, t)
    drawHerbs(p, c, tone, ink, t)

    // The floor, in boards, and the ceiling's beams.
    p.stroke(ink)
    p.strokeWeight(W)
    p.fill(tone(ROOM.wood))
    p.rect(X(R.wallL - 0.4), X(R.ground), X(R.wallR - R.wallL + 0.8), X(0.7))
    // The floor's cut edge: the boards' thickness, then the joists in shadow under them.
    p.noStroke()
    p.fill(tone(ROOM.woodDark))
    p.rect(X(R.wallL - 0.4), X(R.ground + 0.16), X(R.wallR - R.wallL + 0.8), X(0.54))
    p.stroke(inkT(0.6))
    p.strokeWeight(W * 0.7)
    p.line(X(R.wallL - 0.4), X(R.ground + 0.16), X(R.wallR + 0.4), X(R.ground + 0.16))
    p.stroke(ink)
    p.strokeWeight(W)
    p.fill(tone(ROOM.woodDark))
    p.rect(X(R.wallL - 0.4), X(R.ceil - 0.5), X(R.wallR - R.wallL + 0.8), X(0.5))
    for (let x = R.wallL + 1.2; x < R.wallR - 0.4; x += 2.2) p.rect(X(x), X(R.ceil), X(0.28), X(0.24))
    p.rect(X(R.wallL - 0.4), X(R.ceil), X(0.4), X(R.ground - R.ceil))
    p.rect(X(R.wallR), X(R.ceil), X(0.4), X(R.ground - R.ceil))
    drawRail(p, c, tone, ink, t)

    // The light. Calcifer lights the room from the grate, most while it is dark; the morning comes in at the window
    // as a shaft across the floor, with dust in it; in the war, the window's red.
    const cal = calciferAt(t)
    const [lx, ly] = LOG
    const glow = Math.min(0.6, (0.14 + 0.46 * (1 - day)) * (0.35 + 0.9 * cal.size) * (morningNow ? 1 : 0.6 + 0.4 * level(t)))
    const radius = 3 + 3.4 * cal.size
    const g = ctx.createRadialGradient(X(lx), X(ly - 0.4), 0, X(lx), X(ly - 0.4), X(radius))
    g.addColorStop(0, `rgba(255, 150, 70, ${glow})`)
    g.addColorStop(0.45, `rgba(255, 130, 60, ${glow * 0.35})`)
    g.addColorStop(1, 'rgba(255, 130, 60, 0)')
    ctx.fillStyle = g
    ctx.fillRect(X(lx - radius), X(ly - 0.4 - radius), X(2 * radius), X(2 * radius))
    const [wx0, wx1, wy0, wy1] = R.window
    const open = shuttersAt(t)
    if (day > 0.01 && open > 0.05) {
      p.noStroke()
      p.fill(alpha(p, ROOM.sun, 0.2 * day * open))
      p.quad(X(wx0), X(wy1), X(wx1), X(wy1), X(wx1 - 2.4), X(R.ground), X(wx0 - 3.6), X(R.ground))
      p.fill(alpha(p, ROOM.sun, 0.1 * day * open))
      p.quad(X(wx0), X(wy0), X(wx1), X(wy0), X(wx1 - 2.4), X(R.ground), X(wx0 - 3.6), X(R.ground))
      // Dust in the beam, shaken off the beams by the running shaft.
      for (let i = 0; i < 26; i++) {
        const u = (hash(i, 3) + t * (0.02 + 0.03 * hash(i, 5))) % 1
        const v = hash(i, 7)
        const y = wy1 + (R.ground - wy1) * v
        const x0 = wx0 - 3.6 * v
        const x1 = wx1 - 2.4 * v
        const x = x0 + (x1 - x0) * u + 0.08 * Math.sin(t * 0.7 + i)
        const tw = 0.5 + 0.5 * Math.sin(t * 2.3 + i * 1.7)
        p.fill(alpha(p, ROOM.sun, 0.55 * day * open * tw))
        p.circle(X(x), X(y - 0.05 * Math.sin(t * 0.5 + i)), Math.max(1, X(0.022)))
      }
    }
    if (war > 0) {
      const flick = 0.5 + 0.5 * Math.sin(t * 7) * Math.sin(t * 3.1 + 1)
      p.noStroke()
      p.fill(alpha(p, ROOM.warLight, 0.12 + 0.1 * flick))
      p.quad(X(wx0), X(wy1), X(wx1), X(wy1), X(wx1 - 2.4), X(R.ground), X(wx0 - 3.6), X(R.ground))
    }
    p.pop()
  },
})

/* ------------------------------------------------------------------ the window */

function drawWindow(p: p5, c: C, tone: Tone, ink: string, t: number, day: number, war: number): void {
  const { k, weight: W } = c
  const X = (v: number) => v * k
  const [x0, x1, y0, y1] = R.window
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // The view: the wastes' morning, or the dark, or the war's fire.
  ctx.save()
  ctx.beginPath()
  ctx.rect(X(x0), X(y0), X(x1 - x0), X(y1 - y0))
  ctx.clip()
  if (war > 0) {
    const flick = 0.5 + 0.5 * Math.sin(t * 7) * Math.sin(t * 3.1 + 1)
    const g = ctx.createLinearGradient(0, X(y0), 0, X(y1))
    g.addColorStop(0, ROOM.night)
    g.addColorStop(1, mixHex(ROOM.brickDark, ROOM.warLight, 0.4 + 0.5 * flick))
    ctx.fillStyle = g
    ctx.fillRect(X(x0), X(y0), X(x1 - x0), X(y1 - y0))
  } else {
    const g = ctx.createLinearGradient(0, X(y0), 0, X(y1))
    g.addColorStop(0, mixHex(WASTES.night, WASTES.skyHigh, day))
    g.addColorStop(1, mixHex(mixHex(WASTES.night, WASTES.dusk, 0.3), mixHex(WASTES.sky, WASTES.gold, 0.35), day))
    ctx.fillStyle = g
    ctx.fillRect(X(x0), X(y0), X(x1 - x0), X(y1 - y0))
    p.noStroke()
    // A cloud going by, and the far hills.
    p.fill(alpha(p, WASTES.cloud, 0.8 * day))
    const cx = x0 + ((t * 0.05) % 2.2) - 0.3
    p.ellipse(X(cx), X(y0 + 0.4), X(0.7), X(0.18))
    p.ellipse(X(cx + 0.22), X(y0 + 0.33), X(0.4), X(0.16))
    p.fill(mixHex(mixHex(WASTES.night, WASTES.heatherDeep, 0.3), WASTES.hillFar, day))
    p.beginShape()
    p.vertex(X(x0), X(y1))
    for (let i = 0; i <= 10; i++) p.vertex(X(x0 + ((x1 - x0) * i) / 10), X(y1 - 0.35 - 0.12 * Math.sin(i * 0.9 + 1.3)))
    p.vertex(X(x1), X(y1))
    p.endShape(p.CLOSE)
    p.fill(mixHex(mixHex(WASTES.night, WASTES.heatherDeep, 0.5), WASTES.hill, day))
    p.beginShape()
    p.vertex(X(x0), X(y1))
    for (let i = 0; i <= 10; i++) p.vertex(X(x0 + ((x1 - x0) * i) / 10), X(y1 - 0.14 - 0.08 * Math.sin(i * 1.4 + 0.2)))
    p.vertex(X(x1), X(y1))
    p.endShape(p.CLOSE)
  }
  ctx.restore()
  // The frame, the mullion and transom, and the sill.
  p.stroke(ink)
  p.strokeWeight(W)
  p.noFill()
  p.rect(X(x0), X(y0), X(x1 - x0), X(y1 - y0))
  p.strokeWeight(W * 0.8)
  p.line(X((x0 + x1) / 2), X(y0), X((x0 + x1) / 2), X(y1))
  p.line(X(x0), X((y0 + y1) / 2), X(x1), X((y0 + y1) / 2))
  p.strokeWeight(W)
  p.fill(tone(ROOM.woodDark))
  p.rect(X(x0 - 0.12), X(y1), X(x1 - x0 + 0.24), X(0.08))
  // The shutters: two leaves, hinged at the window's sides, meeting in the middle; they swing toward us.
  const open = shuttersAt(t)
  const half = (x1 - x0) / 2
  const lw = half * Math.cos(open * Math.PI * 0.47)
  for (const side of [-1, 1]) {
    const hinge = side < 0 ? x0 : x1
    const free = hinge - side * lw
    const shade = mixHex(ROOM.wood, ROOM.woodDark, 0.35 + 0.4 * open)
    p.stroke(ink)
    p.strokeWeight(W * 0.9)
    p.fill(tone(shade))
    p.rect(X(Math.min(hinge, free)), X(y0 - 0.02), X(Math.abs(hinge - free)), X(y1 - y0 + 0.04))
    if (lw > 0.08) {
      // Boards, and a heart cut in each leaf (the one ornament), with the dawn showing through it.
      p.stroke(alpha(p, ink, 0.4))
      p.strokeWeight(W * 0.45)
      for (let i = 1; i < 3; i++) {
        const x = hinge - (side * (lw * i)) / 3
        p.line(X(x), X(y0 + 0.04), X(x), X(y1 - 0.04))
      }
      p.noStroke()
      const hx = hinge - side * lw * 0.5
      const hy = y0 + 0.42
      const s = lw / half
      p.fill(alpha(p, mixHex(WASTES.gold, ROOM.sun, 0.5), 0.25 + 0.65 * (1 - open)))
      p.beginShape()
      p.vertex(X(hx), X(hy + 0.1))
      p.bezierVertex(X(hx - 0.12 * s), X(hy), X(hx - 0.08 * s), X(hy - 0.1), X(hx), X(hy - 0.04))
      p.bezierVertex(X(hx + 0.08 * s), X(hy - 0.1), X(hx + 0.12 * s), X(hy), X(hx), X(hy + 0.1))
      p.endShape(p.CLOSE)
    }
  }
  // The latch bar across the shutters, lifted by its cord as the shaft winds it, until it lets go.
  const lift = latchLift(t)
  if (open < 0.2) {
    p.stroke(ink)
    p.strokeWeight(W * 0.8)
    p.fill(tone(IRON))
    p.rect(X((x0 + x1) / 2 - 0.34), X((y0 + y1) / 2 - 0.05 - lift), X(0.68), X(0.07))
  }
  p.stroke(alpha(p, ink, 0.8))
  p.strokeWeight(W * 0.5)
  const cordEnd = open < 0.2 ? (y0 + y1) / 2 - 0.05 - lift : y0 - 0.15
  p.line(X(SHAFT.shutter), X(SHAFT.y + 0.12), X(SHAFT.shutter + (open < 0.2 ? 0 : 0.1)), X(cordEnd))
}

/* ------------------------------------------------------------------ the stair */

function drawStair(p: p5, c: C, tone: Tone, ink: string): void {
  const { k, weight: W } = c
  const X = (v: number) => v * k
  const [s0, s1, land] = R.stair
  const n = 9
  const run = (s1 - s0) / n
  const rise = (R.ground - land) / n
  // The landing and the doorway off it, dark.
  p.stroke(ink)
  p.strokeWeight(W)
  p.fill(tone(ROOM.hearth))
  p.rect(X(s1 + 0.2), X(land - 1.9), X(0.75), X(1.9))
  p.fill(tone(ROOM.woodDark))
  p.rect(X(s1 + 0.12), X(land - 2.0), X(0.91), X(0.1))
  p.beginShape()
  p.vertex(X(s0), X(R.ground))
  for (let i = 0; i < n; i++) {
    const x = s0 + run * i
    const y = R.ground - rise * (i + 1)
    p.vertex(X(x), X(y))
    p.vertex(X(x + run), X(y))
  }
  p.vertex(X(R.wallR), X(land))
  p.vertex(X(R.wallR), X(land + 0.18))
  p.vertex(X(s1 + 0.3), X(land + 0.18))
  p.vertex(X(s0 + 0.4), X(R.ground))
  p.endShape(p.CLOSE)
  p.strokeWeight(W * 0.6)
  for (let i = 0; i < n; i++) {
    const x = s0 + run * i
    const y = R.ground - rise * (i + 1)
    p.line(X(x - 0.03), X(y), X(x + run), X(y))
  }
  // The banister: a rail and a few balusters.
  p.strokeWeight(W * 0.9)
  p.line(X(s0 + 0.05), X(R.ground - 0.75), X(s1 + 0.05), X(land - 0.75))
  p.line(X(s0 + 0.05), X(R.ground - 0.75), X(s0 + 0.05), X(R.ground))
  p.strokeWeight(W * 0.5)
  for (let i = 1; i < n; i += 2) {
    const x = s0 + run * (i + 0.5)
    const y = R.ground - rise * (i + 1)
    p.line(X(x), X(y), X(x), X(y - 0.75 + 0.02))
  }
}

/* ------------------------------------------------------------------ the table and the stool */

function drawTable(p: p5, c: C, tone: Tone, ink: string): void {
  const { k, weight: W } = c
  const X = (v: number) => v * k
  p.stroke(ink)
  p.strokeWeight(W)
  p.fill(tone(ROOM.woodDark))
  // The bench behind the table, just seen at the ends.
  p.rect(X(TABLE.x0 + 0.1), X(-0.34), X(TABLE.x1 - TABLE.x0 - 0.2), X(0.08))
  drawTableTop(p, k, W, ink, tone)
  p.fill(tone(ROOM.wood))
  for (const x of [TABLE.x0 + 0.12, TABLE.x1 - 0.22]) p.rect(X(x), X(TABLE.top + 0.22), X(0.1), X(R.ground - TABLE.top - 0.22))
  // The stool at the table's right end.
  p.fill(tone(ROOM.wood))
  p.rect(X(STOOL.x - 0.2), X(STOOL.seat), X(0.4), X(0.07))
  p.strokeWeight(W * 0.8)
  p.line(X(STOOL.x - 0.15), X(STOOL.seat + 0.07), X(STOOL.x - 0.19), X(R.ground))
  p.line(X(STOOL.x + 0.15), X(STOOL.seat + 0.07), X(STOOL.x + 0.19), X(R.ground))
  p.line(X(STOOL.x - 0.17), X(STOOL.seat + 0.22), X(STOOL.x + 0.17), X(STOOL.seat + 0.22))
}

/** The table's top and apron: drawn with the room, and again over anyone sitting behind it (by the part). */
export function drawTableTop(p: p5, k: number, W: number, ink: string, tone: Tone): void {
  const X = (v: number) => v * k
  p.push()
  p.rectMode(p.CORNER)
  p.stroke(ink)
  p.strokeWeight(W)
  p.fill(tone(ROOM.wood))
  p.rect(X(TABLE.x0 - 0.08), X(TABLE.top), X(TABLE.x1 - TABLE.x0 + 0.16), X(0.1))
  p.fill(tone(ROOM.woodDark))
  p.rect(X(TABLE.x0 + 0.04), X(TABLE.top + 0.1), X(TABLE.x1 - TABLE.x0 - 0.08), X(0.12))
  p.pop()
}

/* ------------------------------------------------------------------ the hearth */

function drawHearth(p: p5, c: C, tone: Tone, ink: string, t: number): void {
  const { k, weight: W } = c
  const X = (v: number) => v * k
  const [hx0, hx1, htop] = R.hearth
  // The chimney breast: brick up to the ceiling.
  p.stroke(ink)
  p.strokeWeight(W)
  p.fill(tone(ROOM.brick))
  p.rect(X(hx0 - 0.5), X(R.ceil), X(hx1 - hx0 + 1), X(R.ground - R.ceil))
  // A few bricks drawn in where the plaster has fallen off: not a pattern.
  p.stroke(alpha(p, ink, 0.28))
  p.strokeWeight(W * 0.45)
  p.noFill()
  for (const [bx, by] of [[1.6, -3.0], [4.0, -3.6], [1.75, -1.1], [3.95, -0.7], [4.05, -2.2], [1.55, -3.8]] as Pt[]) {
    p.rect(X(bx - 0.18), X(by - 0.07), X(0.36), X(0.14))
    p.rect(X(bx), X(by + 0.07), X(0.36), X(0.14))
  }
  // The opening, dark, arched.
  p.stroke(ink)
  p.strokeWeight(W)
  p.fill(tone(ROOM.hearth))
  p.beginShape()
  p.vertex(X(hx0), X(R.ground))
  p.vertex(X(hx0), X(htop + 0.3))
  p.quadraticVertex(X((hx0 + hx1) / 2), X(htop - 0.2), X(hx1), X(htop + 0.3))
  p.vertex(X(hx1), X(R.ground))
  p.endShape(p.CLOSE)
  // The hearthstone.
  p.fill(tone(WASTES.stoneDark))
  p.rect(X(hx0 - 0.25), X(R.ground - 0.02), X(hx1 - hx0 + 0.5), X(0.1))
  // The grate and the log (Calcifer is drawn by the parts, on `ROOM_AT.log`).
  const [lx, ly] = LOG
  p.fill(tone(IRON_DARK))
  p.rect(X(lx - 0.5), X(ly + 0.1), X(1.0), X(0.06))
  p.strokeWeight(W * 0.8)
  for (const dx of [-0.42, 0.42]) p.line(X(lx + dx), X(ly + 0.16), X(lx + dx), X(R.ground))
  p.strokeWeight(W)
  p.fill(tone(ROOM.woodDark))
  p.rect(X(lx - 0.36), X(ly - 0.05), X(0.72), X(0.15), X(0.07))
  // Embers glowing in the log's cracks, brighter as he is.
  const cal = calciferAt(t)
  p.noStroke()
  p.fill(alpha(p, CALCIFER.body, 0.35 + 0.4 * Math.min(1, cal.size)))
  p.rect(X(lx - 0.24), X(ly + 0.03), X(0.2), X(0.025))
  p.rect(X(lx + 0.06), X(ly + 0.05), X(0.18), X(0.022))
  // The mantel shelf (bare: the engine stands on it).
  p.stroke(ink)
  p.strokeWeight(W)
  p.fill(tone(ROOM.woodDark))
  p.rect(X(hx0 - 0.7), X(htop - 0.22), X(hx1 - hx0 + 1.4), X(0.22))
}

/* ------------------------------------------------------------------ the engine */

function drawEngine(p: p5, c: C, tone: Tone, ink: string, t: number): void {
  const { k, weight: W } = c
  const X = (v: number) => v * k
  const [fx, fy] = ENGINE.fly
  const a = flywheelAt(t)
  const pin: Pt = [fx + ENGINE.crank * Math.cos(a + Math.PI), fy + ENGINE.crank * Math.sin(a + Math.PI)]
  const dy = pin[1] - fy
  const head = pin[0] - Math.sqrt(ENGINE.rod * ENGINE.rod - dy * dy)
  const [c0, c1] = ENGINE.cyl
  // The steam pipe: out of the chimney breast over the mantel, up and into the cylinder's valve chest.
  const pipe = () => {
    p.beginShape()
    p.vertex(X(2.25), X(-1.72))
    p.vertex(X(2.25), X(-2.05))
    p.quadraticVertex(X(2.25), X(-2.2), X(2.1), X(-2.2))
    p.vertex(X(1.95), X(-2.2))
    p.endShape()
  }
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(X(0.07) + W)
  pipe()
  p.stroke(tone(ROOM.copper))
  p.strokeWeight(Math.max(1, X(0.07) - W * 0.4))
  pipe()
  // Brackets into the brick, the cylinder with its valve chest, the crosshead's guide bars.
  p.stroke(ink)
  p.strokeWeight(W)
  p.fill(tone(IRON))
  p.rect(X(c0 + 0.08), X(fy + 0.12), X(0.08), X(0.55))
  p.rect(X(c1 - 0.16), X(fy + 0.12), X(0.08), X(0.55))
  p.fill(tone(BRASS))
  p.rect(X(c0), X(fy - 0.16), X(c1 - c0), X(0.32), X(0.05))
  p.fill(tone(ROOM.copper))
  p.rect(X(c0 + 0.18), X(fy - 0.3), X(0.34), X(0.14), X(0.03))
  p.fill(tone(IRON_DARK))
  p.rect(X(c0 - 0.05), X(fy - 0.19), X(0.07), X(0.38))
  p.rect(X(c1 - 0.02), X(fy - 0.19), X(0.07), X(0.38))
  p.strokeWeight(W * 0.9)
  const [g0, g1] = ENGINE.guide
  p.line(X(g0), X(fy - 0.09), X(g1), X(fy - 0.09))
  p.line(X(g0), X(fy + 0.09), X(g1), X(fy + 0.09))
  // The piston rod to the crosshead.
  p.strokeWeight(W * 1.5)
  p.line(X(c1), X(fy), X(head), X(fy))
  p.strokeWeight(W)
  p.fill(tone(IRON))
  p.rect(X(head - 0.08), X(fy - 0.08), X(0.16), X(0.16), X(0.02))
  // The flywheel: rim, six spokes, hub and its pulley, turning.
  p.push()
  p.translate(X(fx), X(fy))
  p.rotate(a)
  p.stroke(ink)
  p.strokeWeight(W)
  p.fill(tone(IRON))
  p.circle(0, 0, X(2 * ENGINE.r))
  p.fill(tone(ROOM.brick))
  p.circle(0, 0, X(2 * ENGINE.r - 0.14))
  p.strokeWeight(W * 1.4)
  for (let i = 0; i < 6; i++) {
    const s = (i * Math.PI) / 3
    p.line(X(0.07 * Math.cos(s)), X(0.07 * Math.sin(s)), X((ENGINE.r - 0.07) * Math.cos(s)), X((ENGINE.r - 0.07) * Math.sin(s)))
  }
  p.strokeWeight(W)
  p.fill(tone(BRASS))
  p.circle(0, 0, X(2 * ENGINE.hub + 0.04))
  p.fill(tone(IRON_DARK))
  p.circle(0, 0, X(0.07))
  p.pop()
  // The connecting rod, over the wheel, to the crank pin.
  p.stroke(ink)
  p.strokeWeight(W * 1.3)
  p.line(X(head), X(fy), X(pin[0]), X(pin[1]))
  p.strokeWeight(W)
  p.fill(tone(BRASS))
  p.circle(X(pin[0]), X(pin[1]), X(0.07))
  // The belt from the hub up to the shaft: slack, sagging, until the engine takes it up.
  const slack = beltSlack(t)
  const top = SHAFT.y
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(W * 1.1)
  for (const side of [-1, 1]) {
    const xb = fx + side * ENGINE.hub
    const xt = SHAFT.drive + side * SHAFT.rDrive
    const mid: Pt = [(xb + xt) / 2 + side * 0.35 * slack, (fy + top) / 2 + 0.25 * slack]
    p.beginShape()
    p.vertex(X(xb), X(fy))
    p.quadraticVertex(X(mid[0]), X(mid[1]), X(xt), X(top))
    p.endShape()
  }
  // Steam: a puff from the exhaust at each of the first strokes, soft, rising and spreading; a wisp from the valve.
  for (const s of steamAt(t)) {
    const u = s.since
    puff(p, k, c0 - 0.1 - 0.15 * u, fy - 0.2 - 0.5 * u, 0.1 + 0.28 * Math.sqrt(u), WASTES.steam, 0.7 * Math.exp(-u / 0.45))
  }
  if (inMorning(t) && t > 153.1) {
    for (let i = 0; i < 3; i++) {
      const u = (t * 0.9 + i / 3) % 1
      puff(p, k, c0 + 0.34 + 0.12 * Math.sin(u * 6 + i), fy - 0.34 - 0.55 * u, 0.04 + 0.08 * u, WASTES.steam, 0.3 * (1 - u))
    }
  }
}

/* ------------------------------------------------------------------ the shaft and the rail */

function spokes(p: p5, k: number, W: number, ink: string, fill: string, x: number, y: number, r: number, a: number): void {
  const X = (v: number) => v * k
  p.push()
  p.translate(X(x), X(y))
  p.rotate(a)
  p.stroke(ink)
  p.strokeWeight(W)
  p.fill(fill)
  p.circle(0, 0, X(2 * r))
  p.strokeWeight(W * 0.8)
  for (let i = 0; i < 4; i++) {
    const s = (i * Math.PI) / 2
    p.line(0, 0, X(r * 0.85 * Math.cos(s)), X(r * 0.85 * Math.sin(s)))
  }
  p.pop()
}

function drawShaft(p: p5, c: C, tone: Tone, ink: string, t: number): void {
  const { k, weight: W } = c
  const X = (v: number) => v * k
  const a = shaftAt(t)
  // Hangers from the ceiling.
  p.stroke(ink)
  p.strokeWeight(W)
  p.fill(tone(IRON))
  for (const x of SHAFT.hangers) {
    p.rect(X(x - 0.04), X(R.ceil), X(0.08), X(SHAFT.y - R.ceil))
    p.rect(X(x - 0.09), X(SHAFT.y - 0.07), X(0.18), X(0.14), X(0.03))
  }
  // The shaft.
  p.stroke(ink)
  p.strokeWeight(X(0.05) + W)
  p.line(X(SHAFT.x0), X(SHAFT.y), X(SHAFT.x1), X(SHAFT.y))
  p.stroke(tone(IRON))
  p.strokeWeight(Math.max(1, X(0.05) - W * 0.3))
  p.line(X(SHAFT.x0), X(SHAFT.y), X(SHAFT.x1), X(SHAFT.y))
  // The pulleys: the drive, the shutters' winder, the pump's eccentric.
  spokes(p, k, W, ink, tone(BRASS), SHAFT.drive, SHAFT.y, SHAFT.rDrive, a)
  spokes(p, k, W, ink, tone(ROOM.wood), SHAFT.shutter, SHAFT.y, 0.12, a * 1.4)
  spokes(p, k, W, ink, tone(IRON), SHAFT.pump, SHAFT.y, 0.14, a)
  // The pump's rod, from the eccentric down to the handle's end.
  const pump = pumpAt(t)
  const [px, py] = PUMP.pivot
  const endX = px + PUMP.handle * Math.cos(-pump.handle)
  const endY = py + PUMP.handle * Math.sin(-pump.handle)
  const ex = SHAFT.pump + 0.07 * Math.cos(a)
  const ey = SHAFT.y + 0.07 * Math.sin(a)
  p.stroke(ink)
  p.strokeWeight(W * 1.2)
  p.line(X(ex), X(ey), X(endX), X(endY))
}

function drawRail(p: p5, c: C, tone: Tone, ink: string, t: number): void {
  const { k, weight: W } = c
  const X = (v: number) => v * k
  // The rail, hung from the ceiling on straps.
  p.stroke(ink)
  p.strokeWeight(W)
  p.fill(tone(IRON))
  p.rect(X(TROLLEY.x0), X(TROLLEY.y - 0.06), X(TROLLEY.x1 - TROLLEY.x0), X(0.06))
  for (const x of [TROLLEY.x0 + 0.3, -0.9, 2.1, TROLLEY.x1 - 0.3]) p.line(X(x), X(R.ceil), X(x), X(TROLLEY.y - 0.06))
  // The trolley: two wheels on the rail, a carriage, a drum; the chain down to the pan's bail.
  const pan = panAt(t)
  const x = pan.trolley
  const turn = (x - TROLLEY.park) / 0.06
  p.fill(tone(IRON_DARK))
  for (const dx of [-0.13, 0.13]) {
    p.push()
    p.translate(X(x + dx), X(TROLLEY.y - 0.1))
    p.rotate(turn)
    p.circle(0, 0, X(0.1))
    p.line(0, 0, X(0.05), 0)
    p.pop()
  }
  p.fill(tone(IRON))
  p.rect(X(x - 0.2), X(TROLLEY.y), X(0.4), X(0.12), X(0.03))
  p.fill(tone(BRASS))
  p.rect(X(x - 0.07), X(TROLLEY.y + 0.08), X(0.14), X(0.1), X(0.03))
  // The chain; where the pan rests on something it hangs slack.
  const rim = pan.y - PAN.depth
  const topY = rim - BAIL
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  p.beginShape()
  p.vertex(X(x), X(TROLLEY.hook))
  p.quadraticVertex(X((x + pan.x) / 2 + 0.25 * pan.slack), X((TROLLEY.hook + topY) / 2 + 0.3 * pan.slack), X(pan.x), X(topY))
  p.endShape()
  drawPan(p, k, W, ink, tone, pan.x, pan.y, pan.tilt, true)
}

/** The pan, side-on: a shallow iron dish with a long handle to the right, on a bail. Its bottom's underside at y. */
export function drawPan(p: p5, k: number, W: number, ink: string, tone: Tone, x: number, y: number, tilt: number, bail: boolean): void {
  const X = (v: number) => v * k
  const { r, depth, handle } = PAN
  p.push()
  p.translate(X(x), X(y))
  p.rotate(tilt)
  p.stroke(ink)
  p.strokeWeight(W)
  if (bail) {
    // Two wires from the rim up to a ring the chain hooks into.
    p.strokeWeight(W * 0.55)
    p.line(X(-r * 0.85), X(-depth), X(0), X(-depth - BAIL))
    p.line(X(r * 0.85), X(-depth), X(0), X(-depth - BAIL))
    p.strokeWeight(W)
  }
  p.fill(tone(IRON_DARK))
  p.beginShape()
  p.vertex(X(-r), X(-depth))
  p.vertex(X(r), X(-depth))
  p.vertex(X(r * 0.82), X(0))
  p.vertex(X(-r * 0.82), X(0))
  p.endShape(p.CLOSE)
  p.fill(tone(IRON))
  p.rect(X(r - 0.02), X(-depth + 0.01), X(handle), X(0.045), X(0.02))
  p.pop()
}

/* ------------------------------------------------------------------ the sink and the pump */

function drawSink(p: p5, c: C, tone: Tone, ink: string, t: number): void {
  const { k, weight: W } = c
  const X = (v: number) => v * k
  const [sx0, sx1, sy] = R.sink
  // The cupboard under it, the stone basin, a jug on the side.
  p.stroke(ink)
  p.strokeWeight(W)
  p.fill(tone(ROOM.wood))
  p.rect(X(sx0), X(sy + 0.14), X(sx1 - sx0), X(R.ground - sy - 0.14))
  p.strokeWeight(W * 0.6)
  p.line(X((sx0 + sx1) / 2), X(sy + 0.2), X((sx0 + sx1) / 2), X(R.ground - 0.05))
  p.strokeWeight(W)
  p.fill(tone(WASTES.stone))
  p.rect(X(sx0 - 0.08), X(sy - 0.12), X(sx1 - sx0 + 0.16), X(0.26), X(0.04))
  p.fill(tone(ROOM.cloth))
  p.rect(X(sx0 + 0.12), X(sy - 0.34), X(0.18), X(0.22), X(0.05))
  // The pump: a column, its spout over the basin, and its handle on top rocked by the rod.
  const pump = pumpAt(t)
  const [px, py] = PUMP.pivot
  p.fill(tone(IRON))
  p.rect(X(PUMP.x - 0.07), X(py), X(0.14), X(sy - 0.12 - py))
  p.rect(X(PUMP.spout[0]), X(PUMP.spout[1] - 0.04), X(PUMP.x - PUMP.spout[0]), X(0.08))
  p.push()
  p.translate(X(px), X(py))
  p.rotate(-pump.handle)
  p.fill(tone(IRON_DARK))
  p.rect(X(-0.08), X(-0.035), X(PUMP.handle + 0.08), X(0.07), X(0.03))
  p.pop()
  p.fill(tone(BRASS))
  p.circle(X(px), X(py), X(0.07))
  // The water: a gush from the spout into the basin on each stroke, soft and pale, splashing.
  if (pump.flow > 0.02) {
    const [sxp, syp] = PUMP.spout
    p.noStroke()
    const w = 0.035 + 0.035 * pump.flow
    p.fill(alpha(p, WATER, 0.85 * pump.flow))
    p.beginShape()
    p.vertex(X(sxp + 0.01), X(syp - w))
    p.bezierVertex(X(sxp - 0.08), X(syp - w), X(sxp - 0.12), X(syp + 0.1), X(sxp - 0.13 - w), X(sy - 0.1))
    p.vertex(X(sxp - 0.13 + w), X(sy - 0.1))
    p.bezierVertex(X(sxp - 0.06), X(syp + 0.12), X(sxp - 0.04), X(syp + w), X(sxp + 0.01), X(syp + w))
    p.endShape(p.CLOSE)
    for (let i = 0; i < 4; i++) {
      const u = (t * 3 + i / 4) % 1
      p.fill(alpha(p, WATER, 0.7 * pump.flow * (1 - u)))
      p.ellipse(X(sxp - 0.14 + (i - 1.5) * 0.08 * u), X(sy - 0.12 - 0.12 * Math.sin(u * Math.PI)), X(0.035), X(0.02))
    }
  }
}

/* ------------------------------------------------------------------ the rocking chair and the bellows */

function drawChair(p: p5, c: C, tone: Tone, ink: string, t: number): void {
  const { k, weight: W } = c
  const X = (v: number) => v * k
  const a = rock(t)
  const P = (x: number, y: number): Pt => onChair([x, y], a)
  const { cx, R: rr, half, seat } = CHAIR
  const line = (p0: Pt, p1: Pt) => p.line(X(p0[0]), X(p0[1]), X(p1[0]), X(p1[1]))
  const shape = (pts: Pt[]) => {
    p.beginShape()
    for (const q of pts) {
      const [x, y] = P(q[0], q[1])
      p.vertex(X(x), X(y))
    }
    p.endShape(p.CLOSE)
  }
  // The bellows first (under the rocker): two boards hinged at the nozzle, leather between, pressed as she rocks.
  const press = bellowsAt(t)
  const { rear, hinge, tip } = BELLOWS
  const floor = R.ground
  const lift = 0.3 - 0.2 * press
  const topRear: Pt = [rear, floor - 0.04 - lift]
  p.stroke(ink)
  p.strokeWeight(W)
  p.fill(tone(ROOM.cloth))
  p.beginShape()
  p.vertex(X(rear + 0.02), X(floor - 0.04))
  p.vertex(X(hinge), X(floor - 0.06))
  p.vertex(X(hinge), X(floor - 0.1))
  p.vertex(X(topRear[0] + 0.02), X(topRear[1] + 0.03))
  p.endShape(p.CLOSE)
  p.fill(tone(ROOM.woodDark))
  p.beginShape()
  p.vertex(X(topRear[0] - 0.03), X(topRear[1]))
  p.vertex(X(hinge + 0.02), X(floor - 0.12))
  p.vertex(X(hinge + 0.02), X(floor - 0.09))
  p.vertex(X(topRear[0] - 0.03), X(topRear[1] + 0.035))
  p.endShape(p.CLOSE)
  p.rect(X(rear - 0.03), X(floor - 0.05), X(hinge - rear + 0.05), X(0.035))
  p.fill(tone(ROOM.copper))
  p.beginShape()
  p.vertex(X(hinge), X(floor - 0.06))
  p.vertex(X(tip), X(floor - 0.09))
  p.vertex(X(hinge), X(floor - 0.12))
  p.endShape(p.CLOSE)
  // The rockers: an arc under the chair, rolling on the floor.
  const c0y = floor - rr
  const arc: Pt[] = []
  for (let i = 0; i <= 12; i++) {
    const dx = -half - 0.04 + ((2 * half + 0.08) * i) / 12
    arc.push([cx + dx, c0y + Math.sqrt(rr * rr - dx * dx)])
  }
  const rocker = () => {
    p.beginShape()
    for (const q of arc) {
      const [x, y] = P(q[0], q[1])
      p.vertex(X(x), X(y))
    }
    p.endShape()
  }
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(X(0.05) + W)
  rocker()
  p.stroke(tone(ROOM.woodDark))
  p.strokeWeight(Math.max(1, X(0.05) - W * 0.3))
  rocker()
  // The link from the front rocker's tip to the bellows' board: the chair works the bellows.
  const tipPt = P(arc[arc.length - 2][0], arc[arc.length - 2][1] - 0.03)
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  line(tipPt, [topRear[0] + 0.02, topRear[1] + 0.01])
  // A member of the chair: a band `w` wide from p0 to p1 (both in the level chair's cells), filled, inked.
  const member = (p0: Pt, p1: Pt, w: number, fill: string) => {
    const dx = p1[0] - p0[0]
    const dy = p1[1] - p0[1]
    const L = Math.hypot(dx, dy) || 1
    const nx = (-dy / L) * (w / 2)
    const ny = (dx / L) * (w / 2)
    p.fill(tone(fill))
    shape([
      [p0[0] + nx, p0[1] + ny],
      [p1[0] + nx, p1[1] + ny],
      [p1[0] - nx, p1[1] - ny],
      [p0[0] - nx, p0[1] - ny],
    ])
  }
  p.stroke(ink)
  p.strokeWeight(W * 0.9)
  // The back: two spindles between the seat and the crest (behind the stile), then the stile itself, rear leg and
  // back in one piece, leaning back.
  for (const dx of [0.1, 0.2]) member([cx - 0.3 + dx, seat], [cx - 0.44 + dx * 0.7, seat - 0.88], 0.035, ROOM.wood)
  member([cx - 0.34, floor - 0.11], [cx - 0.3, seat + 0.02], 0.065, ROOM.woodDark)
  member([cx - 0.3, seat + 0.02], [cx - 0.47, seat - 0.94], 0.065, ROOM.woodDark)
  // The crest rail: a curved board across the top of the back.
  p.fill(tone(ROOM.woodDark))
  shape([[cx - 0.56, seat - 0.9], [cx - 0.46, seat - 1.03], [cx - 0.2, seat - 0.99], [cx - 0.18, seat - 0.91], [cx - 0.44, seat - 0.93], [cx - 0.54, seat - 0.84]])
  // The front leg, up through the seat to the arm.
  member([cx + 0.3, floor - 0.11], [cx + 0.25, seat - 0.34], 0.06, ROOM.woodDark)
  // A stretcher between the legs.
  member([cx - 0.32, seat + 0.24], [cx + 0.28, seat + 0.24], 0.03, ROOM.wood)
  // The seat, and a cushion on it.
  p.fill(tone(ROOM.wood))
  shape([[cx - 0.36, seat], [cx + 0.31, seat], [cx + 0.33, seat + 0.035], [cx + 0.29, seat + 0.075], [cx - 0.34, seat + 0.075]])
  p.fill(tone(ROOM.brick))
  shape([[cx - 0.3, seat + 0.005], [cx - 0.3, seat - 0.035], [cx - 0.2, seat - 0.055], [cx + 0.18, seat - 0.055], [cx + 0.28, seat - 0.03], [cx + 0.28, seat + 0.005]])
  // The arm: from the stile to the front post, ending in a curl where the basket sits.
  member([cx - 0.41, seat - 0.35], [cx + 0.33, seat - 0.33], 0.05, ROOM.wood)
  p.fill(tone(ROOM.woodDark))
  const curl = P(cx + 0.35, seat - 0.33)
  p.circle(X(curl[0]), X(curl[1]), X(0.07))
}

/* ------------------------------------------------------------------ the bell-pull, the lever, the herbs */

function drawPull(p: p5, c: C, tone: Tone, ink: string, t: number): void {
  const { k, weight: W } = c
  const X = (v: number) => v * k
  const pull = pullAt(t)
  const [dx] = R.door
  const lintel = R.door[1] - 2.05 - 0.12
  // The chain: from the dial's hub along the lintel to a pulley on the wall, and down to its handle.
  p.stroke(alpha(p, ink, 0.85))
  p.strokeWeight(W * 0.6)
  p.line(X(dx - 0.16), X(lintel - 0.2), X(PULL.x), X(PULL.pulley))
  const hx = PULL.x + pull.swing
  const hy = PULL.handle + pull.down
  p.line(X(PULL.x), X(PULL.pulley), X(hx), X(hy - 0.08))
  p.stroke(ink)
  p.strokeWeight(W)
  p.fill(tone(BRASS))
  p.circle(X(PULL.x), X(PULL.pulley), X(0.1))
  // The handle: a brass tee, never a ring.
  p.rect(X(hx - 0.1), X(hy - 0.09), X(0.2), X(0.05), X(0.02))
  p.line(X(hx), X(hy - 0.09), X(hx), X(hy - 0.04))
  // The trolley's lever on the door's right post: a short arm on a pivot, knocked over as Howl passes.
  const [lx, ly] = LEVER
  const lv = leverAt(t)
  p.push()
  p.translate(X(lx), X(ly))
  p.rotate(-0.4 + 0.62 * lv)
  p.fill(tone(IRON))
  p.rect(X(-0.028), X(-0.4), X(0.056), X(0.4))
  p.fill(tone(ROOM.brick))
  p.rect(X(-0.06), X(-0.52), X(0.12), X(0.14), X(0.04))
  p.pop()
  p.fill(tone(IRON_DARK))
  p.rect(X(lx - 0.08), X(ly - 0.06), X(0.16), X(0.13), X(0.03))
  // The rod from the lever up the wall to the rail's drive.
  p.stroke(alpha(p, ink, 0.7))
  p.strokeWeight(W * 0.5)
  p.line(X(lx + 0.05), X(ly - 0.05), X(lx + 0.05), X(TROLLEY.y))
}

function drawHerbs(p: p5, c: C, tone: Tone, ink: string, t: number): void {
  const { k, weight: W } = c
  const X = (v: number) => v * k
  // Bunches of herbs hung head down from the beams to dry: a string, a tie, a spray of stems with leaves. They sway
  // harder once the shaft runs.
  const run = inMorning(t) ? Math.min(1, Math.max(0, (t - 154.3) / 1.5)) : 0.6
  for (const [x, len, col, i] of [[-3.7, 0.42, WASTES.moss, 0], [-1.6, 0.34, HERB_DRY, 1], [4.75, 0.5, WASTES.moss, 2], [5.35, 0.36, HERB_DRY, 3], [9.4, 0.44, WASTES.moss, 4]] as [number, number, string, number][]) {
    const sway = (0.04 + 0.07 * run) * Math.sin(t * (1.9 + 0.3 * i) + i * 2)
    const tieX = x + len * Math.sin(sway)
    const tieY = R.ceil + len * Math.cos(sway)
    p.stroke(alpha(p, ink, 0.8))
    p.strokeWeight(W * 0.5)
    p.line(X(x), X(R.ceil), X(tieX), X(tieY))
    p.push()
    p.translate(X(tieX), X(tieY))
    p.rotate(-sway * 1.3)
    const n = 6
    for (let j = 0; j < n; j++) {
      const a = (j / (n - 1) - 0.5) * 0.7
      const L = 0.3 + 0.12 * Math.sin(j * 2.3 + i)
      const ex = Math.sin(a) * L
      const ey = Math.cos(a) * L
      p.stroke(alpha(p, ink, 0.7))
      p.strokeWeight(W * 0.45)
      p.line(0, 0, X(ex), X(ey))
      p.stroke(alpha(p, ink, 0.6))
      p.fill(tone(mixHex(col, ROOM.plasterShade, (j % 3) * 0.12)))
      for (const f of [0.55, 0.85]) {
        p.push()
        p.translate(X(ex * f), X(ey * f))
        p.rotate(-a + (j % 2 ? 0.7 : -0.7))
        p.ellipse(0, 0, X(0.075), X(0.032))
        p.pop()
      }
    }
    p.stroke(ink)
    p.strokeWeight(W * 0.6)
    p.fill(tone(ROOM.cloth))
    p.rect(X(-0.045), X(-0.02), X(0.09), X(0.05), X(0.01))
    p.pop()
  }
}
