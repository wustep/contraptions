import { R } from '../../../../parts'
import type { ShowBall } from '../../../../show'

/**
 * Every ball's mark (the director's): the dot on a ball is a spot on it, so it turns as the ball rolls, by the
 * distance rolled over the ball's radius, clockwise going right over the ground; and not at all while nothing turns
 * the ball: carried (on the van's bench), on skis, afloat, weightless, or thrown and falling.
 *
 * The stage's own rule turns a mark with the ball's x, which spins a ball that rides in the van or runs on skis, turns
 * one that floats or flies sideways, under-turns one going up a slope, and jumps at every cut between worlds (each
 * world has its own cells). Here each mark is rolled along the ball's path instead, at 1/120 s, and joined up across
 * the cuts. Where a part sets a mark itself (a look: Mal's eye on him, Fischer's eyes to the window, the children's
 * faces), the part's mark is kept while the ball stands, and rolled on from it whenever the ball rolls.
 *
 * A stretch of a ball's own rolling begins where its mark can be carried on: from a part's mark it meets, or across a
 * match cut where the ball holds its place on the screen. Where the stretch begins under a blink or a veil it is
 * joined to the part's mark at its end instead (Ariadne waking on the plane); with neither, the stage's rule gives its
 * start, so a mark a part was laid out for (home: Cobb comes to rest turned to the children) is as it was.
 */

/** A stretch in which these balls' marks hold still while they move: carried, on skis, afloat, weightless. */
export interface Held {
  ids: number[]
  from: number
  to: number
}

/** A stretch in which a ball rolls on something that itself turns: its mark there, up to a constant (the hotel's drum). */
export interface Turned {
  id: number
  from: number
  to: number
  at: (t: number) => number
}

export interface MarkPlan {
  held: Held[]
  turned: Turned[]
  /** The cuts hidden under a blink or a veil: a mark may start afresh there. */
  covered: number[]
  /** Stretches whose marks a part already rolls itself (Paris, where the street folds over): left as it has them. */
  own: [number, number][]
}

/** The balls at `t` as the parts have them, which leg has Cobb, and where the leg's world measures x from. */
export interface MarkSample {
  leg: number
  origin: number
  balls: ShowBall[]
}

const DT = 1 / 120
/** Thrown, falling, lifted: moving more steeply than this, nothing under a ball turns it. */
const STEEP = 1.2
/** At a cut, a ball whose place beside Cobb moves by less than this holds its place on the screen. */
const HELD_PLACE = 0.3

const enum Kind {
  None = 0,
  /** The stage would turn it with its x: rolled here. */
  Rolled = 1,
  /** A part's mark, rolled on from it. */
  Looked = 2,
  /** A part's mark that already rolls. */
  Own = 3,
}

interface Track {
  kind: Uint8Array
  /** How far it rolled since the last sample, radians. */
  inc: Float64Array
  /** 0: no last sample; 1: the last sample, joined; 2: across a match cut where it holds its place; 3: across another cut. */
  link: Uint8Array
  part: Float64Array
  raw: Float64Array
  /** Its mark (Rolled), or what to add to the part's mark (Looked). */
  v: Float64Array
}

/** Set every ball's mark at `t` in place. */
export type Marks = (t: number, balls: ShowBall[]) => void

