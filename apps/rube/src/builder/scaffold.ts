import { makeRng, type Rng } from '../../../../src/core/rng'
import type { Theme } from '../../../../src/core/themes'
import { FAST, FLOOR, R, ROLL, type Pt } from '../parts'
import { WORLDS, type Backdrop } from '../worlds'
import { slug, uniqueName, type LaneStep, type Motion, type PieceSpec, type Shape, type StockWorld, type WorldSpec } from './spec'

/**
 * The offline half of "prompt a piece": no key, no network. A prompt is read
 * for the one thing a scaffold can honestly get from it — which mechanism it
 * is asking for — and the answer is one of eleven mechanisms, each written
 * here the way a stock piece is: a lane the ball really follows, a cause the
 * eye can see, parts that stand on something, and one flat fill that is never
 * the ball's colour. The noun in the prompt names the piece and picks the
 * silhouette where there is one to pick.
 *
 * What comes out is a plain `PieceSpec`, the same JSON a file holds, so the
 * scaffold is a starting point in the full sense: it plays as it is, and
 * everything about it can be edited in the Builder's JSON pane afterwards.
 */

/* ------------------------------------------------------------------ small builders */

const TAU = Math.PI * 2
const round = (v: number) => Math.round(v * 1000) / 1000
const pt = (x: number, y: number): Pt => [round(x), round(y)]

const railTo = (x0: number, x1: number, y?: number): Shape => ({ kind: 'rail', x0: round(x0), x1: round(x1), ...(y === undefined ? {} : { y: round(y) }) })
const sparks = (x: number, y: number, r0: number, r1: number, n: number, to = 0.26, from = 0): Shape => ({
  kind: 'burst', at: pt(x, y), r0, r1, n, phase: -Math.PI / 2 + 0.3, stroke: 'color', show: { clock: 'since', from: round(from), to: round(to) },
})

type Body = Pick<PieceSpec, 'cells' | 'exit' | 'lane' | 'shapes'> & Partial<Pick<PieceSpec, 'flight' | 'paint' | 'weight'>> & { note: string }

interface Archetype {
  key: string
  /** What it does to the ball, in a word or two, for the Builder to list. */
  label: string
  /** A prompt that asks for it, for the Builder to offer. */
  example: string
  /** Words in a prompt that ask for this mechanism. */
  words: string[]
  build(rng: Rng, noun: string, words: Set<string>, variant: number): Body
}

const has = (words: Set<string>, ...any: string[]) => any.some((w) => words.has(w))

/**
 * Which silhouette a mechanism wears. A word in the prompt that names one
 * decides it; failing that the variant does, so making a piece again from
 * the same prompt makes one that looks different and not the same one with
 * its numbers nudged.
 */
function look<T extends string>(words: Set<string>, variant: number, looks: Record<T, string[]>): T {
  const names = Object.keys(looks) as T[]
  return names.find((name) => has(words, ...looks[name])) ?? names[variant % names.length]
}

/* ------------------------------------------------------------------ the mechanisms */

/** A mallet on a mast comes round onto the ball's shoulder and drives it out along the rail. */
const striker: Archetype = {
  key: 'striker',
  label: 'strike',
  example: 'a mallet',
  words: ['hammer', 'mallet', 'hit', 'hits', 'strike', 'strikes', 'smash', 'whack', 'knock', 'knocks', 'kick', 'kicks', 'boot', 'punch', 'fist', 'bat', 'club', 'thump', 'bonk', 'slap', 'stomp', 'gavel'],
  build: (rng, noun, words, variant) => {
    const WAIT = round(rng.range(0.42, 0.6))
    const boot = look(words, variant, { mallet: ['mallet', 'hammer', 'gavel', 'club', 'bat'], boot: ['kick', 'kicks', 'boot', 'stomp', 'foot', 'shoe'] }) === 'boot'
    // The head comes down the ball's upper back at 45° and its face stops a ball's radius from the
    // ball's centre: `face` is how far the face stands proud of the arm's end, along the swing.
    const face = boot ? 0.24 : 0.16
    const reach = 0.42
    const hx = -(R + face) * Math.SQRT1_2
    const pivot = pt(hx + reach, hx - reach)
    const arm = round(Math.hypot(reach, reach))
    const strike = (Math.PI * 3) / 4
    const cocked = 1.5
    const lane: LaneStep[] = [
      { op: 'arrive', to: [0, 0] },
      { op: 'wait', dur: WAIT, fire: true },
      { op: 'fly', to: [0.22, 0], dur: 0.05, arc: 0.04 },
      { op: 'ramp', to: [0.5, 0], v0: FAST, v1: ROLL },
    ]
    const swing: Motion[] = [
      { drive: 'ease', ease: 'in', from: -0.2, to: 0, rotate: -cocked, back: [1.0, 2.6] },
      { drive: 'swing', from: 0, rotate: 0.16, freq: 20, decay: 8 },
    ]
    const shapes: Shape[] = [
      railTo(-0.5, 0.5),
      // The plate the ball stops on; its sink is what lets the mallet go.
      { kind: 'rect', at: pt(0, FLOOR + 0.03), w: 0.34, h: 0.06, r: 0.01, fill: 'ink', motion: [{ drive: 'ease', clock: 't', from: 0.2, to: 0.3, move: [0, 0.02] }] },
      { kind: 'post', x: pivot[0], y0: pivot[1], y1: 0.5 },
      {
        kind: 'group', at: pivot, rot: round(strike + cocked), motion: swing,
        shapes: [
          { kind: 'line', pts: [[0, 0], [arm, 0]] },
          // In the arm's frame the swing is towards -y: a mallet's head lies along it, a boot's toe points down it.
          boot
            ? { kind: 'poly', at: pt(arm, 0), pts: [[-0.22, -0.07], [-0.22, 0.07], [0.08, 0.07], [0.08, -0.24], [-0.05, -0.24], [-0.05, -0.07]] }
            : { kind: 'rect', at: pt(arm, 0), w: 0.18, h: 0.32, r: 0.03 },
          { kind: 'ellipse', w: 0.1, h: 0.1, fill: 'paper' },
        ],
      },
      sparks(-0.1, -0.12, 0.06, 0.3, 7),
    ]
    return { cells: [[0, 0], [0, -1]], exit: { at: [1, 0], dir: 1 }, lane, shapes, note: `A ${noun} on a mast: the ball stops on the plate, the head comes round onto its shoulder, and it leaves twice as fast as it came.` }
  },
}

