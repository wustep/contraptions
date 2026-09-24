import { defineShow } from '../../registry'

export default defineShow({
  title: 'In the Hall of the Mountain King',
  label: '[Opus 5.5] One-shot',
  note: 'One-shot Opus 5.5 take on a new Playground world, Troll: every piece keeps time, warped onto the measured beat. Peer plays the tune; Oom, Pah and the King keep the beat.',
  async load() {
    return (await import('./opus55/performance')).performance
  },
})
