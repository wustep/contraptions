import { hash, mix, smooth, type Paint } from '../../draw'
import { MAN, MAN_RIM } from '../../cast'
import { layer } from '../../world/depth'
import { flame } from './city'
import { TOWER, WALL, ground } from './geo'
import { tone } from './tone'

/**
 * Agamemnon's army, come back in the dark from behind the island while Troy slept: thousands of Greeks massed on the
 * hill below the gate and down the beach to the ships, rank behind rank, their torches lit. When the gate goes up they
 * go in, the king first: the surge runs back down the column from the gate to the sea, and the whole host pours up the
 * hill and in, out of sight behind the gate tower, into the city that is about to burn. He and his men come out of the
 * drain and go down through them to the ships the other way.
 *
 * Agamemnon is a ball, as everyone is: gold, as Mycenae's death masks are, and bigger than any man; the Greeks are the
 * same clay as his own men. They are drawn here, rank by rank behind the plane of the action (they never touch it).
 */

export const AGAMEMNON = '#C9A227'
const AGAMEMNON_RIM = '#4A3608'
const R = 0.13
const R_MAN = R * 0.86
const R_KING = R * 1.3

/** When the king goes in under the gate, and how fast the surge runs back down the column and the host marches. */
export const SURGE = 114.32
const WAVE = 7
const MARCH = 1.7
/** The head of the column, at the gate, and its tail, on the beach by the ships (cells, in each rank's own terms). */
const HEAD = WALL.x1 + 0.55
const TAIL = -7.5
/** The ranks' depths behind the plane. */
const RANKS = [0.6, 1.4, 2.4, 3.8, 5.8]
const GAP = 0.27
/** When they are there: come up in the dark while the camera is in the city, gone into it by the time the ships sail. */
const FROM = 100
const TO = 131

/** How far one who stood at `lx0` has marched in by `t`: from rest when the surge reaches him, gathering way. */
function marched(lx0: number, t: number, lag = 0): number {
  const go = SURGE + 0.25 + (lx0 - HEAD) / WAVE + lag
  const s = Math.max(0, t - go)
  return MARCH * (s - 0.45 * (1 - Math.exp(-s / 0.45)))
}

/** The ground one of them stands on, at layer x `lx`: the hill and the beach outside the wall, the street inside it. */
const groundAt = (lx: number): number => Math.min(0, lx > WALL.x1 ? ground(lx) : ground(WALL.x1))

/** Where the king is in his rank at `t` (layer x), and whether he is still to be seen. */
export function kingAt(t: number): number {
  return HEAD - marched(HEAD, t, -0.25)
}

export function drawHost(g: Paint): void {
  const { ctx, t, view } = g
  if (t < FROM || t > TO || view.x1 < TOWER.x0 || view.x0 > 4) return
  // Hidden behind the gate tower once they are past its near side: nothing of them is drawn beyond it.
  const gone = TOWER.x0 + 0.45
  const air = tone('#141A26', t)
  for (let r = RANKS.length - 1; r >= 0; r--) {
    const L = layer(view, RANKS[r])
    const radius = R_MAN * L.s
    if (radius < view.h / 320) continue
    const small = 1 - smooth(radius / view.h, 1 / 320, 1 / 170)
    // Each rank deeper into the dark, and lit by its own torches, warm on the side of them.
    const fill = mix(mix(tone(MAN, t, { fire: 0.55 }), air, 0.1 + 0.11 * r), air, 0.8 * small)
    const rim = mix(tone(MAN_RIM, t), fill, Math.min(1, 0.2 * r + small))
    const torches: [number, number, number, number][] = []
    ctx.beginPath()
    let any = false
    // From the gate (the king's place, then those behind him) down the hill to the beach.
    const near = r === 0 ? HEAD + 0.5 : HEAD + 0.15
    for (let j = Math.ceil(near / GAP); j <= Math.floor(TAIL / GAP); j++) {
      const lx0 = j * GAP + (r % 2 ? GAP / 2 : 0) + (hash(j, r, 21) - 0.5) * GAP * 0.4
      // Thinner down on the beach, where the last of them are still coming up from the ships.
      if (hash(j, r, 22) < 0.12 + 0.5 * smooth(lx0, -14, TAIL)) continue
      const shuffle = 0.02 * Math.sin(t * (0.7 + 0.3 * hash(j, r, 23)) + 6 * hash(j, r, 24))
      const lx = lx0 + shuffle - marched(lx0, t, 0.15 * hash(j, r, 25))
      const x = L.x(lx)
      if (x < gone || x < view.x0 - 1 || x > view.x1 + 1) continue
      const y = L.y(groundAt(lx)) - radius + 0.04 * L.s * (hash(j, r, 26) - 0.5)
      ctx.moveTo(x + radius, y)
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      any = true
      if (hash(j, r, 27) < 0.24) torches.push([x, y - radius, L.s, j * 7 + r])
    }
    if (any) {
      ctx.lineWidth = Math.max(0.75 * g.px, 0.037 * L.s * 0.8)
      ctx.strokeStyle = rim
      ctx.stroke()
      ctx.fillStyle = fill
      ctx.fill()
    }
    // The torches, held up over them: a short pole and its flame.
    if (torches.length) {
      ctx.beginPath()
      for (const [x, top, s] of torches) {
        ctx.moveTo(x + 0.02 * s, top + 0.02 * s)
        ctx.lineTo(x + 0.05 * s, top - 0.3 * s)
      }
      ctx.lineWidth = Math.max(0.75 * g.px, 0.022 * L.s)
      ctx.strokeStyle = mix(tone('#1A120C', t), air, 0.15 * r)
      ctx.stroke()
      for (const [x, top, s, seed] of torches) flame(ctx, x + 0.05 * s, top - 0.28 * s, 0.1 * s, 0.19 * s, t, seed)
    }
    if (r === 0) drawKing(g, L)
  }
}

/** Agamemnon at the head of the column: the gold one, bigger than any of them, and two torches by him. */
function drawKing(g: Paint, L: ReturnType<typeof layer>): void {
  const { ctx, t, view } = g
  const lx = kingAt(t)
  const x = L.x(lx)
  if (x < TOWER.x0 + 0.45 || x < view.x0 - 1 || x > view.x1 + 1) return
  const r = R_KING * L.s
  const y = L.y(groundAt(lx)) - r
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = tone(AGAMEMNON, t, { fire: 0.75 })
  ctx.fill()
  ctx.lineWidth = Math.max(0.75 * g.px, 0.037 * L.s)
  ctx.strokeStyle = tone(AGAMEMNON_RIM, t)
  ctx.stroke()
  // His mark: the dot, turning as he goes.
  const spin = lx / R_KING
  ctx.beginPath()
  ctx.arc(x + Math.cos(spin) * r * 0.48, y + Math.sin(spin) * r * 0.48, r * 0.2, 0, Math.PI * 2)
  ctx.fillStyle = tone(AGAMEMNON_RIM, t)
  ctx.fill()
}
