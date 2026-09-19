import type Anthropic from '@anthropic-ai/sdk'
import { FAST, FLOOR, R, ROLL } from '../parts'
import { WORLDS } from '../worlds'
import { PROVIDER_INFO, type Keyed } from './providers'
import { nameFor, scaffoldPiece, scaffoldWorld } from './scaffold'
import { BACKDROPS, BUILD_FORMAT, BUILD_VERSION, LIMITS, STOCK_WORLDS, parseBuild, slug, uniqueName, type PieceSpec, type WorldSpec } from './spec'

/**
 * The other half of "prompt a piece": a model writes the `PieceSpec`.
 * Optional — the Builder works without it, on the scaffolds — and
 * bring-your-own-key, client-side only. This is a static site: there is no
 * server to hold a secret or forward a request, and no key is built into the
 * bundle. The key a person pastes in is kept in their browser's localStorage
 * and sent to the provider it belongs to and nowhere else (`providers.ts`):
 *
 *   claude   api.anthropic.com, through the official SDK, which is loaded
 *            only when a key is used, so nobody who never sets one downloads it
 *   gateway  ai-gateway.vercel.sh, the Vercel AI Gateway's OpenAI-compatible
 *            chat endpoint, which answers browsers from any origin
 *
 * What comes back is text, and is treated as a file from anywhere would be:
 * parsed and validated by `parseBuild`, and if it does not pass, the reasons
 * go back for one repair before the Builder falls back to a scaffold.
 */

/** Who to ask, with what, for which model. */
export interface Generator {
  provider: Keyed
  key: string
  model: string
}

/** What a stopped request throws: the person asked for it, so nothing is scaffolded in its place. */
export class Stopped extends Error {
  constructor() {
    super('Stopped.')
    this.name = 'Stopped'
  }
}

