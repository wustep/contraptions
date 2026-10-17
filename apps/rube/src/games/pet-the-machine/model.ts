/** Decisions are resolved before a performance is built. Nothing depends on a collision or a frame rate. */
export const RESIDENTS = ['snail', 'frog', 'fern'] as const
export type Resident = typeof RESIDENTS[number]
export const TOYS = ['ball', 'bell', 'pompom'] as const
export type Toy = typeof TOYS[number]
export type Perches = 'apart' | 'together'

export const residents = {
  snail: { name: 'Pip', species: 'the snail', color: '#bd7352', trait: 'A small creature with a very full schedule.', mood: 'Taking his time', note: 'Accepts deliveries. Eventually.', number: '01' },
  frog: { name: 'Moss', species: 'the frog', color: '#789575', trait: 'Big feelings. Questionable aim.', mood: 'Eager to impress', note: 'Everything is an opportunity to show off.', number: '02' },
  fern: { name: 'Fern', species: 'the mimosa', color: '#7c9180', trait: 'Sensitive, in the botanical sense.', mood: 'Quietly curious', note: 'A little patience goes a long way.', number: '03' },
} satisfies Record<Resident, { name: string; species: string; color: string; trait: string; mood: string; note: string; number: string }>

export const toys = {
  ball: { label: 'Wooden ball', short: 'ball', color: '#c77851', note: 'A very good round thing.' },
  bell: { label: 'Little bell', short: 'bell', color: '#d6ae55', note: 'For making a small announcement.' },
  pompom: { label: 'Pom-pom', short: 'pom-pom', color: '#a1a7ba', note: 'Soft. Suspiciously soft.' },
} satisfies Record<Toy, { label: string; short: string; color: string; note: string }>

export const behaviors = [
  { id: 'snail-ball', resident: 'snail', toy: 'ball', title: 'Special delivery', line: 'Your parcel will arrive in three to five business moments.', hint: 'Offer Pip a wooden ball.' },
  { id: 'snail-bell', resident: 'snail', toy: 'bell', title: 'Under consideration', line: 'A full inspection. No conclusions at this time.', hint: 'Let Pip inspect the little bell.' },
  { id: 'snail-pompom', resident: 'snail', toy: 'pompom', title: 'An excellent hat', line: 'Fashion has finally caught up with the snail.', hint: 'Pip has never tried on a pom-pom.' },
  { id: 'frog-ball', resident: 'frog', toy: 'ball', title: 'Return to sender', line: 'A thoughtful gift. Returned with considerable enthusiasm.', hint: 'Moss would like to see the wooden ball.' },
  { id: 'frog-bell', resident: 'frog', toy: 'bell', title: 'One-note orchestra', line: 'The entire concert. There may be an encore.', hint: 'Give Moss something musical.' },
  { id: 'frog-pompom', resident: 'frog', toy: 'pompom', title: 'Soft spot', line: 'For once, the big show-off has nothing to say.', hint: 'Even a show-off likes something soft.' },
  { id: 'fern-ball', resident: 'fern', toy: 'ball', title: 'Personal space', line: 'A brief retreat. Nothing personal. Probably.', hint: 'Roll a wooden ball beneath Fern.' },
  { id: 'fern-bell', resident: 'fern', toy: 'bell', title: 'A tiny round of applause', line: 'Every leaf is a critic. Today, the reviews are good.', hint: 'Does Fern have an ear for music?' },
  { id: 'fern-pompom', resident: 'fern', toy: 'pompom', title: 'A little umbrella', line: 'Forecast: a very local chance of fluff.', hint: 'Show Fern the pom-pom.' },
  { id: 'snail-again', resident: 'snail', toy: 'bell', title: 'Still under consideration', line: 'The second inspection has raised further questions.', hint: 'Offer Pip the bell twice in a row.' },
  { id: 'frog-encore', resident: 'frog', toy: 'bell', title: 'Encore, please', line: 'One more? You really should not have asked.', hint: 'Offer Moss the bell twice in a row.' },
  { id: 'fern-trust', resident: 'fern', toy: 'pompom', title: 'Coming out of her shell', line: 'A little kindness. A little courage. A little fluff.', hint: 'Give Fern a pat, then offer the pom-pom.' },
  { id: 'neighbors', resident: 'frog', toy: 'ball', title: 'The slowest game of catch', line: 'Moss throws. Pip thinks. A friendship takes its time.', hint: 'Visit Pip and Moss, bring the perches together, then give Moss the ball.' },
] as const
export type Behavior = typeof behaviors[number]
export type BehaviorId = Behavior['id']
export type Decision = { resident: Resident; toy: Toy; behavior: BehaviorId; perches: Perches }
export const behaviorById = (id: string): Behavior | undefined => behaviors.find((b) => b.id === id)

