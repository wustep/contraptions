import { outline, solid } from '../../../../../../src/core/draw'
import { easeInOutSine } from '../../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, over, rail, ramp, roll, wait, type Lane, type Pt } from '../../../parts'
import { brass, feltColor } from './hall'

/**
 * The house curtain. A proscenium two floors high stands over the rail, a
 * gilt valance across its head, and the curtain is down to the boards
 * between its columns: velvet, in its pleats, a gilt band along its hem.
 * The ball rolls in from the wings onto the footlight plate, a rocker, and
 * fetches up against the curtain's edge, past the plate's pivot; the plate
 * tips under it, the footlight at its foot comes on, and the rod from its
 * other end throws the hook out from under a sandbag in the flies. The bag
 * goes down, and the curtain goes up on its cords the way a house curtain
 * does, in swags: up at each cord and hanging in a scallop between, the
 * velvet gathering above in folds. As soon as the hem will let it under all
 * the way, the ball rolls off the tipped plate and through, under the
 * scallops, and out past the far column. Later the bag is wound up again
 * and the curtain comes down, for nobody.
 *
 * The hem is one function of how far the cords have hauled, and the ball
 * waits for it: it goes at the first moment from which it never comes
 * within a finger of the velvet, which is worked out from that hem and the
 * ball's own run.
 */

/** The curtain's two edges, its head behind the valance, and how far the cords haul its hem. */
const XL = -0.05
const XR = 1.38
const HEAD = -1.25
const HAUL = 0.75
/** The cords: one at each edge and three between; and how deep a scallop hangs between two of them when it is hauled right up. */
const BAYS = 4
const BAY = (XR - XL) / BAYS
const SAG = 0.15
/** The valance. */
const VAL_TOP = -1.47
const VAL_BOTTOM = -1.2
/** Where the ball fetches up against the velvet, and the plate it is on by then: its ends and its pivot. */
const XS = XL - R + 0.03
const PLATE: [number, number] = [-0.46, -0.02]
const PIVOT = -0.3
const TIP = 0.075
/** The sandbag's line, and the bag's height on its hook. */
const BAG_X = -0.27
const BAG_Y = -1.0
/** The ball's run up to pace once it goes. */
const RUN = 0.45

const T_STOP = arriveAt(XS)
const T_FIRE = T_STOP + 0.08
const RISE = 1.1
const RESET = 1.3
const FALL = 1.6

/** How far the cords have hauled, `since` the bag went. */
const hauled = (since: number, tExit: number) => HAUL * (easeInOutSine(over(since, 0, RISE)) - easeInOutSine(over(since, tExit + RESET, tExit + RESET + FALL)))
/** The hem's height at `x` with the cords hauled `h`: up at the cords, in a scallop between. */
function hemAt(x: number, h: number): number {
  const f = ((x - XL) / BAY) % 1
  return FLOOR - h + SAG * Math.min(1, h / 0.3) * Math.sin(Math.PI * Math.max(0, f))
}

/** The ball's place `s` seconds after it goes: up to pace over RUN, then on. */
function runAt(s: number): number {
  const up = RUN / (ROLL / 2)
  return s < up ? XS + (ROLL * s * s) / (2 * up) : XS + RUN + ROLL * (s - up)
}
/** The first moment, after the bag goes, from which the ball can run the whole way without coming within a finger of the hem. */
const GO = (() => {
  const clear = (go: number): boolean => {
    for (let s = 0; runAt(s) < XR + R; s += 1 / 120) {
      const bx = runAt(s)
      for (let i = -4; i <= 4; i++) {
        const x = bx + (i / 4) * R
        if (x < XL || x > XR) continue
        const top = -Math.sqrt(R * R - (x - bx) ** 2)
        if (hemAt(x, HAUL * easeInOutSine(over(go + s, 0, RISE))) > top - 0.03) return false
      }
    }
    return true
  }
  let go = 0
  while (!clear(go) && go < RISE) go += 1 / 120
  return go
})()
const T_GO = T_FIRE + GO
const T_EXIT = T_GO + RUN / (ROLL / 2) + (1.5 - XS - RUN) / ROLL

const LANE: Lane = {
  segs: [...arrive([-0.5, 0], [XS, 0.01]), wait([XS, 0.01], T_GO - T_STOP), ramp([XS, 0.01], [XS + RUN, 0], 0, ROLL), roll([XS + RUN, 0], [1.5, 0], ROLL)],
  fire: T_FIRE,
}

