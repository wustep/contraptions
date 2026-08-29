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
import { clipCell, outline, solid } from '../core/draw'
import { easeInOutCubic, lerp, seg } from '../core/ease'
import { BELT_V, HIT, PART_Y, bench, part, rollers, shuttle } from './shop'

/** TODO: one sentence on what happens to the part here. */
export const ${camel} = defineContraption({
  name: '${name}',
  label: '${label}',
  tags: ['work'],
  role: 'sink',         // source: lets a part go · relay: carries it · sink: reacts to it
  rotations: [0],       // the shop floor has a down
  // span: [2, 1],      // footprint in cells, if this needs more than one
  fireAt: HIT,          // the station beat: parts arrive, are worked at HIT, leave
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const x = shuttle(u)
    const tool = lerp(-0.2, 0.0, easeInOutCubic(seg(u, HIT - 0.06, HIT)) - easeInOutCubic(seg(u, HIT + 0.06, HIT + 0.16)))

    clipCell(p, k, () => {
      bench(p, k, ink, weight)
      rollers(p, k, ink, weight, s.color, -0.5, -0.18, u * BELT_V)
      rollers(p, k, ink, weight, s.color, 0.18, 0.5, u * BELT_V)
      if (x !== null) part(p, k, ink, weight, s.color, x, PART_Y, { mark: u >= HIT ? 'dot' : 'blank' })

      outline(p, ink, weight)
      p.line(0, -0.5 * k, 0, tool * k)
      solid(p, ink, weight, s.color)
      p.rect(0, tool * k, 0.3 * k, 0.1 * k)
    })
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
