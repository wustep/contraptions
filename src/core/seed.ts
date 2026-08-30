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
 * weighted tables rather than uniform ranges: an end of a range is a corner
 * someone steers into deliberately, not a place a dice roll should strand
 * them, so the middle carries most of the weight and the ends appear only as
 * occasional visitors. Pool filters and catalog mode reset — a full roll means
 * "show me a fresh piece" — but the mode stays, since it is a choice of world
 * rather than a dial on this one.
 */
export function rollOptions(current: Options): Options {
  const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]
  // Resolution is rolled inside the mode's own range, so a roll never asks
  // for a piece the composer would have to clamp back.
  const { min, max } = modeInfo(current.mode).res
  return {
    ...defaultOptions,
    mode: current.mode,
    seed: randomSeed(),
    theme: pick(themes).name,
    // Only the modes that lay out on a layout get one rolled; the rest build
    // their own grid, and a stray `layout=` in the URL would say otherwise.
    layout: modeInfo(current.mode).dials.layout ? pick(layouts).name : defaultOptions.layout,
    res: Math.round(min + (max - min) * pick([0.05, 0.2, 0.35, 0.45, 0.5, 0.5, 0.6, 0.7, 0.85, 0.95])),
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