/** Something hung over the line that the ball brushes in passing: it swings, and rings. Punctuation. */
const chime: Archetype = {
  key: 'chime',
  label: 'ring',
  example: 'a bell',
  words: ['gong', 'bell', 'chime', 'chimes', 'ring', 'rings', 'lantern', 'sign', 'hang', 'hangs', 'hanging', 'dangle', 'swing', 'swings', 'pendulum', 'cymbal', 'tambourine', 'mobile', 'charm', 'ornament', 'bauble', 'toll'],
  build: (_rng, noun, words, variant) => {
    const d = 0.62
    const cy = 0.95
    const form = look(words, variant, { disc: ['gong', 'cymbal', 'tambourine', 'plate'], lantern: ['lantern', 'sign', 'ornament', 'bauble', 'box'], bell: ['bell', 'toll', 'chime', 'chimes'] })
    // Each body as its parts, and how far above and below its middle it reaches, for the cords and the feeler.
    const bodies: Record<typeof form, { shapes: Shape[]; up: number; down: number }> = {
      disc: { up: d / 2, down: d / 2, shapes: [{ kind: 'ellipse', offset: pt(0, cy), w: d, h: d }, { kind: 'ellipse', offset: pt(0, cy), w: 0.2, h: 0.2, fill: 'paper' }] },
      lantern: { up: 0.29, down: 0.29, shapes: [{ kind: 'rect', offset: pt(0, cy), w: 0.44, h: 0.58, r: 0.06 }, { kind: 'rect', offset: pt(0, cy), w: 0.24, h: 0.34, r: 0.03, fill: 'paper' }] },
      bell: {
        up: 0.3, down: 0.28,
        shapes: [
          { kind: 'poly', at: pt(0, cy), pts: [[-0.32, 0.28], [-0.22, 0.14], [-0.18, -0.14], [-0.09, -0.3], [0.09, -0.3], [0.18, -0.14], [0.22, 0.14], [0.32, 0.28]] },
          { kind: 'line', at: pt(0, cy), pts: [[-0.2, 0.18], [0.2, 0.18]] },
        ],
      },
    }
    const lantern = form === 'lantern'
    const body = bodies[form].shapes
    const bottom = cy + bodies[form].down
    // The feeler ends where the ball's crown passes, so the ball is seen to set it off.
    const tip = 1.5 - R - 0.03
    const shapes: Shape[] = [
      railTo(-0.5, 0.5),
      { kind: 'gallows', x0: -0.36, x1: 0.24, post: -0.36, y: -1.5 },
      // The ring going out, a pair of arcs a side.
      ...[0, Math.PI].map((a): Shape => ({
        kind: 'arc', at: pt(0, -1.5 + cy), w: 0.74, h: 0.74, a0: round(a - 0.45), a1: round(a + 0.45), stroke: 'color',
        show: { clock: 'since', from: 0.02, to: 0.5 }, motion: [{ drive: 'ease', ease: 'out', from: 0, to: 0.5, scale: [1.28, 1.28] }],
      })),
      {
        kind: 'group', at: pt(0, -1.5), motion: [{ drive: 'swing', from: 0, rotate: 0.13, freq: 7, decay: 1.1 }],
        shapes: [
          { kind: 'line', pts: [[lantern ? -0.1 : -0.06, 0], [lantern ? -0.1 : -0.06, round(cy - bodies[form].up + 0.02)]] },
          { kind: 'line', pts: [[lantern ? 0.1 : 0.06, 0], [lantern ? 0.1 : 0.06, round(cy - bodies[form].up + 0.02)]] },
          ...body,
          { kind: 'line', pts: [[0, round(bottom)], [0, round(tip - 0.025)]] },
          { kind: 'ellipse', offset: pt(0, tip), w: 0.055, h: 0.055, fill: 'ink' },
        ],
      },
    ]
    const lane: LaneStep[] = [{ op: 'roll', to: [0, 0], fire: true }, { op: 'roll', to: [0.5, 0] }]
    return { cells: [[0, 0], [0, -1]], exit: { at: [1, 0], dir: 1 }, lane, shapes, weight: 0.8, note: `A ${noun} hung from a gallows with a feeler down in the ball's way: brushed in passing, it rocks on its cords and rings.` }
  },
}

/** A pit with something springy in it: the rail stops, the ball drops in and comes back out over the far wall. */
const bouncer: Archetype = {
  key: 'bouncer',
  label: 'bounce',
  example: 'a mushroom',
  words: ['bounce', 'bounces', 'bouncy', 'spring', 'springs', 'trampoline', 'jump', 'jumps', 'hop', 'hops', 'drum', 'mushroom', 'toadstool', 'pogo', 'rubber', 'jelly', 'boing', 'cushion', 'pillow', 'bed'],
  build: (_rng, noun, words, variant) => {
    const LIP = 0.22
    const X = 0.7
    const REST = 1.05
    const SAG = 0.13
    const arrive = (0.5 + LIP) / ROLL
    const IN = 0.32
    const DOWN = 0.1
    const UP = 0.09
    const lane: LaneStep[] = [
      { op: 'roll', to: [LIP, 0] },
      { op: 'fly', to: pt(X, REST - R), dur: IN, arc: 0.1 },
      { op: 'move', to: pt(X, REST - R + SAG), dur: DOWN, ease: 'out', fire: true },
      { op: 'move', to: pt(X, REST - R), dur: UP, ease: 'in' },
      { op: 'fly', to: [1.32, 0], dur: 0.56, arc: 0.5 },
      { op: 'fly', to: [1.44, 0], dur: 0.08, arc: 0.03 },
      { op: 'ramp', to: [1.5, 0], v0: 2, v1: ROLL },
    ]
    // Pressed for exactly as long as the ball is on it: down with the ball, up with it.
    const press = { clock: 't' as const, from: round(arrive + IN), to: round(arrive + IN + DOWN + UP) }
    const cap = look(words, variant, { pad: ['drum', 'spring', 'springs', 'trampoline', 'pogo'], cap: ['mushroom', 'toadstool', 'jelly', 'pillow', 'cushion', 'bed'] }) === 'cap'
    const pad: Shape[] = cap
      ? [
          { kind: 'rect', at: pt(X, 1.37), w: 0.14, h: 0.26, fill: 'paper' },
          {
            kind: 'group', at: pt(X, REST + 0.2), motion: [{ drive: 'pulse', ...press, scale: [1.14, 0.35] }, { drive: 'swing', from: UP, scale: [1, 1.18], freq: 26, decay: 5 }],
            shapes: [
              { kind: 'arc', w: 0.6, h: 0.4, a0: Math.PI, a1: TAU, close: 'chord' },
              { kind: 'ellipse', offset: pt(-0.13, -0.09), w: 0.07, h: 0.06, fill: 'paper', stroke: 'none' },
              { kind: 'ellipse', offset: pt(0.1, -0.12), w: 0.09, h: 0.07, fill: 'paper', stroke: 'none' },
            ],
          },
        ]
      : [
          { kind: 'coil', at: pt(X, REST + 0.05), anchor: pt(X, 1.5), turns: 4, amp: 0.09, motion: [{ drive: 'pulse', ...press, move: [0, SAG] }, { drive: 'swing', from: UP, move: [0, -0.05], freq: 26, decay: 5 }] },
          { kind: 'rect', at: pt(X, REST + 0.03), w: 0.5, h: 0.06, r: 0.02, motion: [{ drive: 'pulse', ...press, move: [0, SAG] }, { drive: 'swing', from: UP, move: [0, -0.05], freq: 26, decay: 5 }] },
        ]
    const shapes: Shape[] = [
      railTo(-0.5, LIP + 0.06),
      railTo(1.14, 1.5),
      { kind: 'line', pts: [pt(LIP + 0.06, FLOOR), pt(LIP + 0.06, 1.5), pt(1.14, 1.5), pt(1.14, FLOOR)] },
      ...pad,
      sparks(X, REST, 0.14, 0.42, 6, 0.3),
    ]
    return {
      cells: [[0, 0], [1, 0], [0, 1], [1, 1]], exit: { at: [2, 0], dir: 1 }, lane, shapes, flight: true, weight: 0.8,
      note: `A pit with a ${noun} in it. The rail just stops; the ball drops in, the ${noun} gives under it, and it comes back out higher than it went in.`,
    }
  },
}