/** The contract, as the model is told it. Built once and byte-stable, so it caches. */
const FORMAT = `You design pieces for "contraptions", a Rube Goldberg show drawn in heavy ink outlines with one flat fill per part on paper. One ball rolls one thread through a chain of pieces. You write a piece as JSON; the app interprets it. There is no code in a piece.

## Space and time
- Units are cells. A cell spans [-0.5, 0.5] on both axes, y grows DOWN. [0,0] is the entry cell.
- The ball has radius R = ${R}. Its centre rolls along y = 0 of whatever floor it is on; the rail it rolls on is drawn at y = FLOOR = ${FLOOR} (so a rail one floor down is at y = 1 + ${FLOOR}, one floor up at y = -1 + ${FLOOR}).
- The ball enters at [-0.5, 0] heading east. Speeds: ROLL = ${ROLL} cells/s on plain rail, FAST = ${FAST} after a kick.
- The show draws the ball. A piece NEVER draws the ball; it declares the ball's path (the lane) and draws the machine around it.
- Two clocks, in seconds: "t" since the ball entered the piece (negative before), "since" since the piece fired (negative before). A piece must look right at any time: armed and waiting before the ball, reacting as it passes, settled long after.

## PieceSpec
{
  "name": slug, lower-case with hyphens, a noun: "bell-tower",
  "note": one or two sentences saying what is seen to happen, cause first,
  "weight": 0.6 to 1.2 (how often the planner picks it; 1 is ordinary),
  "flight": true only if it throws the ball through the air,
  "cells": [[x,y],...] whole cells it occupies, relative to the entry cell; must include [0,0]; everything drawn and everywhere the ball goes must be inside these,
  "exit": { "at": [x,y], "dir": 1 } the next piece's entry cell (not one of "cells"); dir -1 only if the ball leaves heading west,
  "lane": [steps], "paint": optional, "shapes": [shapes]
}
Common footprints: one cell [[0,0]] exit [1,0]; two tall [[0,0],[0,-1]] exit [1,0]; up a floor [[0,0],[0,-1]] exit [1,-1]; down a floor [[0,0],[0,1]] exit [1,1]; a flight over a gap [[0,0],[1,0],[0,-1],[1,-1]] exit [2,0]. Keep to ${LIMITS.cells} cells or fewer and ${LIMITS.rows} rows or fewer counting the exit's row, and prefer small.

## Lane steps (each starts where the last ended; the first starts at [-0.5, 0])
{ "op": "roll", "to": [x,y], "v": optional speed }        straight at constant speed
{ "op": "ramp", "to": [x,y], "v0": n, "v1": n }           straight, speed changing linearly (v0 + v1 > 0)
{ "op": "arrive", "to": [x,y] }                           roll and come to a stop
{ "op": "wait", "dur": s }                                stay put
{ "op": "fall", "to": [x,y] }                             accelerate, as under gravity
{ "op": "fly", "to": [x,y], "dur": s, "arc": cells }      a parabola peaking "arc" above the chord's midpoint
{ "op": "move", "to": [x,y], "dur": s, "ease": "in"|"out"|"inout" }   carried by something
Any step may add "fire": true (exactly one step: the piece fires when that step ENDS — the blow, the bang, the tip) and "hidden": true (the ball is out of sight, inside something).
The lane MUST end at [exit.at.x - 0.5 * dir, exit.at.y]: on the edge of the exit cell, on its rail line. Hand the ball on at about ROLL (end with a ramp to v1 = ${ROLL} after anything fast or stopped). The whole lane takes under ${LIMITS.laneTime} seconds; 1 to 3.5 is typical.

## Shapes (drawn in order; later ones on top)
Every shape may have: "at": [x,y] its origin and pivot; "rot": radians at rest; "fill"; "stroke"; "layer": "over" to be drawn in front of the ball (default is behind); "motion": [motions]; "show": { "clock": "since"|"t", "from": s, "to": s } to exist only in a window.
fill: "color" (the piece's one colour, the default) | "accent" (a second) | "paint" | "paper" | "ink" | "none".   stroke: "ink" (default) | "color" | "accent" | "paint" | "none".
{ "kind": "rail", "x0": n, "x1": n, "y": optional }       a stretch of rail (y defaults to FLOOR)
{ "kind": "post", "x": n, "y0": n, "y1": n }              a post with a foot at y1 (the cell's ground is y = 0.5)
{ "kind": "gallows", "x0": n, "x1": n, "post": x, "y": n } a beam along a roof (y = -0.5, or -1.5 for a two-tall piece) held up by a post to the ground
{ "kind": "line", "pts": [[x,y],...] }                    open polyline, relative to "at"
{ "kind": "poly", "pts": [[x,y],...] }                    closed, filled
{ "kind": "rect", "w": n, "h": n, "r": corner, "offset": [x,y] }   centred on "at" (+offset)
{ "kind": "ellipse", "w": n, "h": n, "offset": [x,y] }
{ "kind": "arc", "w": n, "h": n, "a0": rad, "a1": rad, "close": "open"|"chord"|"pie", "offset": [x,y] }
{ "kind": "coil", "anchor": [x,y], "turns": int, "amp": n }   a spring from the fixed anchor to this shape's (moving) origin; amp 0 is a cable
{ "kind": "burst", "r0": n, "r1": n, "n": int }           radial lines; with "show" they are sparks flying outward over the window
{ "kind": "puff", "r": n }                                 a smoke cloud; with "show" it swells
{ "kind": "group", "shapes": [...] }                       parts that move as one: the group's "at", "rot" and "motion" carry everything in it (children are in the group's frame)

## Motions (each makes an amount m from a clock, and m scales "rotate" (radians), "move" [x,y] (cells) and "scale" [x,y] (factors) about the origin)
{ "drive": "ease", "from": s, "to": s, "ease": "linear"|"in"|"out"|"inout", "back": [s, s] }   m goes 0→1 over the window, and back to 0 over "back" if given
{ "drive": "pulse", "from": s, "to": s }      0→1→0
{ "drive": "flick", "from": s, "to": s }      out fast, back with a settle
{ "drive": "swing", "from": s, "freq": n, "decay": n }   a ring-down: sin(freq·x)·exp(-decay·x)
{ "drive": "turn", "from": s, "to": s }       m = seconds run, so "rotate" is radians per second
{ "drive": "follow", "steps": [first, last], "axis": "x"|"y"|"both", "back": [s, s] }   moves exactly as the ball does over those lane steps (by index): use it for anything that carries the ball
"clock" is "since" by default; say "clock": "t" to time something by the ball's arrival instead. Positive rotation is clockwise on screen.

## "paint" (optional): { "after": s, "over": s } — the ball takes a new colour "after" seconds past the fire, blending over "over". Use fill/stroke "paint" for the paint itself.

## Craft — this is what makes a piece good
1. Silhouette first. One clear machine that reads at thumbnail size: a few big parts, not many small ones. 6 to 16 shapes is typical.
2. Cause and effect the eye can follow: the ball does something (lands on a plate, shoulders a vane, trips a catch) and THAT makes the machine act. The fire is the moment of the act. Geometry must agree with the lane: a hammer's face touches the ball where the ball actually is (the ball is a circle of radius ${R} at the lane's position); a platform under the ball is at y = FLOOR; something the ball brushes reaches exactly to the ball's crown at y = -${R}.
3. Nothing floats. Everything stands on the ground (y = 0.5 of its lowest cell), hangs from a gallows, or is fixed to a post.
4. The rail is part of the drawing: draw it wherever the ball rolls, and leave it out where the ball is carried or flies.
5. Bodies are "color" with ink outlines; small contrasting parts "paper", "ink" or "accent". Never assume what the colour is; it is never the ball's.
6. Sparks, puffs and sound arcs are brief, in "color", and only at the moment of action.
7. After acting, a machine settles, and a part that was cocked is slowly hauled "back", long after the ball is gone (start "back" at least a second after the fire).
8. Stay inside the claimed cells: every coordinate, through every motion.

Reply with the JSON object only: no prose, no code fence.`

