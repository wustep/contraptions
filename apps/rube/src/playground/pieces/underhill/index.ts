import { outline, solid } from '../../../../../../src/core/draw'
import type { Theme } from '../../../../../../src/core/themes'
import { FLOOR } from '../../../parts'
import { portal } from '../../../pieces/portal'
import { makeRail } from '../../../pieces/rail'
import type { World } from '../../../worlds'
import { newWorld } from '../../staging'
import { boilerBeats } from './boiler'
import { cavernBeats } from './cavern'
import { throneBeats } from './throne'
import { crystal, gear } from './visual'

const cavernRail = makeRail(['gem', 'drip', 'crack', 'none'] as const, (p, s, { k, ink, weight }) => {
  if (s.decor === 'gem') crystal(p, k, ink, weight, s.color, 0.1, 0.36, 0.2)
  if (s.decor === 'drip') {
    outline(p, ink, weight)
    p.line(-0.2 * k, -0.48 * k, -0.2 * k, -0.2 * k)
    solid(p, ink, weight, s.color)
    p.circle(-0.2 * k, 0.28 * k, 0.07 * k)
  }
  if (s.decor === 'crack') {
    outline(p, ink, weight)
    p.line(0.02 * k, FLOOR * k, 0.1 * k, 0.38 * k)
    p.line(0.1 * k, 0.38 * k, -0.02 * k, 0.5 * k)
  }
})

const boilerRail = makeRail(['rivet', 'pipe', 'gauge', 'none'] as const, (p, s, { k, ink, weight }) => {
  solid(p, ink, weight, s.color)
  p.rect(0, 0.38 * k, 0.72 * k, 0.14 * k, 0.02 * k)
  if (s.decor === 'rivet') for (const x of [-0.25, 0.25]) p.circle(x * k, 0.38 * k, 0.055 * k)
  if (s.decor === 'pipe') {
    outline(p, ink, weight)
    p.line(-0.2 * k, 0.3 * k, -0.2 * k, -0.32 * k)
    p.line(-0.2 * k, -0.32 * k, 0.16 * k, -0.32 * k)
  }
  if (s.decor === 'gauge') gear(p, k, ink, weight, s.color, 0.12, 0.35, 0.14, 0, 8)
})

const throneRail = makeRail(['pillar', 'jewel', 'tassel', 'none'] as const, (p, s, { k, ink, weight }) => {
  solid(p, ink, weight, s.color)
  p.rect(0, 0.37 * k, 0.92 * k, 0.08 * k, 0.01 * k)
  if (s.decor === 'pillar') {
    p.rect(0.12 * k, -0.19 * k, 0.12 * k, 0.64 * k, 0.02 * k)
    p.circle(0.12 * k, -0.48 * k, 0.21 * k)
  }
  if (s.decor === 'jewel') crystal(p, k, ink, weight, s.color, 0.05, -0.32, 0.19)
  if (s.decor === 'tassel') {
    outline(p, ink, weight)
    p.line(0.08 * k, -0.5 * k, 0.08 * k, -0.24 * k)
    p.circle(0.08 * k, -0.18 * k, 0.11 * k)
  }
})

const cavernThemes: Theme[] = [
  { name: 'underhill-limestone', label: 'Limestone', bg: '#E8E4D8', ink: '#30333D', colors: ['#786E91', '#427E8C', '#B88D45', '#718A58', '#E0B36B'], note: 'mineral violet, turquoise and old amber' },
  { name: 'underhill-mica', label: 'Mica', bg: '#E9E5EB', ink: '#2F3045', colors: ['#80628D', '#B9805A', '#54939D', '#768458', '#C0A44E'], note: 'flecks of copper in pale stone' },
]
const boilerThemes: Theme[] = [
  { name: 'underhill-copper', label: 'Copper', bg: '#EAE1D3', ink: '#342E32', colors: ['#B66A47', '#3C8790', '#C59B3C', '#706D8F', '#D0C6A3'], note: 'copper, hot iron and steam' },
  { name: 'underhill-iron', label: 'Iron', bg: '#E1E5E2', ink: '#27333B', colors: ['#4A7182', '#BF743E', '#A69A57', '#74847A', '#D0B36C'], note: 'blue iron, brass and kiln orange' },
]
const throneThemes: Theme[] = [
  { name: 'underhill-gilt', label: 'Gilt', bg: '#EEE8D7', ink: '#302C38', colors: ['#8C6582', '#C59B3D', '#547A87', '#A6674D', '#6C855B'], note: 'gilt on stone, velvet in the corners' },
  { name: 'underhill-coronation', label: 'Coronation', bg: '#ECE4E3', ink: '#332936', colors: ['#865870', '#C5A050', '#5D8295', '#9F7553', '#69907A'], note: 'rose velvet and tarnished gold' },
]

