export interface Theme {
  name: string
  label: string
  /** Page and canvas background. */
  bg: string
  /** Line color. Every contraption is drawn in ink plus one fill. */
  ink: string
  /** Fill palette. Instances draw one color each. */
  colors: string[]
  /** Multiplier on the base stroke weight. Heavier palettes want lighter lines. */
  weight?: number
  /** Short note shown in the picker. */
  note?: string
}

/**
 * Fourteen palettes, each a different mood rather than a reshuffle of the same
 * hues. Every fill is checked to read against both `bg` and `ink`, since
 * contraptions always sit as ink outlines over a single flat fill.
 */
export const themes: Theme[] = [
  {
    name: 'okazz',
    label: 'Okazz',
    bg: '#EBF1F4',
    ink: '#212121',
    colors: ['#FCB500', '#007EB6', '#009135', '#E76B31', '#EB335E'],
    note: 'the original',
  },
  {
    name: 'bauhaus',
    label: 'Bauhaus',
    bg: '#EFE7D8',
    ink: '#171717',
    colors: ['#D62828', '#1D4E89', '#F4C430', '#F2F2F2', '#8C8C8C'],
    note: 'primaries on raw paper',
  },
  {
    name: 'riso',
    label: 'Risograph',
    bg: '#F7F3E8',
    ink: '#2B2B2B',
    colors: ['#FF48B0', '#0078BF', '#FFE800', '#00A95C', '#FF6C2F'],
    weight: 0.9,
    note: 'fluorescent duplicator inks',
  },
  {
    name: 'blueprint',
    label: 'Blueprint',
    bg: '#0E3B5C',
    ink: '#DCEBF7',
    colors: ['#7FD1E8', '#FFFFFF', '#9BE0C4', '#F7C948', '#B8C7D9'],
    note: 'drafting table, inverted',
  },
  {
    name: 'noir',
    label: 'Noir',
    bg: '#141414',
    ink: '#F0EDE6',
    colors: ['#E23636', '#F0EDE6', '#8A8A8A', '#4D4D4D', '#C9A227'],
    note: 'one red in the dark',
  },
  {
    name: 'terracotta',
    label: 'Terracotta',
    bg: '#F3E7DC',
    ink: '#3A2A20',
    colors: ['#C1622F', '#8C4A2F', '#D9A566', '#5E7A5E', '#A63D40'],
    note: 'fired clay and sage',
  },
  {
    name: 'citrus',
    label: 'Citrus',
    bg: '#FFF8E6',
    ink: '#26261F',
    colors: ['#F4A300', '#E2542B', '#8CB800', '#00A3A3', '#FFD400'],
    note: 'high acid',
  },
  {
    name: 'deepsea',
    label: 'Deep Sea',
    bg: '#0B2027',
    ink: '#CFE8E4',
    colors: ['#2EC4B6', '#41B3A3', '#E8F1F2', '#F6AE2D', '#5C7AEA'],
    note: 'bioluminescence',
  },
  {
    name: 'candy',
    label: 'Candy',
    bg: '#FDF3F7',
    ink: '#1B1B1B',
    colors: ['#FF3D8B', '#00C2CB', '#FFD23F', '#7B4BFF', '#3DDC97'],
    note: 'memphis group',
  },
  {
    name: 'forest',
    label: 'Forest',
    bg: '#EDF1E6',
    ink: '#1F2A1C',
    colors: ['#2F6B3C', '#8FB339', '#D9C36B', '#B45B2E', '#4E7C8C'],
    note: 'canopy and bark',
  },
  {
    name: 'mono',
    label: 'Mono',
    bg: '#FFFFFF',
    ink: '#000000',
    colors: ['#000000', '#FFFFFF', '#B3B3B3', '#666666', '#E0E0E0'],
    weight: 1.15,
    note: 'line study, no color',
  },
  {
    name: 'ember',
    label: 'Ember',
    bg: '#1A1210',
    ink: '#F5E6D8',
    colors: ['#FF6B35', '#F7C59F', '#EF476F', '#FFD166', '#8A3033'],
    note: 'banked fire',
  },
  {
    name: 'lagoon',
    label: 'Lagoon',
    bg: '#E8F4F2',
    ink: '#12312E',
    colors: ['#00808C', '#4ECDC4', '#FFE66D', '#FF6B6B', '#1A535C'],
    note: 'shallow water',
  },
  {
    name: 'dusk',
    label: 'Dusk',
    bg: '#2A2438',
    ink: '#E8E3F0',
    colors: ['#DBD8E3', '#9A8FBF', '#F5B841', '#E2717A', '#5C5470'],
    note: 'the hour after sunset',
  },
]

export const themeByName = (name: string): Theme =>
  themes.find((t) => t.name === name) ?? themes[0]
