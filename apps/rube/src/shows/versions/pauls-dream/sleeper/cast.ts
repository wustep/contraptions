/**
 * Who is in Sleeper. The cast is locked: these and no others. Everyone who is a person is a ball; everything else (the
 * box, the bull's head, the ships, the ornithopters, the harvester, the worms, the storm) is drawn.
 *
 * - Paul: the one ball through every scene, the green of Caladan's sea; he takes it into the desert with him, the one
 *   thing of the sea left there.
 * - Jessica, his mother: plum, the Bene Gesserit's dark; with him from the box to the end.
 * - Leto, the Duke: Atreides slate, bigger than his son.
 * - The Reverend Mother: black, bigger again; only at the box.
 * - The Baron: pale and swollen, the biggest, and he floats; only on the night.
 * - Chani: henna, the colour of the Fremen's hair in the sun; first in Paul's dream, then on the rock.
 * - Stilgar: dark umber, big; Jamis: a darker umber; the Fremen: the umber of their cloaks.
 * - Harkonnen soldiers: gunmetal, small, many; the harvester's crew: dust grey.
 */

export interface Role {
  id: number
  color: string
  /** Its outline: a darker shade of its own colour reads as a person. */
  rim: string
  /** Its size against Paul's. */
  size: number
}

export const PAUL: Role = { id: 1, color: '#3E8C6B', rim: '#123827', size: 1 }
export const JESSICA: Role = { id: 2, color: '#7A4A6E', rim: '#2E1529', size: 1 }
export const LETO: Role = { id: 3, color: '#46566B', rim: '#151C26', size: 1.18 }
export const MOTHER: Role = { id: 4, color: '#1E1C21', rim: '#77707E', size: 1.3 }
export const BARON: Role = { id: 5, color: '#DCD3C6', rim: '#5B5248', size: 2.1 }
export const CHANI: Role = { id: 6, color: '#B4533C', rim: '#4A1D12', size: 0.96 }
export const STILGAR: Role = { id: 7, color: '#5C4A39', rim: '#22180F', size: 1.15 }
export const JAMIS: Role = { id: 8, color: '#4A3A2E', rim: '#1A120C', size: 1.05 }

/** The Fremen of Stilgar's troop: one id each from FREMEN_ID up. */
export const FREMEN = { id: 100, color: '#7B6853', rim: '#2D2218', size: 0.95 }
/** Harkonnen soldiers: one id each from SOLDIERS_ID up. */
export const SOLDIER = { id: 200, color: '#3A3D42', rim: '#121316', size: 0.9 }
/** The harvester's crew. */
export const CREW = { id: 300, color: '#9A958B', rim: '#3C3933', size: 0.9 }

/** The colour a ball goes to when it dies: its own, drained to the grey of dust. */
export const DEAD = '#8C877F'

/** The principals, by name: the scenes give each its moves inside their windows. */
export const PRINCIPALS = { paul: PAUL, jessica: JESSICA, leto: LETO, mother: MOTHER, baron: BARON, chani: CHANI, stilgar: STILGAR, jamis: JAMIS } as const
export type Who = keyof typeof PRINCIPALS
