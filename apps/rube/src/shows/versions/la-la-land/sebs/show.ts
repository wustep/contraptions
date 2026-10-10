import { ballAt, laneAt, R, type Pt } from '../../../../parts'
import type { Box, Placed } from '../../../../plan'
import { Show, type ShowBall, type ShowPoint } from '../../../../show'
import type { Universe } from '../../../../universe'
import type { World } from '../../../../worlds'
import type { Theme } from '../../../../../../../src/core/themes'
import type { Company, Echo, EchoBall, Who } from './kit'
import { DAVID, DAVID_ID, MIA, MIA_ID, SEB, SON, SON_ID, SON_SCALE } from './worlds'

/**
 * Seb's as a `Show`: one thread through ten places on one clock, and no
 * portal anywhere. The places share one set of cells, laid out left to right
 * in the order the dream visits them, and the stage changes place only while
 * the frame is covered: a blackout, an iris, a curtain, a doorway filling
 * the frame. The club at the end is the club at the start, built again
 * where the thread comes back to it.
 *
 * Every universe runs on show time (`local` is `t`, `begin` is 0), so a
 * part's `t` is always seconds since the ball reached it, and a piece of
 * scenery's `t` is the show's own.
 */

export interface Stage {
  world: World
  theme: Theme
  /** What stands behind and around the chain, drawn first, in order. */
  scenery: Placed[]
  /** The ball's parts, in order of time. */
  chain: Placed[]
  /** What is laid over everything, the ball included: light, and the covers the stage changes under. */
  after?: Placed[]
  /** Show time from which this universe is on the stage. */
  from: number
}

/**
 * Where they look. A ball's mark turns with its rolling everywhere else; in these spans it is turned to look, eased
 * in from its rolling, held, and let go to roll again.
 * - `both`: each looks at the other. The kiss at Lipton's and the room lighting up after it, the curtain call's touch, the roll down the beam to him,
 *   the waltz from its first ONE to the touch among the stars, and the look and the nods at the door, so that her
 *   close shot looks across to him and his back to her; and in the car, where she leans in to him. (The club's kiss is set by
 *   where they sit.)
 * - `mia`: she alone looks: at her table at the start, up from David to the man at the piano.
 * - `seb`: he alone looks: at her, across the room at the start, as he finds her at her table, the what-if's first
 *   moment; and, once she has gone, back at the door she went out by (`at`, a fixed direction), before the count-in.
 */
interface Look {
  from: number
  to: number
  /** How long it takes to turn to look, and to let go. */
  ease: [number, number]
  who: 'both' | 'seb' | 'mia'
  /** A fixed direction to look (radians, on the screen), rather than at her. */
  at?: number
}
const touch = (t: number): Look => ({ from: t, to: t + 1.2, ease: [0.7, 0.8], who: 'both' })
const LOOKS: Look[] = [
  // Leaning in to David over their table, eye to eye, before her eyes go up to the stage.
  { from: 22.0, to: 24.0, ease: [0.4, 0.5], who: 'mia', at: 0 },
  // Up to the stage, clearly above David across the table: the man at the piano is only a little higher than him.
  { from: 25.0, to: 31.5, ease: [1.0, 0.9], who: 'mia', at: -0.87 },
  { from: 32.8, to: 35.2, ease: [0.6, 0.7], who: 'seb' },
  // The kiss, and still eye to eye while the room lights up round them, until they go to the cup.
  // In the hush she looks after the echo of him going (the way it went), and then up, as he comes down to her.
  { from: 62.7, to: 63.55, ease: [0.22, 0.7], who: 'mia', at: Math.PI },
  { from: 65.515, to: 69.4, ease: [0.7, 0.8], who: 'both' },
  touch(125.585),
  touch(266.008),
  { from: 269.9, to: 338.709 + 1.2, ease: [0.3, 0.8], who: 'both' },
  // In the car: where she leans in to him in the jam's silences, and again when they have stopped at the club.
  { from: 399.2, to: 404.6, ease: [0.6, 0.6], who: 'both' },
  { from: 418.5, to: 421.4, ease: [0.6, 0.5], who: 'both' },
  // Waking: her eyes stay on the place beside her, on the dream's him, as it greys, and on David as he sits down in it.
  { from: 451.7, to: 456.6, ease: [0.5, 0.6], who: 'mia', at: 0.05 },
  { from: 461.0, to: 464.2, ease: [0.4, 0.5], who: 'both' },
  { from: 471.2, to: 472.8, ease: [0.5, 0.7], who: 'seb', at: Math.PI + 0.12 },
]
/** The look in force at `t`, and how far it has turned to it. */
function lookAt(t: number): { look: Look; w: number } | null {
  let best: { look: Look; w: number } | null = null
  for (const look of LOOKS) {
    const [i, o] = look.ease
    const w = t < look.from - i || t > look.to + o ? 0 : t < look.from ? 1 - ((look.from - t) / i) ** 2 : t <= look.to ? 1 : 1 - ((t - look.to) / o) ** 2
    if (w > 0 && (!best || w > best.w)) best = { look, w }
  }
  return best
}
/** From `a` toward `b` by `w`, the short way round. */
function turn(a: number, b: number, w: number): number {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a))
  return a + d * w
}