export function marks(plan: MarkPlan, duration: number, sample: (t: number) => MarkSample): Marks {
  const n = Math.ceil(duration / DT) + 1
  const tracks = new Map<number, Track>()
  const track = (id: number): Track => {
    let tr = tracks.get(id)
    if (!tr) {
      tr = { kind: new Uint8Array(n), inc: new Float64Array(n), link: new Uint8Array(n), part: new Float64Array(n), raw: new Float64Array(n), v: new Float64Array(n) }
      tracks.set(id, tr)
    }
    return tr
  }
  const own = (t: number) => plan.own.some(([a, b]) => t >= a && t < b)
  const turnedAt = (id: number, t: number) => plan.turned.find((w) => w.id === id && t > w.from && t <= w.to)
  const held = (id: number, t: number) => plan.held.some((h) => h.ids.includes(id) && t > h.from && t <= h.to)

  let last = new Map<number, { x: number; y: number; dx: number; dy: number; leg: number }>()
  for (let i = 0; i < n; i++) {
    const t = Math.min(duration, i * DT)
    const s = sample(t)
    const hero = s.balls.find((b) => b.id === 0)
    const now = new Map<number, { x: number; y: number; dx: number; dy: number; leg: number }>()
    for (const b of s.balls) {
      const scale = b.scale ?? 1
      if (scale <= 0.02 || b.spin === null) continue
      const tr = track(b.id)
      const r = R * scale
      const here = { x: b.x, y: b.y, dx: hero ? b.x - hero.x : 0, dy: hero ? b.y - hero.y : 0, leg: s.leg }
      now.set(b.id, here)
      tr.kind[i] = own(t) ? Kind.Own : b.spin === undefined ? Kind.Rolled : Kind.Looked
      tr.part[i] = b.spin ?? 0
      tr.raw[i] = (b.x - s.origin) / r
      const was = last.get(b.id)
      if (!was) continue
      if (was.leg !== s.leg) {
        if (plan.covered.some((c) => c > t - DT - 1e-9 && c <= t + 1e-9)) continue
        tr.link[i] = Math.hypot(here.dx - was.dx, here.dy - was.dy) < HELD_PLACE ? 2 : 3
        continue
      }
      tr.link[i] = 1
      const w = turnedAt(b.id, t)
      if (w) tr.inc[i] = w.at(t) - w.at(t - DT)
      else if (!held(b.id, t)) {
        const dx = b.x - was.x
        const dy = b.y - was.y
        if (Math.abs(dy) <= STEEP * Math.abs(dx)) tr.inc[i] = (Math.sign(dx) * Math.hypot(dx, dy)) / r
      }
    }
    last = now
  }

  for (const tr of tracks.values()) {
    const shown = (j: number) => tr.part[j] + (tr.kind[j] === Kind.Looked ? tr.v[j] : 0)
    // A part's marks, rolled on from where each stretch of them begins.
    for (let i = 0; i < n; i++) {
      if (tr.kind[i] !== Kind.Looked) continue
      tr.v[i] = tr.link[i] && tr.kind[i - 1] === Kind.Looked ? tr.v[i - 1] + tr.inc[i] : 0
    }
    // Each stretch of its own rolling, joined to what it meets.
    let i = 0
    while (i < n) {
      if (tr.kind[i] !== Kind.Rolled) {
        i++
        continue
      }
      const a = i
      let rel = 0
      tr.v[a] = 0
      while (i + 1 < n && tr.kind[i + 1] === Kind.Rolled && tr.link[i + 1]) {
        i++
        rel += tr.inc[i]
        tr.v[i] = rel
      }
      const b = i
      const joins = (j: number) => j >= 0 && j < n && (tr.kind[j] === Kind.Looked || tr.kind[j] === Kind.Own)
      const before = a > 0 && (tr.link[a] === 1 || tr.link[a] === 2) && joins(a - 1)
      const after = b + 1 < n && (tr.link[b + 1] === 1 || tr.link[b + 1] === 2) && joins(b + 1)
      const start = before ? shown(a - 1) + tr.inc[a] : after ? shown(b + 1) - tr.inc[b + 1] - tr.v[b] : tr.raw[a]
      for (let j = a; j <= b; j++) tr.v[j] += start
      i = b + 1
    }
  }

  return (t, balls) => {
    const f = Math.max(0, Math.min(n - 1, t / DT))
    const i = Math.min(n - 2, Math.floor(f))
    const u = f - i
    for (const b of balls) {
      if (b.spin === null) continue
      const tr = tracks.get(b.id)
      if (!tr) continue
      const want = b.spin === undefined ? Kind.Rolled : Kind.Looked
      const k0 = tr.kind[i] === want
      const k1 = tr.kind[i + 1] === want && tr.link[i + 1] === 1
      if (!k0 && !(tr.kind[i + 1] === want)) continue
      const v = k0 && k1 ? tr.v[i] + (tr.v[i + 1] - tr.v[i]) * u : k0 ? tr.v[i] : tr.v[i + 1]
      if (want === Kind.Rolled) b.spin = v
      else if (tr.kind[i] !== Kind.Own) b.spin = (b.spin ?? 0) + v
    }
  }
}
