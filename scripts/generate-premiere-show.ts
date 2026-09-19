/** The full, fixed Première score. Musical phrases are independent of maps. */
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { ballAt, laneAt, laneTime, type BallState, type Pt } from '../apps/rube/src/parts'
import { portalPlacement } from '../apps/rube/src/pieces/portal'
import { worldByName } from '../apps/rube/src/worlds'
import { pieceTime } from '../apps/rube/src/timed/premiere-arabesque/time'
import type { Phrase, PremiereScore, TimedMap, TimedPiece } from '../apps/rube/src/timed/premiere-arabesque/types'
import type { Rng } from '../src/core/rng'

const DURATION = 290.61133333333333
const maps: TimedMap[] = [], phrases: Phrase[] = []
let map: TimedMap, col = 0, row = 0, mirror: 1 | -1 = 1
let ball: BallState = { color: '#E76B31', ghost: false, id: 0 }
interface Spec { name: string; exit?: Pt; weight?: number; pick?: number; portal?: 'in' | 'out' }
const p = (name: string, x?: number, y?: number, weight = 1): Spec => ({ name, exit: x === undefined ? undefined : [x, y!], weight })
const door = (kind: 'in' | 'out'): Spec => ({ name: 'portal', portal: kind })

function scene(world: TimedMap['world'], begin: number, end: number, start: Pt = [-1, 0]) {
  map = { title: worldByName(world)!.label, world, begin, end, backdrop: world === 'garden' ? 'sprigs' : world === 'harbor' ? 'waves' : world === 'arcade' ? 'stars' : 'dots', pieces: [], camera: [] }
  maps.push(map); [col, row] = start; mirror = 1
}

function place(spec: Spec): TimedPiece {
  const world = worldByName(map.world)!, theme = world.themes[0]
  const stock = world.pieces.find(s => s.name === spec.name)
  assert.ok(stock, `Unknown ${map.world}/${spec.name}`)
  const color = theme.colors[(map.pieces.length * 2 + 1) % theme.colors.length]
  // Deterministic enumeration of stock variants and explicit palette indices.
  // No PRNG, planner, random samples, or entropy methods are available.
  const rng = new Proxy({
    shuffle: <T>(items: readonly T[]) => [...items],
    weighted: <T>(items: readonly T[]) => items[0],
    pick: <T>(items: readonly T[]) => items[(spec.pick ?? 0) % items.length],
  }, { get(target, key) {
    if (key in target) return target[key as keyof typeof target]
    throw new Error(`Entropy is forbidden: ${String(key)}`)
  } }) as unknown as Rng
  const placed = spec.portal ? portalPlacement(spec.portal, color) : stock.place({
    rng, color, theme, ball, earned: 600, taste: { weights: {} },
    fits: (_cells, exit) => !spec.exit || exit[0] === spec.exit[0] && exit[1] === spec.exit[1],
  })
  assert.ok(placed, `Cannot place ${map.world}/${spec.name}`)
  const saved: TimedPiece = { name: spec.name, label: spec.name, begin: 0, end: 0, col, row, mirror,
    cells: placed.cells.map(([x,y]) => [col + mirror*x, row+y]), lane: placed.lane, state: placed.state,
    ballIn: ball, changes: placed.changes ?? [], timing: [] }
  map.pieces.push(saved)
  ball = ballAt(ball, saved.changes, laneTime(saved.lane))
  col += mirror * placed.exit.at[0]; row += placed.exit.at[1]; mirror = mirror * placed.exit.dir as 1 | -1
  return saved
}

/** Prefer a pause after a braking ramp or at a stock wait to stretching motion. */
function restAt(piece: TimedPiece): number | undefined {
  let t = 0
  for (const seg of piece.lane.segs) {
    if (t > .05 && seg.from[0] === seg.to[0] && seg.from[1] === seg.to[1]) return t + seg.dur / 2
    t += seg.dur
    if (seg.ramp?.[1] === 0 && !piece.changes.some(c=>c.relay && Math.abs(c.at-t)<1e-8)) return t
  }
}
function timing(piece: TimedPiece) {
  const native = laneTime(piece.lane), span = piece.end - piece.begin, rest = restAt(piece)
  const knots: [number, number][] = [[piece.begin,0]]
  if (rest !== undefined && rest > 0 && rest < native && span > native * 1.2 && piece.name !== 'portal') {
    const moving = native * 1.1, hold = span - moving
    const settled = piece.begin + moving * rest / native
    knots.push([settled,rest], [settled+hold,rest])
  }
  knots.push([piece.end,native])
  piece.timing = knots.map(([time,native]) => ({time,native,slope:0}))
}
function phrase(title: string, end: number, specs: Spec[], note: string, visible = 5.5) {
  const begin = phrases.at(-1)?.end ?? 0
  const pieces = specs.map(place)
  const total = pieces.reduce((n,p,i) => n + laneTime(p.lane) * (specs[i].weight ?? 1), 0)
  let cursor = begin
  pieces.forEach((piece,i) => {
    piece.begin = cursor
    piece.end = i === pieces.length-1 ? end : cursor + (end-begin) * laneTime(piece.lane) * (specs[i].weight ?? 1) / total
    timing(piece); cursor = piece.end
  })
  phrases.push({title,begin,end,note,visible})
}

