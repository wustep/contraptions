import { readShows, type Registry } from './registry'

/**
 * The versions the page finds for itself, by Vite's glob when it is served
 * or built: every `versions/<work>/<take>.show.ts`. No list to keep. Drop a
 * file in and it is in the picker. Browser-only, since the glob is Vite's;
 * the headless checks read the same folder from disk.
 *
 * Eager, because a version file is a few lines: a title, a label, and a
 * `load()` that reaches for everything heavy.
 */
const found = import.meta.glob('./versions/*/*.show.ts', { eager: true, import: 'default' })

export const discoverShows = (): Registry => readShows(found)