export const curtain = definePiece<{ color: string }>({
  name: 'curtain',
  weight: 0.9,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, -1],
      [1, -1],
    ]
    if (!fits(cells, [2, 0])) return null
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { color: feltColor(theme, color, ball.color) } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight, theme }) => {
    const gold = brass(theme)
    const h = since < 0 ? 0 : hauled(since, T_EXIT - T_FIRE)
    // The plate is tipped for as long as the ball is on it past its pivot.
    const on = over(t, T_STOP - 0.06, T_FIRE) * (1 - over(t, T_GO + 0.1, T_GO + 0.22))

    // The rail: from the wings to the plate, and from the plate on under the curtain and out.
    rail(p, k, ink, weight, -0.5, PLATE[0] - 0.01)
    rail(p, k, ink, weight, PLATE[1] + 0.01, 1.5)

    // The columns, behind everything, and the valance across their heads and out over the wings.
    solid(p, ink, weight, bg)
    for (const x of [XL - 0.05, XR + 0.05]) p.rect(x * k, ((VAL_BOTTOM + 0.5) / 2) * k, 0.075 * k, (0.5 - VAL_BOTTOM) * k)

    // The curtain: from its head down its edges to the hem, up at every cord and in a scallop between.
    const n = 48
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(XL * k, HEAD * k)
    p.vertex(XR * k, HEAD * k)
    for (let i = n; i >= 0; i--) {
      const x = XL + ((XR - XL) * i) / n
      p.vertex(x * k, hemAt(Math.min(x, XR - 1e-6), h) * k)
    }
    p.endShape(p.CLOSE)
    // Its pleats at the cords; and above each scallop the folds the velvet gathers into as it is hauled.
    outline(p, ink, weight * 0.6)
    for (let i = 1; i < BAYS; i++) p.line((XL + i * BAY) * k, VAL_BOTTOM * k, (XL + i * BAY) * k, hemAt(XL + i * BAY, h) * k)
    for (let fold = 1; fold <= 2; fold++) {
      const depth = Math.min(1, Math.max(0, (h - fold * 0.2) / 0.25))
      if (depth <= 0) continue
      for (let b = 0; b < BAYS; b++) {
        p.beginShape()
        for (let i = 0; i <= 10; i++) {
          const f = i / 10
          p.vertex((XL + (b + f) * BAY) * k, (FLOOR - h - fold * 0.1 * depth + SAG * depth * Math.sin(Math.PI * f) * (1 - fold * 0.25)) * k)
        }
        p.endShape()
      }
    }
    // The gilt band along the hem.
    solid(p, ink, weight * 0.8, gold)
    p.beginShape()
    for (let i = 0; i <= n; i++) {
      const x = XL + ((XR - XL) * i) / n
      p.vertex(x * k, (hemAt(Math.min(x, XR - 1e-6), h) - 0.055) * k)
    }
    for (let i = n; i >= 0; i--) {
      const x = XL + ((XR - XL) * i) / n
      p.vertex(x * k, hemAt(Math.min(x, XR - 1e-6), h) * k)
    }
    p.endShape(p.CLOSE)

    // The valance: a gilt band with a scalloped foot.
    solid(p, ink, weight, gold)
    const v0 = -0.48
    const v1 = XR + 0.1
    p.beginShape()
    p.vertex(v0 * k, VAL_TOP * k)
    p.vertex(v1 * k, VAL_TOP * k)
    const scallops = 6
    for (let i = scallops * 8; i >= 0; i--) {
      const f = i / (scallops * 8)
      p.vertex((v0 + (v1 - v0) * f) * k, (VAL_BOTTOM + 0.07 * Math.abs(Math.sin(Math.PI * f * scallops))) * k)
    }
    p.endShape(p.CLOSE)

    // The sandbag in the flies, on its line from the valance: on its hook, and down as far as the cords have hauled.
    const bag = BAG_Y + h
    outline(p, ink, weight * 0.8)
    p.line(BAG_X * k, (VAL_BOTTOM + 0.04) * k, BAG_X * k, (bag - 0.09) * k)
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex((BAG_X - 0.03) * k, (bag - 0.09) * k)
    p.vertex((BAG_X + 0.03) * k, (bag - 0.09) * k)
    p.vertex((BAG_X + 0.07) * k, (bag + 0.09) * k)
    p.vertex((BAG_X - 0.07) * k, (bag + 0.09) * k)
    p.endShape(p.CLOSE)
    // The hook under it, and the rod up to the hook's tail from the plate's far end, which rises as the plate tips.
    const lift = on * Math.sin(TIP) * (PIVOT - PLATE[0])
    const thrown = since < 0 ? over(t, T_STOP, T_FIRE) : 1 - over(since, T_EXIT - T_FIRE + RESET + FALL - 0.1, T_EXIT - T_FIRE + RESET + FALL + 0.2)
    outline(p, ink, weight * 0.8)
    p.line((PLATE[0] + 0.02) * k, (FLOOR - lift) * k, (PLATE[0] + 0.02) * k, (BAG_Y + 0.13 - lift) * k)
    p.push()
    p.translate((PLATE[0] + 0.05) * k, (BAG_Y + 0.13) * k)
    p.rotate(0.9 * thrown)
    solid(p, ink, weight, gold)
    p.rect(0.045 * k, 0, 0.17 * k, 0.045 * k, 0.015 * k)
    p.pop()

    // The footlight plate, rocking on its post, and the shell footlight at the post's foot, which comes on.
    outline(p, ink, weight)
    p.line(PIVOT * k, (FLOOR + 0.03) * k, PIVOT * k, 0.5 * k)
    solid(p, ink, weight, on > 0.5 ? gold : bg)
    p.arc(PIVOT * k, 0.5 * k, 0.26 * k, 0.28 * k, Math.PI, Math.PI * 2, p.CHORD)
    p.push()
    p.translate(PIVOT * k, (FLOOR + 0.0175) * k)
    p.rotate(TIP * on)
    solid(p, ink, weight, s.color)
    p.rect(((PLATE[0] + PLATE[1]) / 2 - PIVOT) * k, 0, (PLATE[1] - PLATE[0]) * k, 0.035 * k, 0.008 * k)
    p.pop()
  },
})
