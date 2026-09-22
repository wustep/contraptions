import { createHash } from 'node:crypto'

// Version this pool when changing the distribution. Seeds reproduce briefs, not run IDs.
export function makeSuite(seed, id) {
  const settings = ['a moonlit postal depot', 'a subterranean tea room', 'a cloud observatory', 'a clockwork orchard', 'a miniature textile mill', 'a tidal saltworks', 'a rooftop bakery', 'a lantern repair shop', 'a glacial greenhouse', 'a desert water station', 'a paper theater', 'a mossy mineral laboratory']
  const materials = ['folded paper and brass', 'glazed ceramic and cord', 'weathered wood and copper', 'frosted glass and iron', 'stitched fabric and wire', 'cut stone and bamboo']
  const moods = ['patient and precise', 'bouncy and playful', 'quiet and mysterious', 'busy but legible']
  let counter = 0
  const pick = list => list.splice(createHash('sha256').update(`${seed}:${counter++}`).digest().readUInt32BE() % list.length, 1)[0]
  return {
    version: 1, generator: 'briefs-v1', id, seed,
    worlds: Array.from({ length: 3 }, (_, i) => ({
      name: `world-${i + 1}`, pieces: 10,
      brief: `Construct ${pick(settings)} using ${pick(materials)}; the mood is ${pick(moods)}.`,
      constraints: ['Ten distinct mechanisms, each with a readable cause and reaction.', 'At least one lift, one drop, one flight, one pause/release, and one paint change; mechanisms may overlap.', 'Use a coherent custom palette and backdrop; borrow no stock pieces.', 'Keep every footprint to at most six cells and every lane to at most seven seconds.'],
    })),
  }
}