/** David's outline: the candle's warm light on him. */
const DAVID_RIM = '#E9B868'

const IDS: Record<Who, number> = { mia: MIA_ID, david: DAVID_ID, son: SON_ID }
const COLORS: Record<Who, string> = { mia: MIA, david: DAVID, son: SON }

function boundsOf(pieces: Placed[]): Box {
  const b: Box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }
  for (const p of pieces) {
    for (const [c, r] of p.cells) {
      b.x0 = Math.min(b.x0, c)
      b.x1 = Math.max(b.x1, c)
      b.y0 = Math.min(b.y0, r)
      b.y1 = Math.max(b.y1, r)
    }
  }
  return b
}

export class SebsShow extends Show {
  private readonly stages: Stage[]
  private readonly worlds: Universe[]
  /** Every part of the thread, in order of time, whichever universe it was laid in. */
  private readonly thread: Placed[]

  constructor(stages: Stage[], readonly duration: number, private readonly company: Company[] = [], readonly echoList: Echo[] = []) {
    super('sebs')
    this.stages = stages
    this.worlds = stages.map((s, index) => {
      const bounds = boundsOf(s.chain.length ? s.chain : s.scenery)
      return {
        index,
        seed: 'sebs',
        world: s.world,
        theme: s.theme,
        taste: 'arranged',
        ballColor: SEB,
        backdrop: 'plain',
        pieces: [...s.scenery, ...s.chain, ...(s.after ?? [])],
        box: bounds,
        bounds,
        journey: duration,
      }
    })
    const seen = new Set<Placed>()
    this.thread = stages.flatMap((s) => s.chain).filter((p) => (seen.has(p) ? false : (seen.add(p), true))).sort((a, b) => a.start - b.start)
  }

  clamp(t: number): number {
    return Math.max(0, Math.min(this.duration, Number.isFinite(t) ? t : 0))
  }

  override indexAt(t: number): number {
    const time = this.clamp(t)
    let i = 0
    while (i + 1 < this.stages.length && time >= this.stages[i + 1].from) i++
    return i
  }

  override universe(i: number): Universe {
    return this.worlds[Math.max(0, Math.min(this.worlds.length - 1, i))]
  }

  override begin(): number {
    return 0
  }

  override worldAt(i: number): World {
    return this.universe(i).world
  }

