import type { Voice } from './model'
const drawings: Record<Voice, string> = {
  triangle: '<path d="M32 10 12 46h40L33 13"/><path d="m43 30 12-9"/><circle cx="32" cy="7" r="3" fill="currentColor"/>',
  musicbox: '<path fill="var(--voice)" d="M11 26h42v22H11z"/><ellipse cx="32" cy="26" rx="21" ry="8" fill="var(--paper)"/><path d="M22 24v7m8-8v9m8-8v7M16 49v5m32-5v5m5-20h6v-8"/><circle cx="59" cy="24" r="3" fill="currentColor"/>',
  harp: '<path d="M12 49V13c13 14 25-13 39-4L45 49Z" fill="var(--voice)"/><path d="M19 46V22m6 24V22m6 24V20m6 26V16m6 30V14" stroke="var(--paper)"/><path d="M9 53h40"/>',
  timpani: '<path d="M11 26c0 28 42 28 42 0" fill="var(--voice)"/><ellipse cx="32" cy="26" rx="21" ry="7" fill="var(--paper)"/><path d="m21 46-4 9m26-9 4 9M23 20 16 9"/><circle cx="15" cy="8" r="4" fill="var(--voice)"/>',
  keys: '<path fill="var(--paper)" d="M9 19h46v30H9z"/><path d="M18 20v28m9-28v28m10-28v28m9-28v28"/><path stroke-width="5" d="M18 21v12m9-12v12m19-12v12"/><path d="M8 52h48"/>',
  xylophone: '<path d="m12 47 42-24M18 53 60 29"/><path stroke="var(--voice)" stroke-width="8" d="m12 31 13 20m-2-26 12 20m-2-27 12 20m-2-26 12 20"/><path d="m8 12 18 9"/><circle cx="29" cy="22" r="4" fill="currentColor"/>',
}
export function icon(kind: Voice): string {
  return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${drawings[kind]}</svg>`
}
export const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 4 14 8-14 8z" fill="currentColor"/></svg>'
export const pauseIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16m10-16v16" stroke="currentColor" stroke-width="5"/></svg>'
