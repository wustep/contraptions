import { makeRng, type Rng } from '../../../../../src/core/rng'
import { ballAt, fly, laneAt, segTime, wait, type BallChange, type Lane, type Pt, type Seg } from '../../parts'
import { COLORS, MACHINES, PARK, inputAt, mailboxAt, readyAt, returnAt, worldLane, type Address, type Color, type Station } from './machines'

export const SHIFT = 90
export const CAPACITY = 3
export interface Order { color: Color; next: Color; until: number; reserved: boolean; serial: number }
export interface Motion { start: number; end: number; lane: Lane; color: string; changes: BallChange[] }
export interface Parcel { id: number; color: Color; rescued: boolean; returns: number; motions: Motion[] }
export interface Activation { station: Station; start: number; color: string; paint?: string }
export interface Choice { at: number; action: 'paint' | 'send' | 'hold' | 'park'; value?: number }
export interface Delivery { at: number; parcel: number; address: Address; good: boolean; start: number; returns: number }
interface Pending { at: number; run(): void }
export type Sound = 'paint' | 'send' | 'good' | 'bad' | 'hold' | 'return' | 'tick' | 'finish' | 'bang'
export type Phase = 'open' | 'closing' | 'finished'

/** Decisions own the rules. Timed lanes perform their already-resolved consequences. */
export class Depot {
  time = 0
  phase: Phase = 'open'
  score = 0
  delivered = 0
  missed = 0
  mistakes = 0
  rescues = 0
  streak = 0
  bestStreak = 0
  feedHeld = false
  parked: Parcel | null = null
  intake: Parcel[] = []
  ready: Parcel[] = []
  rework: Parcel[] = []
  parcels: Parcel[] = []
  activations: Activation[] = []
  choices: Choice[] = []
  deliveries: Delivery[] = []
  orders: Order[]
  notice = 'Match a parcel’s color to an address’s request.'
  noticeAt = 0
  noticeKind: 'normal' | 'good' | 'bad' = 'normal'
  painterFree = 0
  conveyorFree = 0
  cannonFree = 0
  frogFree = 0
  painting = 0
  production: Parcel[] = []
  inFlight = 0
  revision = 0
  private nextId = 1
  private pending: Pending[] = []
  private rng: Rng
  onSound: (sound: Sound) => void = () => {}

  constructor(readonly seed: string, readonly practice = false) {
    this.rng = makeRng(`delivery-v1:${seed}`)
    this.orders = ([0, 1, 2] as Color[]).map((color, i) => ({ color, next: ((i + 1) % 3) as Color, until: 22 + i * 3, reserved: false, serial: 1 }))
  }

  get multiplier(): number { return Math.min(4, 1 + Math.floor(this.streak / 4)) }
  get load(): number { return this.ready.length + this.painting }
  get activeCount(): number { return this.parcels.filter((p) => p.motions.at(-1)?.end === Infinity).length }
  get rush(): number { return Math.min(2, Math.floor(this.time / 30)) }

  say(message: string, kind: 'normal' | 'good' | 'bad' = 'normal'): void {
    this.notice = message; this.noticeAt = this.time; this.noticeKind = kind; this.revision++
  }

  private schedule(at: number, run: () => void): void {
    this.pending.push({ at, run })
    this.pending.sort((a, b) => a.at - b.at)
  }

  private motion(p: Parcel, segs: Seg[], changes: BallChange[] = [], color: string = COLORS[p.color]): void {
    const last = p.motions.at(-1)
    if (last) last.end = this.time
    p.motions.push({ start: this.time, end: Infinity, lane: { segs, fire: 0 }, color, changes })
  }

  private move(p: Parcel, to: Pt): void {
    const old = this.position(p, this.time)
    this.motion(p, old ? [fly([old.x, old.y], to, 0.18, 0.06)] : [wait(to, 1)], [], old?.color)
  }

  position(p: Parcel, t: number) {
    const m = p.motions.slice().reverse().find((m) => m.start <= t && m.end > t)
    if (!m) return null
    const at = laneAt(m.lane, t - m.start)
    const state = ballAt({ color: m.color, id: p.id, ghost: false }, m.changes, t - m.start)
    return { ...at, color: state.color, id: p.id }
  }

  paint(color: Color): boolean {
    if (this.phase !== 'open') return false
    if (this.intake.length >= CAPACITY || (!this.rework.length && this.activeCount >= 8)) {
      this.say('Paint queue full. Dispatch a parcel or use the parking pocket.', 'bad'); this.onSound('bad'); return false
    }
    this.choices.push({ at: this.time, action: 'paint', value: color })
    const p = this.rework.shift() ?? { id: this.nextId++, color, rescued: false, returns: 0, motions: [] }
    if (!this.parcels.includes(p)) this.parcels.push(p)
    const previous = p.motions.length ? this.position(p, this.time)?.color ?? COLORS[p.color] : '#f5f1e7'
    p.color = color
    this.motion(p, [wait(inputAt(this.intake.length), 1)], [], previous)
    this.intake.push(p)
    this.rework.forEach((q, i) => this.move(q, returnAt(i)))
    this.onSound('paint'); this.revision++
    this.pump()
    return true
  }