/** A platform on a spring carries the ball up a floor between two guides. */
const lifter: Archetype = {
  key: 'lifter',
  label: 'lift',
  example: 'an elevator',
  words: ['lift', 'lifts', 'elevator', 'rise', 'rises', 'raise', 'raises', 'up', 'climb', 'climbs', 'hoist', 'piston', 'geyser', 'fountain', 'jack', 'ladder', 'tower', 'escalator', 'upward', 'upwards'],
  build: (rng, noun, words, variant) => {
    const RISE = round(rng.range(0.9, 1.15))
    const lane: LaneStep[] = [
      { op: 'arrive', to: [0, 0] },
      { op: 'wait', dur: 0.3, fire: true },
      { op: 'move', to: [0, -1], dur: RISE, ease: 'inout' },
      { op: 'wait', dur: 0.15 },
      { op: 'ramp', to: [0.5, -1], v0: 0, v1: ROLL },
    ]
    const carried: Motion[] = [{ drive: 'follow', steps: [2, 2], axis: 'y', back: [round(RISE + 0.9), round(RISE + 2.1)] }]
    const hoist = look(words, variant, { spring: ['spring', 'piston', 'geyser', 'fountain', 'jack'], cable: ['elevator', 'hoist', 'cable', 'crane', 'winch', 'tower'] }) === 'cable'
    const shapes: Shape[] = [
      railTo(-0.5, -0.2),
      railTo(0.2, 0.5, -1 + FLOOR),
      // Two guides the platform rides between, tied across the top.
      { kind: 'line', pts: [[-0.2, 0.5], [-0.2, -1.32], [0.2, -1.32], [0.2, 0.5]] },
      { kind: 'line', pts: [[-0.3, 0.5], [0.3, 0.5]] },
      // What moves it: a spring under it, or a cable from a sheave on the tie (a coil with no amplitude is a line that stretches).
      hoist
        ? { kind: 'coil', at: pt(0, -0.3), anchor: [0, -1.27], turns: 1, amp: 0, motion: carried }
        : { kind: 'coil', at: pt(0, FLOOR + 0.06), anchor: [0, 0.5], turns: 5, amp: 0.1, motion: carried },
      ...(hoist
        ? ([
            { kind: 'ellipse', at: pt(0, -1.27), w: 0.1, h: 0.1, fill: 'paper', motion: [{ drive: 'ease', ease: 'inout', from: 0, to: RISE, rotate: -9, back: [round(RISE + 0.9), round(RISE + 2.1)] }] },
            // The cage: a bail over the ball from the platform's ends, carried with it.
            { kind: 'line', at: pt(0, FLOOR), pts: [[-0.16, 0], [-0.16, -0.43], [0.16, -0.43], [0.16, 0]], motion: carried },
          ] satisfies Shape[])
        : []),
      { kind: 'rect', at: pt(0, FLOOR + 0.03), w: 0.36, h: 0.06, r: 0.015, motion: carried },
      // The catch that holds it down, flicked aside at the fire.
      { kind: 'rect', at: pt(-0.2, FLOOR + 0.03), offset: [-0.06, 0], w: 0.12, h: 0.05, fill: 'accent', motion: [{ drive: 'ease', ease: 'out', from: -0.04, to: 0.04, rotate: -1.1, back: [round(RISE + 2.0), round(RISE + 2.2)] }] },
      sparks(0, FLOOR + 0.1, 0.1, 0.3, 5, 0.22),
    ]
    if (hoist) return { cells: [[0, 0], [0, -1]], exit: { at: [1, -1], dir: 1 }, lane, shapes, note: `A ${noun}: a cage on a cable between two guides. The ball's weight trips the catch and the sheave winds it up a floor.` }
    return { cells: [[0, 0], [0, -1]], exit: { at: [1, -1], dir: 1 }, lane, shapes, note: `A ${noun}: a platform on a spring between two guides. The ball's weight trips the catch and the spring carries it up a floor.` }
  },
}

/** A slide down a floor: over the edge, faster all the way, and out along the rail below. Or a flight of steps it hops down. */
const chute: Archetype = {
  key: 'chute',
  label: 'drop',
  example: 'a flight of stairs',
  words: ['slide', 'slides', 'chute', 'drop', 'drops', 'fall', 'falls', 'down', 'ramp', 'slope', 'hill', 'waterfall', 'slip', 'ski', 'sled', 'descend', 'tumble', 'tumbles', 'downhill', 'toboggan', 'stairs', 'stair', 'steps', 'staircase', 'stairway'],
  build: (_rng, noun, words, variant) => {
    if (look(words, variant, { slide: ['slide', 'chute', 'ramp', 'slope', 'ski', 'sled', 'toboggan', 'slip', 'hill'], stairs: ['stairs', 'stair', 'steps', 'staircase', 'stairway', 'tumble', 'tumbles'] }) === 'stairs') return stairs(noun)
    // The slide runs from the end of the upper rail to the lower one. The ball's centre keeps a radius off
    // it along its normal: round the top edge onto it, and off it where the ball first touches the flat.
    const edge = pt(-0.3, FLOOR)
    const foot = pt(0.3, 1 + FLOOR)
    const len = Math.hypot(foot[0] - edge[0], foot[1] - edge[1])
    const dx = (foot[0] - edge[0]) / len
    const dy = (foot[1] - edge[1]) / len
    const on = pt(edge[0] + dy * R, edge[1] - dx * R)
    const run = (1 - on[1]) / dy
    const off = pt(on[0] + dx * run, 1)
    const SLIDE = 0.5
    const lane: LaneStep[] = [
      { op: 'roll', to: [edge[0], 0] },
      { op: 'move', to: on, dur: 0.05, fire: true },
      { op: 'move', to: off, dur: SLIDE, ease: 'in' },
      { op: 'ramp', to: [0.5, 1], v0: 3.4, v1: ROLL },
    ]
    const shapes: Shape[] = [
      railTo(-0.5, edge[0]),
      { kind: 'line', pts: [edge, foot, pt(0.5, 1 + FLOOR)] },
      { kind: 'post', x: edge[0], y0: FLOOR, y1: 0.5 },
      { kind: 'post', x: 0, y0: round((edge[1] + foot[1]) / 2), y1: 1.5 },
      // A pennant on a staff at the top, set flying as the ball goes over the edge.
      { kind: 'line', pts: [[-0.42, FLOOR], [-0.42, -0.4]] },
      { kind: 'poly', at: pt(-0.42, -0.38), pts: [[0, 0], [0.26, 0.07], [0, 0.14]], motion: [{ drive: 'swing', from: 0, rotate: 0.5, freq: 11, decay: 2.2 }] },
      // Where it lands on the flat: a pad that gives, and dust.
      { kind: 'rect', at: pt(off[0], 1 + FLOOR + 0.035), w: 0.2, h: 0.07, r: 0.02, fill: 'color', motion: [{ drive: 'pulse', from: SLIDE - 0.03, to: SLIDE + 0.16, scale: [1.1, 0.6] }] },
      sparks(off[0] - 0.05, 1 + FLOOR - 0.02, 0.06, 0.26, 5, SLIDE + 0.24, SLIDE),
    ]
    return { cells: [[0, 0], [0, 1]], exit: { at: [1, 1], dir: 1 }, lane, shapes, note: `A ${noun}: over the edge and down a slide to the floor below, faster all the way, with a pennant at the top that the ball sets flying.` }
  },
}

/** Three steps down a floor: the ball rolls to each edge and hops down to the next tread, which gives a little under it. */
function stairs(noun: string): Body {
  const RISE = 1 / 3
  // Each tread's front edge: the upper rail's end, then a quarter of a cell apart; the last is the lower rail's start.
  const edges = [-0.3, -0.05, 0.2]
  const HOP = 0.2
  // The ball comes down clear of the riser it went over, and rolls on to the next edge.
  const CLEAR = 0.14
  const lane: LaneStep[] = [{ op: 'roll', to: [edges[0], 0] }]
  edges.forEach((x, i) => {
    lane.push({ op: 'fly', to: pt(x + CLEAR, RISE * (i + 1)), dur: HOP, arc: 0.08, ...(i === 0 ? { fire: true } : {}) })
    if (i < 2) lane.push({ op: 'roll', to: pt(edges[i + 1], RISE * (i + 1)) })
  })
  lane.push({ op: 'ramp', to: [0.5, 1], v0: 1.6, v1: ROLL })
  // Seconds from one landing to the next.
  const step = round((edges[1] - edges[0] - CLEAR) / ROLL + HOP)
  const tread = (i: number): number => round(FLOOR + RISE * i)
  const shapes: Shape[] = [
    railTo(-0.5, edges[0]),
    railTo(edges[2], 0.5, 1 + FLOOR),
    { kind: 'post', x: -0.42, y0: FLOOR, y1: 0.5 },
    // The flight as one block: treads and risers, and down to the ground.
    { kind: 'poly', pts: [pt(edges[0], FLOOR), pt(edges[0], tread(1)), pt(edges[1], tread(1)), pt(edges[1], tread(2)), pt(edges[2], tread(2)), pt(edges[2], 1.5), pt(edges[0], 1.5)] },
    // A strip on each tread that dips as the ball comes down on it.
    ...edges.map((x, i): Shape => ({
      kind: 'rect', at: pt(x + 0.125, tread(i + 1) + 0.025), w: 0.18, h: 0.05, r: 0.015, fill: 'accent',
      motion: [{ drive: 'pulse', from: round(i * step - 0.02), to: round(i * step + 0.14), move: [0, 0.02] }],
    })),
    sparks(edges[2] + CLEAR, 1 + FLOOR - 0.03, 0.06, 0.24, 5, 2 * step + 0.22, 2 * step - 0.02),
  ]
  return { cells: [[0, 0], [0, 1]], exit: { at: [1, 1], dir: 1 }, lane, shapes, note: `A ${noun} of three steps: the ball rolls to each edge and hops down to the next, and each tread gives under it as it lands.` }
}

