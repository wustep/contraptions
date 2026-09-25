import { defineShow } from '../../registry'

export default defineShow({
  title: 'Come Recover',
  label: 'All at Once',
  director: { name: 'wustep', href: 'https://x.com/wustep' },
  async load() { return (await import('./all-at-once')).performance },
})
