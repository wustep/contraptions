import type { Pt } from '../../../../parts'
import { box, part, route, type Company, type Part, type PartShot, type Way } from './kit'
import { bar, beatAt } from './music'
import { G_SNAP, hop } from './physics'
import { SEAM_SHOT, WOMAN_LEAD, type PartPlan } from './seams'

/**
 * Parts not yet built. The score runs end to end from the first day, and each builder replaces one of these with
 * the real part, keeping the export names the stub file has.
 *
 * A stub takes the ball across its room in its slot: it rolls, and hops onto every bar's downbeat (the hops are its
 * strikes, so the check has something to hold to the music), and it leaves the way `seams.ts` says (at rest, or
 * dropped onto the next part's entry). It draws a faint box where its room will be.
 */

/** The bar downbeats a stub lands on: every bar line strictly inside its slot, and its first moment when the ball is handed to it (a seam is a strike: the incoming part's). */
export function stubHits(plan: PartPlan, seamIn: boolean): number[] {
  const out: number[] = seamIn ? [plan.begin] : []
  const n0 = Math.max(0, Math.ceil(beatAt(plan.begin) / 4 + 1e-6))
  for (let n = n0; bar(n) < plan.end - 0.3; n++) if (bar(n) > plan.begin + 0.3) out.push(bar(n))
  return out
}

export interface StubOptions {
  /** The part is handed the ball at a seam (it is not the first part). */
  seamIn?: boolean
  /** The Woman in Green: 'lead' walks with him, ahead; 'leave' starts ahead of him and walks off out of shot. */
  woman?: 'lead' | 'leave'
}

export function stub(plan: PartPlan, opts: StubOptions = {}): Part<{ begin: number }> {
  const [x0, y0, x1, y1] = plan.footprint
  const shaft = plan.shaft
  const exit = plan.exit
  const end: Pt = [exit[0] - 0.5, exit[1]]
  return part<{ begin: number }>(
    {
      name: plan.name,
      draw: (p, _s, c) => {
        const { k, ink, weight } = c
        p.push()
        p.rectMode(p.CORNER)
        const faint = p.color(ink)
        faint.setAlpha(40)
        p.stroke(faint)
        p.strokeWeight(weight * 0.6)
        p.noFill()
        p.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
        if (shaft) p.rect(shaft[0] * k, shaft[1] * k, (shaft[2] - shaft[0]) * k, (shaft[3] - shaft[1]) * k)
        p.pop()
      },
    },
    (slot) => {
      const span = slot.end - slot.begin
      const hits = stubHits(plan, !!opts.seamIn).filter((t) => t > slot.begin + 1e-6).map((t) => t - slot.begin)
      const ways: Way[] = [{ at: 0, p: [-0.5, 0] }]
      // Along the floor from the entry to where the exit's column is, a hop onto every bar line.
      const n = hits.length
      hits.forEach((at, i) => {
        const x = -0.5 + ((i + 1) / (n + 1)) * (end[0] + 0.5)
        const last = ways[ways.length - 1]
        const lift = Math.min(0.4, (at - last.at) / 2)
        if (at - last.at > lift + 0.05) ways.push({ at: at - lift, p: [x - 0.35, 0] })
        ways.push(hop(ways[ways.length - 1], [x, 0], at, G_SNAP))
      })
      // And out: a last tiptoe onto the exit, or up over the hole and straight down it.
      const last = ways[ways.length - 1]
      if (plan.out === 'drop') {
        const over: Pt = [end[0], Math.min(0, end[1]) - 0.5]
        const tFall = Math.min(0.9, Math.max(0.3, Math.sqrt((2 * (end[1] - over[1])) / 12)))
        const tOver = span - tFall
        if (tOver - last.at > 0.5) ways.push({ at: tOver - 0.4, p: [end[0] - 0.6, 0] })
        ways.push(hop(ways[ways.length - 1], over, tOver, G_SNAP))
        ways.push({ at: span, p: end, ease: 'in' })
      } else {
        if (span - last.at > 0.8) ways.push({ at: span - 0.5, p: [end[0] - 0.4, end[1]], ease: 'inout' })
        ways.push({ ...hop(ways[ways.length - 1], end, span, G_SNAP), ease: undefined })
      }
      const lane = { segs: route(ways), fire: hits[0] ?? span / 2 }
      const company: Company[] = []
      if (opts.woman) {
        // She is the lane's position, WOMAN_LEAD ahead; leaving, she drifts off to the left and is gone out of shot.
        const at = (t: number): Pt => {
          let acc = 0
          for (const s of lane.segs) {
            if (t <= acc + s.dur || s === lane.segs[lane.segs.length - 1]) {
              const u = s.dur > 0 ? Math.max(0, Math.min(1, (t - acc) / s.dur)) : 1
              return [s.from[0] + (s.to[0] - s.from[0]) * u, s.from[1] + (s.to[1] - s.from[1]) * u]
            }
            acc += s.dur
          }
          return end
        }
        if (opts.woman === 'lead') {
          company.push({ who: 'woman', from: slot.begin, to: slot.end, at: (t) => { const [x, y] = at(t - slot.begin); return { x: x + WOMAN_LEAD, y } } })
        } else {
          const home = at(0)
          company.push({ who: 'woman', from: slot.begin, to: slot.begin + 10, at: (t) => {
            const u = Math.max(0, t - slot.begin)
            return { x: home[0] + WOMAN_LEAD - 1.5 * u * Math.min(1, u / 2), y: home[1] }
          } })
        }
      }
      return {
        cells: box(x0, y0, x1, y1).concat(shaft ? box(shaft[0], shaft[1], shaft[2], shaft[3]) : []),
        exit,
        lane,
        state: { begin: slot.begin },
        company,
      }
    },
    (slot): PartShot[] => [
      { t: slot.begin, ...SEAM_SHOT },
      { t: slot.end, ...SEAM_SHOT },
    ],
  )
}
