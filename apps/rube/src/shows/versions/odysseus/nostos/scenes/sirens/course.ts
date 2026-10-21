import { R } from '../../../../../../parts'
import { BEAT, M } from '../../music'
import { ride, type Move, type Pt } from '../../path'
import { glide } from '../../voyage'
import { floatAt, onShip, type Pose } from '../../world/ship'

/**
 * His ship from the Sirens to the bolt (251.36 to the cut at 304.611): one course, so the three scenes that share it
 * agree on where the ship is. It comes in under sail at five cells a second, slows to the rowers' pace past the rocks,
 * gathers way again, runs onto Thrinacia's beach and lies there becalmed while the men go ashore, and puts out into the
 * storm, where the bolt finds it at sea.
 */

/** When Zeus's bolt strikes the mast: the tutti's cut-off. */
export const STRIKE = M.cut

/** Where its bow comes to the beach, and how long it lies there. */
export const BEACHED = { x: 495.6, from: 284.2, to: 294.6 }

export const shipX = glide([
  [251.36, 392, 5],
  [258.5, 418, 3.0],
  [272.5, 455, 3.0],
  [278.36, 480, 4.5],
  [BEACHED.from, BEACHED.x, 0],
  [BEACHED.to, BEACHED.x, 0],
  [299.5, 507, 4.0],
  [STRIKE, 531, 4.6],
])

export const shipPose = (t: number): Pose => floatAt(shipX(t), t)

/** The rowers' stroke: the comb's beat, the catch on every beat (`BEAT`), counted from the comb's first. */
export const strokeAt = (t: number): number => (t - 188.35) / BEAT

/**
 * A ball moving about the deck: at `local(t)` in the ship's own frame, carried with the ship, its mark turning by how far
 * it has rolled along the deck (forward is clockwise) and with the ship's own lean.
 */
export function onDeck(local: (t: number) => Pt, t0: number, t1: number, r = R, pose: (t: number) => Pose = shipPose): Move {
  const start = local(t0)[0]
  return ride(
    (t) => onShip(pose(t), local(t)),
    t0,
    t1,
    (t) => pose(t).a + (local(t)[0] - start) / r,
  )
}

/** A deck walk from `a` to `b` (ship frame) between `t0` and `t1`, from rest to rest. */
export function walk(a: Pt, b: Pt, t0: number, t1: number): (t: number) => Pt {
  return (t) => {
    const u = Math.max(0, Math.min(1, (t - t0) / (t1 - t0)))
    const s = u * u * (3 - 2 * u)
    return [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s]
  }
}

/**
 * A value worked out the first time it is asked for. Anything that reads the sea (a ship's pose, a point on the swell)
 * must wait until the score has set the weather (`setWeather`), which it does after the scenes are loaded: so a
 * flight's ends, or a drift's start, are found on first use, not when the module loads.
 */
export function lazy<T>(f: () => T): () => T {
  let done = false
  let v: T
  return () => {
    if (!done) {
      v = f()
      done = true
    }
    return v
  }
}

/** A move whose shape is built the first time it is asked where the ball is (`lazy`). */
export function later(t0: number, t1: number, kind: Move['kind'], build: () => Move): Move {
  const m = lazy(build)
  return {
    t0,
    t1,
    kind,
    at: (t) => m().at(t),
    turn: (t) => m().turn?.(t) ?? 0,
  }
}
