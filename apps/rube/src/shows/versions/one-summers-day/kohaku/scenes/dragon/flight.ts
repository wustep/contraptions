import { M, spread } from '../../music'
import { clamp01, smooth, type Pt } from '../../paint'
import { trail } from '../../world/dragon'

/**
 * The dragon's way in (M.rise → M.high): from far out over the sea, harried by the paper birds, round in front of the
 * bathhouse, at her room's door, through it, and down on its floor; then the thrashing, dying away to stillness.
 *
 * His head goes through timed points on a smooth curve (each point's tangent from its neighbours, so he never turns on
 * a pin); the body is the head's own way behind it. Once he is down, the body is held where it lay and only writhes.
 */

/** [t, x, y]: where his head is. Through the door on the peak. */
const KEYS: [number, number, number][] = [
  [99.0, 101, -11.6],
  [102.5, 96.5, -10.4],
  [105.5, 92.5, -12.3],
  [108.5, 88.5, -10.1],
  [111.0, 85.5, -7.6],
  [113.4, 89, -6.4],
  [115.8, 93, -9.4],
  [118.0, 88.5, -12.2],
  [120.2, 82.0, -9.4],
  [122.0, 76.0, -6.9],
  [M.peak, 70.5, -6.12],
  [M.peak + 0.39, 69.0, -6.22],
  [M.peak + 0.79, 67.4, -6.22],
  [M.peak + 1.09, 66.65, -5.95],
  [M.peak + 1.39, 67.0, -5.66],
  [M.peak + 1.69, 68.0, -5.63],
  [M.peak + 1.94, 68.5, -5.63],
]

/** Where he stops, down on the floor, his head towards the door. */
export const STOP = KEYS[KEYS.length - 1][0]
/** He is through the door: his tail's end passes it about here. */
export const THROUGH = M.peak + 1.4

/** A Hermite curve through the keys, each tangent from its neighbours (non-uniform in time); held at the ends. */
export function head(t: number): Pt {
  const k = KEYS
  if (t <= k[0][0]) {
    // Before the first key he is coming in from further out the same way.
    const [t0, x0, y0] = k[0]
    const [t1, x1, y1] = k[1]
    const s = (t - t0) / (t1 - t0)
    return [x0 + (x1 - x0) * s, y0 + (y1 - y0) * s]
  }
  if (t >= k[k.length - 1][0]) return [k[k.length - 1][1], k[k.length - 1][2]]
  let i = 0
  while (i + 1 < k.length && k[i + 1][0] <= t) i++
  const tan = (j: number): Pt => {
    const a = k[Math.max(0, j - 1)]
    const b = k[Math.min(k.length - 1, j + 1)]
    const dt = b[0] - a[0] || 1
    return [(b[1] - a[1]) / dt, (b[2] - a[2]) / dt]
  }
  const [t0, x0, y0] = k[i]
  const [t1, x1, y1] = k[i + 1]
  const h = t1 - t0
  const u = (t - t0) / h
  const m0 = tan(i)
  const m1 = tan(i + 1)
  const h00 = 2 * u * u * u - 3 * u * u + 1
  const h10 = u * u * u - 2 * u * u + u
  const h01 = -2 * u * u * u + 3 * u * u
  const h11 = u * u * u - u * u
  return [h00 * x0 + h10 * h * m0[0] + h01 * x1 + h11 * h * m1[0], h00 * y0 + h10 * h * m0[1] + h01 * y1 + h11 * h * m1[1]]
}

/** The blows of the thrashing: the onsets he jerks on, dying away to stillness. */
export const JERKS = spread(125.6, 131.6, 5)
/** He lies still from here. */
export const STILL = 133.6

const frozen = new Map<number, Pt[]>()

/** His spine at `t`: flying, his head's way behind it; down, where he lay, writhing as the pain takes him. */
export function spineAt(t: number): Pt[] {
  if (t <= STOP) return trail(head, t, undefined, 48, t > THROUGH - 0.6 ? 0.04 : 0.16)
  let base = frozen.get(0)
  if (!base) {
    base = trail(head, STOP, undefined, 48, 0.04)
    frozen.set(0, base)
  }
  const out: Pt[] = []
  const n = base.length - 1
  // A slow writhe running down him, and a jerk on each blow, dying away; nothing at all once he is still.
  let jolt = 0
  for (const j of JERKS) if (t >= j) jolt += Math.exp(-(t - j) / 0.35) * Math.sin(Math.min(Math.PI, (t - j) * 9))
  const quiet = 1 - smooth(t, STILL - 1, STILL)
  const amp = (0.07 * (1 - smooth(t, 129, STILL)) + 0.08 * jolt) * quiet
  // On each blow his head comes up off the floor and his back arches, and they go down again; each blow weaker.
  const rear = JERKS.reduce((s, j, k) => s + (1 - 0.16 * k) * blow(t - j), 0) * quiet
  const arch = JERKS.reduce((s, j, k) => s + (1 - 0.16 * k) * blow(t - j - 0.08), 0) * quiet
  for (let i = 0; i <= n; i++) {
    const a = base[Math.max(0, i - 1)]
    const b = base[Math.min(n, i + 1)]
    const dx = a[0] - b[0]
    const dy = a[1] - b[1]
    const d = Math.hypot(dx, dy) || 1
    const u = i / n
    // Less along the ceiling than on the floor, where he has room.
    const room = u < 0.45 ? 1 : 0.5
    const w = amp * room * Math.sin(2 * Math.PI * (u * 1.4 - (t - STOP) * 1.1)) * Math.sin(Math.PI * clamp01(u * 1.2))
    const lift = 0.3 * rear * Math.pow(Math.max(0, 1 - u / 0.22), 2) + 0.13 * arch * Math.sin(Math.PI * clamp01((u - 0.06) / 0.3))
    out.push([base[i][0] + (dy / d) * w, base[i][1] - (dx / d) * w - lift])
  }
  return out
}

/** One blow's heave, `s` seconds after it: up quickly, down again a little slower, then nothing. */
function blow(s: number): number {
  if (s <= 0 || s >= 0.75) return 0
  return s < 0.22 ? Math.sin((Math.PI / 2) * (s / 0.22)) : Math.cos((Math.PI / 2) * ((s - 0.22) / 0.53))
}

/** Which way is up for him: back to the sky going west over the sea, and as he goes in through the door. */
export function upAt(t: number): number {
  // Inside: west along the ceiling with his back to it, then round and east along the floor, his back to the sky.
  if (t > M.peak - 0.3) return -1 + 2 * smooth(t, M.peak + 1.05, M.peak + 1.4)
  // Over the sea he rolls as he turns: his back to the sky whichever way he is going.
  let east = 0
  for (let j = -3; j <= 3; j++) {
    const a = head(t + j * 0.08 - 0.04)
    const b = head(t + j * 0.08 + 0.04)
    east += (b[0] - a[0]) / 0.08
  }
  return Math.max(-1, Math.min(1, east / 7 / 1.2))
}
