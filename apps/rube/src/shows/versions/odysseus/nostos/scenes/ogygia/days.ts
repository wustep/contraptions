/**
 * Seven years on Ogygia, as seven days and nights going faster. The first dawn is the rise's first strong attack
 * (358.70) and that first day is long: he goes over the rise to the lotus at the cave's mouth, and comes to them as the
 * sun goes down (363.88). The six days after it are quicker and equal, and the eighth dawn, the cloudless morning of the
 * thunder, is the rise's strong attack at 384.66.
 *
 * Penelope's loom in Ithaca keeps the same days (she weaves by day and unpicks by night), so the schedule is here, for
 * any drawing that wants to know whether it is day: `daylight(t)` is 1 at noon and 0 at midnight, eased between.
 */

export const FIRST_DAWN = 358.7
/** The first dusk: he comes to the lotus as the sun goes. */
export const FIRST_DUSK = 363.88
export const LAST_DAWN = 384.66
export const YEARS = 7
/** Of each later day and night, the share that is day. */
export const DAY = 0.56
/** The first night, before the quick days begin. */
const FIRST_NIGHT = 2.0

/** The dawns: the first, the six between, and the cloudless eighth. */
export const DAWNS: number[] = (() => {
  const out = [FIRST_DAWN, FIRST_DUSK + FIRST_NIGHT]
  const period = (LAST_DAWN - out[1]) / (YEARS - 1)
  for (let k = 2; k <= YEARS; k++) out.push(out[1] + (k - 1) * period)
  return out
})()

/** Day `k`'s dusk. */
export const duskOf = (k: number): number => (k === 0 ? FIRST_DUSK : DAWNS[k] + DAY * (DAWNS[k + 1] - DAWNS[k]))

/**
 * Where `t` is in the years: which day (0 to 6; 7 from the last dawn on, -1 before the first), whether it is day or
 * night, and how far through that day or that night, 0 to 1.
 */
export function dayOf(t: number): { k: number; day: boolean; u: number } {
  if (t < FIRST_DAWN) return { k: -1, day: false, u: 0 }
  if (t >= LAST_DAWN) return { k: YEARS, day: true, u: t - LAST_DAWN }
  let k = 0
  while (k + 1 < DAWNS.length && DAWNS[k + 1] <= t) k++
  const dusk = duskOf(k)
  if (t < dusk) return { k, day: true, u: (t - DAWNS[k]) / (dusk - DAWNS[k]) }
  return { k, day: false, u: (t - dusk) / (DAWNS[k + 1] - dusk) }
}

/**
 * How much it is day at `t`, 0 to 1: a cosine through each day and night, 1 at noon and 0 at midnight, so the light
 * comes and goes without a step. Before the first dawn it is the grey before it (0.25, lifting); from the last dawn the
 * cloudless day comes up and stays.
 */
export function daylight(t: number): number {
  if (t < FIRST_DAWN) {
    const w = Math.max(0, Math.min(1, (t - (FIRST_DAWN - 2)) / 2))
    return 0.25 + 0.25 * w * w * (3 - 2 * w)
  }
  const { k, day, u } = dayOf(t)
  if (k === YEARS) {
    const v = Math.min(1, u / 1.2)
    return 0.5 + 0.5 * Math.sin((v * Math.PI) / 2)
  }
  const v = day ? u * 0.5 : 0.5 + u * 0.5
  return 0.5 + 0.5 * Math.sin(v * Math.PI * 2)
}

/** The noons and the midnights, for keying the sky: [t, isDay]. */
export function extremes(): [number, boolean][] {
  const out: [number, boolean][] = []
  for (let k = 0; k < YEARS; k++) {
    const dusk = duskOf(k)
    out.push([(DAWNS[k] + dusk) / 2, true])
    out.push([(dusk + DAWNS[k + 1]) / 2, false])
  }
  return out
}
