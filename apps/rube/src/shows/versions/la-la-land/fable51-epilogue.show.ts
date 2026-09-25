import { defineShow } from '../../registry'

export default defineShow({
  title: 'La La Land',
  label: 'Epilogue',
  director: { name: 'wustep', href: 'https://x.com/wustep' },
  async load() { return (await import('./epilogue')).performance },
})
