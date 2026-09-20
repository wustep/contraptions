import type { Show } from '../show'

/**
 * Shows: Machine set to music. A show is one piece of music and a machine
 * choreographed to it, and the same music may have several versions side by
 * side — takes — so that two runs at it can be kept, compared, and later
 * combined. The code calls the music a work, since a piece here is already
 * a mechanism.
 *
 * A version is one file, `versions/<work>/<take>.show.ts`, and the file is
 * the whole of adding one: the page finds it by Vite's glob (`discover.ts`),
 * its path says which work it is a take of, and what it exports says the
 * rest. The file itself is small. The score, the machine and the recording
 * sit behind `load()`, fetched when the version is picked and not before.
 *
 * Nothing here needs a browser, so the headless checks read the same
 * folder (`check-shows.ts`).
 */

/** Where the camera is: the cell at the frame's centre, and how many cells a 16:9 frame shows top to bottom. */
export interface Framing {
  x: number
  y: number
  cells: number
}

export interface SoundtrackSpec {
  /** The recording's URL. Import the file and Vite gives it one: `import src from './take.mp3'`. */
  src: string
  /** Seconds into the recording at which the show's zero falls. Never negative. */
  offset?: number
  /** Who is playing, and under what licence. The panel says it; the frame never does. */
  credit?: string
  /** Where the credit leads. */
  href?: string
}

/** A version, loaded: everything the player needs to put it on the stage. */
export interface Performance {
  /**
   * The machine, as a function of the music's clock: the player asks for
   * `show.at(t)` with `t` in seconds of music and nothing else. New music
   * takes arrange stock durations against the recording (`stock/show.ts`).
   * Older takes and the metronome studies keep their existing clock maps.
   */
  show: Show
  /** Seconds of show. The player holds the last frame there. */
  duration: number
  /** Authored framing. Left out, the stage follows the ball as Machine does. */
  camera?(t: number): Framing
  /** Whether the show's cuts are drawn at `t`: the iris at a portal, the fade up from ink. Left out, they are. */
  cuts?(t: number): boolean
  /** The music. Left out, the show is silent and runs on the wall clock. */
  soundtrack?: SoundtrackSpec
}

/** What a `.show.ts` file exports as its default. */
export interface ShowVersion {
  /** The music's name, the same in every take of it: "Clair de Lune". */
  title: string
  /** This take's name among the others: "Take A". */
  label: string
  /** One line on what this take is trying. */
  note?: string
  load(): Promise<Performance>
}

/** Type-checks a version where it is written. */
export const defineShow = (version: ShowVersion): ShowVersion => version

/** A version as the page knows it: what the file said, and where it was found. */
export interface Version extends ShowVersion {
  work: string
  take: string
}

/** A piece of music and the takes of it, in file order. */
export interface Work {
  work: string
  title: string
  versions: Version[]
}

const PATH = /(?:^|\/)versions\/([a-z0-9][a-z0-9-]*)\/([a-z0-9][a-z0-9-]*)\.show\.ts$/

/** `versions/<work>/<take>.show.ts`, or null for a path that is not one. */
export function versionPath(path: string): { work: string; take: string } | null {
  const m = PATH.exec(path)
  return m ? { work: m[1], take: m[2] } : null
}

const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0

export interface Registry {
  works: Work[]
  /** What was found and could not be used, a line each. One bad file never takes the tab down. */
  problems: string[]
}

/**
 * The works, from what was found: `path → default export`, as Vite's eager
 * glob hands them over. In path order, so a work's takes come in the order
 * their files sort and nothing keeps a list.
 */
export function readShows(found: Record<string, unknown>): Registry {
  const works: Work[] = []
  const problems: string[] = []
  for (const path of Object.keys(found).sort()) {
    const at = versionPath(path)
    if (!at) {
      problems.push(`${path}: not versions/<work>/<take>.show.ts, in lower case and hyphens`)
      continue
    }
    const v = found[path] as Partial<ShowVersion> | null | undefined
    if (!v || typeof v !== 'object' || !text(v.title) || !text(v.label) || typeof v.load !== 'function' || (v.note !== undefined && typeof v.note !== 'string')) {
      problems.push(`${path}: the default export is not a show: it needs a title, a label and load()`)
      continue
    }
    const version: Version = { ...at, title: v.title, label: v.label, note: v.note, load: v.load }
    const work = works.find((w) => w.work === at.work)
    if (!work) {
      works.push({ work: at.work, title: v.title, versions: [version] })
      continue
    }
    if (work.title !== v.title) problems.push(`${path}: titled "${v.title}", where the other takes of ${at.work} say "${work.title}"`)
    if (work.versions.some((o) => o.label === v.label)) problems.push(`${path}: a second take labelled "${v.label}"`)
    work.versions.push(version)
  }
  return { works, problems }
}

/** The Shows tab, with no work in the link: Clair de Lune. */
export const DEFAULT_WORK = 'clair-de-lune'

/**
 * The version a link names. A work that is not there falls to the first
 * work; a take that is not there falls to that work's first. A link that
 * names no work opens Clair de Lune, when it is there.
 */
export function pickVersion(works: Work[], work: string | null, take: string | null): Version | null {
  const w = work
    ? (works.find((o) => o.work === work) ?? works[0])
    : (works.find((o) => o.work === DEFAULT_WORK) ?? works[0])
  if (!w) return null
  return w.versions.find((v) => v.take === take) ?? w.versions[0] ?? null
}

/** A loaded version that cannot be played, said plainly; empty when it can. */
export function performanceProblems(p: Performance): string[] {
  const out: string[] = []
  if (!p || typeof p !== 'object') return ['load() did not resolve to a performance']
  if (!p.show || typeof p.show.at !== 'function') out.push('no show')
  if (!Number.isFinite(p.duration) || p.duration <= 0) out.push(`duration is ${p.duration}`)
  if (p.soundtrack) {
    if (!text(p.soundtrack.src)) out.push('the soundtrack has no src')
    const offset = p.soundtrack.offset ?? 0
    if (!Number.isFinite(offset) || offset < 0) out.push(`the soundtrack's offset is ${offset}`)
  }
  return out
}
