import { defineShow } from '../../registry'

export default defineShow({
  title: 'Mountain King',
  label: 'Opus 5.5',
  about: "Grieg's In the Hall of the Mountain King as a Rube Goldberg machine: Peer Gynt sneaks into the troll king's hall, and the chase speeds up until the mountain comes down.",
  still: 64.5,
  async load() { return (await import('./dovre')).performance },
})
