import { makeRng } from '../../../../../src/core/rng'

export type Racer = 0 | 1
export type Route = 'rocket' | 'covered'
export type Card = 'snail' | 'dunk' | 'shield' | 'boost' | 'clean'
export type Mode = 'solo' | 'local'
export interface Choice {
  route: Route
  card: Card
}
export interface Driver {
  name: string
  color: string
  used: Card[]
}
export interface Heat {
  name: string
  note: string
  rocket: number
  covered: number
}
export interface Outcome {
  choice: Choice
  base: number
  penalty: number
  boost: number
  time: number
  incoming: 'snail' | 'dunk' | null
  blocked: boolean
  protected: boolean
}
export interface Result {
  heat: number
  choices: [Choice, Choice]
  outcomes: [Outcome, Outcome]
  winner: Racer | null
  points: [number, number]
}
export interface Match {
  seed: string
  mode: Mode
  drivers: [Driver, Driver]
  results: Result[]
}

export const COLORS = ['#de6547', '#2a8178'] as const
export const HEATS: readonly Heat[] = [
  { name: 'Opening trouble', note: 'A quick rocket. A patient conveyor. A perfectly good friendship.', rocket: 9.6, covered: 10.6 },
  { name: 'A little tailwind', note: 'The rocket is 1.4 seconds quicker. An awfully tempting target.', rocket: 9.0, covered: 10.4 },
  { name: 'One last grudge', note: 'Only 0.4 seconds between routes. Spend what you saved.', rocket: 9.8, covered: 10.2 },
]
export const CARDS: Record<Card, { name: string; label: string; description: string; effect: string }> = {
  snail: { name: 'Snail mail', label: 'THE LONG WAY', description: 'Put your rival on a very patient snail.', effect: '+2.6s to rival' },
  dunk: { name: 'Dunk tank', label: 'A QUICK DIP', description: 'Send your rival through the dunk tank.', effect: '+1.8s to rival' },
  shield: { name: 'No, thank you', label: 'THE DEFENSE', description: 'Block a prank. Keep your dignity dry.', effect: 'Blocks any prank' },
  boost: { name: 'Hot wheels', label: 'THE GETAWAY', description: 'Find an extra gear on the home stretch.', effect: '−1.2s for you' },
  clean: { name: 'Play it clean', label: 'SAVE YOUR CARDS', description: 'Save your tricks for another heat.', effect: 'Always available' },
}
export const HAND: readonly Card[] = ['snail', 'dunk', 'shield', 'boost']

export function newMatch(mode: Mode, seed: string, names: [string, string]): Match {
  return {
    seed,
    mode,
    results: [],
    drivers: names.map((name, i): Driver => ({ name: name.trim().slice(0, 18) || (i ? 'Pip' : 'Dot'), color: COLORS[i], used: [] })) as [
      Driver,
      Driver,
    ],
  }
}

export const available = (driver: Driver, card: Card): boolean => card === 'clean' || !driver.used.includes(card)

/** Choices are simultaneous. Resolve the whole heat before constructing a single animation. */
export function resolveHeat(heat: number, choices: [Choice, Choice]): Result {
  const course = HEATS[heat]
  if (!course) throw new Error('There are exactly three heats.')
  const outcomes = choices.map((choice, index): Outcome => {
    const attack = choices[1 - index].card
    const incoming = attack === 'snail' || attack === 'dunk' ? attack : null
    const blocked = incoming !== null && choice.card === 'shield'
    const protectedRoute = incoming !== null && !blocked && choice.route === 'covered'
    const penalty = !incoming || blocked ? 0 : (incoming === 'snail' ? 2.6 : 1.8) * (protectedRoute ? 0.5 : 1)
    const boost = choice.card === 'boost' ? 1.2 : 0
    const base = course[choice.route]
    return {
      choice: { ...choice },
      base,
      incoming,
      blocked,
      protected: protectedRoute,
      penalty,
      boost,
      time: Math.round((base + penalty - boost) * 100) / 100,
    }
  }) as [Outcome, Outcome]
  const difference = outcomes[0].time - outcomes[1].time
  const winner = Math.abs(difference) < 0.005 ? null : difference < 0 ? 0 : 1
  return {
    heat,
    choices: choices.map((c) => ({ ...c })) as [Choice, Choice],
    outcomes,
    winner,
    points: winner === null ? [2, 2] : winner === 0 ? [3, 1] : [1, 3],
  }
}

export function commitHeat(match: Match, choices: [Choice, Choice]): Result {
  if (match.results.length >= HEATS.length) throw new Error('The derby has finished.')
  choices.forEach((choice, i) => {
    if (!available(match.drivers[i], choice.card)) throw new Error('That card has already been spent.')
  })
  const result = resolveHeat(match.results.length, choices)
  choices.forEach((choice, i) => {
    if (choice.card !== 'clean') match.drivers[i].used.push(choice.card)
  })
  match.results.push(result)
  return result
}

export function totals(match: Match): [number, number] {
  return [0, 1].map((i) => match.results.reduce((sum, result) => sum + result.points[i], 0)) as [number, number]
}

export function champion(match: Match): Racer | null {
  const points = totals(match)
  if (points[0] !== points[1]) return points[0] > points[1] ? 0 : 1
  const times = [0, 1].map((i) => match.results.reduce((sum, result) => sum + result.outcomes[i].time, 0))
  return Math.abs(times[0] - times[1]) < 0.005 ? null : times[0] < times[1] ? 0 : 1
}

/** Called at the start of a heat, before the human can choose. Only public history is consulted. */
export function houseChoice(match: Match): Choice {
  const heat = match.results.length
  const rng = makeRng(`${match.seed}:house:${heat}`)
  const rival = match.drivers[0]
  const house = match.drivers[1]
  const last = match.results.at(-1)?.choices[0]
  const threats = ['snail', 'dunk'].filter((c) => available(rival, c as Card)).length
  const route: Route = rng.bool(heat === 2 && threats ? 0.65 : 0.22) ? 'covered' : 'rocket'
  const pool = [...HAND, 'clean' as Card].filter((card) => available(house, card))
  const card = rng.weighted(pool, (c) => {
    if (c === 'clean') return heat === 2 ? 0.05 : 0.35
    if (c === 'shield') return threats ? (last?.card === 'clean' ? 1.6 : 1) : 0.05
    if (c === 'boost') return heat === 2 ? 1.8 : 0.8
    return last?.route === 'covered' ? 0.65 : 1.2
  })
  return { route, card }
}

export function consequence(result: Result, racer: Racer, names: [string, string]): string {
  const outcome = result.outcomes[racer]
  const rival = names[1 - racer]
  if (outcome.blocked) return `${names[racer]} blocked ${rival}’s ${outcome.incoming === 'snail' ? 'snail' : 'dunk'}. No delay.`
  if (outcome.incoming)
    return `${rival} ${outcome.incoming === 'snail' ? 'sent' : 'dunked'} ${names[racer]}${outcome.incoming === 'snail' ? ' by snail mail' : ''}. +${outcome.penalty.toFixed(1)}s${outcome.protected ? ' · cover halved it' : ''}.`
  if (outcome.choice.card === 'shield') return `${names[racer]} brought a shield. Nobody brought a prank.`
  if (outcome.boost) return `${names[racer]} found another gear. −1.2s on the home stretch.`
  return `${names[racer]} had a clean run on the ${outcome.choice.route === 'rocket' ? 'rocket' : 'conveyor'}.`
}
