export const VOICES = ['musicbox', 'triangle', 'harp', 'timpani', 'keys', 'xylophone'] as const
export type Voice = (typeof VOICES)[number]
export const NAMES: Record<Voice, string> = { musicbox: 'Music box', triangle: 'Triangle', harp: 'Harp', timpani: 'Drum', keys: 'Piano', xylophone: 'Xylophone' }
export const COLORS = ['#c49540', '#508780', '#bd654d', '#827596']
export const NOTES = ['C', 'D', 'E', 'G', 'A']
export const STEP = 60 / 84
export const MAX_NOTES = 48
export interface Note { id: string; kind: Voice; pitch: number; beat: number; y: number; size: number; track: string }
export interface Track { id: string; color: string; muted: boolean; volume: number }
export interface Take { title: string; tempo: number; length: number; tracks: Track[]; notes: Note[] }
export const copy = (t: Take): Take => ({ ...t, tracks: t.tracks.map(v => ({ ...v })), notes: t.notes.map(v => ({ ...v })) })
export const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n))
export const mod = (n: number, d: number): number => ((n % d) + d) % d
export const TRACK_GAP = 132
export const trackY = (i: number): number => 65 + i * TRACK_GAP
export const boardHeight = (take: Take): number => 71 + take.tracks.length * TRACK_GAP
export const beatX = (beat: number): number => 84 + beat * 86
export const boardWidth = (take: Take): number => beatX(take.length) + 38
export function pitchName(degree: number): string { return NOTES[mod(degree, 5)] + (4 + Math.floor(degree / 5)) }
export function frequency(degree: number): number {
  const midi = 60 + Math.floor(degree / 5) * 12 + [0, 2, 4, 7, 9][mod(degree, 5)]
  return 440 * 2 ** ((midi - 69) / 12)
}
const tracks = (count: number): Track[] => Array.from({ length: count }, (_, i) => ({ id: `t${i}`, color: COLORS[i], muted: false, volume: .8 }))
const score = (title: string, tempo: number, rows: [Voice, number, number, number][][]): Take => ({
  title, tempo, length: 12, tracks: tracks(rows.length),
  notes: rows.flatMap((row, i) => row.map(([kind, beat, pitch, offset], j) => ({ id: `n${i}-${j}`, kind, beat, pitch, y: trackY(i) + offset, size: 1, track: `t${i}` }))),
})
export const PRESETS = [
  score('Clockwork picnic', 92, [
    [['musicbox', 1, 5, -4], ['harp', 3, 7, 22], ['triangle', 5, 9, -14], ['keys', 7, 6, 20], ['musicbox', 9, 5, 0]],
    [['xylophone', 1, 0, 14], ['keys', 4, 2, -16], ['harp', 7, 3, 20], ['triangle', 9, 0, -6]],
    [['timpani', 1, -5, 0], ['timpani', 5, -5, 20], ['xylophone', 8, -2, -12]],
  ]),
  score('Raindrop waltz', 76, [
    [['harp', 1, 5, -15], ['harp', 2.5, 7, 12], ['triangle', 4, 9, -8], ['harp', 5.5, 8, 22], ['keys', 7, 7, -12], ['triangle', 9, 5, 15]],
    [['musicbox', 1, 0, 10], ['keys', 4, 2, -14], ['musicbox', 7, 3, 8]],
  ]),
  score('Tin-can parade', 112, [
    [['xylophone', 1, 0, 0], ['triangle', 2.5, 3, 24], ['xylophone', 4, 2, -10], ['keys', 5.5, 4, 22], ['xylophone', 7, 3, -10], ['musicbox', 9, 0, 10]],
    [['timpani', 1, -5, 10], ['timpani', 3, -5, -12], ['timpani', 5, -3, 10], ['timpani', 7, -5, -12], ['triangle', 9, 0, 10]],
  ]),
]
export function blankTake(): Take { return { title: 'Untitled machine', tempo: 92, length: 12, tracks: tracks(1), notes: [] } }
export function resizeTake(take: Take, length: number): void {
  const next = clamp(length, 8, 24)
  for (const note of take.notes) note.beat = .5 + (note.beat - .5) * (next - 2.5) / (take.length - 2.5)
  take.length = next
}
export function validTake(value: unknown): Take | null {
  if (!value || typeof value !== 'object') return null
  const t = value as Take
  if (!Number.isFinite(t.tempo) || !Number.isInteger(t.length) || t.length < 8 || t.length > 24 || !Array.isArray(t.tracks) || t.tracks.length < 1 || t.tracks.length > 4 || !Array.isArray(t.notes) || t.notes.length > MAX_NOTES) return null
  const ids = new Set<string>(), noteIds = new Set<string>()
  const safeTracks: Track[] = []
  for (const [i, track] of t.tracks.entries()) {
    if (!track || typeof track.id !== 'string' || !/^[\w-]{1,40}$/.test(track.id) || ids.has(track.id) || !Number.isFinite(track.volume)) return null
    ids.add(track.id); safeTracks.push({ id: track.id, color: COLORS[i], volume: clamp(track.volume, 0, 1), muted: !!track.muted })
  }
  const notes: Note[] = []
  for (const n of t.notes) {
    if (!n || typeof n.id !== 'string' || !/^[\w-]{1,40}$/.test(n.id) || noteIds.has(n.id) || !VOICES.includes(n.kind) || !ids.has(n.track) || !Number.isInteger(n.pitch) || n.pitch < -5 || n.pitch > 14 || !Number.isFinite(n.beat) || !Number.isFinite(n.y) || !Number.isFinite(n.size)) return null
    noteIds.add(n.id)
    notes.push({ id: n.id, kind: n.kind, pitch: n.pitch, beat: clamp(n.beat, .5, t.length - 2), y: clamp(n.y, 40, boardHeight(t) - 80), size: clamp(n.size, .65, 1.5), track: n.track })
  }
  return { title: typeof t.title === 'string' ? t.title.slice(0, 48) : 'Untitled machine', tempo: clamp(Math.round(t.tempo), 48, 160), length: t.length, tracks: safeTracks, notes }
}
function legacy(value: unknown): Take | null {
  const t = value as { slots?: { kind: Voice | 'rest'; pitch: number }[]; title?: string; tempo?: number } | null
  if (!t || !Array.isArray(t.slots) || t.slots.length < 2 || t.slots.length > 6 || !Number.isFinite(t.tempo)) return null
  const next = blankTake(); next.title = typeof t.title === 'string' ? t.title.slice(0, 48) : next.title; next.tempo = clamp(t.tempo!, 48, 160)
  for (const [i, n] of t.slots.entries()) {
    if (!n || n.kind === 'rest') continue
    if (!VOICES.includes(n.kind) || !Number.isInteger(n.pitch) || n.pitch < 0 || n.pitch > 5) return null
    next.notes.push({ id: `n${i}`, kind: n.kind, pitch: n.pitch, beat: 1 + i * 1.5, y: 85 + i % 2 * 20, size: 1, track: 't0' })
  }
  return next
}
export function encodeTake(take: Take): string {
  return 'v2.' + btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(take)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
export function decodeTake(hash: string): Take | null {
  try {
    const value = hash.replace(/^#/, '')
    if (!/^v[12]\./.test(value) || value.length > 24000) return null
    const bytes = Uint8Array.from(atob(value.slice(3).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
    const data: unknown = JSON.parse(new TextDecoder().decode(bytes))
    return value.startsWith('v2.') ? validTake(data) : legacy(data)
  } catch { return null }
}
