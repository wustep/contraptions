import { ATREIDES, thopterLook, type ThopterLook, type ThopterPose } from '../../craft/thopter'
import { PAD } from '../../plan'
import { mix, smooth, smoother } from '../../paint'
import { T, LANDED, beatAt, curve, dunesAt } from './geo'

/**
 * The ornithopter's flight: off the palace roof, out over the dunes (low over one crest), across the open erg to the
 * harvester, down beside it; up again as the worm comes over, backing away from it, turning in the high wide shot, and
 * away west toward the lower sun. Where it is over the dunes it keeps its height over their crests, so it can skim one.
 */

/** On the pad: its skids on the pad's top. */
const PAD_Y = PAD[1] - 0.6

const padX = curve([[T.lift, PAD[0]], [131.6, PAD[0] + 0.4], [T.out - 0.01, PAD[0] + 2.6]])
const padY = curve([[T.lift, PAD_Y], [130.95, PAD_Y], [131.8, PAD_Y - 1.2], [T.out - 0.01, PAD_Y - 3.6]])

/** Out over the erg: along, and how high over the crests round it (to its skids' foot: 0 is on the sand). */
const ergX = curve([
  [T.out, 212], [T.dip, 236], [T.skim, 262], [T.climb, 276], [T.open, 298], [T.ahead, 360], [T.plume, 380], [T.sign, 395],
  [151.6, 401.5], [T.touch, LANDED.x],
])
const ergAlt = curve([
  [T.out, 7.5], [T.dip, 5.0], [T.skim, 1.4], [T.climb, 2.6], [T.open, 6], [T.ahead, 8], [T.plume, 7], [T.sign, 3.2], [151.6, 1.0], [T.touch, 0],
])
const ergPitch = curve([
  [T.out, 0.08], [T.dip, 0.14], [T.skim, 0.04], [T.climb, -0.1], [T.open, 0.02], [T.ahead, 0.05], [T.sign, 0.03], [151.6, -0.08], [T.touch, -0.02], [T.settle, 0],
])

/** Up and away: straight up off the flat, backing off from the worm, the turn, and west. */
const awayX = curve([[T.up, LANDED.x], [T.climbing, LANDED.x - 0.4], [T.arch, LANDED.x - 1.5], [T.down, 400], [T.swallow, 395], [T.above, 391], [191.6, 389], [194, 381], [198.252, 352]])
const awayY = curve([[T.up, LANDED.y], [T.climbing, -3.6], [T.arch, -8.5], [T.down, -13], [T.swallow, -15], [T.above, -17], [191.6, -18], [198.252, -22]])
const awayPitch = curve([[T.up, 0], [177.2, -0.12], [T.arch, -0.06], [T.down, -0.1], [T.above, 0], [191.6, 0], [193, 0.06], [198.252, 0.04]])

/** The turn from east to west, in the high wide shot: drawn as a turn about its upright, so it never flips at once. */
const TURN = [190.3, 191.7] as const
const faceAt = (t: number): number => Math.cos(Math.PI * smoother(t, TURN[0], TURN[1]))

export function pose(t: number): ThopterPose {
  if (t < T.out) return { x: padX(t), y: padY(t), face: 1, pitch: 0.06 * smooth(t, 131.2, 132.6) }
  if (t < T.up) {
    const x = ergX(t)
    return { x, y: -dunesAt(x) - 0.6 - ergAlt(t), face: 1, pitch: ergPitch(t) }
  }
  return { x: awayX(t), y: awayY(t), face: faceAt(t) as 1 | -1, pitch: awayPitch(t) }
}

/** Its middle, for the camera to track. */
export const at = (t: number): [number, number] => {
  const p = pose(t)
  return [p.x, p.y]
}

/** Wings: spread open as it lifts, folded once it has settled by the harvester, open again to go. */
function spread(t: number): number {
  if (t < T.touch) return smooth(t, T.lift, 131.2)
  if (t < T.up - 0.6) return 1 - smooth(t, T.touch, T.settle)
  return smooth(t, T.up - 0.6, T.up)
}

/** Skids: drawn up once it is clear of the roof, down for the landing, up again once it is away. */
function gear(t: number): number {
  if (t < T.out) return 1 - smooth(t, 131.4, 132.4)
  if (t < T.up) return smooth(t, 149.5, 151.0)
  return 1 - smooth(t, T.climbing, 179.2)
}

/** The canopy: open for Paul to get out, and Leto, and shut again once they are both back in. */
const canopy = (t: number): number => smooth(t, 163.75, 164.4) * (1 - smooth(t, 175.4, 176.1))

/** Its look at `t`; `shade` (0 to 1) is how far it stands in the worm's shadow, its colours taken toward it. */
export function look(t: number, shade = 0): ThopterLook {
  const l = thopterLook(ATREIDES, beatAt(t), spread(t), gear(t))
  l.canopy = canopy(t)
  if (shade > 0.001) {
    const dim = (c: string) => mix(c, SHADOW, 0.42 * shade)
    l.body = dim(l.body)
    l.belly = dim(l.belly)
    l.wing = dim(l.wing)
  }
  return l
}

const SHADOW = '#4A2C16'
