import { MODE_LINKS, type ShellMode } from './shell'

/**
 * Which tab a path is. `/machine/`, `/shows/`, `/shows` and
 * `/shows/index.html` are the same mode, so a deep link and a client switch
 * agree. A show's own page, `/shows/<work>/`, is Shows. The site root only
 * redirects to Machine, so it is not itself a tab. Anything else — the
 * Builder, an old redirect — is not a tab.
 */
export function modeFromPath(pathname: string): ShellMode | null {
  let path = pathname
  if (path.endsWith('/index.html')) path = path.slice(0, -'index.html'.length)
  if (path === '') path = '/'
  if (!path.endsWith('/')) path += '/'
  if (/^\/shows\/[a-z0-9-]+\/(?:[a-z0-9-]+\/)?$/.test(path)) return 'shows'
  return MODE_LINKS.find((m) => m.path === path)?.mode ?? null
}
