import { MODES, defaultOptions, modeInfo, type Options } from './composition'
import { layouts } from './layouts'
import { themes } from './themes'

const ADJECTIVES = [
  'brass', 'copper', 'quiet', 'idle', 'clever', 'stubborn', 'patient', 'restless',
  'crooked', 'humming', 'sunken', 'polished', 'rusted', 'lopsided', 'nimble',
  'brittle', 'velvet', 'amber', 'cobalt', 'slate', 'paper', 'hollow', 'wound',
  'lazy', 'tidy', 'obtuse', 'stray', 'plain', 'candid', 'faint',
]

const NOUNS = [
  'pendulum', 'flywheel', 'escapement', 'ratchet', 'bellows', 'cam', 'spindle',
  'lever', 'pulley', 'gasket', 'crank', 'piston', 'governor', 'gantry', 'linkage',
  'armature', 'shuttle', 'trestle', 'winch', 'axle', 'cogwheel', 'plunger',
  'dowel', 'tumbler', 'valve', 'sprocket',
]

/** A seed you can say out loud, like `amber-flywheel-812`. */
export function randomSeed(): string {
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
  const n = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}-${n}`
}

/**
 * Roll the whole configuration, not just the seed. The dials are drawn from
 * weighted tables rather than uniform ranges: a res of 4 or 30 is a corner
 * someone steers into deliberately, not a place a dice roll should strand
 * them, so the middle of each range carries most of the weight and the ends
 * appear only as occasional visitors. Pool filters and catalog mode reset —
 * a full roll means "show me a fresh piece" — but the mode stays, since it is
 * a choice of world rather than a dial on this one.
 */
export function rollOptions(current: Options): Options {
  const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]
  const { dials } = modeInfo(current.mode)
  return {
    ...defaultOptions,
    mode: current.mode,
    seed: randomSeed(),
    theme: pick(themes).name,
    // A world that builds its own floor does not honour the layout, so
    // rolling one would only leave a dead word in the URL.
    layout: dials.layout ? pick(layouts).name : current.layout,
    // Mostly 12-18 cells across; sometimes airy, sometimes dense, never extreme.
    res: pick([9, 11, 12, 13, 14, 14, 15, 15, 16, 16, 17, 18, 20, 22]),
    stroke: pick([0.85, 1, 1, 1, 1, 1.15, 1.3]),
    spans: pick([0.2, 0.35, 0.5, 0.5, 0.65, 0.8]),
    chains: pick([0.2, 0.35, 0.5, 0.5, 0.65, 0.8]),
  }
}

const NUMERIC: (keyof Options)[] = ['res', 'stroke', 'spans', 'chains']

/** Read options out of the URL, falling back to defaults. */
export function readUrl(): Options {
  const params = new URLSearchParams(location.search)
  const options: Options = { ...defaultOptions, seed: randomSeed() }
  for (const key of Object.keys(defaultOptions) as (keyof Options)[]) {
    const raw = params.get(key)
    if (raw === null) continue
    if (NUMERIC.includes(key)) {
      const value = Number(raw)
      if (Number.isFinite(value)) (options[key] as number) = value
    } else if (key === 'solo' || key === 'tag') {
      options[key] = raw === '' ? null : raw
    } else if (key === 'catalog') {
      options.catalog = raw === '1' || raw === 'true'
    } else if (key === 'mode') {
      const mode = MODES.find((m) => m.name === raw)
      if (mode) options.mode = mode.name
    } else {
      ;(options[key] as string) = raw
    }
  }
  return options
}

/** Mirror options into the address bar so any state is a shareable link. */
export function writeUrl(options: Options): void {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(options)) {
    if (value === null || value === '' || value === false) continue
    if (value === defaultOptions[key as keyof Options] && key !== 'seed') continue
    params.set(key, value === true ? '1' : String(value))
  }
  const query = params.toString()
  history.replaceState(null, '', query ? `?${query}` : location.pathname)
}
