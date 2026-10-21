import type { Pt } from '../../../../../parts'
import { sway, type Frame } from '../depth'
import { hash, smooth } from '../kit'
import { type Pen } from '../pen'
import { ROAD, S, STEP_TIMES } from './geo'
import { bag, box, disc, fill } from './ink'
import { gust, solid } from './wind'

/**
 * The airliner's apron while he makes up his mind: the bags going out to it. A tow tractor comes across behind the
 * stair from the farm side toward the airliner's hold with three carts of suitcases and trunks, its driver hunched in his cap, its
 * one lamp lit, its stack puffing; and as the engines start a man by the stair's foot waves the pilot on with his
 * arm. It is all the night's: work going on round him while he cannot decide.
 */

/** The train's front: out across the apron from the farm side to the airliner's hold, behind the stair, at a walk. */
const TOW_FROM = 164
const TOW_X0 = S + 22.4
const TOW_V = 1.15
const towX = (t: number): number => TOW_X0 + TOW_V * Math.max(0, t - TOW_FROM)
/** Its wheels' line on the apron: a little behind the stair's. */
const GY = ROAD - 0.3
/** The man by the stair's foot, and his wave, from as the engines start. */
const MAN_X = S + 34.7
const WAVE_FROM = STEP_TIMES[2]

const T = {
  body: '#2E3A2C',
  bodyLit: '#4C5A44',
  cart: '#262019',
  wheel: '#0E0F10',
  hub: '#5C6064',
  lamp: '#F2E3B0',
  man: '#0B0D10',
  smoke: '#4A5256',
  bags: ['#5A4632', '#3E4A52', '#6E5A3A', '#4A3A44', '#7A6A52', '#34403A'],
}

export function drawApron(pen: Pen, t: number, f: Frame): void {
  drawTow(pen, t, f)
  drawWaver(pen, t, f)
}

function drawTow(pen: Pen, t: number, f: Frame): void {
  if (t < TOW_FROM - 0.5) return
  const front = towX(t)
  // Laid out from its front backwards: `X(d)` is `d` cells behind the front.
  const X = (d: number): number => front - d
  if (X(0.95 + 3 * 1.05) > f.x1 + 0.5 || front < f.x0 - 0.5) return
  const rect = (path: Path2D, d0: number, y0: number, d1: number, y1: number) => box(path, Math.min(X(d0), X(d1)), y0, Math.max(X(d0), X(d1)), y1)
  const body = bag()
  const lit = bag()
  const carts = bag()
  const wheels = bag()
  const hubs = bag()
  const bags = T.bags.map(() => bag())
  const rolled = TOW_V * Math.max(0, t - TOW_FROM)
  const wheel = (d: number, r: number) => {
    disc(wheels, X(d), GY - r, r)
    // A spoke's mark going round, so the wheel is seen to turn.
    const a = rolled / r
    disc(hubs, X(d) + Math.cos(a) * r * 0.5, GY - r + Math.sin(a) * r * 0.5, r * 0.18)
  }
  // The tractor, facing the way it goes: its bonnet, its seat and the driver hunched on it, its stack.
  const bump = 0.012 * Math.sin(t * 17)
  const by = GY - 0.18 + bump
  solid(body, [[X(0), by], [X(0), by - 0.32], [X(0.1), by - 0.38], [X(0.5), by - 0.38], [X(0.5), by - 0.2], [X(0.9), by - 0.2], [X(0.9), by]])
  rect(body, 0.38, by - 0.62, 0.42, by - 0.38)
  rect(lit, 0.02, by - 0.36, 0.48, by - 0.33)
  const head: Pt = [X(0.68), by - 0.62 + 0.01 * Math.sin(t * 9)]
  disc(body, head[0], head[1], 0.085)
  solid(body, [[head[0] + 0.13, head[1] - 0.04], [head[0] + 0.1, head[1] - 0.11], [head[0] - 0.08, head[1] - 0.11], [head[0] - 0.1, head[1] - 0.04]])
  solid(body, [[head[0] + 0.12, head[1] + 0.08], [head[0] + 0.2, head[1] + 0.2], [head[0] + 0.16, by - 0.2], [head[0] - 0.16, by - 0.2], [head[0] - 0.14, head[1] + 0.1]])
  wheel(0.2, 0.13)
  wheel(0.72, 0.17)
  // Three carts on their drawbars, each with its load: suitcases and a trunk, rocking a little.
  for (let c = 0; c < 3; c++) {
    const d0 = 1.05 + c * 1.05
    const d1 = d0 + 0.85
    const deck = GY - 0.22
    rect(carts, d0 - 0.12, deck + 0.02, d0, deck + 0.05)
    rect(carts, d0, deck - 0.05, d1, deck + 0.02)
    rect(carts, d0 + 0.02, deck - 0.3, d0 + 0.05, deck - 0.05)
    rect(carts, d1 - 0.05, deck - 0.3, d1 - 0.02, deck - 0.05)
    wheel(d0 + 0.15, 0.1)
    wheel(d1 - 0.15, 0.1)
    let d = d0 + 0.06
    let row = 0
    const rock = 0.01 * sway(t, c * 3.3, 0.7)
    for (let k = 0; k < 6 && d < d1 - 0.1; k++) {
      const w = 0.16 + 0.16 * hash(c, k, 701)
      const h = 0.12 + 0.12 * hash(c, k, 702)
      const col = Math.floor(hash(c, k, 703) * T.bags.length)
      const yb = deck - 0.05 - row * 0.2 + rock * (row + 1)
      rect(bags[col], d, yb - h, Math.min(d1 - 0.06, d + w), yb)
      d += w + 0.015
      if (d > d1 - 0.2 && row === 0) {
        d = d0 + 0.12 + 0.1 * hash(c, 704)
        row = 1
      }
    }
  }
  // Its stack's smoke, going off on the wind.
  const smoke = bag()
  for (let k = 0; k < 4; k++) {
    const u = ((t * 1.4 + k / 4) % 1 + 1) % 1
    disc(smoke, X(0.4) + (0.3 + 0.5 * gust(t)) * u, by - 0.66 - 0.45 * u, 0.04 + 0.11 * u)
  }
  fill(pen, smoke, T.smoke, 0.22)
  fill(pen, carts, T.cart, 1)
  for (const [i, b] of bags.entries()) fill(pen, b, T.bags[i], 1)
  fill(pen, body, T.body, 1)
  fill(pen, lit, T.bodyLit, 1)
  fill(pen, wheels, T.wheel, 1)
  fill(pen, hubs, T.hub, 1)
  // The lamp on its front: lit, small, and its light a short plain fall on the concrete ahead of it.
  const lamp = bag()
  disc(lamp, X(0) + 0.01, by - 0.25, 0.04)
  fill(pen, lamp, T.lamp, 0.95)
  const pool = bag()
  solid(pool, [[X(0) + 0.02, GY - 0.03], [X(0) + 1.1, GY - 0.05], [X(0) + 1.1, GY + 0.05], [X(0) + 0.02, GY + 0.02]])
  fill(pen, pool, T.lamp, 0.08)
}