export interface Memory {
  version: 1
  names: Record<Resident, string>
  visits: Record<Resident, number>
  pats: Record<Resident, number>
  found: BehaviorId[]
  last: { resident: Resident; toy: Toy } | null
  perches: Perches
  sound: boolean
}

export const freshMemory = (): Memory => ({
  version: 1,
  names: { snail: 'Pip', frog: 'Moss', fern: 'Fern' },
  visits: { snail: 0, frog: 0, fern: 0 },
  pats: { snail: 0, frog: 0, fern: 0 },
  found: [], last: null, perches: 'apart', sound: true,
})

export function decide(memory: Memory, resident: Resident, toy: Toy): Decision {
  let behavior: BehaviorId = `${resident}-${toy}`
  if (resident === 'frog' && toy === 'ball' && memory.perches === 'together' && memory.visits.snail > 0 && memory.visits.frog > 0) behavior = 'neighbors'
  else if (toy === 'bell' && memory.last?.resident === resident && memory.last.toy === toy) {
    if (resident === 'snail') behavior = 'snail-again'
    if (resident === 'frog') behavior = 'frog-encore'
  } else if (resident === 'fern' && toy === 'pompom' && memory.pats.fern > 0 && memory.last?.resident !== 'fern') behavior = 'fern-trust'
  return { resident, toy, behavior, perches: memory.perches }
}

export function remember(memory: Memory, decision: Decision): boolean {
  memory.visits[decision.resident]++
  memory.last = { resident: decision.resident, toy: decision.toy }
  const isNew = !memory.found.includes(decision.behavior)
  if (isNew) memory.found.push(decision.behavior)
  return isNew
}

export const SAVE_KEY = 'contraptions.pet-the-machine.v1'
export function cleanName(value: string, fallback: string): string {
  return Array.from(value).filter((c) => c.charCodeAt(0) >= 32 && (c.charCodeAt(0) < 127 || c.charCodeAt(0) > 159)).join('').trim().slice(0, 18) || fallback
}

/** Saves are untrusted input, including old versions and half-written browser storage. */
export function parseMemory(raw: string | null): Memory {
  const memory = freshMemory()
  if (!raw) return memory
  try {
    const input = JSON.parse(raw)
    if (!input || input.version !== 1) return memory
    for (const id of RESIDENTS) {
      if (typeof input.names?.[id] === 'string') memory.names[id] = cleanName(input.names[id], residents[id].name)
      for (const key of ['visits', 'pats'] as const) {
        const n = input[key]?.[id]
        if (Number.isSafeInteger(n) && n >= 0) memory[key][id] = Math.min(n, 1_000_000)
      }
    }
    if (Array.isArray(input.found)) memory.found = [...new Set<BehaviorId>((input.found as unknown[]).filter((id): id is BehaviorId => typeof id === 'string' && !!behaviorById(id)))]
    if (RESIDENTS.includes(input.last?.resident) && TOYS.includes(input.last?.toy)) memory.last = { resident: input.last.resident, toy: input.last.toy }
    memory.perches = input.perches === 'together' ? 'together' : 'apart'
    memory.sound = typeof input.sound === 'boolean' ? input.sound : true
    return memory
  } catch { return memory }
}

export function loadMemory(): Memory {
  try { return parseMemory(localStorage.getItem(SAVE_KEY)) } catch { return freshMemory() }
}
export function saveMemory(memory: Memory): boolean {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(memory)); return true } catch { return false }
}
