import type p5 from 'p5'
import { clamp, easeOutCubic } from '../../../../../../../../src/core/ease'
import { mixHex } from '../../../../../parts'
import { frame, hash, scenery } from '../kit'
import type { MultiverseShow } from '../show'
import { VOID } from '../worlds'
import { drawThing, type Thing } from './bagelThings'
import { JOY_LIGHT } from './pullPath'
import { JOY_EYE } from './peak'

/**
 * Jobu's crown: while Joy is Jobu Tupaki, a ring of everything goes round her, slowly, as the things go round her
 * bagel: its own seeds (sesame, garlic, salt, onion) and a few small things from every life (a sock, a coin, a hot dog,
 * a fan, a trophy, a googly eye). The bagel, small, with her for its hole. It is tilted as the bagel is seen, so it
 * goes behind her and comes round in front of her.
 *
 * It gathers as the light finds her on the crown (133.79), goes round all through the pull, a little quicker once the
 * pulse comes in, and is round her again in the bagel's hole at the peak; and when her mother gives her the eye, it
 * flies apart. She is Joy again.
 *
 * In the dark's world only (the pull and the peak). Its far half is drawn before the balls and its near half after,
 * so it is round her, not over her.
 */

export interface CrownState {
  show: MultiverseShow | null
}

const SEEDS = 56
const THINGS: Thing[] = ['sock', 'hotdog', 'coin', 'eye', 'fan']
const SEED_COLORS = [VOID.sesame, VOID.garlic, VOID.salt, VOID.onion]
/** The ring's size and tilt, as shares of Joy (cells at her scale 1). */
const RX = 0.62
const RY = 0.17
const TILT = -0.3
/** How long it takes to gather round her, and to fly apart. */
const GATHER = 1.6
const SCATTER = 1.1

interface Mote {
  a: number
  r: number
  lift: number
  thing?: Thing
  variant: number
  color: string
  size: number
  spin: number
}

const MOTES: Mote[] = Array.from({ length: SEEDS + THINGS.length }, (_, i) => {
  const h = (n: number) => hash(i, n, 4242)
  const thing = i >= SEEDS ? THINGS[i - SEEDS] : undefined
  return {
    // The things spread evenly round it; the seeds anywhere.
    a: thing ? ((i - SEEDS) / THINGS.length) * Math.PI * 2 + 0.3 : ((i + 0.6 * h(1)) / SEEDS) * Math.PI * 2,
    // Close to one ellipse, as a ring is, a few seeds a little in or out.
    r: 0.94 + 0.12 * h(2) * h(2),
    lift: (h(3) - 0.5) * 0.025,
    thing,
    variant: Math.floor(h(4) * 3),
    color: SEED_COLORS[Math.floor(h(5) * SEED_COLORS.length)],
    size: thing ? 0.07 + 0.012 * h(6) : 0.028 + 0.01 * h(6),
    spin: (h(7) - 0.5) * 2,
  }
})

/** How far round it has gone at `t`: slowly in the hush, quicker on the pulse. */
const turnAt = (t: number): number => 0.75 * t + 0.45 * Math.max(0, Math.min(t, 166) - 142)

/** How much of it there is at `t`, and how far it has flown apart (0 round her, 1 gone). */
function presence(t: number): { up: number; out: number } {
  const up = easeOutCubic(clamp((t - JOY_LIGHT) / GATHER))
  const out = clamp((t - JOY_EYE) / SCATTER)
  return { up: up * (1 - out * out), out: easeOutCubic(out) }
}

/** Each seed's colour, lit on the near side and in her shadow on the far: worked out once, not every frame. */
const NEAR = MOTES.map((m) => mixHex(m.color, VOID.bagel, 0.05))
const FAR = MOTES.map((m) => mixHex(m.color, VOID.bagel, 0.45))

const smooth01 = (u: number): number => {
  const x = clamp(u)
  return x * x * (3 - 2 * x)
}

function paint(p: p5, k: number, ink: string, weight: number, s: CrownState, t: number, near: boolean): void {
  if ((globalThis as { __noCrown?: boolean }).__noCrown) return
  if (t < JOY_LIGHT || t > JOY_EYE + SCATTER) return
  const { up, out } = presence(t)
  if (up <= 0.003) return
  const joy = s.show?.joy(t)
  if (!joy) return
  const scale = joy.scale ?? 1
  if (scale < 0.05) return
  // Gathering, it closes in on her from further out; flying apart, it goes out a long way.
  const reach = (1 + 0.8 * (1 - up) * (out > 0 ? 0 : 1)) * (1 + 7 * out) * scale
  // Nothing to draw if all of it is out of the frame.
  const f = frame(p, k)
  const span = RX * 1.1 * reach + 0.2
  if (joy.x + span < f.x0 || joy.x - span > f.x1 || joy.y + span < f.y0 || joy.y - span > f.y1) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const cos = Math.cos(TILT)
  const sin = Math.sin(TILT)
  const turn = turnAt(t)
  const a = clamp(up * (out > 0 ? 1 - out : 1))
  const px = 1 / k
  ctx.save()
  ctx.globalAlpha = a
  // The seeds, one path a colour: each a small lens along its way round.
  const paths = new Map<string, Path2D>()
  MOTES.forEach((m, i) => {
    const th = m.a + turn
    const z = Math.sin(th)
    if (z > 0 !== near) return
    const ex = Math.cos(th) * RX * m.r * reach
    const ey = Math.sin(th) * RY * m.r * reach + m.lift * scale
    const x = joy.x + ex * cos - ey * sin
    const y = joy.y + ex * sin + ey * cos
    if (m.thing) {
      // The things are seen on the near side, lit, and fade as they go round behind her (many shapes each, they are
      // not drawn where they would hardly be seen). Too small to be a thing, one is left out.
      const seen = smooth01((z + 0.35) / 0.45)
      const size = m.size * scale * (0.9 + 0.15 * z)
      if (seen <= 0.01 || size <= 3 * px) return
      ctx.globalAlpha = a * seen
      drawThing(p, k, ink, weight, m.thing, x, y, size, turn * 0.6 * m.spin + i, near ? 0.05 : 0.3, m.variant)
      ctx.globalAlpha = a
      return
    }
    const color = near ? NEAR[i] : FAR[i]
    let path = paths.get(color)
    if (!path) paths.set(color, (path = new Path2D()))
    const ang = Math.atan2(Math.cos(th) * RY, -Math.sin(th) * RX) + TILT + m.spin * 0.4
    const rx = Math.max(m.size * scale, 0.8 * px) * k
    path.moveTo(x * k + rx * Math.cos(ang), y * k + rx * Math.sin(ang))
    path.ellipse(x * k, y * k, rx, rx * 0.42, ang, 0, Math.PI * 2)
  })
  for (const [color, path] of paths) {
    ctx.fillStyle = color
    ctx.fill(path)
  }
  ctx.restore()
}

export const crown = scenery<CrownState>({
  name: 'jobu crown',
  draw: (p, s, c) => paint(p, c.k, c.ink, c.weight, s, c.t, false),
  over: (p, s, c) => paint(p, c.k, c.ink, c.weight, s, c.t, true),
})
