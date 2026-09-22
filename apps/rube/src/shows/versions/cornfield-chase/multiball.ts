import { clamp, easeInOutSine, easeOutCubic } from '../../../../../../src/core/ease'
import type { Box } from '../../../plan'
import type { ShowBall, ShowPoint } from '../../../show'
import { Show } from '../../../show'
import { extentOf, universeAt, type Universe } from '../../../universe'
import type { Framing, Performance } from '../../registry'
import recording from '../../../../../../docs/promo/cornfield-chase-zimmer.mp3'

/**
 * Cornfield Chase, as four kinematic riders on one garden.
 *
 * The music is the only clock. Each rider is born on a phrase accent of the
 * Zimmer cue, runs a lane offset in Y from the garden's own path, and eases
 * back onto that path so the four meet in the exit portal. Nothing collides.
 * One garden is a short chain, so the lanes run it out and back — stopping
 * shy of the door — and only the last pass goes in. That keeps a chase pace
 * instead of a two-minute crawl. The machines follow the first rider, and
 * scrub backwards when that rider turns around; a piece already has to look
 * right under a reversed clock. The other three are painted, not simulated.
 *
 * Accents are read off the recording: the ostinato speaks at 6.64s, the next
 * phrases at 14.96s and 22.66s, and the chase itself hits at 41.92s. They
 * arrive together at 124.5s, as the cue falls away.
 */

/** Seconds of the WaterTower upload. Show time zero is the start of the file. */
export const CORNFIELD_DURATION = 126.984

/** Show time at which every lane has reached the portal. */
export const CORNFIELD_MEET = 124.5

/** Allotment paper, plain ground: the field the chase is run on. */
const SEED = 'field'

/** Cells per second the first rider averages, out and back, before the door. */
const CHASE_PACE = 2.2

export interface CornfieldRider {
  id: number
  /** Show time the rider appears. */
  spawn: number
  /** Cells of Y offset while the lane is open. Positive is down. */
  lane: number
  color: string
}

export const CORNFIELD_RIDERS: readonly CornfieldRider[] = [
  { id: 1, spawn: 6.64, lane: -1.05, color: '#E2B33A' },
  { id: 2, spawn: 14.96, lane: -0.35, color: '#3F7D34' },
  { id: 3, spawn: 22.66, lane: 0.35, color: '#2C4C7C' },
  { id: 4, spawn: 41.92, lane: 1.05, color: '#C4512C' },
]

interface Knot {
  d: number
  x: number
  y: number
  scale: number
  local: number
  /** Inside either portal. The out-and-back stays off these samples, so the iris waits for the last pass. */
  door: boolean
}

interface Course {
  universe: Universe
  knots: Knot[]
  /** Arc length just clear of the entrance portal. */
  d0: number
  /** Arc length shy of the exit portal: the turnaround. */
  dTurn: number
  /** Arc length at the end of the exit portal. */
  dEnd: number
  /** Out-and-back trips before the final run into the door. */
  loops: number
  framing: Framing
}

const ASPECT = 16 / 9

function buildCourse(universe: Universe): Course {
  const n = Math.max(2, Math.ceil(universe.journey * 30))
  const knots: Knot[] = []
  let d = 0
  let px = 0
  let py = 0
  for (let i = 0; i <= n; i++) {
    const local = (universe.journey * i) / n
    const at = universeAt(universe, local)
    if (i > 0) d += Math.hypot(at.x - px, at.y - py)
    px = at.x
    py = at.y
    knots.push({ d, x: at.x, y: at.y, scale: at.scale, local, door: at.placed.piece.name === 'portal' })
  }
  let i0 = 0
  while (i0 < knots.length - 1 && knots[i0].door) i0++
  let i1 = knots.length - 1
  while (i1 > i0 && knots[i1].door) i1--
  const d0 = knots[i0].d
  const dTurn = Math.max(d0 + 0.5, knots[i1].d)
  const dEnd = Math.max(dTurn, knots[knots.length - 1].d)
  const span = dTurn - d0
  const finale = Math.max(span, dEnd - d0)
  const travel = CORNFIELD_MEET - CORNFIELD_RIDERS[0].spawn
  const loops = Math.max(0, Math.min(5, Math.round((CHASE_PACE * travel - finale) / (span * 2))))
  const extent = extentOf(universe)
  return {
    universe,
    knots,
    d0,
    dTurn,
    dEnd,
    loops,
    framing: frameOf(extent),
  }
}