  private pump(): void {
    if (this.phase !== 'open' || this.feedHeld || !this.intake.length || this.load >= CAPACITY || this.time < this.painterFree) return
    const p = this.intake.shift()!
    const before = this.position(p, this.time)!
    const approach = fly([before.x, before.y], [1.2, 2.3], 0.22, 0.12)
    const paint = worldLane('painter')
    const belt = worldLane('conveyor')
    const start = this.time + approach.dur
    const painted = start + MACHINES.painter.duration
    const beltStart = Math.max(painted, this.conveyorFree)
    const tail = fly([4.2, 1.3], readyAt(this.load), 0.38, 0)
    const segs = [approach, ...paint.segs, wait([2.2, 2.3], beltStart - painted), ...belt.segs, tail]
    this.motion(p, segs, (MACHINES.painter.placement.changes ?? []).map((c) => ({
      ...c, at: approach.dur + c.at / MACHINES.painter.rate, color: COLORS[p.color], over: (c.over ?? 0) / MACHINES.painter.rate,
    })), before.color)
    this.activations.push({ station: 'painter', start, color: before.color, paint: COLORS[p.color] },
      { station: 'conveyor', start: beltStart, color: COLORS[p.color] })
    this.painterFree = beltStart
    this.conveyorFree = beltStart + MACHINES.conveyor.duration
    this.painting++; this.production.push(p)
    this.intake.forEach((q, i) => this.move(q, inputAt(i)))
    this.schedule(this.painterFree, () => this.pump())
    this.schedule(this.time + segTime(segs), () => {
      this.painting--; this.production = this.production.filter((q) => q !== p); this.ready.push(p)
      this.move(p, readyAt(this.ready.length - 1))
      this.revision++; this.pump()
    })
    this.revision++
  }

  hold(): void {
    if (this.phase !== 'open') return
    this.choices.push({ at: this.time, action: 'hold' })
    this.feedHeld = !this.feedHeld
    this.say(this.feedHeld ? 'Paint feed held. Parcels already on the belt keep moving.' : 'Paint feed running.')
    this.onSound('hold'); this.pump()
  }

  park(): void {
    if (this.phase !== 'open') return
    if (!this.ready.length && !this.parked) { this.say('The parking pocket is for a parcel on the dispatch shelf.'); return }
    if (this.parked && !this.ready.length && this.load >= CAPACITY) { this.say('Shelf filling. Wait for a parcel to arrive, then swap.', 'bad'); return }
    this.choices.push({ at: this.time, action: 'park' })
    const first = this.ready.shift() ?? null
    const old = this.parked
    this.parked = first
    if (old) this.ready.unshift(old)
    if (first) this.move(first, PARK)
    this.ready.forEach((p, i) => this.move(p, readyAt(i)))
    this.say(first ? old ? 'Swapped. The parked parcel is next to send.' : 'Parcel parked. Send the next color, then swap it back.' : 'Parked parcel back on the shelf.')
    this.onSound('hold'); this.pump()
  }

  send(address: Address): boolean {
    if (this.phase !== 'open') return false
    if (this.time < this.cannonFree) { this.say('Cannon reloading. Your next parcel is safe on the shelf.'); return false }
    if (!this.ready.length) { this.say('Paint a parcel first. It will ride up to the dispatch shelf.'); return false }
    if (this.orders[address].reserved) { this.say('That delivery is already on its way. Try another address.'); return false }
    this.choices.push({ at: this.time, action: 'send', value: address })
    const p = this.ready.shift()!
    const order = this.orders[address]
    const good = p.color === order.color
    if (good) order.reserved = true
    else { this.streak = 0; this.mistakes++ }
    const start = this.time
    const cannon = worldLane('cannon')
    const segs = [fly(readyAt(0), [6.6, 2.3], 0.3, 0), ...cannon.segs,
      fly([9.6, 1.3], mailboxAt(address), 0.48, 0.45), wait(mailboxAt(address), 0.15)]
    const arrival = this.time + segTime(segs)
    this.motion(p, segs)
    this.activations.push({ station: 'cannon', start: start + 0.3, color: COLORS[p.color] })
    this.cannonFree = start + 0.3 + MACHINES.cannon.duration
    this.inFlight++
    this.ready.forEach((q, i) => this.move(q, readyAt(i)))
    this.onSound('send')
    this.schedule(start + 0.3 + cannon.fire, () => this.onSound('bang'))
    this.say('Special delivery, coming through!')
    this.schedule(arrival, () => {
      this.inFlight--
      this.deliveries.push({ at: this.time, parcel: p.id, address, good, start, returns: p.returns })
      if (good) {
        const points = 100 * this.multiplier + (p.rescued ? 50 : 0)
        this.score += points; this.delivered++; this.streak++
        this.bestStreak = Math.max(this.streak, this.bestStreak)
        if (p.rescued) this.rescues++
        p.motions.at(-1)!.end = this.time
        this.replaceOrder(address)
        this.say(`${p.rescued ? 'Rescued delivery' : 'Delivered'}! +${points}${this.streak % 4 === 0 ? ` · ${this.multiplier}× streak` : ''}`, 'good')
        this.onSound('good')
      } else {
        this.say('Wrong color! The frog is sending it back. Repaint it to rescue it.', 'bad')
        this.onSound('bad'); this.returnParcel(p, address)
      }
      this.revision++
    })
    this.pump(); this.revision++
    return true
  }

