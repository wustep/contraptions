import type { Pt } from '../../../../parts'
import { box, part, route, type Part, type PartShot, type Way } from './kit'
import { G_SNAP, hop } from './physics'
import type { KitPiece } from './drums'
import { KIT_AT, land } from './carnegie/stage'

/**
 * Parts not yet built. The score runs end to end from the first day, and each builder replaces one of these with
 * the real part, keeping the export names the stub file has.
 */

/** A part not yet built: it takes the ball across its footprint in its slot, in a straight line, and draws a faint frame where it will stand. */
export function stub(name: string, width: number, rise = 0): Part<{ begin: number }> {
  return part<{ begin: number }>(
    {
      name,
      draw: (p, _s, c) => {
        const { k, ink, weight } = c
        p.push()
        p.rectMode(p.CORNER)
        p.stroke(ink)
        p.strokeWeight(weight * 0.5)
        p.noFill()
        p.rect((-0.5 + width / 2) * k, -1 * k, width * k, 3 * k)
        p.line(-0.5 * k, 0.5 * k, (width - 0.5) * k, (rise + 0.5) * k)
        p.pop()
      },
    },
    (slot) => ({
      cells: box(-1, -3, width, 1),
      exit: [width, rise] as Pt,
      lane: { segs: [{ from: [-0.5, 0], to: [width - 0.5, rise], dur: slot.end - slot.begin }], fire: (slot.end - slot.begin) / 2 },
      state: { begin: slot.begin },
    }),
    (slot) => [{ t: slot.begin, cells: 6 }],
  )
}

/** A stroke on the Carnegie kit: when, and which piece. Every Carnegie part exports its list as `<NAME>_KIT`. */
export interface KitStroke {
  t: number
  piece: KitPiece
}

/**
 * The recording's strong onsets in a stretch, as strokes on the kit a stub can play: loud and low on the rack
 * tom, bright on the hi-hat, the rest on the snare; none closer than `gap` to the one before.
 */
export function strokesOf(onsets: { t: number; lo: number; mid: number; hi: number }[], gap = 0.14): KitStroke[] {
  const out: KitStroke[] = []
  for (const o of onsets) {
    if (out.length && o.t - out[out.length - 1].t < gap) continue
    const piece: KitPiece = o.lo > Math.max(o.mid, o.hi) ? 'rack' : o.hi > o.mid * 1.2 ? 'hat' : 'snare'
    out.push({ t: o.t, piece })
  }
  return out
}

/**
 * A Carnegie part not yet built: the ball hops on the kit, landing on each of `strokes`, from the snare at the
 * slot's start back to the snare at its end (every Carnegie part's frame is the same: `carnegie/stage.ts`).
 */
export function kitStub(name: string, strokes: KitStroke[], shots?: (slot: { begin: number; end: number }) => PartShot[]): Part<{ begin: number }> {
  return part<{ begin: number }>(
    { name, draw: () => {} },
    (slot) => {
      const span = slot.end - slot.begin
      const ways: Way[] = [{ at: 0, p: [...KIT_AT] as Pt }]
      // A hop to `to` landing at `at`; after a long gap, a rest where it is first, then a short hop.
      const to = (p: Pt, at: number) => {
        const last = ways[ways.length - 1]
        if (at - last.at > 0.6) ways.push({ at: at - 0.35, p: last.p })
        ways.push(hop(ways[ways.length - 1], p, at, G_SNAP))
      }
      for (const s of strokes) {
        const at = s.t - slot.begin
        if (at <= ways[ways.length - 1].at + 0.05 || at >= span - 0.05) continue
        to(land(s.piece), at)
      }
      to([...KIT_AT] as Pt, span)
      return {
        cells: box(-5, -3, 3, 3),
        exit: [0, 0] as Pt,
        lane: { segs: route(ways), fire: strokes.length ? Math.max(0, strokes[0].t - slot.begin) : 0 },
        state: { begin: slot.begin },
      }
    },
    shots ?? ((slot) => [{ t: slot.begin, cells: 5, hold: [KIT_AT[0] - 0.8, KIT_AT[1] - 0.5], w: 0.7 }]),
  )
}
