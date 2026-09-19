import { makeRng, type Rng } from '../../../../src/core/rng'
import type { Theme } from '../../../../src/core/themes'
import { FAST, FLOOR, R, ROLL, type Pt } from '../parts'
import { WORLDS, type Backdrop } from '../worlds'
import { slug, type LaneStep, type Motion, type PieceSpec, type Shape, type StockWorld, type WorldSpec } from './spec'

/**
 * The offline half of "prompt a piece": no key, no network. A prompt is read
 * for the one thing a scaffold can honestly get from it — which mechanism it
 * is asking for — and the answer is one of eight mechanisms, each written
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
  /** Words in a prompt that ask for this mechanism. */
  words: string[]
  build(rng: Rng, noun: string, words: Set<string>): Body
}

const has = (words: Set<string>, ...any: string[]) => any.some((w) => words.has(w))

/* ------------------------------------------------------------------ the eight mechanisms */

/** A mallet on a mast comes round onto the ball's shoulder and drives it out along the rail. */
const striker: Archetype = {
  key: 'striker',
  words: ['hammer', 'mallet', 'hit', 'hits', 'strike', 'strikes', 'smash', 'whack', 'knock', 'knocks', 'kick', 'kicks', 'boot', 'punch', 'fist', 'bat', 'club', 'thump', 'bonk', 'slap', 'stomp', 'gavel'],
  build: (rng, noun, words) => {
    const WAIT = round(rng.range(0.42, 0.6))
    const boot = has(words, 'kick', 'kicks', 'boot', 'stomp', 'foot', 'shoe')
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
  words: ['gong', 'bell', 'chime', 'chimes', 'ring', 'rings', 'lantern', 'sign', 'hang', 'hangs', 'hanging', 'dangle', 'swing', 'swings', 'pendulum', 'cymbal', 'tambourine', 'mobile', 'charm', 'ornament', 'bauble', 'toll'],
  build: (_rng, noun, words) => {
    const d = 0.62
    const cy = 0.95
    const lantern = has(words, 'lantern', 'sign', 'ornament', 'bauble')
    const body: Shape[] = lantern
      ? [
          { kind: 'rect', offset: pt(0, cy), w: 0.44, h: 0.58, r: 0.06 },
          { kind: 'rect', offset: pt(0, cy), w: 0.24, h: 0.34, r: 0.03, fill: 'paper' },
        ]
      : [
          { kind: 'ellipse', offset: pt(0, cy), w: d, h: d },
          { kind: 'ellipse', offset: pt(0, cy), w: 0.2, h: 0.2, fill: 'paper' },
        ]
    const bottom = lantern ? cy + 0.29 : cy + d / 2
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
          { kind: 'line', pts: [[-0.1, 0], [-0.1, round(cy - (lantern ? 0.29 : d / 2) + 0.02)]] },
          { kind: 'line', pts: [[0.1, 0], [0.1, round(cy - (lantern ? 0.29 : d / 2) + 0.02)]] },
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
  words: ['bounce', 'bounces', 'bouncy', 'spring', 'springs', 'trampoline', 'jump', 'jumps', 'hop', 'hops', 'drum', 'mushroom', 'toadstool', 'pogo', 'rubber', 'jelly', 'boing', 'cushion', 'pillow', 'bed'],
  build: (_rng, noun, words) => {
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
    const cap = has(words, 'mushroom', 'toadstool', 'jelly', 'pillow', 'cushion', 'bed')
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
  words: ['lift', 'lifts', 'elevator', 'rise', 'rises', 'raise', 'raises', 'up', 'climb', 'climbs', 'hoist', 'piston', 'geyser', 'fountain', 'jack', 'ladder', 'tower', 'escalator', 'upward', 'upwards'],
  build: (rng, noun) => {
    const RISE = round(rng.range(0.9, 1.15))
    const lane: LaneStep[] = [
      { op: 'arrive', to: [0, 0] },
      { op: 'wait', dur: 0.3, fire: true },
      { op: 'move', to: [0, -1], dur: RISE, ease: 'inout' },
      { op: 'wait', dur: 0.15 },
      { op: 'ramp', to: [0.5, -1], v0: 0, v1: ROLL },
    ]
    const carried: Motion[] = [{ drive: 'follow', steps: [2, 2], axis: 'y', back: [round(RISE + 0.9), round(RISE + 2.1)] }]
    const shapes: Shape[] = [
      railTo(-0.5, -0.2),
      railTo(0.2, 0.5, -1 + FLOOR),
      // Two guides the platform rides between, tied across the top.
      { kind: 'line', pts: [[-0.2, 0.5], [-0.2, -1.32], [0.2, -1.32], [0.2, 0.5]] },
      { kind: 'line', pts: [[-0.3, 0.5], [0.3, 0.5]] },
      { kind: 'coil', at: pt(0, FLOOR + 0.06), anchor: [0, 0.5], turns: 5, amp: 0.1, motion: carried },
      { kind: 'rect', at: pt(0, FLOOR + 0.03), w: 0.36, h: 0.06, r: 0.015, motion: carried },
      // The catch that holds the spring down, flicked aside at the fire.
      { kind: 'rect', at: pt(-0.2, FLOOR + 0.03), offset: [-0.06, 0], w: 0.12, h: 0.05, fill: 'accent', motion: [{ drive: 'ease', ease: 'out', from: -0.04, to: 0.04, rotate: -1.1, back: [round(RISE + 2.0), round(RISE + 2.2)] }] },
      sparks(0, FLOOR + 0.1, 0.1, 0.3, 5, 0.22),
    ]
    return { cells: [[0, 0], [0, -1]], exit: { at: [1, -1], dir: 1 }, lane, shapes, note: `A ${noun}: a platform on a spring between two guides. The ball's weight trips the catch and the spring carries it up a floor.` }
  },
}

/** A slide down a floor: over the edge, faster all the way, and out along the rail below. */
const chute: Archetype = {
  key: 'chute',
  words: ['slide', 'slides', 'chute', 'drop', 'drops', 'fall', 'falls', 'down', 'ramp', 'slope', 'hill', 'waterfall', 'slip', 'ski', 'sled', 'descend', 'tumble', 'tumbles', 'downhill', 'toboggan'],
  build: (_rng, noun) => {
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

/** A bucket on a gallows tips over the stopped ball, and it leaves a new colour. */
const painter: Archetype = {
  key: 'painter',
  words: ['paint', 'paints', 'painted', 'colour', 'color', 'colours', 'colors', 'recolour', 'recolor', 'dye', 'dyes', 'dip', 'ink', 'spray', 'splash', 'bucket', 'pour', 'pours', 'glaze', 'stain', 'tint', 'rainbow', 'honey', 'syrup', 'sauce', 'slime'],
  build: (_rng, noun) => {
    // Tipped, the bucket's lip comes round to the ball's centre line, so the pour lands on its crown.
    const pivot = pt(-0.1, -0.78)
    const lip = -0.47
    const lane: LaneStep[] = [
      { op: 'arrive', to: [0, 0] },
      { op: 'wait', dur: 0.06, fire: true },
      { op: 'wait', dur: 0.62 },
      { op: 'ramp', to: [0.5, 0], v0: 0.6, v1: ROLL },
    ]
    const shapes: Shape[] = [
      railTo(-0.5, -0.17),
      railTo(0.17, 0.5),
      { kind: 'rect', at: pt(0, FLOOR + 0.025), w: 0.32, h: 0.05, fill: 'ink', motion: [{ drive: 'ease', from: -0.06, to: 0, move: [0, 0.03], back: [0.7, 0.85] }] },
      { kind: 'line', pts: [pt(0, FLOOR + 0.05), [0, 0.5]] },
      { kind: 'gallows', x0: -0.38, x1: 0.24, post: -0.38, y: -1.5 },
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
      // What is left on the plate after.
      { kind: 'arc', at: pt(0, FLOOR), w: 0.2, h: 0.07, a0: Math.PI, a1: TAU, close: 'chord', fill: 'paint', stroke: 'none', show: { clock: 'since', from: 0.5 } },
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
  words: ['spin', 'spins', 'wheel', 'windmill', 'mill', 'fan', 'turn', 'turns', 'rotor', 'propeller', 'pinwheel', 'turnstile', 'carousel', 'whirl', 'whirligig', 'twirl', 'rotate', 'rotates', 'revolve', 'sail', 'sails', 'blades'],
  build: (_rng, noun, words) => {
    const hub = pt(0, -0.52)
    const three = has(words, 'pinwheel', 'propeller', 'fan', 'rotor', 'blades')
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

/** A spoon on a fulcrum throws the ball over a cell with no rail at all. */
const launcher: Archetype = {
  key: 'launcher',
  words: ['launch', 'launches', 'catapult', 'fling', 'flings', 'throw', 'throws', 'toss', 'tosses', 'shoot', 'shoots', 'sling', 'slingshot', 'lob', 'hurl', 'hurls', 'fly', 'flies', 'volcano', 'erupt', 'erupts', 'spoon', 'lever', 'yeet'],
  build: (rng, noun) => {
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
    const shapes: Shape[] = [
      railTo(-0.5, -0.22),
      railTo(1.86, 2.5),
      { kind: 'post', x: 1.9, y0: FLOOR, y1: 0.5 },
      { kind: 'poly', pts: [pt(pivot[0], pivot[1] - 0.02), pt(pivot[0] - 0.16, 0.5), pt(pivot[0] + 0.16, 0.5)], fill: 'paper' },
      {
        kind: 'group', at: pivot, motion: [{ drive: 'flick', from: 0, to: 0.9, rotate: 1.05 }],
        shapes: [
          { kind: 'line', pts: [pt(-0.32, -0.06), [0.3, 0.02]] },
          // The cup the ball sits in, and the weight on the short end.
          { kind: 'arc', offset: pt(-pivot[0], -pivot[1]), w: 0.38, h: 0.38, a0: 0.1 * Math.PI, a1: 0.9 * Math.PI, close: 'chord' },
          { kind: 'rect', offset: [0.3, 0.05], w: 0.22, h: 0.2, r: 0.03 },
        ],
      },
      // Where it comes down: a pad that gives.
      { kind: 'rect', at: pt(2.1, FLOOR + 0.035), w: 0.34, h: 0.07, r: 0.02, fill: 'accent', motion: [{ drive: 'pulse', clock: 't', from: round(land - 0.02), to: round(land + 0.14), scale: [1.1, 0.55] }] },
      sparks(0, -0.12, 0.1, 0.36, 7),
    ]
    return {
      cells: [[0, 0], [1, 0], [2, 0], [0, -1], [1, -1], [2, -1]], exit: { at: [3, 0], dir: 1 }, lane, shapes, flight: true, weight: 0.8,
      note: `A ${noun}: a spoon on a fulcrum. The ball settles in the cup, the arm comes over, and it flies a cell with no rail under it at all.`,
    }
  },
}

export const ARCHETYPES: readonly Archetype[] = [striker, chime, bouncer, lifter, chute, painter, spinner, launcher]

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

const unique = (name: string, taken: ReadonlySet<string>): string => {
  if (!taken.has(name)) return name
  for (let i = 2; ; i++) if (!taken.has(`${name}-${i}`)) return `${name}-${i}`
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
  const body = archetype.build(rng.fork('build'), noun, new Set(tokens(text)))
  const { note, weight, ...rest } = body
  return { name: unique(slug(noun, archetype.key), taken), note, ...(text ? { prompt: text } : {}), weight: weight ?? 1, ...rest }
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