  private returnParcel(p: Parcel, address: Address): void {
    const drop = fly(mailboxAt(address), [10.9, 3.8], 0.55, 0.4)
    const frogStart = Math.max(this.time + drop.dur, this.frogFree)
    const frog = worldLane('frog')
    const segs = [drop, wait([10.9, 3.8], Math.max(0, frogStart - this.time - drop.dur)), ...frog.segs,
      fly([10.9, 2.8], returnAt(this.rework.length), 1.05, -1.1)]
    this.motion(p, segs)
    this.activations.push({ station: 'frog', start: frogStart, color: COLORS[p.color] })
    this.schedule(frogStart + frog.fire, () => this.onSound('return'))
    this.frogFree = frogStart + MACHINES.frog.duration
    p.rescued = true; p.returns++
    this.schedule(this.time + segTime(segs), () => {
      this.rework.push(p); this.move(p, returnAt(this.rework.length - 1))
      this.say('A parcel came back. Your next paint key repaints it.', 'normal')
      this.onSound('return'); this.revision++
    })
  }

  private replaceOrder(address: number): void {
    const old = this.orders[address]
    this.orders[address] = { color: old.next, next: this.rng.int(0, 3) as Color, until: this.time + 23 - this.rush * 4,
      reserved: false, serial: old.serial + 1 }
  }

  /** Process the earliest event first, including deadlines and the closing bell. Frame rate cannot change results. */
  advance(target: number): void {
    if (target < this.time || this.phase === 'finished') return
    for (let safety = 0; safety < 2000; safety++) {
      const deadline = !this.practice && this.phase === 'open' ? Math.min(...this.orders.filter((o) => !o.reserved).map((o) => o.until)) : Infinity
      const bell = !this.practice && this.phase === 'open' ? SHIFT : Infinity
      const next = Math.min(this.pending[0]?.at ?? Infinity, deadline, bell)
      if (next > target) break
      this.time = next
      if (next === bell) {
        this.phase = 'closing'; this.say('Last post! Deliveries already sent still count.'); this.revision++
      }
      // An arrival at the deadline wins. The order was reserved at dispatch.
      while (this.pending.length && this.pending[0].at <= this.time) this.pending.shift()!.run()
      if (this.phase === 'open' && !this.practice) this.orders.forEach((o, i) => {
        if (!o.reserved && o.until <= this.time) {
          this.missed++; this.streak = 0; this.replaceOrder(i)
          this.say('An order expired. Fresh requests are in the windows.', 'bad'); this.onSound('tick')
        }
      })
      if (this.phase === 'closing' && !this.inFlight) { this.finish(); return }
    }
    this.time = target
    if (this.phase === 'closing' && !this.inFlight) this.finish()
    this.pump()
  }

  private finish(): void { this.phase = 'finished'; this.revision++; this.onSound('finish') }

  highlight(): { cuts: { start: number; end: number }[]; caption: string } | null {
    const rescue = this.deliveries.filter((d) => d.good && d.returns).sort((a, b) => b.returns - a.returns)[0]
    const wrong = rescue ? this.deliveries.filter((d) => d.parcel === rescue.parcel && !d.good).at(-1) : this.deliveries.find((d) => !d.good)
    const delivery = rescue ?? wrong ?? this.deliveries.at(-1)
    if (!delivery) return null
    const cuts: { start: number; end: number }[] = []
    if (wrong) {
      const returned = this.parcels.find((p) => p.id === wrong.parcel)?.motions.find((m) => Math.abs(m.start - wrong.at) < 0.0001)
      const end = returned ? returned.start + segTime(returned.lane.segs) : wrong.at + 4.5
      cuts.push({ start: Math.max(0, wrong.start - 0.25), end: Math.min(end, rescue?.start ?? Infinity) })
    }
    if (delivery.good) cuts.push({ start: Math.max(0, delivery.start - 0.25, cuts.at(-1)?.end ?? 0), end: delivery.at + 0.7 })
    return { cuts, caption: rescue ? `Parcel ${rescue.parcel}: a scenic detour, a second chance, a perfect delivery.`
      : delivery.good ? 'One more little miracle of postal engineering.' : 'A brief detour through the returns department.' }
  }
}