const cavern: World = {
  name: 'underhill-cavern', label: 'Cavern', note: 'echoes, crystals and stone that keeps a charge',
  themes: cavernThemes, backdrops: ['dots', 'plain', 'stars'], tastes: {
    echoes: { 'echo-bridge': 2, 'echo-bell': 2 },
    crystals: { 'crystal-battery': 2, 'split-geode': 2, 'stone-lock': 1.6 },
    passages: { 'bat-lift': 2, 'shale-fall': 2 },
  },
  pieces: [cavernRail, ...cavernBeats, portal],
}
const boiler: World = {
  name: 'underhill-boiler', label: 'Boiler', note: 'a pressure works of copper pipes and moving teeth',
  themes: boilerThemes, backdrops: ['grid', 'rules', 'plain'], tastes: {
    pressure: { 'pressure-pump': 2, 'selector-valve': 2, 'relief-valve': 2 },
    engines: { 'piston-bank': 2, 'boiler-flywheel': 2, 'furnace-belt': 1.6 },
    steam: { 'steam-jet': 2, 'relief-valve': 2 },
  },
  pieces: [boilerRail, ...boilerBeats, portal],
}
const throne: World = {
  name: 'underhill-throne', label: 'Throne', note: 'counting, mirrors and traps in the mountain king’s hall',
  themes: throneThemes, backdrops: ['rules', 'dots', 'plain'], tastes: {
    treasury: { 'royal-abacus': 2, 'combination-vault': 2, 'mirror-hall': 2 },
    balcony: { chandelier: 2, 'royal-trapdoor': 2 },
    coronation: { 'crown-sling': 2, 'kings-gong': 2 },
  },
  pieces: [throneRail, ...throneBeats, portal],
}

export const cavernShelf = newWorld(cavern, {
  rail: 'a short stone track, sometimes marked by a mineral or a drip',
  'echo-bridge': 'four steps remember the pass, then answer it in reverse',
  'crystal-battery': 'a crystal stores two sparks in the ball for later gates',
  'split-geode': 'two decoys peel away while a new ball takes the thread',
  'stone-lock': 'a charged ball opens the gate at once; an empty one waits for the counterweight',
  'bat-lift': 'a bat cage carries the ball to a ledge above',
  'shale-fall': 'the shelf tilts, drops the ball, and catches it a floor below',
  'echo-bell': 'three delayed rings keep speaking after the ball moves on',
})
export const boilerShelf = newWorld(boiler, {
  rail: 'riveted iron track, with an occasional gauge or pipe',
  'pressure-pump': 'two strokes load the ball with three units of pressure',
  'selector-valve': 'stored pressure picks the high pipe and spends a unit; an empty ball takes the bypass',
  'piston-bank': 'three pistons strike in sequence before their crankshaft turns',
  'boiler-flywheel': 'a toothed wheel catches the ball and rolls it up a floor',
  'steam-jet': 'a steam plume throws the ball onto the upper catwalk',
  'relief-valve': 'the safety valve dumps stored pressure into a lower chute',
  'furnace-belt': 'the three windows light in the ball’s wake',
})
export const throneShelf = newWorld(throne, {
  rail: 'the gilt edge of the king’s floor, interrupted by jewels and pillars',
  'royal-abacus': 'each bead stays counted after the ball passes',
  'combination-vault': 'two stored sparks click the tumblers open; otherwise the crank must do the work',
  'mirror-hall': 'two reflections take side passages and a new ball emerges between them',
  chandelier: 'a swinging chandelier carries the ball to the balcony',
  'royal-trapdoor': 'two hinged leaves drop the ball and close after it lands',
  'crown-sling': 'a sprung crown throws the ball clear of the throne',
  'kings-gong': 'the king’s gong answers the hit twice',
})

export const underhillWorlds = [cavernShelf.world, boilerShelf.world, throneShelf.world] as const
