export const OPTIONS = [
  [
    {
      id: 'cannon',
      name: 'Cannon',
      line: 'A disproportionate entrance.',
      verb: 'Taking the scenic route.',
      icon: 'launch',
    },
    {
      id: 'seesaw',
      name: 'Seesaw',
      line: 'A small, considerate shove.',
      verb: 'Applying a little encouragement.',
      icon: 'seesaw',
    },
    {
      id: 'toaster',
      name: 'Toaster',
      line: 'Warm wishes. Literally.',
      verb: 'Warming up the compliment.',
      icon: 'toaster',
    },
  ],
  [
    {
      id: 'snow',
      name: 'Snow day',
      line: 'Completely out of season.',
      verb: 'Adding unnecessary weather.',
      icon: 'snow',
    },
    {
      id: 'paint',
      name: 'Fresh paint',
      line: 'A very important makeover.',
      verb: 'A fresh coat of self-esteem.',
      icon: 'paint',
    },
    {
      id: 'apple',
      name: 'An apple',
      line: 'Your gift is now produce.',
      verb: 'Making a fruit-based substitution.',
      icon: 'apple',
    },
  ],
  [
    {
      id: 'photo',
      name: 'Photo booth',
      line: 'For the permanent record.',
      verb: 'Please look extremely normal.',
      icon: 'photo',
    },
    {
      id: 'stamp',
      name: 'Rubber stamp',
      line: 'Officially, unnecessarily nice.',
      verb: 'Authorizing this affection.',
      icon: 'stamp',
    },
    {
      id: 'bell',
      name: 'Service bell',
      line: 'Tell absolutely everyone.',
      verb: 'Announcing a very good human.',
      icon: 'bell',
    },
  ],
] as const

export const FINALS = [
  { id: 'fanfare', name: 'Tiny fanfare', line: 'One very small, very sincere ta-da.' },
  { id: 'boxes', name: 'One more box', line: 'A box. In a box. In another box.' },
  { id: 'approval', name: 'Official approval', line: 'Certified by the Department of You.' },
] as const
export type Finale = (typeof FINALS)[number]['id']
export type Opening = 'gentle' | 'deluxe'
export interface Recipe {
  v: 1
  to: string
  from: string
  message: string
  picks: [number, number, number]
  finale: Finale
  seed: string
  hop: number
}

export const MAX_MESSAGE = 80
export const MAX_NAME = 28
export const DEFAULT_MESSAGE = 'nice socks.'

/** Keep short notes portable across text fields, URLs, printed slips and PNGs. */
export const cleanText = (text: string): string =>
  Array.from(text)
    .map((c) => (c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 ? ' ' : c))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()

export function newRecipe(): Recipe {
  return {
    v: 1,
    to: '',
    from: '',
    message: DEFAULT_MESSAGE,
    picks: [0, 0, 0],
    finale: 'fanfare',
    seed: crypto.randomUUID().slice(0, 8),
    hop: 0,
  }
}

export function encodeRecipe(recipe: Recipe): string {
  const bytes = new TextEncoder().encode(
    JSON.stringify({
      ...recipe,
      to: cleanText(recipe.to),
      from: cleanText(recipe.from),
      message: cleanText(recipe.message),
    }),
  )
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/** A link is untrusted input. Reject unknown versions and invalid choices instead of silently changing the gift. */
export function decodeRecipe(encoded: string): Recipe | null {
  try {
    if (!encoded || encoded.length > 4096 || !/^[\w-]+$/.test(encoded)) return null
    const bytes = Uint8Array.from(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
    const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    if (!value || typeof value !== 'object') return null
    const r = value as Record<string, unknown>
    const text = (v: unknown, max: number): v is string =>
      typeof v === 'string' &&
      v.length <= max &&
      !Array.from(v).some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
    if (
      r.v !== 1 ||
      !text(r.to, MAX_NAME) ||
      !text(r.from, MAX_NAME) ||
      !text(r.message, MAX_MESSAGE) ||
      !r.message.trim()
    )
      return null
    if (!text(r.seed, 32) || !r.seed || !Number.isInteger(r.hop) || (r.hop as number) < 0 || (r.hop as number) > 999)
      return null
    if (
      !FINALS.some((f) => f.id === r.finale) ||
      !Array.isArray(r.picks) ||
      r.picks.length !== 3 ||
      r.picks.some((n) => !Number.isInteger(n) || n < 0 || n > 2)
    )
      return null
    return {
      v: 1,
      to: r.to,
      from: r.from,
      message: r.message,
      picks: [...r.picks] as Recipe['picks'],
      seed: r.seed,
      hop: r.hop as number,
      finale: r.finale as Finale,
    }
  } catch {
    return null
  }
}

export const giftUrl = (recipe: Recipe): string =>
  `${location.origin}/games/extremely-normal-gifts/#gift=${encodeRecipe(recipe)}`
export const recipient = (recipe: Recipe): string => recipe.to.trim() || 'a very good human'
export const sender = (recipe: Recipe): string => recipe.from.trim() || 'someone who likes you'

/** Replies keep the original joke and change exactly one mechanism. */
export function replyRecipe(recipe: Recipe): Recipe {
  return { ...recipe, to: recipe.from, from: recipe.to, picks: [...recipe.picks], hop: Math.min(999, recipe.hop + 1) }
}

const DRAFT_KEY = 'extremely-normal-gifts:draft:1'
export function saveDraft(recipe: Recipe, parent: Recipe | null): void {
  try {
    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ gift: encodeRecipe(recipe), parent: parent ? encodeRecipe(parent) : null }),
    )
  } catch {
    /* Private browsing and storage limits must never block a gift. */
  }
}

export function loadDraft(): { recipe: Recipe; parent: Recipe | null } | null {
  try {
    const data = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null')
    if (!data || typeof data.gift !== 'string') return null
    const recipe = decodeRecipe(data.gift)
    const parent = typeof data.parent === 'string' ? decodeRecipe(data.parent) : null
    if (
      !recipe ||
      (parent && (recipe.message !== parent.message || recipe.picks.filter((p, i) => p !== parent.picks[i]).length > 1))
    )
      return null
    return { recipe, parent }
  } catch {
    return null
  }
}