/** A bucket on a gallows tips over the stopped ball, and it leaves a new colour. */
const painter: Archetype = {
  key: 'painter',
  label: 'paint',
  example: 'a spray can',
  words: ['paint', 'paints', 'painted', 'colour', 'color', 'colours', 'colors', 'recolour', 'recolor', 'dye', 'dyes', 'dip', 'ink', 'spray', 'sprays', 'airbrush', 'aerosol', 'graffiti', 'splash', 'bucket', 'pour', 'pours', 'glaze', 'stain', 'tint', 'rainbow', 'honey', 'syrup', 'sauce', 'slime'],
  build: (_rng, noun, words, variant) => {
    // Tipped, the bucket's lip comes round to the ball's centre line, so the pour lands on its crown.
    const pivot = pt(-0.1, -0.78)
    const lip = -0.47
    const lane: LaneStep[] = [
      { op: 'arrive', to: [0, 0] },
      { op: 'wait', dur: 0.06, fire: true },
      { op: 'wait', dur: 0.62 },
      { op: 'ramp', to: [0.5, 0], v0: 0.6, v1: ROLL },
    ]
    const frame: Shape[] = [
      railTo(-0.5, -0.17),
      railTo(0.17, 0.5),
      { kind: 'rect', at: pt(0, FLOOR + 0.025), w: 0.32, h: 0.05, fill: 'ink', motion: [{ drive: 'ease', from: -0.06, to: 0, move: [0, 0.03], back: [0.7, 0.85] }] },
      { kind: 'line', pts: [pt(0, FLOOR + 0.05), [0, 0.5]] },
      { kind: 'gallows', x0: -0.38, x1: 0.24, post: -0.38, y: -1.5 },
    ]
    // What is left on the plate after.
    const puddle: Shape = { kind: 'arc', at: pt(0, FLOOR), w: 0.2, h: 0.07, a0: Math.PI, a1: TAU, close: 'chord', fill: 'paint', stroke: 'none', show: { clock: 'since', from: 0.5 } }
    const spray = look(words, variant, { bucket: ['bucket', 'pour', 'pours', 'honey', 'syrup', 'sauce', 'slime', 'dip', 'splash', 'glaze'], spray: ['spray', 'sprays', 'airbrush', 'aerosol', 'graffiti', 'mist', 'nozzle', 'can'] }) === 'spray'
    if (spray) {
      const hang = pt(0, -0.95)
      const shapes: Shape[] = [
        ...frame,
        { kind: 'line', pts: [[0, -1.5], hang] },
        // The cloud, behind the ball so that it settles on it, from the nozzle down to its crown.
        { kind: 'poly', pts: [[-0.03, -0.56], [0.03, -0.56], [0.19, -0.06], [-0.19, -0.06]], fill: 'paint', stroke: 'none', show: { clock: 'since', from: 0.08, to: 0.45 } },
        {
          kind: 'group', at: hang, motion: [{ drive: 'pulse', from: 0, to: 0.12, move: [0, 0.04] }, { drive: 'swing', from: 0.12, rotate: 0.08, freq: 14, decay: 3 }],
          shapes: [
            { kind: 'rect', offset: [0, 0.17], w: 0.2, h: 0.3, r: 0.03 },
            { kind: 'rect', offset: [0, 0.12], w: 0.2, h: 0.07, fill: 'paint' },
            { kind: 'rect', offset: [0, 0.35], w: 0.08, h: 0.06, fill: 'ink' },
          ],
        },
        { kind: 'burst', at: pt(0, -R), r0: 0.06, r1: 0.3, n: 9, phase: -Math.PI / 2 + 0.2, stroke: 'paint', show: { clock: 'since', from: 0.1, to: 0.5 } },
        puddle,
      ]
      return {
        cells: [[0, 0], [0, -1]], exit: { at: [1, 0], dir: 1 }, lane, shapes, paint: { after: 0.14, over: 0.3 }, weight: 0.9,
        note: `A ${noun} hung over the plate. The ball stops, the can jolts and hisses a cloud of paint down over it, and it rolls on a new colour, for good.`,
      }
    }
    const shapes: Shape[] = [
      ...frame,
      { kind: 'line', pts: [[pivot[0], -1.5], pivot] },
      // The pour, behind the ball so that it lands on its crown.
      { kind: 'rect', at: pt(0.01, (lip - R) / 2), w: 0.08, h: round(-lip - R), fill: 'paint', stroke: 'none', show: { clock: 'since', from: 0.12, to: 0.5 } },
      {
        kind: 'group', at: pivot, motion: [{ drive: 'ease', ease: 'inout', from: 0, to: 0.16, rotate: 1.9, back: [0.52, 0.85] }],
        shapes: [
          { kind: 'poly', pts: [[-0.26, -0.2], [0.26, -0.2], [0.19, 0.24], [-0.19, 0.24]] },
          { kind: 'rect', offset: [0, -0.15], w: 0.46, h: 0.07, fill: 'paint' },
          { kind: 'ellipse', w: 0.06, h: 0.06, fill: 'ink' },
        ],
      },
      { kind: 'burst', at: pt(0, -R), r0: 0.04, r1: 0.26, n: 7, phase: -Math.PI / 2 + 0.2, stroke: 'paint', show: { clock: 'since', from: 0.14, to: 0.5 } },
      puddle,
    ]
    return {
      cells: [[0, 0], [0, -1]], exit: { at: [1, 0], dir: 1 }, lane, shapes, paint: { after: 0.16, over: 0.3 }, weight: 0.9,
      note: `A ${noun} on a gallows. The ball stops on the plate, the bucket tips over it, and it rolls on a new colour, for good.`,
    }
  },
}

