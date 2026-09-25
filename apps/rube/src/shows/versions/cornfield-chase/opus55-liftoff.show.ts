import { defineShow } from '../../registry'

export default defineShow({
  title: 'Cornfield Chase',
  label: 'Liftoff',
  director: { name: 'wustep', href: 'https://x.com/wustep' },
  async load() { return (await import('./liftoff')).performance },
})
