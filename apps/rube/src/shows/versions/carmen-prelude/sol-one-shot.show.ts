import { defineShow } from '../../registry'

export default defineShow({
  title: 'Carmen Prelude · Sol one-shot',
  label: '[GPT-6 Sol xhigh] Sol one-shot',
  note: 'Sol one-shot (GPT-6 Sol xhigh): the opera supper spills into the wings. Six musical sections set the scenery; measured attacks call the machines on cue.',
  async load() { return (await import('./sol-one-shot')).loadPerformance() },
})