/** A wheel over the line with a vane down in the ball's way: shouldered aside, it goes round. */
const spinner: Archetype = {
  key: 'spinner',
  label: 'spin',
  example: 'a windmill',
  words: ['spin', 'spins', 'wheel', 'windmill', 'mill', 'fan', 'turn', 'turns', 'rotor', 'propeller', 'pinwheel', 'turnstile', 'carousel', 'whirl', 'whirligig', 'twirl', 'rotate', 'rotates', 'revolve', 'sail', 'sails', 'blades'],
  build: (_rng, noun, words, variant) => {
    const hub = pt(0, -0.52)
    const three = look(words, variant, { four: ['windmill', 'mill', 'wheel', 'turnstile', 'sail', 'sails'], three: ['pinwheel', 'propeller', 'fan', 'rotor', 'blades'] }) === 'three'
    const n = three ? 3 : 4
    const lane: LaneStep[] = [
      { op: 'roll', to: [-0.2, 0] },
      { op: 'ramp', to: [0.04, 0], v0: ROLL, v1: 1.8, fire: true },
      { op: 'ramp', to: [0.5, 0], v0: 1.8, v1: ROLL },
    ]
    const meet = 0.3 / ROLL
    const fire = meet + 0.24 / ((ROLL + 1.8) / 2)
    const nudge = 0.3
    // Round once and on to the next vane, so it comes to rest looking as it did.
    const total = TAU + TAU / n
    const vane = (i: number): Shape => ({
      kind: 'group', rot: round(Math.PI / 2 + (i * TAU) / n),
      shapes: [three ? { kind: 'poly', pts: [[0.05, 0], [0.4, -0.13], [0.4, 0.04]] } : { kind: 'poly', pts: [[0.07, -0.03], [0.4, -0.1], [0.4, 0.1], [0.07, 0.03]] }],
    })
    const shapes: Shape[] = [
      railTo(-0.5, 0.5),
      { kind: 'post', x: -0.36, y0: hub[1], y1: 0.5 },
      { kind: 'line', pts: [[-0.36, hub[1]], hub] },
      {
        kind: 'group', at: hub,
        motion: [
          { drive: 'ease', ease: 'in', clock: 't', from: round(meet), to: round(fire), rotate: -nudge },
          { drive: 'ease', ease: 'out', from: 0, to: 1.9, rotate: round(-(total - nudge)) },
        ],
        shapes: [...Array.from({ length: n }, (_, i) => vane(i)), { kind: 'ellipse', w: 0.13, h: 0.13, fill: 'paper' }],
      },
    ]
    return { cells: [[0, 0], [0, -1]], exit: { at: [1, 0], dir: 1 }, lane, shapes, weight: 0.9, note: `A ${noun} on a mast with a vane down in the ball's way: the ball shoulders it aside and the whole wheel goes round once and settles.` }
  },
}

/** A spoon on a fulcrum throws the ball over a cell with no rail at all. Or a plank, with a weight dropped on its other end. */
const launcher: Archetype = {
  key: 'launcher',
  label: 'launch',
  example: 'a plank with a weight',
  words: ['launch', 'launches', 'catapult', 'fling', 'flings', 'throw', 'throws', 'toss', 'tosses', 'shoot', 'shoots', 'sling', 'slingshot', 'lob', 'hurl', 'hurls', 'fly', 'flies', 'volcano', 'erupt', 'erupts', 'spoon', 'lever', 'yeet', 'seesaw', 'teeter', 'totter', 'plank', 'anvil', 'trebuchet'],
  build: (rng, noun, words, variant) => {
    const ARC = round(rng.range(0.9, 1.05))
    const pivot = pt(0.32, 0.24)
    const lane: LaneStep[] = [
      { op: 'arrive', to: [0, 0] },
      { op: 'wait', dur: 0.45, fire: true },
      { op: 'fly', to: [2.1, 0], dur: 0.85, arc: ARC },
      { op: 'fly', to: [2.24, 0], dur: 0.08, arc: 0.03 },
      { op: 'ramp', to: [2.5, 0], v0: 2, v1: ROLL },
    ]
    const land = 0.2 / ROLL + 0.45 + 0.85
    const THROW = 1.05
    const seesaw = look(words, variant, { spoon: ['catapult', 'spoon', 'sling', 'slingshot', 'trebuchet', 'volcano'], seesaw: ['seesaw', 'teeter', 'totter', 'plank', 'anvil', 'lever'] }) === 'seesaw'
    // The seesaw's weight: hung on a cable from an arm over the plank's far end, high above where the ball will fly.
    // Let go once the ball has settled, it drops onto the end and rides it down; long after, it is wound back up.
    const HANG = -1.25
    const TOP = -1.45
    const drop = round(FLOOR - 0.09 - HANG)
    const falls: Motion[] = [
      { drive: 'ease', ease: 'in', from: -0.36, to: 0, move: [0, drop], back: [1.5, 2.6] },
      // Where the plank's end carries it, turned about the fulcrum.
      { drive: 'flick', from: 0, to: 0.9, move: [0.03, 0.34] },
    ]
    const arm: Shape[] = seesaw
      ? [{ kind: 'rect', offset: [-0.03, -0.08], w: 0.8, h: 0.06, r: 0.02 }]
      : [
          { kind: 'line', pts: [pt(-0.32, -0.06), [0.3, 0.02]] },
          // The cup the ball sits in, and the weight on the short end.
          { kind: 'arc', offset: pt(-pivot[0], -pivot[1]), w: 0.38, h: 0.38, a0: 0.1 * Math.PI, a1: 0.9 * Math.PI, close: 'chord' },
          { kind: 'rect', offset: [0.3, 0.05], w: 0.22, h: 0.2, r: 0.03 },
        ]
    const weight: Shape[] = seesaw
      ? [
          { kind: 'post', x: 0.84, y0: TOP, y1: 0.5 },
          { kind: 'line', pts: [[0.84, TOP], [0.56, TOP]] },
          { kind: 'coil', at: pt(0.6, HANG - 0.09), anchor: [0.6, TOP], turns: 1, amp: 0, motion: falls },
          { kind: 'rect', at: pt(0.6, HANG), w: 0.22, h: 0.18, r: 0.03, fill: 'accent', motion: falls },
          // The catch on the arm that lets it go.
          { kind: 'rect', at: pt(0.56, TOP), offset: [-0.04, 0], w: 0.08, h: 0.05, fill: 'ink', motion: [{ drive: 'ease', ease: 'out', from: -0.42, to: -0.36, rotate: -1.2, back: [2.6, 2.8] }] },
        ]
      : []
    const shapes: Shape[] = [
      railTo(-0.5, -0.22),
      railTo(1.86, 2.5),
      { kind: 'post', x: 1.9, y0: FLOOR, y1: 0.5 },
      { kind: 'poly', pts: [pt(pivot[0], pivot[1] - 0.02), pt(pivot[0] - 0.16, 0.5), pt(pivot[0] + 0.16, 0.5)], fill: 'paper' },
      ...weight,
      { kind: 'group', at: pivot, motion: [{ drive: 'flick', from: 0, to: 0.9, rotate: THROW }], shapes: arm },
      // Where it comes down: a pad that gives.
      { kind: 'rect', at: pt(2.1, FLOOR + 0.035), w: 0.34, h: 0.07, r: 0.02, fill: 'accent', motion: [{ drive: 'pulse', clock: 't', from: round(land - 0.02), to: round(land + 0.14), scale: [1.1, 0.55] }] },
      sparks(0, -0.12, 0.1, 0.36, 7),
    ]
    return {
      cells: [[0, 0], [1, 0], [2, 0], [0, -1], [1, -1], [2, -1]], exit: { at: [3, 0], dir: 1 }, lane, shapes, flight: true, weight: 0.8,
      note: seesaw
        ? `A ${noun}: a plank on a fulcrum. The ball settles on one end, a weight is let go onto the other, and the ball flies a cell with no rail under it at all.`
        : `A ${noun}: a spoon on a fulcrum. The ball settles in the cup, the arm comes over, and it flies a cell with no rail under it at all.`,
    }
  },
}

