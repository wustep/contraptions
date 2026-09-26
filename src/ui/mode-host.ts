import '../analytics'
import { modeFromPath } from './mode-path'
import { clientNavigation, createShell, type Shell, type ShellMode } from './shell'

/**
 * One document for the four tabs. Each page still has its own address and
 * its own entry, so a deep link loads that mode directly. A tab click does
 * not. The chrome is built once; the mode that is leaving stops its clock,
 * its keys and its canvas; the one that is arriving fills the same panel
 * and the same stage. The back button is a switch too, except when the
 * path did not change — that is a step inside the mode, and the mode's own
 * listener reads it.
 */

export type ModeMount = (shell: Shell) => () => void

const TITLE: Record<ShellMode, string> = {
  machine: 'contraptions',
  explorations: 'contraptions · explorations',
  shows: 'contraptions · shows',
  builder: 'contraptions · builder',
  playground: 'contraptions · playground',
}

const mounts = new Map<ShellMode, ModeMount>()
let shell: Shell | null = null
let stop: (() => void) | null = null
/** The mode a click or the back button is bringing in. A second click for it is ignored. */
let target: ShellMode | null = null
let generation = 0
/** A switch that has not landed. The next click replaces that history entry instead of stacking a blank. */
let pending = false

async function loadMount(mode: ShellMode): Promise<ModeMount> {
  const have = mounts.get(mode)
  if (have) return have
  switch (mode) {
    case 'machine':
      await import('../../apps/rube/src/main')
      break
    case 'explorations':
      await import('../main')
      break
    case 'shows':
      await import('../../apps/rube/src/shows/main')
      break
    case 'playground':
      await import('../../apps/rube/src/playground/main')
      break
    default:
      throw new Error(`No client mode for ${mode}`)
  }
  const mount = mounts.get(mode)
  if (!mount) throw new Error(`${mode} did not register`)
  return mount
}

function clearStage(): void {
  const stage = document.getElementById('stage')
  if (!stage) return
  stage.replaceChildren()
}

async function activate(mode: ShellMode): Promise<void> {
  const token = ++generation
  target = mode
  if (shell) {
    shell.setMode(mode)
    document.title = TITLE[mode]
  }
  let mount: ModeMount
  try {
    mount = await loadMount(mode)
  } catch (err) {
    console.error(err)
    return
  }
  // A newer click or a back step won while this one was loading.
  if (token !== generation || !shell) return
  try {
    stop?.()
  } finally {
    stop = null
  }
  shell.body.replaceChildren()
  clearStage()
  shell.root.scrollTop = 0
  target = mode
  pending = false
  stop = mount(shell)
}

function onPop(): void {
  const mode = modeFromPath(location.pathname)
  // Same path: a catalog step or a seed, handled by the mode that is on it.
  if (!mode || mode === target) return
  pending = false
  void activate(mode)
}

/**
 * The page's entry calls this with its mount. The first call builds the
 * chrome and runs that mode. A later call, from a tab fetched without a
 * new document, only keeps the mount for the switch that asked for it.
 */
export function registerMode(mode: ShellMode, mount: ModeMount): void {
  mounts.set(mode, mount)
  if (shell) return
  const panel = document.getElementById('panel')
  if (!panel) return
  shell = createShell(panel, mode)
  clientNavigation((next, href) => {
    if (next === target) return
    const url = new URL(href, location.origin)
    const nextUrl = `${url.pathname}${url.search}${url.hash}`
    const here = `${location.pathname}${location.search}${location.hash}`
    if (nextUrl !== here) {
      if (pending) history.replaceState({ mode: next }, '', nextUrl)
      else history.pushState({ mode: next }, '', nextUrl)
      pending = true
    }
    void activate(next)
  })
  target = mode
  document.title = TITLE[mode]
  stop = mount(shell)
  window.addEventListener('popstate', onPop)
}
