import { defaultOptions, type Options } from './composition'

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

const NUMERIC: (keyof Options)[] = ['res', 'stroke']

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
