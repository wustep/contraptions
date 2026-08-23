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
import { outline, rails, solid } from '../core/draw'
import { lerp, pingPong } from '../core/ease'

/** TODO: one line on what this machine does. */
export const ${camel} = defineContraption({
  name: '${name}',
  label: '${label}',
  tags: [],
  // span: [2, 1],     // footprint in cells, if this needs more than one
  // fireAt: 0.5,      // where in the loop the notable moment falls
  // rotations: [0],   // lock upright if the machine depends on gravity
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size, u, ink, weight }) => {
    const y = lerp(size * 0.3, -size * 0.3, pingPong(u))

    outline(p, ink, weight)
    rails(p, size)
    p.line(0, -size / 2, 0, size / 2)

    solid(p, ink, weight, s.color)
    p.circle(0, y, size * 0.24)
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
console.log('remember: draw must be a pure function of `u`')
