// Rebuild the saved 30s checkpoint. All pieces, variants, positions, cues and camera poses are authored.
// npx esbuild dev/author-clair-de-lune.ts --bundle --platform=node --format=esm --outfile=/tmp/author-clair.mjs
// node /tmp/author-clair.mjs
import { writeFileSync } from 'node:fs'
import { makeRng } from '../src/core/rng'
import { ballAt, laneTime, type BallState, type Placement, type Pt } from '../apps/rube/src/parts'
import { portalPlacement } from '../apps/rube/src/pieces/portal'
import { worldByName } from '../apps/rube/src/worlds'
import type { AuthoredScene, AuthoredScore } from '../apps/rube/src/shows/clair-de-lune'

function scene(worldName: string, themeIndex: number, begin: number, endTime: number, origin: Pt) {
  const world = worldByName(worldName)!
  const theme = world.themes[themeIndex]
  let ball: BallState = { color: theme.colors[worldName === 'harbor' ? 2 : 0], ghost: false, id: 0 }
  const data: AuthoredScene = { begin, end: endTime, world: worldName, theme, backdrop: worldName === 'harbor' ? 'waves' : 'plain', ballColor: ball.color, pieces: [], cues: [], camera: [] }
  let [col, row] = origin
  let mirror: 1 | -1 = 1
  let start = 0
  const byId = new Map<string, AuthoredScene['pieces'][number]>()
  function commit(id: string, name: string, placement: Placement<unknown>) {
    const span = laneTime(placement.lane)
    const placed = {
      id, piece: name, state: placement.state, col, row, mirror,
      cells: placement.cells.map(([x, y]): Pt => [col + mirror * x, row + y]),
      lane: placement.lane, start, span, ballIn: ball, changes: placement.changes ?? [], points: 0,
    }
    data.pieces.push(placed)
    byId.set(id, placed)
    ball = ballAt(ball, placed.changes, Infinity)
    col += mirror * placement.exit.at[0]
    row += placement.exit.at[1]
    mirror = mirror * placement.exit.dir as 1 | -1
    start += span
  }
  function stock(id: string, name: string, colorIndex: number, exit: Pt) {
    const piece = world.pieces.find((p) => p.name === name)!
    const color = theme.colors[colorIndex]
    if (color === ball.color && name !== 'rail') throw new Error(`Ball and mechanism share a colour: ${id}`)
    const placement = piece.place({
      // Stock functions use this only while authoring; playback reads the saved concrete result.
      rng: makeRng(`clair-de-lune:${worldName}:${id}`), theme, color, ball, earned: 0, taste: { weights: {} },
      fits: (_, proposed) => proposed[0] === exit[0] && proposed[1] === exit[1],
    })
    if (!placement) throw new Error(`Cannot place ${id}`)
    commit(id, name, placement)
  }
  const p = (id: string) => byId.get(id)!
  const at = (id: string, local: number) => p(id).start + local
  const fire = (id: string) => at(id, p(id).lane.fire)
  const end = (id: string) => at(id, p(id).span)
  const cue = (time: number, native: number, label: string) => data.cues.push({ at: time, native, label })
  const camera = (time: number, x: number, y: number, cells: number) => data.camera.push({ at: time, x, y, cells })
  const portal = (kind: 'in' | 'out') => commit(`portal-${kind}`, 'portal', portalPlacement(kind, theme.colors[ball.color === theme.colors[2] ? 0 : 2]))
  return { data, stock, p, at, fire, end, cue, camera, portal }
}

// Workshop: up two floors, back across a suspended basket, a relay, down and back again.
const a = scene('workshop', 1, 0, 15.296, [2, 4])
a.stock('opening-bell', 'bell', 2, [1, 0])
a.stock('breath', 'rail', 2, [1, 0])
a.stock('lift', 'lift', 1, [-1, -2])
a.stock('trapeze', 'trapeze', 2, [3, 0])
a.stock('cradle', 'cradle', 1, [2, 0])
a.stock('switchback', 'switchback', 2, [-1, 1])
a.stock('landing', 'rail', 2, [1, 0])
a.stock('pendulum', 'pendulum', 3, [2, 0])
a.portal('out')

