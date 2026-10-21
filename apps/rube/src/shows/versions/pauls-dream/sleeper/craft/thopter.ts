import { blob, ellipse, fill, line, mix, poly, rgba, stroke, type Paint, type Pt } from '../paint'

/**
 * The ornithopter, side on: a long body with a glass nose, a tail boom, two pairs of long narrow wings on its back
 * that beat like a dragonfly's, front and rear in turn, and two skids under it. Two balls ride in the nose (`seat`).
 *
 * `drawThopter` is its body and the far wings (under the balls); `drawThopterOver` is the glass and the near wings (over
 * them), so the riders are seen through the canopy. Local cells, facing right, the body's middle at the origin, about
 * 3.4 cells nose to tail.
 */

export interface ThopterPose {
  x: number
  y: number
  /** 1 facing right, -1 facing left. */
  face: 1 | -1
  /** Its pitch, radians, nose down positive (whichever way it faces). */
  pitch?: number
}

export interface ThopterLook {
  /** Where the wings are in their beat, radians (the caller times it: on the click, the wings beat on the music). */
  beat: number
  /** How wide they sweep, 0 (folded back along the body, still) to 1 (a full beat). */
  spread: number
  /** The skids: 1 down, 0 drawn up. */
  gear: number
  /** House colours. */
  body: string
  belly: string
  wing: string
  glass: string
}

export const ATREIDES: Omit<ThopterLook, 'beat' | 'spread' | 'gear'> = {
  body: '#77736A',
  belly: '#46443F',
  wing: '#D8D0BE',
  glass: '#2B3A40',
}

export const HARKONNEN: Omit<ThopterLook, 'beat' | 'spread' | 'gear'> = {
  body: '#34363A',
  belly: '#1C1D20',
  wing: '#6A6D72',
  glass: '#141619',
}

/** The two seats in the nose, local cells: the pilot's forward, the passenger's behind. */
const SEATS: Pt[] = [[1.02, -0.1], [0.6, -0.1]]
const ROOTS: Pt[] = [[0.18, -0.36], [-0.52, -0.33]]
const WING = 2.5

function toWorld(p: ThopterPose, [lx, ly]: Pt): Pt {
  const a = (p.pitch ?? 0) * p.face
  const c = Math.cos(a)
  const s = Math.sin(a)
  const x = lx * p.face
  return [p.x + x * c - ly * s, p.y + x * s + ly * c]
}

/** Where rider `i` sits (0 the pilot), in world cells. */
export const seat = (p: ThopterPose, i: 0 | 1): Pt => toWorld(p, SEATS[i])

function enter(g: Paint, p: ThopterPose): void {
  g.ctx.save()
  g.ctx.translate(p.x, p.y)
  g.ctx.rotate((p.pitch ?? 0) * p.face)
  g.ctx.scale(p.face, 1)
}

/** One wing at angle `a` above the backward line from its root, `far` drawn paler and a little shorter. */
function wing(g: Paint, root: Pt, a: number, look: ThopterLook, far: boolean): void {
  const ctx = g.ctx
  const len = far ? WING * 0.92 : WING
  const w = far ? 0.085 : 0.1
  const c = Math.cos(a)
  const s = Math.sin(a)
  const dir: Pt = [-c, -s]
  const nrm: Pt = [s, -c]
  const at = (u: number, side: number): Pt => [root[0] + dir[0] * len * u + nrm[0] * w * side, root[1] + dir[1] * len * u + nrm[1] * w * side]
  blob(ctx, [root, at(0.15, 0.7), at(0.55, 1), at(0.92, 0.7), [root[0] + dir[0] * len, root[1] + dir[1] * len], at(0.92, -0.6), at(0.55, -0.85), at(0.15, -0.6)])
  fill(ctx, rgba(far ? mix(look.wing, look.belly, 0.35) : look.wing, far ? 0.55 : 0.78))
  stroke(g, rgba(look.belly, far ? 0.4 : 0.7), 0.018)
}

