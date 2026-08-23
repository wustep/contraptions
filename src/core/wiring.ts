import { LOOP } from './constants'
import type { Rng } from './rng'
import type { Instance, Wire } from './types'

/** Frames between one machine firing and the next in its chain. */
export const LINK_DELAY = 24

/** How long `fired` takes to decay back to 0, in frames. */
export const FIRE_DECAY = 16

/** Shortest run of machines that still reads as a cascade rather than a pair. */
const MIN_CHAIN = 3
const MAX_CHAIN = 7

const key = (x: number, y: number) => `${Math.round(x)}:${Math.round(y)}`

const colorOf = (inst: Instance): string => {
  const state = inst.state as { color?: string } | null
  return state?.color ?? '#000000'
}

/**
 * Wire adjacent machines into chains that fire in sequence.
 *
 * A chain is not a runtime dependency — nothing is evaluated in order at draw
 * time. It is purely a phase assignment: each machine's phase is chosen so its
 * firing moment lands `LINK_DELAY` frames after the one before it. The cascade
 * you see is real causality expressed as arithmetic, which is what lets every
 * contraption stay a pure function of its own `u`.
 *
 * Only machines whose period is the full loop are eligible, so a chain never
 * has to reason about a member that fires twice per cycle.
 */
export function wire(instances: Instance[], rng: Rng, density: number): Wire[] {
  if (density <= 0) return []

  const eligible = instances.filter(
    (i) =>
      i.period === LOOP &&
      (i.contraption.chainable ?? true) &&
      i.cell.w === i.cell.size &&
      i.cell.h === i.cell.size,
  )
  if (eligible.length < MIN_CHAIN) return []

  const byPos = new Map<string, Instance>()
  for (const i of eligible) byPos.set(key(i.cell.x, i.cell.y), i)

  const used = new Set<Instance>()
  const wires: Wire[] = []
  const budget = Math.max(1, Math.round((eligible.length / 24) * density))
  let built = 0

  const neighbours = (inst: Instance): Instance[] => {
    const s = inst.cell.size
    const steps: [number, number][] = [[s, 0], [-s, 0], [0, s], [0, -s]]
    return steps
      .map(([dx, dy]) => byPos.get(key(inst.cell.x + dx, inst.cell.y + dy)))
      .filter((n): n is Instance => !!n && !used.has(n) && n.cell.size === s)
  }

  for (const start of rng.shuffle(eligible)) {
    if (built >= budget) break
    if (used.has(start)) continue

    const chain = [start]
    used.add(start)
    const target = rng.int(MIN_CHAIN, MAX_CHAIN + 1)
    while (chain.length < target) {
      const options = neighbours(chain[chain.length - 1])
      if (!options.length) break
      const next = rng.pick(options)
      used.add(next)
      chain.push(next)
    }

    if (chain.length < MIN_CHAIN) {
      for (const member of chain) used.delete(member)
      continue
    }

    const base = rng.int(0, LOOP)
    chain.forEach((inst, k) => {
      const fireFrame = (base + k * LINK_DELAY) % LOOP
      inst.fireFrame = fireFrame
      // The phase that puts this machine's firing moment on that frame.
      inst.phase = Math.round((inst.contraption.fireAt ?? 0) * inst.period - fireFrame)
    })

    for (let k = 0; k < chain.length - 1; k++) {
      wires.push({
        from: chain[k].cell,
        to: chain[k + 1].cell,
        start: chain[k].fireFrame,
        end: chain[k].fireFrame + LINK_DELAY,
        color: colorOf(chain[k]),
      })
    }
    built++
  }

  return wires
}