/** Where `progress` (0 at the entrance, 1 in the exit portal) sits on the arc. */
function arcAt(course: Course, progress: number): number {
  const span = course.dTurn - course.d0
  const finale = course.dEnd - course.d0
  const total = course.loops * span * 2 + finale
  let remain = clamp(progress) * total
  const leg = (forward: boolean, into: number): number => {
    const f = easeInOutSine(clamp(into / span))
    return forward ? course.d0 + f * span : course.dTurn - f * span
  }
  for (let i = 0; i < course.loops; i++) {
    if (remain <= span) return leg(true, remain)
    remain -= span
    if (remain <= span) return leg(false, remain)
    remain -= span
  }
  const f = finale <= 0 ? 1 : easeInOutSine(clamp(remain / finale))
  return course.d0 + f * finale
}

/** The whole garden, with room for a lane on either side. Cells of a 16:9 frame. */
function frameOf(extent: Box): Framing {
  const padX = 1.8
  const padY = 2.6
  const w = extent.x1 - extent.x0 + padX * 2
  const h = extent.y1 - extent.y0 + padY * 2
  return {
    x: (extent.x0 + extent.x1) / 2,
    y: (extent.y0 + extent.y1) / 2,
    cells: Math.max(h, w / ASPECT),
  }
}

function knotAt(knots: Knot[], d: number): Knot {
  const last = knots[knots.length - 1]
  const dist = Math.max(0, Math.min(last.d, d))
  let lo = 0
  let hi = knots.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (knots[mid].d < dist) lo = mid + 1
    else hi = mid
  }
  const b = knots[lo]
  const a = knots[Math.max(0, lo - 1)]
  if (a === b || b.d === a.d) return b
  const f = (dist - a.d) / (b.d - a.d)
  return {
    d: dist,
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
    scale: a.scale + (b.scale - a.scale) * f,
    local: a.local + (b.local - a.local) * f,
    door: f < 0.5 ? a.door : b.door,
  }
}

function progressOf(spawn: number, t: number): number {
  return clamp((t - spawn) / (CORNFIELD_MEET - spawn))
}

export class CornfieldChase extends Show {
  private course: Course | null = null

  constructor() {
    super(SEED, { world: 'garden' })
  }

  private road(): Course {
    if (!this.course) this.course = buildCourse(this.universe(0))
    return this.course
  }

  /** Authored overview: the whole garden, not a follow shot. */
  cameraAt(): Framing {
    return this.road().framing
  }

  override at(t: number): ShowPoint {
    const course = this.road()
    const time = Math.max(0, t)
    const balls: ShowBall[] = []
    let leadLocal = 0
    let lead: ShowBall | null = null
    const place = (rider: CornfieldRider, at: number): { x: number; y: number; scale: number; local: number } => {
      const progress = progressOf(rider.spawn, at)
      const knot = knotAt(course.knots, arcAt(course, progress))
      const merge = easeInOutSine(clamp((progress - 0.8) / 0.2))
      return {
        x: knot.x,
        y: knot.y + rider.lane * (1 - merge),
        scale: knot.scale,
        local: knot.local,
      }
    }
    for (const rider of CORNFIELD_RIDERS) {
      if (time < rider.spawn) continue
      const here = place(rider, time)
      const next = place(rider, time + 0.05)
      const pop = easeOutCubic(clamp((time - rider.spawn) / 0.45))
      const scale = here.scale * pop
      const vx = (next.x - here.x) / 0.05
      const vy = (next.y - here.y) / 0.05
      const placed: ShowBall = {
        id: rider.id,
        x: here.x,
        y: here.y,
        vx,
        vy,
        color: rider.color,
        scale,
        stretch: here.scale < 0.98 ? 1 + 2.4 * Math.pow(clamp(1 - here.scale), 1.4) : 1,
        angle: Math.atan2(vy, vx),
        ghost: false,
      }
      balls.push(placed)
      if (!lead) {
        lead = placed
        leadLocal = here.local
      }
    }
    const point = universeAt(course.universe, lead ? leadLocal : 0)
    return {
      ...point,
      x: lead ? lead.x : point.x,
      y: lead ? lead.y : point.y,
      universe: course.universe,
      local: lead ? leadLocal : 0,
      begin: 0,
      balls,
    }
  }
}

export function cornfieldPerformance(): Performance {
  const show = new CornfieldChase()
  return {
    show,
    duration: CORNFIELD_DURATION,
    camera: () => show.cameraAt(),
    soundtrack: {
      src: recording,
      offset: 0,
      credit: 'Hans Zimmer — Cornfield Chase, from Interstellar (WaterTower, 2014). Tech demo only; not licensed for a public show.',
      href: 'https://www.youtube.com/watch?v=JuSsvM8B4Jc',
    },
  }
}
