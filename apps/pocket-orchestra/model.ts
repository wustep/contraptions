export const VOICES = ['musicbox', 'triangle', 'harp', 'timpani', 'keys', 'xylophone'] as const
export type Voice = (typeof VOICES)[number]
export type Kind = Voice | 'rest'
export interface Note { kind: Kind; pitch: number }
export interface Take { slots: (Note | null)[]; tempo: number; title: string }
export const STEP = 120 / 84
export const NOTES = ['C', 'D', 'E', 'G', 'A', 'C↑']
export const COLORS = ['#ba583f', '#d4a348', '#4c7d79', '#66784c', '#8e6c83', '#b46a47']
export const NAMES: Record<Kind, string> = { musicbox: 'Music box', triangle: 'Triangle', harp: 'Harp', timpani: 'Kettledrum', keys: 'Piano', xylophone: 'Xylophone', rest: 'A little rest' }
export const DESCRIPTIONS: Record<Kind, string> = { musicbox: 'three little chimes', triangle: 'one silver note', harp: 'a sweep of strings', timpani: 'a warm, low thump', keys: 'an ivory ripple', xylophone: 'four wooden steps', rest: 'let the room listen' }
export const copy = (t: Take): Take => ({ ...t, slots: t.slots.map(n => n && { ...n }) })
const n = (kind: Kind, pitch = 0): Note => ({ kind, pitch })
export interface Phrase { title: string; line: string; hint: string; start: Take; rules: { label: string; test: (s: Take['slots']) => boolean }[]; praise: string }
const full = (s: Take['slots']) => s.every(Boolean)
const played = (s: Take['slots']) => s.filter((v): v is Note => !!v && v.kind !== 'rest')
export const PHRASES: Phrase[] = [
  { title: 'A small hello.', line: 'The music box has a hello. Give it an answer.', hint: 'The triangle is ready. Tap step 2, then press Play.', start: { title: 'A small hello', tempo: 84, slots: [n('musicbox'), null] },
    rules: [{ label: 'A triangle on step 2', test: s => s[1]?.kind === 'triangle' }, { label: 'Hear your whole phrase', test: full }], praise: 'And just like that, a little duet.' },
  { title: 'Up the stairs.', line: 'Three notes, each a little higher than the last.', hint: 'Select a step. Choose its note below the instruments.', start: { title: 'Up the stairs', tempo: 88, slots: [n('triangle'), n('triangle'), n('triangle')] },
    rules: [{ label: 'Fill all three steps', test: full }, { label: 'Each note higher than the last', test: s => full(s) && s.every((v, i) => !!v && v.kind !== 'rest' && (!i || v.pitch > s[i - 1]!.pitch)) }], praise: 'A staircase you can hear.' },
  { title: 'Room to breathe.', line: 'Sometimes the loveliest note is the one you leave out.', hint: 'Put a rest on step 3. Let the last note come home to C.', start: { title: 'Room to breathe', tempo: 80, slots: [n('harp', 1), n('triangle', 3), n('timpani'), n('triangle', 2)] },
    rules: [{ label: 'A rest on step 3', test: s => s[2]?.kind === 'rest' }, { label: 'Finish with a C', test: s => !!s[3] && s[3].kind !== 'rest' && s[3].pitch === 0 }], praise: 'That breath made all the difference.' },
  { title: 'Call & answer.', line: 'Let the first two voices return at the end.', hint: 'Make steps 5 and 6 echo steps 1 and 2: same voices, same notes.', start: { title: 'Call & answer', tempo: 92, slots: [n('triangle'), n('harp', 2), n('timpani'), n('rest'), null, null] },
    rules: [{ label: 'Fill all six steps', test: full }, { label: 'Repeat the opening pair at the end', test: s => [0, 1].every(i => !!s[i] && s[i]!.kind !== 'rest' && s[i]?.kind === s[i + 4]?.kind && s[i]?.pitch === s[i + 4]?.pitch) }], praise: 'A familiar voice, coming back.' },
  { title: 'Your little ensemble.', line: 'A few different voices. A breath. An ending of your own.', hint: 'Use three instruments, leave one rest, and finish on C.', start: { title: 'My little ensemble', tempo: 84, slots: Array(6).fill(null) },
    rules: [{ label: 'Fill the six steps', test: full }, { label: 'At least three different instruments', test: s => new Set(played(s).map(v => v.kind)).size >= 3 }, { label: 'One rest, then an ending on C', test: s => s.filter(v => v?.kind === 'rest').length === 1 && !!s[5] && s[5].kind !== 'rest' && s[5].pitch === 0 }], praise: 'Six small machines. Entirely your own.' },
]
export const PRESETS: Take[] = [
  { title: 'Sunday morning', tempo: 78, slots: [n('musicbox'), n('harp', 2), n('triangle', 4), n('rest'), n('keys', 1), n('triangle')] },
  { title: 'Rain on the roof', tempo: 96, slots: [n('xylophone', 3), n('timpani'), n('triangle', 2), n('rest'), n('xylophone', 1), n('harp')] },
  { title: 'The clockmaker', tempo: 104, slots: [n('timpani'), n('musicbox', 1), n('triangle', 3), n('timpani'), n('musicbox', 2), n('triangle')] },
]
export function frequency(degree: number): number {
  const scale = [0, 2, 4, 7, 9]
  const midi = 60 + Math.floor(degree / 5) * 12 + scale[((degree % 5) + 5) % 5]
  return 440 * 2 ** ((midi - 69) / 12)
}
export function validTake(value: unknown): Take | null {
  if (!value || typeof value !== 'object') return null
  const t = value as Partial<Take>
  if (!Array.isArray(t.slots) || t.slots.length < 2 || t.slots.length > 6 || !Number.isFinite(t.tempo)) return null
  const slots: Take['slots'] = []
  for (const item of t.slots) {
    if (item === null) { slots.push(null); continue }
    if (!item || ![...VOICES, 'rest'].includes(item.kind) || !Number.isInteger(item.pitch) || item.pitch < 0 || item.pitch > 5) return null
    slots.push({ kind: item.kind, pitch: item.pitch })
  }
  return { slots, tempo: Math.max(60, Math.min(112, Math.round(t.tempo!))), title: typeof t.title === 'string' ? t.title.slice(0, 48) : 'A little machine' }
}
export function encodeTake(take: Take): string {
  return 'v1.' + btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(take)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
export function decodeTake(hash: string): Take | null {
  try {
    const value = hash.replace(/^#/, '')
    if (!value.startsWith('v1.') || value.length > 2000) return null
    const bytes = Uint8Array.from(atob(value.slice(3).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
    return validTake(JSON.parse(new TextDecoder().decode(bytes)))
  } catch { return null }
}