// REGULAR, 0–68.8. The opening's climb and two folds carry through one long map.
scene('workshop',0,68.8,[0,0])
phrase('Unfurling',4.90,[p('rail'),p('lift',1,-2),p('rail'),p('scoop')], 'A two-floor lift and a bucket wheel turn the opening back on itself.',5.8)
phrase('First wave',13.70,[p('drop',-1,3),p('cannon'),p('crane')], 'Drop below the opening, launch upward, then let a suspended carry breathe.',5.6)
phrase('Weight and suspension',22.49,[p('cradle'),p('hammer'),p('funnel',1,1),p('balloon',1,-2),p('painter')], 'A relay and a weight answer the melody; spiral down, float back up, change color.',5.4)
phrase('Lift and return',30.00,[p('trapeze'),p('drop',-1,3),p('zipline'),p('lift',1,-1)], 'Swing over open space, fall back underneath, then recover one floor.',5.6)
phrase('Bright crest',35.20,[p('plunger'),p('pendulum'),p('drop',-1,3)], 'A spring and pendulum gather pace before another deep reversal.',5.0)
phrase('Quiet rebuilding',42.80,[p('screw'),p('drawbridge'),p('funnel',1,1),p('conveyor')], 'A screw, bridge and conveyor turn the softer passage into patient work.',6.0)
phrase('Answer in flights',50.20,[p('trampoline'),p('flipper'),p('tipper'),p('cradle'),p('drop',-1,3)], 'Bounce, flick, tip and hand off, folding under the previous terraces.',5.5)
phrase('Suspended line',58.20,[p('crane'),p('gears'),p('seesaw'),p('lift',1,-1)], 'A long carry passes into gears and a seesaw; the cage lifts the answer.',5.6)
phrase('Opening into forest',68.80,[p('inverter'),p('funnel',1,1),p('stairs'),p('trapeze'),door('out')], 'A ceiling ride and spiral descend into a broad final swing; leave at the quiet cadence.',6.0)

// FOREST, 68.8–144.0. The approved garden vocabulary expands above its first loop.
scene('garden',68.8,144)
phrase('Growth resumes',79.30,[door('in'),p('vine',1,-2),p('rail'),p('bamboo'),p('well',-1,3)], 'Grow two floors, tip back, then descend in a well beside the first climb.',5.6)
phrase('The singing path',87.30,[p('spade',1,-2),p('snail'),p('appletree')], 'A spade launches the line; a snail takes its time, and an apple inherits the motion.',5.5)
phrase('A leaf answers',95.80,[p('croquet'),p('maple',1,2),p('wheelbarrow')], 'One mallet accent, a drifting leaf, and a quiet barrow beneath the path.',6.0)
phrase('Seed in the air',103.20,[p('toadstools'),p('dandelion',-1,-2),p('bloom',1,1)], 'Mushrooms lift the ball; the dandelion reverses into a flower spiral.',5.6)
phrase('Over the old route',110.60,[p('bumblebee'),p('dandelion',1,-2),p('gate'),p('vine',-1,-2)], 'A bee and a seed rise above the earlier terraces, pass a gate, and turn east on a vine.',5.8)
phrase('The quieter terrace',118.30,[p('wheelbarrow'),p('spade',1,-2),p('burrow',1,1),p('cocoon')], 'Carry, launch, drop through a burrow, and wait for the cocoon.',6.0)
phrase('Forest crest',126.70,[p('toadstools'),p('well',1,3),p('croquet'),p('frog',-1,-2),p('wateringcan')], 'Bounce and drop through the crest; a frog folds the route back.',5.0)
phrase('A higher answer',135.60,[p('dandelion',-1,-2),p('pod'),p('maple',1,2),p('gate'),p('snail')], 'Float above the frog, release a pod, fall with a leaf, and slow at the gate.',5.8)
phrase('Back through the roots',144.00,[p('bloom',-1,1),p('wheelbarrow'),p('well',1,2),p('burrow',1,1),door('out')], 'Spiral down and travel west beneath the high path, leaving through the roots.',6.0)

