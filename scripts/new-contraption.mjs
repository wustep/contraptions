#!/usr/bin/env node
/**
 * Scaffold a contraption and wire it into the registry.
 *   npm run new -- slot-machine
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const name = process.argv[2]
if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error('usage: npm run new -- <kebab-case-name>')
  process.exit(1)
}

const camel = name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
const label = name.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
const dir = join(process.cwd(), 'src/contraptions')
const file = join(dir, `${name}.ts`)

if (existsSync(file)) {
  console.error(`${name}.ts already exists`)
  process.exit(1)
}

writeFileSync(file, `import { defineContraption } from '../core/define'
import { outline } from '../core/draw'
import { seg } from '../core/ease'
import { P, flight, ground, pedestal, performer } from './circus'

/** TODO: the act's one-sentence causal story — what sets what off, and how it comes back round. */
export const ${camel} = defineContraption({
  name: '${name}',
  label: '${label}',
  tags: [],
  // role: 'source',   // source | relay | sink, if this can sit in a wired chain
  // span: [2, 1],     // footprint in cells, if this needs more than one
  // fireAt: 0.5,      // where in the loop the notable moment falls
  rotations: [0],      // gravity gives this one an up
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    // Cell units, y down, the origin at the centre; multiply by k at the end.
    const left: [number, number] = [-0.3, 0.1 - P / 2]
    const right: [number, number] = [0.3, 0.1 - P / 2]
    const pos = u < 0.5 ? flight(left, right, 0.3, seg(u, 0.1, 0.4)) : flight(right, left, 0.3, seg(u, 0.6, 0.9))

    outline(p, ink, weight)
    ground(p, k, 1)
    pedestal(p, k, ink, weight, s.color, -0.3, 0.1, 0.5, 0.2)
    pedestal(p, k, ink, weight, s.color, 0.3, 0.1, 0.5, 0.2)
    performer(p, k, ink, weight, s.color, pos[0], pos[1])
  },
})
`)

const indexPath = join(dir, 'index.ts')
let index = readFileSync(indexPath, 'utf8')

const importLine = `import { ${camel} } from './${name}'\n`
const imports = index.match(/^import \{ \w+ \} from '\.\/[a-z0-9-]+'$/gm) ?? []
const afterImport = [...imports].sort().find((line) => line > importLine.trim()) ?? imports.at(-1)
index = afterImport
  ? index.replace(afterImport + '\n', afterImport === imports.at(-1) && afterImport < importLine.trim()
      ? afterImport + '\n' + importLine
      : importLine + afterImport + '\n')
  : index

const entries = index.match(/(?<=export const registry: Contraption<any>\[\] = \[\n)[\s\S]*?(?=\n\])/)[0]
const list = entries.split('\n').map((l) => l.trim().replace(/,$/, '')).filter(Boolean)
list.push(camel)
list.sort()
index = index.replace(entries, list.map((l) => `  ${l},`).join('\n'))

writeFileSync(indexPath, index)
console.log(`created src/contraptions/${name}.ts and registered it`)
console.log('remember: draw must be a pure function of `u`, and the act has to come back round')