a.cue(0, a.fire('opening-bell'), 'First audible chord: opening bell')
a.cue(0.56, a.end('opening-bell'), 'A short breath of rail')
a.cue(1.288, a.end('breath'), 'The ball enters the lift')
a.cue(2.006, a.fire('lift'), 'Counterweight releases')
a.cue(3.892, a.fire('lift') + 1.4, 'Two floors up')
a.cue(4.391, a.end('lift'), 'Reverse onto the upper landing')
a.cue(5.249, a.fire('trapeze'), 'Trapeze pin releases')
a.cue(7.883, a.fire('trapeze') + 1.1, 'Basket catches across the open space')
a.cue(8.362, a.end('trapeze'), 'The ball leaves the basket')
a.cue(8.771, a.fire('cradle'), 'Cradle relay')
a.cue(9.210, a.at('cradle', a.p('cradle').lane.segs.slice(0, 9).reduce((n, s) => n + s.dur, 0)), 'The far ball slips its string')
a.cue(9.799, a.end('cradle'), 'Cradle flight lands at the switchback')
a.cue(10.856, a.fire('switchback'), 'Turn downhill')
a.cue(11.515, a.end('switchback'), 'Reverse onto the lower landing')
a.cue(11.924, a.end('landing'), 'Pendulum tongue')
a.cue(12.752, a.fire('pendulum'), 'Pendulum accent')
a.cue(13.371, a.end('pendulum'), 'The exit draws the ball in')
a.cue(14.773, a.fire('portal-out'), 'Portal pull')
a.cue(15.296, a.end('portal-out'), 'Phrase cut to harbor')

// Start with the whole folded mechanism; frame the upper sweep, then open for the descent.
a.camera(0, 1.2, 2.3, 6.1)
a.camera(1.288, 1.2, 2.3, 6.1)
a.camera(4.391, 2.7, 2.1, 4.6)
a.camera(5.249, 2.7, 2.1, 4.6)
a.camera(8.362, 0.5, 1.9, 4.3)
a.camera(9.799, -0.7, 2.1, 4.3)
a.camera(11.924, -0.2, 2.8, 4.8)
a.camera(13.371, 1.3, 2.8, 4.8)
a.camera(15.296, 2.15, 2.8, 3.9)

// Harbor: lighthouse ascent, a pelican's flight, a pearl, then a vortex back down.
const b = scene('harbor', 0, 15.296, 30, [0, 4])
b.portal('in')
b.stock('lighthouse', 'lighthouse', 1, [-1, -2])
b.stock('pelican', 'pelican', 0, [3, 0])
b.stock('oyster', 'oyster', 1, [1, 0])
b.stock('whirlpool', 'whirlpool', 0, [-1, 1])
b.stock('buoy', 'buoy', 1, [1, 0])

b.cue(15.296, 0, 'Harbor portal opens on the new phrase')
b.cue(15.685, 0.4, 'The ball emerges')
b.cue(16.074, b.end('portal-in'), 'At the lighthouse door')
b.cue(16.434, b.at('lighthouse', b.p('lighthouse').lane.segs[0].dur + b.p('lighthouse').lane.segs[1].dur), 'A moment on the threshold')
b.cue(18.399, b.fire('lighthouse'), 'The lantern lights two floors up')
b.cue(18.908, b.end('lighthouse'), 'Reverse out of the lantern room')
b.cue(19.766, b.at('pelican', 0.7492307692307693), 'The pelican turns with the ball in its pouch')
b.cue(21.482, b.at('pelican', 1.2892307692307694), 'The pelican takes flight')
b.cue(22.0, b.at('pelican', 1.7292307692307693), 'The pelican lands')
b.cue(23.039, b.fire('pelican'), 'The beak opens')
b.cue(23.528, b.end('pelican'), 'Into the oyster')
b.cue(23.877, b.fire('oyster'), 'Oyster closes')
b.cue(24.884, b.fire('oyster') + 0.48, 'Held inside the shell')
b.cue(25.294, b.fire('oyster') + 0.55, 'Pearl reveal')
b.cue(25.723, b.end('oyster'), 'The pearl rolls into the whirlpool')
b.cue(27.568, b.fire('whirlpool'), 'The vortex reaches its drain')
b.cue(27.977, b.end('whirlpool'), 'Down a floor, facing back')
b.cue(29.155, b.fire('buoy'), 'Buoy rocks under the pearl')
b.cue(30, b.end('buoy'), 'Checkpoint: stop for feedback')

b.camera(15.296, -1.1, 2.8, 6.0)
b.camera(16.074, -1.1, 2.8, 6.0)
b.camera(18.399, 0.25, 1.9, 4.5)
b.camera(18.908, 0.25, 1.9, 4.5)
b.camera(21.482, -1, 1.7, 4.5)
b.camera(23.528, -2.5, 2, 4.5)
b.camera(25.723, -3.7, 2.25, 4.2)
b.camera(27.977, -3.7, 2.6, 4.7)
b.camera(30, -3.2, 2.6, 4.7)

for (const { data } of [a, b]) {
  for (let i = 1; i < data.cues.length; i++) {
    const prev = data.cues[i - 1], cue = data.cues[i]
    if (cue.at <= prev.at || cue.native <= prev.native) throw new Error(`Cues out of order: ${cue.label}`)
  }
}
const score: AuthoredScore = { duration: 30, audioOffset: 2.44, scenes: [a.data, b.data] }
writeFileSync('apps/rube/src/shows/clair-de-lune-30s.score.json', JSON.stringify(score, null, 2) + '\n')
console.log(`Saved two folded maps, ${score.scenes.reduce((n, s) => n + s.pieces.length, 0)} pieces, 30 seconds.`)