const WORLD_FORMAT = (): string => `You design worlds for "contraptions", a Rube Goldberg show drawn in heavy ink outlines with one flat fill per part on paper. A world is a place: palettes, a backdrop, a rail, and a supporting cast borrowed from the stock pieces, for a builder's own pieces to play among. You write it as JSON.

{
  "label": short name of the place, title case,
  "note": one line about it, lower case, no full stop,
  "themes": [ two palettes: { "name": slug, "label": title, "bg": "#RRGGBB" paper, "ink": "#RRGGBB" line colour, "colors": [five "#RRGGBB" fills], "note": a few words } ],
  "backdrops": one to three of ${BACKDROPS.join(' | ')} (repeats weight the pick),
  "rail": one of ${STOCK_WORLDS.join(' | ')} — whose rail runs between the beats (workshop: posts and brackets; harbor: pilings over water; garden: a path between stakes; arcade: lit strips),
  "borrow": [ five to eight stock piece names ]
}

Palettes: the house style is bright flat fills inside heavy ink on a ground. Paper is light unless the place is night; ink is near-black on light paper and near-white on dark, and must contrast strongly with the paper. Every fill must read against both paper and ink: no fill close to the paper, none close to the ink. One of the five is usually a near-white (or on a dark sheet, a deep tone) for small parts. The two palettes differ in paper and mood, not in a reshuffle of hues.

Stock pieces you may borrow (★ throws the ball; include two or three of those so the tempo has its accents):
${WORLDS.map((w) => `${w.name}: ${w.pieces.filter((c) => c.name !== 'rail' && c.name !== 'portal' && !c.finale).map((c) => `${c.name}${c.flight ? '★' : ''}`).join(', ')}`).join('\n')}

Reply with the JSON object only: no prose, no code fence.`

