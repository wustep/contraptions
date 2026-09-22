import { parseBuild } from '../apps/rube/src/builder/spec'
import { buildLane, compileBuild } from '../apps/rube/src/builder/compile'

/** Operator-only: the compiler transitively imports the stock catalog. Never copy this bundle to candidates. */
export function checkBuild(text: string, name: string) {
  const parsed = parseBuild(text)
  const schema = [...parsed.errors]
  const contract: string[] = []
  const compile: string[] = []
  if (parsed.build) {
    const b = parsed.build
    if (b.name !== name) contract.push(`build.name must be ${name}`)
    if (b.pieces.length !== 10) contract.push('exactly 10 pieces required')
    if (!b.world) contract.push('world required')
    else if (b.world.borrow.length) contract.push('world.borrow must be empty')
    for (const p of b.pieces) {
      if (!p.name.startsWith(`${name}-`)) contract.push(`${p.name}: use world-name prefix`)
      const { lane } = buildLane(p.lane)
      if (lane.segs.some(s => !Number.isFinite(s.dur) || s.dur <= 0)) compile.push(`${p.name}: nonpositive/nonfinite compiled duration`)
      if (lane.segs.reduce((sum, s) => sum + s.dur, 0) > 7) compile.push(`${p.name}: compiled lane exceeds 7 seconds`)
    }
    try {
      const result = compileBuild(b)
      compile.push(...result.errors)
      if (!result.world && !result.errors.length) compile.push('compiler returned no world')
    } catch (error) { compile.push(String(error)) }
  }
  return { schema, contract, compile, passed: !!parsed.build && !contract.length && !compile.length }
}
