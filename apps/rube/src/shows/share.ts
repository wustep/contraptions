import { pickVersion, type Work } from './registry'

/**
 * A show's own address, and what a link to it says when it is shared.
 *
 * A link preview is read by a crawler that runs no script, so a show's card
 * cannot come from `?show=` on the one Shows page: every show needs a page
 * of its own. The build writes one for each work, `/shows/<work>/`, which is
 * its first take (the one the picker opens), and one for each take,
 * `/shows/<work>/<take>/`, each the Shows page with its own title, line and
 * picture (`vite.config.ts`). The page reads the show from that path, and
 * writes the path back as the show changes, so the address bar is always a
 * link with a card. `?show=<work>&take=<take>` still opens a show.
 *
 * Pure: the build reads it as well as the page.
 */

export const SITE = 'https://contraptions-wustep.vercel.app'

/** The address of a take: the work's own when it is the work's first take. */
export function showPath(works: Work[], work: string, take: string): string {
  const first = pickVersion(works, work, null)
  return first && first.work === work && first.take === take ? `/shows/${work}/` : `/shows/${work}/${take}/`
}

/** The show a path names, if it names one: `/shows/<work>/` or `/shows/<work>/<take>/`. */
export function showFromPath(pathname: string): { work: string; take: string | null } | null {
  const m = /^\/shows\/([a-z0-9][a-z0-9-]*)\/(?:([a-z0-9][a-z0-9-]*)\/)?(?:index\.html)?$/.exec(pathname)
  return m ? { work: m[1], take: m[2] ?? null } : null
}

/** Where a take's share card is: `/shows/<work>/<take>.png`, from `public/`. */
export const cardPath = (work: string, take: string): string => `/shows/${work}/${take}.png`

/** What the Shows page says of itself when it is shared, and what a show says when it has no line of its own. */
export const SHOWS_LINE = 'Rube Goldberg machines set to music: every strike on the beat, the music the clock.'

export interface ShareCard {
  title: string
  description: string
  image: string
  url: string
}

/**
 * The card for a take. A take that is the work (its label repeats the title) is named once; a take among others
 * says which, as the picker does.
 */
export function showCard(works: Work[], work: string, take: string): ShareCard | null {
  const w = works.find((o) => o.work === work)
  const v = w?.versions.find((o) => o.take === take)
  if (!w || !v) return null
  const single = w.versions.length === 1 || v.label === v.title
  return {
    title: `${single ? v.title : `${v.title} (${v.label})`} · contraptions`,
    description: v.about ?? SHOWS_LINE,
    image: `${SITE}${cardPath(work, take)}`,
    url: `${SITE}${showPath(works, work, take)}`,
  }
}
