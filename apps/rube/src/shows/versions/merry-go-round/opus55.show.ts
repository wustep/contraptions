import { defineShow } from '../../registry'

export default defineShow({
  title: 'Merry-Go-Round',
  label: 'Opus 5.5',
  about: "Joe Hisaishi's Merry-Go-Round of Life, from Howl's Moving Castle, as a Rube Goldberg machine: a hatter, a curse, and a castle that walks.",
  still: 128,
  async load() { return (await import('./howl')).performance },
})
