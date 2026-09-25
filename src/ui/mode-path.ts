import { MODE_LINKS, type ShellMode } from './shell'

/**
 * Which tab a path is. `/`, `/shows/`, `/shows` and `/shows/index.html` are
 * the same mode, so a deep link and a client switch agree. Anything else —
 * the Builder, an old redirect — is not a tab.
 */
export function modeFromPath(pathname: string): ShellMode | null {
  let path = pathname
  if (path.endsWith('/index.html')) path = path.slice(0, -'index.html'.length)
  if (path === '') path = '/'
  if (!path.endsWith('/')) path += '/'
  if (path === '/') return 'machine'
  return MODE_LINKS.find((m) => m.path === path)?.mode ?? null
}