  /** The part that has the ball at `t`. */
  holder(t: number): Placed {
    const chain = this.thread
    const time = this.clamp(t)
    let lo = 0
    let hi = chain.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (chain[mid].start <= time) lo = mid
      else hi = mid - 1
    }
    return chain[lo]
  }

  /** Where the ball is at `t`, in cells. Cheap: what the camera samples. */
  where(t: number): Pt {
    const placed = this.holder(t)
    const at = laneAt(placed.lane, this.clamp(t) - placed.start)
    return [placed.col + placed.mirror * at.x, placed.row + at.y]
  }

  override at(t: number): ShowPoint {
    const time = this.clamp(t)
    const index = this.indexAt(time)
    const universe = this.worlds[index]
    const placed = this.holder(time)
    const into = time - placed.start
    const point = laneAt(placed.lane, into)
    const ball = ballAt(placed.ballIn, placed.changes, into)
    const here: ShowPoint = {
      ...point,
      x: placed.col + placed.mirror * point.x,
      y: placed.row + point.y,
      placed,
      ball,
      universe,
      local: time,
      begin: 0,
    }
    const company = (['mia', 'david', 'son'] as Who[]).map((who) => this.companion(time, who)).filter((b): b is ShowBall => !!b)
    const look = lookAt(time)
    if (company.length || look) {
      const hero: ShowBall = {
        id: ball.id,
        x: here.x,
        y: here.y,
        color: ball.color,
        ghost: ball.ghost,
        scale: point.hidden ? 0 : point.scale,
        stretch: point.stretch,
        angle: point.angle,
      }
      // Where they look, each one's mark is turned from its rolling to look.
      const mia = company.find((b) => b.id === MIA_ID)
      if (look) {
        const col = universe.pieces[0]?.col ?? 0
        const { look: l, w } = look
        if (l.at !== undefined) {
          if (l.who === 'mia' && mia) mia.spin = turn((mia.x - col) / R, l.at, w)
          else if (l.who !== 'mia') hero.spin = turn((hero.x - col) / R, l.at, w)
        } else if (mia) {
          const toMia = Math.atan2(mia.y - hero.y, mia.x - hero.x)
          if (l.who !== 'mia') hero.spin = turn((hero.x - col) / R, toMia, w)
          if (l.who !== 'seb') mia.spin = turn((mia.x - col) / R, toMia + Math.PI, w)
        }
      }
      // David, wherever he sits beside her, looks at her: her husband, attentive, while her eyes go to the stage.
      const david = company.find((b) => b.id === DAVID_ID)
      if (david && mia && Math.hypot(david.x - mia.x, david.y - mia.y) < 1.2) david.spin = Math.atan2(mia.y - david.y, mia.x - david.x)
      here.balls = [hero, ...company]
    }
    return here
  }

  /** Mia at `t`, in world cells, or null while no part has her in sight. */
  mia(t: number): ShowBall | null {
    return this.companion(t, 'mia')
  }

  /** David at `t` (only in the club, now), or null. */
  david(t: number): ShowBall | null {
    return this.companion(t, 'david')
  }

  /** Their son at `t` (only in the home movie), or null. */
  son(t: number): ShowBall | null {
    return this.companion(t, 'son')
  }

  /** The other road at `t`: every echo there is, in world cells, each with its place in the list as `id`. */
  echoes(t: number): (EchoBall & { id: number })[] {
    const out: (EchoBall & { id: number })[] = []
    this.echoList.forEach((e, id) => {
      if (t < e.from || t >= e.to) return
      const b = e.at(t)
      if (b && b.a > 0) out.push({ ...b, id })
    })
    return out
  }

  companion(t: number, who: Who): ShowBall | null {
    const time = this.clamp(t)
    const span = this.company.find((s) => s.who === who && time >= s.from && time < s.to)
    const b = span?.at(time)
    if (!b) return null
    const scale = who === 'son' ? (b.scale ?? 1) * SON_SCALE : b.scale
    // David, in the room as it is, lit by their table's candle: his outline warm, so he is seen as someone sitting with
    // her, not a grey shape in the grey room.
    const rim = who === 'david' ? DAVID_RIM : b.rim
    return { ...b, id: IDS[who], color: b.color ?? COLORS[who], scale, ...(rim ? { rim } : {}) }
  }
}
