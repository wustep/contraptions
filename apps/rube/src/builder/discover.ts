/**
 * Builds the app finds for itself, by Vite's glob when it is served or built.
 * Browser-only — the headless checks read the same folders from disk instead,
 * since the glob is Vite's.
 *
 *   the builds folder  `apps/rube/builds/*.contraptions.json`. No list to
 *                      keep: drop a file in and it is part of the site, in
 *                      Machine and in the Builder. Ships empty, so the front
 *                      door is the four stock worlds until someone adds to it.
 *   the samples        `samples/*.contraptions.json` beside this file: what
 *                      the Builder has on its bench the first time it is
 *                      opened. Machine never loads them; a sample reaches it
 *                      the way any build does, by being kept in the browser.
 */
const folder = import.meta.glob('../../builds/*.contraptions.json', { eager: true, import: 'default' })
const samples = import.meta.glob('./samples/*.contraptions.json', { eager: true, import: 'default' })

const inOrder = (found: Record<string, unknown>): unknown[] => Object.keys(found).sort().map((path) => found[path])

export const folderBuilds = (): unknown[] => inOrder(folder)
export const sampleBuilds = (): unknown[] => inOrder(samples)