/** A cart on a track of its own carries the ball across two cells. */
const carrier: Archetype = {
  key: 'carrier',
  label: 'carry',
  example: 'a ferry',
  words: ['cart', 'wagon', 'train', 'tram', 'trolley', 'ferry', 'boat', 'raft', 'ship', 'canoe', 'gondola', 'carry', 'carries', 'ride', 'rides', 'conveyor', 'belt', 'car', 'truck', 'bus', 'taxi', 'skateboard', 'minecart'],
  build: (rng, noun, words, variant) => {
    const CROSS = round(rng.range(0.85, 1.05))
    const lane: LaneStep[] = [
      { op: 'arrive', to: [0, 0] },
      { op: 'wait', dur: 0.25, fire: true },
      { op: 'move', to: [1, 0], dur: CROSS, ease: 'inout' },
      { op: 'wait', dur: 0.12 },
      { op: 'ramp', to: [1.5, 0], v0: 0, v1: ROLL },
    ]
    // Whatever carries the ball moves exactly as the ball does, and goes back for the next one long after.
    const carried: Motion[] = [{ drive: 'follow', steps: [2, 2], axis: 'x', back: [round(CROSS + 1.0), round(CROSS + 2.4)] }]
    const boat = look(words, variant, { cart: ['cart', 'wagon', 'train', 'tram', 'trolley', 'car', 'truck', 'bus', 'taxi', 'minecart', 'skateboard'], boat: ['boat', 'ferry', 'raft', 'ship', 'canoe', 'gondola'] }) === 'boat'
    const under: Shape[] = boat
      ? [
          // Water between two piers, three waves a cell as the harbor draws it, and a hull that sits down in it.
          { kind: 'line', pts: Array.from({ length: 31 }, (_, i) => pt(-0.26 + (1.52 * i) / 30, 0.34 + 0.022 * Math.sin((-0.26 + (1.52 * i) / 30) * TAU * 3))) },
          { kind: 'post', x: -0.26, y0: FLOOR, y1: 0.5 },
          { kind: 'post', x: 1.26, y0: FLOOR, y1: 0.5 },
          { kind: 'poly', at: pt(0, FLOOR), pts: [[-0.26, 0.06], [0.26, 0.06], [0.17, 0.24], [-0.17, 0.24]], motion: [...carried, { drive: 'swing', from: 0, rotate: 0.09, freq: 6, decay: 1.4 }] },
        ]
      : [
          // A track of its own under the rail line, buffers at both ends, and a cart on two wheels.
          { kind: 'line', pts: [[-0.3, 0.36], [1.3, 0.36]] },
          { kind: 'post', x: -0.3, y0: 0.2, y1: 0.5 },
          { kind: 'post', x: 1.3, y0: 0.2, y1: 0.5 },
          {
            kind: 'group', at: pt(0, FLOOR), motion: carried,
            shapes: [
              { kind: 'poly', pts: [[-0.19, 0.06], [0.19, 0.06], [0.14, 0.17], [-0.14, 0.17]] },
              { kind: 'ellipse', offset: [-0.1, 0.185], w: 0.09, h: 0.09, fill: 'paper' },
              { kind: 'ellipse', offset: [0.1, 0.185], w: 0.09, h: 0.09, fill: 'paper' },
            ],
          },
        ]
    const shapes: Shape[] = [
      railTo(-0.5, -0.2),
      railTo(1.2, 1.5),
      ...under,
      // The deck the ball stands on, level with the rail at both ends of the run.
      { kind: 'rect', at: pt(0, FLOOR + 0.03), w: 0.38, h: 0.06, r: 0.015, fill: boat ? 'paper' : 'color', motion: carried },
      { kind: 'puff', at: pt(-0.28, 0.02), r: 0.09, show: { clock: 'since', from: 0.02, to: 0.5 } },
    ]
    return {
      cells: [[0, 0], [1, 0]], exit: { at: [2, 0], dir: 1 }, lane, shapes,
      note: boat ? `A ${noun} between two piers. The ball rolls aboard, the ${noun} casts off, and it is put ashore on the far side.` : `A ${noun} on a track of its own. The ball rolls onto its deck, the brake lets go, and it is carried across and set down.`,
    }
  },
}

/** Something the rail runs into and out of: the ball goes in, is gone for a beat while the thing works, and comes out faster. */
const tunnel: Archetype = {
  key: 'tunnel',
  label: 'hide',
  example: 'a tunnel',
  words: ['tunnel', 'cave', 'box', 'crate', 'hat', 'magic', 'vanish', 'vanishes', 'disappear', 'disappears', 'hide', 'hides', 'hidden', 'inside', 'oven', 'machine', 'factory', 'mountain', 'mound', 'igloo', 'house', 'garage', 'shed', 'barn', 'hut'],
  build: (rng, noun, words, variant) => {
    const INSIDE = round(rng.range(0.6, 0.85))
    const lane: LaneStep[] = [
      { op: 'roll', to: [0.2, 0], fire: true },
      { op: 'move', to: [0.8, 0], dur: INSIDE, hidden: true },
      { op: 'ramp', to: [1.5, 0], v0: FAST, v1: ROLL },
    ]
    const box = look(words, variant, { mound: ['tunnel', 'cave', 'mountain', 'mound', 'igloo', 'hat'], box: ['box', 'crate', 'oven', 'machine', 'factory', 'house', 'garage', 'shed', 'barn', 'hut'] }) === 'box'
    // It shudders for as long as the ball is inside it.
    const working: Motion[] = [{ drive: 'pulse', from: 0.02, to: INSIDE, scale: [1.03, 0.97] }]
    const base = FLOOR + 0.06
    // A dark way in, high enough for the ball, so the eye reads a way through and not a wall.
    const mouth = (w: number, h: number): Shape => ({ kind: 'arc', at: pt(0.5, base), w, h, a0: Math.PI, a1: TAU, close: 'chord', fill: 'ink', layer: 'over', motion: working })
    const shell: Shape[] = box
      ? [
          { kind: 'rect', at: pt(0.5, base), offset: [0, -0.36], w: 0.78, h: 0.72, r: 0.04, layer: 'over', motion: working },
          { kind: 'rect', at: pt(0.5, base), offset: [0, -0.17], w: 0.3, h: 0.34, fill: 'ink', layer: 'over', motion: working },
          { kind: 'rect', at: pt(0.3, -0.36), w: 0.16, h: 0.14, r: 0.02, fill: 'paper', layer: 'over' },
          { kind: 'rect', at: pt(0.74, -0.6), w: 0.12, h: 0.22, layer: 'over' },
          // What it gives off while it works.
          { kind: 'puff', at: pt(0.74, -0.8), r: 0.1, layer: 'over', show: { clock: 'since', from: 0.1, to: round(INSIDE + 0.2) } },
        ]
      : [
          { kind: 'arc', at: pt(0.5, base), w: 0.84, h: 1.3, a0: Math.PI, a1: TAU, close: 'chord', layer: 'over', motion: working },
          mouth(0.36, 0.8),
          { kind: 'line', at: pt(0.5, -0.59), pts: [[0, 0], [0, -0.2]], layer: 'over' },
          { kind: 'poly', at: pt(0.5, -0.79), pts: [[0, 0], [0.2, 0.06], [0, 0.12]], fill: 'accent', layer: 'over', motion: [{ drive: 'swing', from: 0, rotate: 0.5, freq: 12, decay: 2 }] },
          // Dust kicked up where it comes out.
          { kind: 'puff', at: pt(0.98, 0.04), r: 0.08, show: { clock: 'since', from: round(INSIDE), to: round(INSIDE + 0.45) } },
        ]
    const shapes: Shape[] = [
      railTo(-0.5, 1.5),
      ...shell,
      // The pop as the ball comes out the far side.
      sparks(0.95, -0.04, 0.06, 0.3, 6, INSIDE + 0.26, INSIDE),
    ]
    return {
      cells: [[0, 0], [1, 0]], exit: { at: [2, 0], dir: 1 }, lane, shapes,
      note: box
        ? `A ${noun} the rail runs straight through. The ball goes in, the ${noun} shudders and smokes with it inside, and it comes out the far side faster than it went in.`
        : `A ${noun} the rail runs through. The ball rolls in under the hill, the flag on top shakes while it is gone, and it shoots out the far side faster than it went in.`,
    }
  },
}

