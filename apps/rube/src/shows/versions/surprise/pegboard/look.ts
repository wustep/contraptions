import type { Theme } from '../../../../../../../src/core/themes'
import type { World } from '../../../../worlds'

/**
 * The look: black pegs on pale paper, a machine drawn in the same ink, and four colours for what it fires. No
 * gradient, no glow: the colours are flat, and the only shading is the shadow a pellet casts while it is in the air.
 */
export const INK = '#1F1E1C'
export const PAPER = '#ECE9E2'
/** The machine's own faces: a lighter paper for the parts on top, a grey for the turntable under them. */
export const FACE = '#F7F5F0'
export const PLATE = '#D3CEC4'
export const SLOT = '#C9C3B8'

/** What the launcher fires. Each variation has its colour; the fourth has all of them. */
export const RED = '#E0472C'
export const YELLOW = '#E99A0B'
export const BLUE = '#2652B8'
export const GREEN = '#1E875A'

/** What the stage paints under everything. */
export const THEME: Theme = {
  name: 'composure',
  label: 'Composure',
  bg: PAPER,
  ink: INK,
  colors: [RED, YELLOW, BLUE, GREEN],
  weight: 0.55,
}

export const WORLD = {
  name: 'pegboard',
  label: 'The pegboard',
  note: 'A board of pegs, and a launcher at its foot.',
  themes: [THEME],
  backdrops: ['plain'],
  pieces: [],
  tastes: { arranged: {} },
} as unknown as World
