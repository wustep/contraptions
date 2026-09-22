import { defineShow } from '../../registry'

export default defineShow({
  title: 'Cornfield Chase',
  label: 'Tech Demo',
  note: 'Tech demo only — copyrighted Zimmer recording, not for release. Forest machines on the piano, then the Arcade locked to the chase.',
  async load() { return (await import('./tech-demo')).performance },
})