/** A bend that takes the ball down a floor and sends it back the way it came. */
const turnback: Archetype = {
  key: 'turnback',
  label: 'turn back',
  example: 'a pipe that turns back',
  words: ['back', 'backwards', 'reverse', 'reverses', 'return', 'returns', 'boomerang', 'bend', 'hairpin', 'curve', 'halfpipe', 'pipe', 'tube', 'rebound', 'around', 'uturn', 'turnaround', 'switchback'],
  build: (_rng, noun, words, variant) => {
    // Half an ellipse on its side: in at the top heading east, round the outside, out at the bottom heading west.
    const cx = -0.05
    const cy = 0.5
    const rx = 0.4
    const ry = 0.5
    const N = 8
    const at = (i: number): Pt => pt(cx + rx * Math.sin((Math.PI * i) / N), cy - ry * Math.cos((Math.PI * i) / N))
    const bend: LaneStep[] = []
    for (let i = 1; i <= N; i++) {
      const [ax, ay] = at(i - 1)
      const [bx, by] = at(i)
      // Faster down the first half, easing off to the plain rail's pace by the bottom.
      const v = ROLL + 1.4 * Math.sin((Math.PI * (i - 0.5)) / N)
      bend.push({ op: 'move', to: at(i), dur: round(Math.hypot(bx - ax, by - ay) / v), ...(i === N / 2 ? { fire: true } : {}) })
    }
    const lane: LaneStep[] = [{ op: 'roll', to: at(0) }, ...bend, { op: 'roll', to: [-0.5, 1] }]
    const wall = 0.015
    // A pipe closes the bend on the inside too, a radius and a hair inside the ball's path: the upper rail curls down into it.
    const pipe = look(words, variant, { wall: ['bend', 'hairpin', 'curve', 'halfpipe', 'switchback', 'boomerang'], pipe: ['pipe', 'tube', 'uturn', 'turnaround'] }) === 'pipe'
    const shapes: Shape[] = [
      railTo(-0.5, cx),
      railTo(-0.5, cx, 1 + FLOOR),
      // The wall the ball rides round: a radius and a hair outside its path, so it joins the lower rail.
      { kind: 'arc', at: pt(cx, cy), w: round(2 * (rx + R + wall)), h: round(2 * (ry + R + wall)), a0: -Math.PI / 2, a1: Math.PI / 2 },
      ...(pipe ? [{ kind: 'arc', at: pt(cx, cy), w: round(2 * (rx - R - wall)), h: round(2 * (ry - R - wall)), a0: -Math.PI / 2, a1: Math.PI / 2 } satisfies Shape] : []),
      { kind: 'post', x: 0.2, y0: round(cy + (ry + R + wall) * Math.sqrt(1 - ((0.2 - cx) / (rx + R + wall)) ** 2)), y1: 1.5 },
      { kind: 'post', x: cx, y0: round(1 + FLOOR), y1: 1.5 },
      // A pad at the outside of the bend, where the ball leans hardest.
      { kind: 'rect', at: pt(cx + rx + R + wall - 0.035, cy), w: 0.05, h: 0.24, r: 0.02, motion: [{ drive: 'flick', from: 0, to: 0.5, move: [0.025, 0] }] },
      sparks(cx + rx + 0.02, cy, 0.06, 0.22, 5, 0.22),
    ]
    return {
      cells: [[0, 0], [0, 1]], exit: { at: [-1, 1], dir: -1 }, lane, shapes,
      note: pipe
        ? `A ${noun} bent back on itself. The ball goes in at the top heading one way, round the inside and down a floor, and comes out underneath heading back the way it came.`
        : `A ${noun} on its side. The ball goes in at the top heading one way, rides the wall round and down a floor, and comes out underneath heading back the way it came.`,
    }
  },
}

export const ARCHETYPES: readonly Archetype[] = [striker, chime, bouncer, lifter, chute, painter, spinner, launcher, carrier, tunnel, turnback]

/* ------------------------------------------------------------------ reading a prompt */

const STOP = new Set(
  'a an the this that these those it its is are was be being and or but so then when while as if of to into onto in on at by for from with without over under through across past off out up down ball balls marble piece pieces thing something machine contraption make makes made making build create new one two some very really like which who what where gets get got go goes going come comes let lets has have had can will would should may do does did not no my your our their his her again once more less big small little tiny giant huge fast slow'.split(' '),
)

const tokens = (prompt: string): string[] => prompt.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/[\s-]+/).filter(Boolean)

/** Which mechanism a prompt is asking for: the one most of its words point at; the seed's choice when none do. */
export function archetypeFor(prompt: string, rng: Rng): Archetype {
  const words = tokens(prompt)
  let best: Archetype | null = null
  let most = 0
  for (const a of ARCHETYPES) {
    // An earlier word counts for a little more: "a gong that spins" is a gong first.
    const score = words.reduce((sum, w, i) => sum + (a.words.includes(w) ? 1 + 0.5 / (i + 1) : 0), 0)
    if (score > most) {
      most = score
      best = a
    }
  }
  return best ?? rng.pick(ARCHETYPES)
}

/** What the piece is called: the first word of the prompt that is a thing rather than grammar or a verb. */
function nounOf(prompt: string, archetype: Archetype): string {
  const words = tokens(prompt).filter((w) => !STOP.has(w) && w.length > 2)
  const verbs = new Set(ARCHETYPES.flatMap((a) => a.words.filter((w) => /(s|es|ed|ing)$/.test(w) || ['hit', 'kick', 'knock', 'spin', 'turn', 'lift', 'drop', 'fall', 'throw', 'toss', 'fling', 'launch', 'paint', 'pour', 'bounce', 'jump', 'hop', 'hang', 'swing', 'ring', 'rise', 'raise', 'climb', 'slide', 'slip', 'shoot', 'fly', 'dip', 'dye', 'spray', 'rotate', 'revolve', 'whirl', 'twirl', 'strike', 'smash', 'whack', 'punch', 'slap', 'stomp', 'lob', 'hurl', 'erupt', 'tumble', 'descend', 'hoist', 'dangle', 'toll'].includes(w))))
  return words.find((w) => !verbs.has(w)) ?? words[0] ?? archetype.key
}


/** What a piece made from this prompt would be called, whoever makes it: its noun, as a slug. */
export const nameFor = (prompt: string): string => {
  const archetype = archetypeFor(prompt, makeRng('name'))
  return slug(nounOf(prompt, archetype), archetype.key)
}

/**
 * A piece from a prompt, offline. `variant` rerolls it: the same prompt and
 * the same variant always make the same piece. `taken` is every name it may
 * not have: the stock pieces', and the build's so far.
 */
export function scaffoldPiece(prompt: string, variant: number, taken: ReadonlySet<string>): PieceSpec {
  const text = prompt.trim().slice(0, 400)
  const rng = makeRng(`scaffold:${text.toLowerCase()}:${variant}`)
  // A reroll with no mechanism named in the prompt tries another; one that names it keeps it and varies the rest.
  const archetype = archetypeFor(text, rng.fork('archetype'))
  const noun = nounOf(text, archetype)
  const body = archetype.build(rng.fork('build'), noun, new Set(tokens(text)), variant)
  const { note, weight, ...rest } = body
  return { name: uniqueName(slug(noun, archetype.key), taken), note, ...(text ? { prompt: text } : {}), weight: weight ?? 1, ...rest }
}

/* ------------------------------------------------------------------ worlds */

interface Place {
  words: string[]
  label: string
  bg: string
  ink: string
  colors: [string, string, string, string, string]
  backdrops: Backdrop[]
  host: StockWorld
  note: string
}