/** The angles of the front and rear wings: a beat between near-flat and high, front and rear in turn. */
function wingAngles(look: ThopterLook): [number, number] {
  // Folded, they lie back along the body, a little down; beating, they sweep from there to about twenty degrees up.
  const rest = -0.05
  const sweep = 0.19 * look.spread
  const mid = rest + sweep
  return [mid + sweep * Math.sin(look.beat), mid + sweep * Math.sin(look.beat + Math.PI * 0.8)]
}

export function drawThopter(g: Paint, p: ThopterPose, look: ThopterLook): void {
  const ctx = g.ctx
  enter(g, p)
  const [af, ar] = wingAngles(look)
  // The far wings first, behind the body.
  wing(g, [ROOTS[1][0] + 0.06, ROOTS[1][1] - 0.03], ar + 0.08, look, true)
  wing(g, [ROOTS[0][0] + 0.06, ROOTS[0][1] - 0.03], af + 0.08, look, true)
  // Skids: legs swinging down from the belly to a runner.
  if (look.gear > 0.01) {
    const drop = 0.42 * look.gear
    for (const lx of [0.75, -0.45]) line(g, [lx, 0.18], [lx - 0.12 * (1 - look.gear), 0.18 + drop], look.belly, 0.045)
    line(g, [-0.75, 0.18 + drop], [1.05, 0.18 + drop], look.belly, 0.05)
  }
  // The tail boom, tapering back and up a little to a fin.
  poly(ctx, [[-0.5, -0.2], [-1.85, -0.16], [-2.0, -0.32], [-2.06, -0.06], [-1.85, 0.0], [-0.5, 0.16]])
  fill(ctx, look.body)
  // The body: a long rounded hull, its belly darker.
  blob(ctx, [[-0.75, -0.3], [0.35, -0.36], [0.95, -0.3], [1.6, -0.02], [1.5, 0.2], [0.6, 0.27], [-0.7, 0.24], [-0.9, -0.02]])
  fill(ctx, look.body)
  blob(ctx, [[-0.8, 0.08], [0.6, 0.1], [1.45, 0.06], [1.42, 0.2], [0.6, 0.28], [-0.7, 0.25]])
  fill(ctx, look.belly)
  // The cabin behind the glass, dark, where the riders sit.
  blob(ctx, [[0.32, -0.3], [0.95, -0.34], [1.5, -0.04], [1.4, 0.12], [0.36, 0.12]])
  fill(ctx, mix(look.glass, '#000000', 0.25))
  // An engine nacelle under each wing root.
  for (const [rx] of ROOTS) {
    ellipse(ctx, rx + 0.05, -0.28, 0.22, 0.09)
    fill(ctx, mix(look.body, look.belly, 0.5))
  }
  ctx.restore()
}

export function drawThopterOver(g: Paint, p: ThopterPose, look: ThopterLook): void {
  const ctx = g.ctx
  enter(g, p)
  // The canopy: tinted glass over the riders, framed by two struts.
  blob(ctx, [[0.32, -0.3], [0.95, -0.34], [1.5, -0.04], [1.4, 0.12], [0.36, 0.12]])
  fill(ctx, rgba(look.glass, 0.32))
  stroke(g, look.belly, 0.03)
  line(g, [0.82, -0.33], [0.84, 0.11], rgba(look.belly, 0.85), 0.025)
  // The near wings, over everything.
  const [af, ar] = wingAngles(look)
  wing(g, ROOTS[1], ar, look, false)
  wing(g, ROOTS[0], af, look, false)
  ctx.restore()
}

/** A look for a thopter in flight (`beat` from show time on the click), landed (`spread` 0), or anything between. */
export function thopterLook(house: Omit<ThopterLook, 'beat' | 'spread' | 'gear'>, beat: number, spread: number, gear: number): ThopterLook {
  return { ...house, beat, spread, gear }
}
