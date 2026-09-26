import { defineShow } from '../../registry'

export default defineShow({
  title: 'Everything',
  label: 'Opus',
  async load() { return (await import('./all-at-once')).performance },
})