/** Places a prompt may name, each a paper, an ink and five fills in the house manner: bright flats inside heavy ink on a ground. */
const PLACES: Place[] = [
  { words: ['volcano', 'lava', 'fire', 'forge', 'ember', 'magma', 'furnace'], label: 'Caldera', bg: '#F3E6D8', ink: '#2A1B17', colors: ['#E4572E', '#F2A541', '#7A3B2E', '#3D5A6C', '#FBF3E4'], backdrops: ['plain', 'dots', 'rules'], host: 'workshop', note: 'ash paper, ember fills' },
  { words: ['ocean', 'sea', 'reef', 'tide', 'underwater', 'lagoon', 'beach', 'island', 'pirate', 'ship'], label: 'Lagoon', bg: '#E4F0EF', ink: '#14303A', colors: ['#F26B5B', '#F4C95D', '#2E8FA3', '#1F5F7A', '#FFFFFF'], backdrops: ['waves', 'waves', 'plain'], host: 'harbor', note: 'sea glass and coral' },
  { words: ['forest', 'jungle', 'moss', 'woods', 'tree', 'trees', 'fern', 'swamp', 'meadow', 'garden'], label: 'Understory', bg: '#EDF0E1', ink: '#1E2A1F', colors: ['#4F8A4B', '#D98E32', '#B5443C', '#2F6F73', '#F7F4E6'], backdrops: ['sprigs', 'sprigs', 'plain'], host: 'garden', note: 'moss, bark and berries' },
  { words: ['desert', 'sand', 'canyon', 'dune', 'dunes', 'mesa', 'cactus', 'western', 'oasis'], label: 'Mesa', bg: '#F4E9D6', ink: '#2E2118', colors: ['#C8553D', '#E9A23B', '#588B8B', '#8C5E3C', '#FFF8EA'], backdrops: ['plain', 'rules', 'dots'], host: 'workshop', note: 'sandstone and turquoise' },
  { words: ['snow', 'ice', 'arctic', 'winter', 'glacier', 'frost', 'frozen', 'polar', 'igloo'], label: 'Icefield', bg: '#EEF3F8', ink: '#1B2838', colors: ['#3A86C8', '#E8505B', '#F2B134', '#5FB0B7', '#FFFFFF'], backdrops: ['dots', 'plain', 'stars'], host: 'harbor', note: 'cold paper, warm signals' },
  { words: ['candy', 'sweet', 'sweets', 'sugar', 'cake', 'bakery', 'dessert', 'icecream', 'gum', 'lollipop'], label: 'Confectionery', bg: '#FBEFF0', ink: '#3A1F2B', colors: ['#EF5D8F', '#F7B538', '#5BC0BE', '#8E6BBF', '#FFFFFF'], backdrops: ['dots', 'dots', 'plain'], host: 'garden', note: 'icing on pink card' },
  { words: ['space', 'night', 'moon', 'star', 'stars', 'neon', 'galaxy', 'cosmic', 'orbit', 'planet', 'rocket', 'cyber', 'midnight'], label: 'Night Shift', bg: '#14162B', ink: '#F2F0E6', colors: ['#FF5D73', '#FFC857', '#3DDBD9', '#9B7BFF', '#2A2E57'], backdrops: ['stars', 'stars', 'grid'], host: 'arcade', note: 'lit fills on a dark sheet' },
  { words: ['autumn', 'fall', 'harvest', 'pumpkin', 'orchard', 'farm', 'barn', 'hay'], label: 'Harvest', bg: '#F3EADB', ink: '#2B2018', colors: ['#D9622B', '#E2A72E', '#7C8B3A', '#8A3B2F', '#FBF5E8'], backdrops: ['sprigs', 'plain', 'rules'], host: 'garden', note: 'rust, straw and leaf' },
  { words: ['circus', 'carnival', 'fair', 'fairground', 'tent', 'clown', 'festival', 'party'], label: 'Big Top', bg: '#F6EEDC', ink: '#1F1A2B', colors: ['#E03A3E', '#F5B82E', '#2D6CB5', '#2F9E77', '#FFFFFF'], backdrops: ['dots', 'rules', 'plain'], host: 'arcade', note: 'poster primaries on canvas' },
  { words: ['kitchen', 'diner', 'cafe', 'breakfast', 'cook', 'cooking', 'food', 'pantry', 'tea', 'coffee'], label: 'Pantry', bg: '#F5F0E4', ink: '#26221C', colors: ['#D1495B', '#EDAE49', '#00798C', '#6B8F47', '#FFFDF6'], backdrops: ['grid', 'plain', 'dots'], host: 'workshop', note: 'enamel and tile' },
]

const hexOf = (h: number, s: number, l: number): string => {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(c * 255).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase()
}

const hslOf = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

const turned = (hex: string, by: number): string => {
  const [h, s, l] = hslOf(hex)
  return s < 0.08 ? hex : hexOf((h + by + 360) % 360, s, l)
}

/** A place nobody named: a light paper and five fills spread round the wheel from the seed's hue. */
function inventPlace(rng: Rng, label: string): Place {
  const base = rng.range(0, 360)
  const hues = [0, 38, 150, 205, 300].map((d) => (base + d + rng.range(-10, 10)) % 360)
  return {
    words: [],
    label,
    bg: hexOf((base + 40) % 360, 0.28, 0.93),
    ink: hexOf((base + 220) % 360, 0.3, 0.13),
    colors: [hexOf(hues[0], 0.72, 0.52), hexOf(hues[1], 0.82, 0.58), hexOf(hues[2], 0.5, 0.42), hexOf(hues[3], 0.6, 0.45), '#FFFFFF'],
    backdrops: rng.pick([['plain', 'dots'], ['dots', 'rules'], ['plain', 'rules', 'dots']] as Backdrop[][]),
    host: rng.pick(['workshop', 'harbor', 'garden'] as StockWorld[]),
    note: 'a paper and five fills of its own',
  }
}

const title = (text: string): string => text.replace(/\b[a-z]/g, (c) => c.toUpperCase())

/**
 * A world from a prompt, offline: a place's palette and a second one turned
 * from it, the backdrops that suit it, the rail of the stock world nearest
 * to it, and six of that world's pieces as a supporting cast — two of them
 * flights, so the tempo has its accents — for the build's own pieces to
 * play among.
 */
export function scaffoldWorld(prompt: string, variant: number): WorldSpec & { label: string } {
  const text = prompt.trim().slice(0, 400)
  const rng = makeRng(`world:${text.toLowerCase()}:${variant}`)
  const words = tokens(text)
  const named = PLACES.find((place) => place.words.some((w) => words.includes(w)))
  const subject = words.find((w) => !STOP.has(w) && w.length > 2)
  const place = named ?? inventPlace(rng.fork('place'), subject ? title(subject) : 'Elsewhere')
  const id = slug(place.label, 'place')
  const first: Theme = { name: id, label: place.label, bg: place.bg, ink: place.ink, colors: [...place.colors], note: place.note }
  // The second palette is the first with its fills turned a little round the wheel and its paper a shade off, so two visits differ in mood.
  const by = rng.pick([-28, -18, 18, 28])
  const [ph, ps, pl] = hslOf(place.bg)
  const second: Theme = {
    name: `${id}-late`,
    label: `${place.label}, late`,
    bg: hexOf((ph + by / 2 + 360) % 360, ps, pl < 0.5 ? Math.min(0.2, pl + 0.03) : Math.max(0.84, pl - 0.04)),
    ink: place.ink,
    colors: place.colors.map((c) => turned(c, by)),
    note: `${place.note}, later in the day`,
  }
  return {
    label: place.label,
    note: text || place.note,
    themes: [first, second],
    backdrops: place.backdrops,
    rail: place.host,
    borrow: castFrom(place.host, `${text.toLowerCase()}:${variant}`),
  }
}

/**
 * A supporting cast from one stock world: six of its pieces, two of them
 * flights so the tempo has its accents, none that pays out a score or
 * changes the ball — those are the build's to bring.
 */
export function castFrom(host: StockWorld, salt: string): string[] {
  const rng = makeRng(`cast:${host}:${salt}`)
  const pool = WORLDS.find((w) => w.name === host)!.pieces.filter((c) => c.name !== 'rail' && c.name !== 'portal' && !c.finale && !c.dynamic)
  const flights = rng.fork('flights').shuffle(pool.filter((c) => c.flight)).slice(0, 2)
  const others = rng.fork('others').shuffle(pool.filter((c) => !c.flight)).slice(0, 4)
  return [...flights, ...others].map((c) => c.name)
}
