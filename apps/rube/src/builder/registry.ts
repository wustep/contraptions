import { registerWorld, unregisterWorld } from '../worlds'
import { compileBuild, mendBuild } from './compile'
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

/** What the store holds, as it was written: a list, whatever is in it. */
function stored(): unknown[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) ?? '[]') as unknown
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export function readStore(): Build[] {
  return stored().flatMap((item) => parseBuild(item).build ?? [])
}

/** What is kept here that this version cannot read, and why. It stays kept, as it was written, and can be had back as a file. */
export function unreadable(): { name: string; errors: string[]; raw: unknown }[] {
  return stored().flatMap((raw) => {
    const { build, errors } = parseBuild(raw)
    const name = (raw as { name?: unknown } | null)?.name
    return build ? [] : [{ name: typeof name === 'string' && name ? name : 'unnamed', errors, raw }]
  })
}

/** False once a save has failed to reach this browser's storage, until one succeeds. */
let kept = true
export const storeKept = (): boolean => kept

/** Write the store whole. Whether it was kept: not, when storage is blocked or full, and the builds then last as long as the page. */
function writeAll(items: unknown[]): boolean {
  try {
    localStorage.setItem(STORE, JSON.stringify(items))
    kept = true
  } catch {
    kept = false
  }
  return kept
}

/**
 * Put `build` in the store in place of the build kept under `name`, or take
 * that out when `build` is null. Only a build this version reads is ever
 * replaced: everything else stays as it was written, an entry it cannot
 * read included, even one of the same name, so nothing a later version
 * wrote is lost to a save made here.
 */
function writeEntry(name: string, build: Build | null): boolean {
  const others = stored().filter((item) => (item as { name?: unknown } | null)?.name !== name || !parseBuild(item).build)
  return writeAll(build ? [...others, build] : others)
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

/** Install a build made before the stock worlds last changed, mended to fit them (`mendBuild`), and say on the console what was changed or why it was left out. */
function installKept(build: Build, source: Installed['source']): void {
  const { build: mended, notes } = mendBuild(build)
  const problems = install(mended, source)
  if (problems.length) console.warn(`[builds] "${build.name}" was left out:`, problems)
  else if (notes.length) console.warn(`[builds] "${build.name}" was mended:`, notes)
}

/** Register builds that shipped with the site. */
export function installShipped(files: readonly unknown[], source: 'folder' | 'sample'): void {
  for (const raw of files) {
    const { build, errors } = parseBuild(raw)
    if (build) installKept(build, source)
    else console.warn(`[builds] a ${source} build was left out:`, errors)
  }
}

/** Register everything there is: the shipped builds, then the browser's over them. */
export function installBuilds(folder: readonly unknown[], samples: readonly unknown[] = []): void {
  installShipped(samples, 'sample')
  installShipped(folder, 'folder')
  for (const build of readStore()) installKept(build, 'browser')
}

/** Keep a build in this browser, in place of any other of its name, and put it in the show. The reasons, when it would not go in. */
export function saveBuild(build: Build): string[] {
  const problems = install(build, 'browser')
  if (problems.length) return problems
  writeEntry(build.name, build)
  return []
}

export function deleteBuild(name: string): void {
  uninstall(name)
  writeEntry(name, null)
}

/** Take out of this browser's store every entry this version cannot read, and nothing else. */
export const forgetUnreadable = (): boolean => writeAll(stored().filter((item) => parseBuild(item).build))