// AQUA, 144–204.7. Several waves, followed by the recording's deepest stillness.
scene('harbor',144,204.7)
phrase('A light on the water',152.80,[door('in'),p('lighthouse',1,-2),p('flags'),p('dolphin'),p('anchor',-1,3)], 'The lighthouse and dolphin rise; an anchor takes the chain below the pier.',5.6)
phrase('Across the tide',161.50,[p('dinghy'),p('anchor',-1,3),p('oyster'),p('kelp',1,-2)], 'Sail back underneath, drop again, hand off a pearl, and rise through kelp.',6.0)
phrase('The large wave',169.50,[p('pelican'),p('blowhole'),p('floats'),p('whirlpool')], 'A pouch carry, whale spout and floats lead into a whirlpool reversal.',5.0)
phrase('The wave recedes',176.50,[p('anemone'),p('anchor',1,2),p('puffer'),p('hawser')], 'The anemone changes the ball, then a descent and a suspended line slow the motion.',5.8)
phrase('Almost still',185.60,[p('anchor',-1,2),p('serpent'),p('seal'),p('crab')], 'Small rocking and a held balance leave air in the quietest passage.',6.3)
phrase('A distant return',193.70,[p('lighthouse',1,-2),p('jellyfish'),p('dinghy'),p('anchor',-1,3)], 'The light returns; a jellyfish and dinghy cross above the previous route.',5.8)
phrase('Leaving the water',204.70,[p('pelican'),p('oyster'),p('whirlpool'),p('floats'),p('slipway'),door('out')], 'A final pearl transfer and whirlpool turn carry the route into the quiet transition.',6.0)

// ARCADE, 204.7–290.611. A long night map, with room for the coda and its decay.
scene('arcade',204.7,DURATION)
phrase('Lights wake',214.60,[door('in'),p('claw'),p('ferris'),p('shooter',1,-2),p('spinner')], 'A claw and slow wheel lift the returning melody; the shooter rises above them.',5.8)
phrase('The returning line',222.50,[p('hoops'),p('slots'),p('bumper'),p('ufo',1,-2),p('phaser')], 'A hoop, lever and bumper give accents before a beam lift and ghost passage.',5.5)
phrase('Crest above the midway',230.50,[p('striker',-1,-2),p('gauss'),p('coaster'),p('ufo',-1,-2)], 'The striker turns west; a relay fires into a coaster, then a beam lifts back east.',5.2)
phrase('A gentler wheel',237.40,[p('ferris'),p('claw'),p('slots'),p('zigzag',1,2)], 'Wheel and claw carry the retreat, then the lever and tubes descend.',6.0)
phrase('Gathering again',245.00,[p('whack'),p('slingshot'),p('hockey'),p('blocks',-1,1)], 'Moles, a sling and a mallet build the next answer before the cleared line turns west.',5.3)
phrase('Through the lit terraces',253.30,[p('coaster'),p('changer'),p('phaser'),p('zigzag',1,2),p('coaster'),p('blocks',1,1)], 'A token transfer, ghost passage and two different coaster approaches fold down through the map.',5.7)
phrase('The line opens out',261.70,[p('claw'),p('zigzag',1,2),p('ferris'),p('changer'),p('blocks',1,1)], 'A suspended carry and wheel slow the line as it reaches the lower terraces.',6.0)
phrase('Coda, with space',270.80,[p('zigzag',1,2),p('ferris'),p('claw'),p('slots')], 'Descend, rise on the wheel, wait in the claw, and let the lever settle.',6.2)
phrase('A last rising answer',278.60,[p('shooter',1,-2),p('whack'),p('ufo',1,-2),p('spinner')], 'The last answer climbs in stages, with short accents between the lifts.',5.6)
phrase('The final arc',284.00,[p('ferris'),p('changer'),p('claw')], 'A slow wheel and a last token transfer lead to a gentle carry.',6.0)
phrase('Release and resonance',287.40,[p('ufo',-1,-2),p('rail')], 'A final beam lift folds back onto one cell of rail; the ball stops while the piano resonance fades.',6.4)

// Reserve the final decay for stillness, without stretching the final fall.
const last = maps.at(-1)!.pieces.at(-1)!
last.end = DURATION
phrases.at(-1)!.end = DURATION
last.timing.push({time:DURATION,native:laneTime(last.lane),slope:0})

