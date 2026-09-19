import { registerWorld, unregisterWorld } from '../worlds'
import { compileBuild } from './compile'
import { parseBuild, type Build } from './spec'

/**
 * Where builds live at runtime, and how they get into the show without a
 * rebuild. Three sources, one registry:
 *
 *   the folder   `apps/rube/builds/*.contraptions.json`, which the app
 *                discovers when it is served or built (`discover.ts`); a
 *                file dropped there ships with the site
 *   the samples  the Builder's own, for its bench; Machine never loads them
 *   the browser  whatever the Builder has made or imported, kept in
 *                localStorage under `contraptions:builds`
 *
 * `installBuilds` validates every one, compiles it and registers its world
 * (`worlds.ts`), after which `?world=<build>` pins the show there and
 * `?solo=<piece>` finds its pieces. A build in the browser takes the place
 * of a shipped build of the same name. One that does not validate is left
 * out and says why on the console, and never takes the app down with it.
 */

const STORE = 'contraptions:builds'

export interface Installed {
  build: Build
  /** Where it came from: the repo's builds folder, the Builder's samples, or this browser. */
  source: 'folder' | 'sample' | 'browser'
}

let installed: Installed[] = []

/** Every build the app is running with, the folder's first. */
export const installedBuilds = (): readonly Installed[] => installed

export function readStore(): Build[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) ?? '[]') as unknown
    if (!Array.isArray(raw)) return []
    return raw.flatMap((item) => parseBuild(item).build ?? [])
  } catch {
    return []
  }
}

export function writeStore(builds: Build[]): void {
  try {
    localStorage.setItem(STORE, JSON.stringify(builds))
  } catch {
    /* storage unavailable: the builds last as long as the page does */
  }
}

/** Compile a build and register its world. The reasons, when it cannot be. */
export function install(build: Build, source: Installed['source']): string[] {
  const { world, errors } = compileBuild(build)
  if (!world) return errors
  registerWorld(world)
  installed = [...installed.filter((i) => i.build.name !== build.name), { build, source }]
  return []
}

export function uninstall(name: string): void {
  unregisterWorld(name)
  installed = installed.filter((i) => i.build.name !== name)
}

/** Register builds that shipped with the site. */
export function installShipped(files: readonly unknown[], source: 'folder' | 'sample'): void {
  for (const raw of files) {
    const { build, errors } = parseBuild(raw)
    const problems = build ? install(build, source) : errors
    if (problems.length) console.warn(`[builds] a ${source} build was left out:`, problems)
  }
}

/** Register everything there is: the shipped builds, then the browser's over them. */
export function installBuilds(folder: readonly unknown[], samples: readonly unknown[] = []): void {
  installShipped(samples, 'sample')
  installShipped(folder, 'folder')
  for (const build of readStore()) {
    const problems = install(build, 'browser')
    if (problems.length) console.warn(`[builds] "${build.name}" was left out:`, problems)
  }
}

/** Keep a build in this browser, in place of any other of its name, and put it in the show. */
export function saveBuild(build: Build): string[] {
  const problems = install(build, 'browser')
  if (problems.length) return problems
  writeStore([...readStore().filter((b) => b.name !== build.name), build])
  return []
}

export function deleteBuild(name: string): void {
  uninstall(name)
  writeStore(readStore().filter((b) => b.name !== name))
}