/** The ground man at the stair's foot: standing by with his hands in his pockets, then waving the pilot on as the engines go. */
function drawWaver(pen: Pen, t: number, f: Frame): void {
  if (MAN_X + 1 < f.x0 || MAN_X - 1 > f.x1) return
  const s = 0.85
  const x = MAN_X + 0.02 * sway(t, 61, 3.3)
  const foot = ROAD - 0.05
  const y = (d: number) => foot - d * s
  const man = bag()
  box(man, x - 0.16 * s, y(1.0), x - 0.03 * s, y(0.05))
  box(man, x + 0.03 * s, y(1.0), x + 0.16 * s, y(0.05))
  solid(man, [[x - 0.3 * s, y(0.95)], [x - 0.33 * s, y(2.45)], [x - 0.24 * s, y(2.6)], [x + 0.24 * s, y(2.6)], [x + 0.33 * s, y(2.45)], [x + 0.3 * s, y(0.95)]])
  box(man, x - 0.06 * s, y(2.75), x + 0.06 * s, y(2.58))
  disc(man, x, y(2.9), 0.17 * s)
  solid(man, [[x - 0.2 * s, y(2.98)], [x - 0.18 * s, y(3.12)], [x + 0.18 * s, y(3.12)], [x + 0.34 * s, y(2.98)]])
  // His near arm: at his side, then up and round, waving the pilot on, a stroke a beat.
  const wave = smooth(t, WAVE_FROM, WAVE_FROM + 0.4)
  const sh: Pt = [x + 0.28 * s, y(2.45)]
  const swing = wave * (2.3 + 0.45 * Math.sin((t - WAVE_FROM) * Math.PI * 2 * 1.87))
  const a = Math.PI / 2 - 0.08 - swing
  const hand: Pt = [sh[0] + Math.cos(a) * 1.05 * s, sh[1] + Math.sin(a) * 1.05 * s]
  const nx = -Math.sin(a) * 0.07 * s
  const ny = Math.cos(a) * 0.07 * s
  solid(man, [[sh[0] - nx, sh[1] - ny], [hand[0] - nx, hand[1] - ny], [hand[0] + nx, hand[1] + ny], [sh[0] + nx, sh[1] + ny]])
  fill(pen, man, T.man, 1)
}