/** The JSON in a reply, whether or not it came wrapped in a fence or a sentence. */
function jsonIn(text: string): unknown {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('The reply had no JSON in it.')
  return JSON.parse(text.slice(start, end + 1))
}

/** One conversation with a model: say something, get its reply as text. Each provider keeps the history in its own shape. */
interface Session {
  send(text: string, signal?: AbortSignal): Promise<string>
}

/**
 * A turn as it goes back to the model. After a fallback part-way through a
 * reply, what the refusing model began before the switch — its thinking,
 * any tool call — is left out; its text, and everything after the switch,
 * go back as they came.
 */
function echoed(content: Anthropic.Beta.BetaContentBlock[]): Anthropic.Beta.BetaContentBlockParam[] {
  const cut = content.map((block) => block.type).lastIndexOf('fallback')
  const kept = cut < 0 ? content : content.filter((block, i) => i > cut || block.type === 'text')
  return kept as Anthropic.Beta.BetaContentBlockParam[]
}

/* ------------------------------------------------------------------ claude */

/** Models whose policy declines the API can re-run on a fallback model inside the same call. */
const REFUSAL_FALLBACK = new Set(['claude-opus-5', 'claude-fable-5-1'])

async function claudeSession(gen: Generator, system: string): Promise<Session> {
  const { default: Client } = await import('@anthropic-ai/sdk')
  // A browser call with the person's own key: see the note at the top of this file.
  const client = new Client({ apiKey: gen.key, dangerouslyAllowBrowser: true })
  const messages: Anthropic.Beta.BetaMessageParam[] = []
  return {
    async send(text, signal) {
      messages.push({ role: 'user', content: text })
      let message: Anthropic.Beta.BetaMessage
      try {
        message = await client.beta.messages
          .stream(
            {
              model: gen.model,
              max_tokens: 32000,
              ...(REFUSAL_FALLBACK.has(gen.model) ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
              system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
              messages,
            },
            { signal },
          )
          .finalMessage()
      } catch (err) {
        // Stopped by the person, not failed: checked first, since a stop is an APIError too.
        if (err instanceof Client.APIUserAbortError || signal?.aborted) throw new Stopped()
        if (err instanceof Client.AuthenticationError) throw new Error('That API key was not accepted.')
        if (err instanceof Client.PermissionDeniedError) throw new Error('That API key may not use this model.')
        if (err instanceof Client.NotFoundError) throw new Error(`The API does not know the model ${gen.model}.`)
        if (err instanceof Client.RateLimitError) throw new Error('Rate limited; try again in a moment.')
        if (err instanceof Client.APIConnectionError) throw new Error('Could not reach api.anthropic.com.')
        if (err instanceof Client.APIError) throw new Error(`The API said ${err.status}: ${err.message}`)
        throw err
      }
      if (message.stop_reason === 'refusal') throw new Error('The model declined that prompt.')
      if (message.stop_reason === 'max_tokens') throw new Error('The reply was cut off before it finished.')
      // The turn goes back as it came, thinking and all (a history with pieces missing is refused by some
      // models), less only what a refusing model began before a fallback took over (`echoed`).
      messages.push({ role: 'assistant', content: echoed(message.content) })
      return message.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('')
    },
  }
}

/* ------------------------------------------------------------------ the gateway */

const GATEWAY = `https://${PROVIDER_INFO.gateway.host}/v1`

/** Every model id the gateway serves today, or null if it would not say. No key needed. */
export async function gatewayModelIds(): Promise<string[] | null> {
  try {
    const res = await fetch(`${GATEWAY}/models`)
    if (!res.ok) return null
    const body = (await res.json()) as { data?: { id?: unknown }[] }
    const ids = (body.data ?? []).flatMap((m) => (typeof m.id === 'string' ? [m.id] : []))
    return ids.length ? ids : null
  } catch {
    return null
  }
}

interface ChatTurn {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** What the gateway said went wrong, in a sentence. */
async function gatewayError(res: Response, model: string): Promise<Error> {
  let said = ''
  try {
    const body = (await res.json()) as { error?: { message?: unknown } }
    if (typeof body.error?.message === 'string') said = body.error.message
  } catch {
    /* no body worth reading */
  }
  if (res.status === 401 || res.status === 403) return new Error('That gateway key was not accepted.')
  if (res.status === 402) return new Error('The gateway says the account is out of credit.')
  if (res.status === 404) return new Error(`The gateway does not serve ${model}.`)
  if (res.status === 429) return new Error('Rate limited; try again in a moment.')
  return new Error(`The gateway said ${res.status}${said ? `: ${said}` : ''}`)
}

function gatewaySession(gen: Generator, system: string): Session {
  const messages: ChatTurn[] = [{ role: 'system', content: system }]
  return {
    async send(text, signal) {
      messages.push({ role: 'user', content: text })
      let res: Response
      try {
        res = await fetch(`${GATEWAY}/chat/completions`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${gen.key}` },
          // Streamed, so a model that thinks for a minute is not cut off as an idle connection.
          body: JSON.stringify({ model: gen.model, messages, max_tokens: 32000, stream: true }),
          signal,
        })
      } catch {
        if (signal?.aborted) throw new Stopped()
        // The gateway answers a browser's preflight, but its refusals (a bad key, no credit, an unknown
        // model) come back without a CORS header, so the browser withholds them and all that is seen
        // here is a failed fetch. Its public model list tells a refusal from a gateway that is not there.
        const reachable = (await gatewayModelIds()) !== null
        if (signal?.aborted) throw new Stopped()
        throw new Error(
          reachable
            ? 'The gateway refused the request, and does not let a browser read why. Check the key, its credit, and that it may use this model.'
            : `Could not reach ${PROVIDER_INFO.gateway.host}.`,
        )
      }
      if (!res.ok || !res.body) {
        const err = await gatewayError(res, gen.model)
        throw signal?.aborted ? new Stopped() : err
      }
      // Server-sent events: `data: {json}` a line, `data: [DONE]` at the end.
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
      let pending = ''
      let reply = ''
      let finish = ''
      for (;;) {
        let chunk: ReadableStreamReadResult<string>
        try {
          chunk = await reader.read()
        } catch (err) {
          if (signal?.aborted) throw new Stopped()
          throw err
        }
        const { value, done } = chunk
        if (done) break
        pending += value
        const lines = pending.split('\n')
        pending = lines.pop() ?? ''
        for (const line of lines) {
          const data = line.startsWith('data:') ? line.slice(5).trim() : ''
          if (!data || data === '[DONE]') continue
          try {
            const chunk = JSON.parse(data) as { choices?: { delta?: { content?: unknown }; finish_reason?: unknown }[]; error?: { message?: unknown } }
            if (typeof chunk.error?.message === 'string') throw new Error(`The gateway said: ${chunk.error.message}`)
            const choice = chunk.choices?.[0]
            if (typeof choice?.delta?.content === 'string') reply += choice.delta.content
            if (typeof choice?.finish_reason === 'string') finish = choice.finish_reason
          } catch (err) {
            if (err instanceof SyntaxError) continue
            throw err
          }
        }
      }
      if (finish === 'length') throw new Error('The reply was cut off before it finished.')
      if (finish === 'content_filter') throw new Error('The model declined that prompt.')
      if (!reply) throw new Error('The model sent back nothing.')
      messages.push({ role: 'assistant', content: reply })
      return reply
    },
  }
}

/* ------------------------------------------------------------------ asking */

/** Tries a model gets at a reply that validates: the first, and two more with the reasons it did not. */
const ATTEMPTS = 3

async function ask<T>(gen: Generator, system: string, prompt: string, accept: (raw: unknown) => { value: T | null; errors: string[] }, status: (text: string) => void, signal?: AbortSignal): Promise<T> {
  const who = gen.model.split('/').pop() ?? gen.model
  if (signal?.aborted) throw new Stopped()
  const session = gen.provider === 'claude' ? await claudeSession(gen, system) : gatewaySession(gen, system)
  let errors: string[] = []
  let say = prompt
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    status(attempt ? `${who} is fixing what did not validate (${attempt + 1} of ${ATTEMPTS})\u2026` : `${who} is drawing it\u2026`)
    const reply = await session.send(say, signal)
    try {
      const result = accept(jsonIn(reply))
      if (result.value) return result.value
      errors = result.errors
    } catch (err) {
      errors = [(err as Error).message]
    }
    say = `That did not validate:\n${errors.slice(0, 12).map((e) => `- ${e}`).join('\n')}\nReply with the corrected JSON object only.`
  }
  throw new Error(`What came back did not validate: ${errors.slice(0, 3).join('; ')}`)
}

/** A piece from a prompt, written by a model and validated like any file. Throws with a sentence a person can read, or `Stopped`. */
export async function generatePiece(
  prompt: string,
  gen: Generator,
  taken: ReadonlySet<string>,
  status: (text: string) => void = () => {},
  signal?: AbortSignal,
  /** What was made from this prompt last time, when this is to be another take on it. */
  instead?: string,
): Promise<PieceSpec> {
  // Two worked examples, from the scaffolds: deterministic, so the system prompt stays byte-stable.
  const examples = ['a gong that rings when the ball brushes it', 'a geyser that lifts the ball'].map((p) => {
    const { prompt: _made, ...spec } = scaffoldPiece(p, 0, new Set())
    return JSON.stringify(spec)
  })
  const system = `${FORMAT}\n\n## Two pieces that validate, for the shape of the thing (do better than these)\n${examples.join('\n')}`
  const again = instead ? `\n\nOne has been made from this already: ${instead.slice(0, LIMITS.text)} Make another take on it, different in mechanism or in look.` : ''
  const spec = await ask<PieceSpec>(gen, system, `The piece: ${prompt.trim().slice(0, LIMITS.text)}${again}`, (raw) => {
    const piece = { weight: 1, ...(raw as object) } as PieceSpec
    // A name is the one thing not worth a round trip: one that is missing, or not a slug, is made from the prompt.
    piece.name = slug(typeof piece.name === 'string' ? piece.name : '', nameFor(prompt))
    const { build, errors } = parseBuild({ format: BUILD_FORMAT, version: BUILD_VERSION, name: 'draft', pieces: [piece] })
    return { value: build?.pieces[0] ?? null, errors }
  }, status, signal)
  return { ...spec, name: uniqueName(spec.name, taken), prompt: prompt.trim().slice(0, LIMITS.text) }
}

/** A world from a prompt, written by a model and validated like any file. */
export async function generateWorld(prompt: string, gen: Generator, status: (text: string) => void = () => {}, signal?: AbortSignal): Promise<WorldSpec> {
  const example = JSON.stringify(scaffoldWorld('a volcano island', 0))
  return ask<WorldSpec>(gen, `${WORLD_FORMAT()}\n\n## One that validates\n${example}`, `The place: ${prompt.trim().slice(0, LIMITS.text)}`, (raw) => {
    const names = new Set(WORLDS.flatMap((w) => w.pieces.map((c) => c.name)))
    const world = raw as WorldSpec
    const { build, errors } = parseBuild({ format: BUILD_FORMAT, version: BUILD_VERSION, name: 'draft', pieces: [], world })
    const unknown = Array.isArray(world?.borrow) ? world.borrow.filter((n) => !names.has(n)) : []
    if (unknown.length) return { value: null, errors: [...errors, `world.borrow: no stock piece called ${unknown.join(', ')}`] }
    return { value: build?.world ?? null, errors }
  }, status, signal)
}