// Selected attacks measured in the approved recording. Nudge a stock release
// by at most a fraction of a second; phrase spans and the path stay fixed.
const accents: [number,string,number][] = [
 [4.9,'cannon',8.58], [13.7,'hammer',15.31], [22.49,'lift',28.17],
 [30,'pendulum',33.57], [35.2,'screw',35.67], [42.8,'flipper',46.02],
 [50.2,'lift',56.56], [58.2,'inverter',58.85], [68.8,'vine',71.24],
 [95.8,'dandelion',98.57], [103.2,'dandelion',105.88], [110.6,'wheelbarrow',112.84],
 [118.3,'frog',124.76], [144,'dolphin',148.78], [152.8,'oyster',157.94],
 [161.5,'whirlpool',168.87], [204.7,'claw',208.15], [214.6,'hoops',215.76],
 [222.5,'striker',223.94], [237.4,'hockey',241.76], [245,'coaster',246.66],
 [270.8,'shooter',272.51], [278.6,'changer',281.31], [284,'ufo',284.49],
]
for(const [begin,name,time] of accents){
 const phrase=phrases.find(p=>p.begin===begin)!
 const piece=maps.flatMap(m=>m.pieces).find(p=>p.name===name && p.begin>=begin && p.begin<phrase.end)!
 assert.ok(piece,`Missing accent ${name} in ${begin}`)
 const native=piece.lane.fire, i=piece.timing.findIndex(k=>k.native>native)
 assert.ok(i>0 && time>piece.timing[i-1].time && time<piece.timing[i].time,`Accent outside motion: ${name} at ${time}`)
 piece.timing.splice(i,0,{time,native,slope:0})
 ;(phrase.strikes??=[]).push({time,piece:name})
}

// Monotone C1 time maps, including zero-slope plateaus at true rests.
const secant = (piece:TimedPiece,i:number) => {
 const a=piece.timing[i], b=piece.timing[i+1]; return (b.native-a.native)/(b.time-a.time)
}
for(const map of maps){
 const occupied=new Map<string,string>()
 for(const piece of map.pieces){
  piece.timing.forEach((k,i,knots)=>{
   if(!i)k.slope=Math.min(.85,2*secant(piece,0))
   else if(i===knots.length-1)k.slope=Math.min(.85,2*secant(piece,i-1))
   else {const a=secant(piece,i-1),b=secant(piece,i);k.slope=a+b?2*a*b/(a+b):0}
  })
  for(const cell of piece.cells){const key=cell.join(',');assert.ok(!occupied.has(key),`${map.world}: ${piece.name} at ${piece.col},${piece.row} overlaps ${occupied.get(key)} at ${key}`);occupied.set(key,piece.name)}
 }
 for(let i=1;i<map.pieces.length;i++){
  const before=map.pieces[i-1], after=map.pieces[i]
  const a=before.timing.at(-1)!, b=after.timing[0], e=1e-6
  const end=laneTime(before.lane), left=laneAt(before.lane,end-e), exit=laneAt(before.lane,end)
  const entry=laneAt(after.lane,0), right=laneAt(after.lane,e)
  const v0=Math.hypot(exit.x-left.x,exit.y-left.y)/e, v1=Math.hypot(right.x-entry.x,right.y-entry.y)/e
  // Some stock pieces leave slightly faster than ROLL. Match physical speed,
  // not merely the two native clock rates, without changing either stock lane.
  const speed=Math.min(a.slope*v0,b.slope*v1)
  a.slope=v0?speed/v0:0; b.slope=v1?speed/v1:0
 }
 const sample=(t:number)=>{
  const time=Math.max(map.begin,Math.min(map.end,t)),p=map.pieces.find(p=>time<p.end)??map.pieces.at(-1)!
  const pos=laneAt(p.lane,pieceTime(p,time));return {x:p.col+p.mirror*pos.x,y:p.row+pos.y}
 }
 // Bake a gentle look-ahead camera. Phrase framing is authored above; its focus
 // averages a short span of the fixed lane so native traces never shake the view.
 for(let time=map.begin;time<map.end+.499;time+=.5){
  const t=Math.min(time,map.end)
  let x=0,y=0,w=0,visible=0
  for(let j=-12;j<=16;j++){const weight=1-Math.abs(j-2)/16;const q=sample(t+j*.075);x+=q.x*weight;y+=q.y*weight;w+=weight;visible+=(phrases.find(p=>t+j*.075<p.end)??phrases.at(-1)!).visible!*weight}
  map.camera.push({time:t,x:x/w,y:y/w-.18,visible:visible/w})
  if(t===map.end)break
 }
}
const score:PremiereScore={id:'premiere-arabesque-prati-journey',title:'Première Arabesque',performer:'Patrizia Prati',revision:4,audioOffset:2.38,duration:DURATION,phrases,maps}
writeFileSync('apps/rube/src/timed/premiere-arabesque/score.generated.json',JSON.stringify(score)+'\n')
console.log(`${phrases.length} phrases, ${maps.length} long maps, ${maps.reduce((n,m)=>n+m.pieces.length,0)} stock pieces, ${DURATION.toFixed(3)} seconds.`)
for(const m of maps)console.log(`${m.title}: ${m.begin}–${m.end}, ${m.pieces.length} pieces`)
