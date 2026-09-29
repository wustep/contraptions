import { defineShow } from '../../registry'

export default defineShow({
  title: 'Goldberg Variations',
  label: 'Sonnet 5.5',
  about: 'Bach’s Goldberg Variations, all thirty-two of them in order and round again: a lap of a lit colonnade to each. Víkingur Ólafsson, from Deutsche Grammophon’s own uploads.',
  still: 4300,
  async load() {
    return (await import('./rotunda')).performance
  },
})
