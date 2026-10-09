/**
 * The checks for Logogram: Louise from the lake house up into the shell and through the glass, and back round to the
 * lake house, on the recording's own pulse and onsets. Called by `checks/shows.ts` for that take.
 */
import type { Performance, ShowVersion } from '../src/shows/registry'
import measured from '../../../scripts/shows/plans/heptapod-b-onsets.json'
import { STRIKES } from '../src/shows/versions/heptapod-b/logogram/hits'
import { CREDITS_AT, DURATION, FLUTTER, ONSETS, PULSES, PUSH, PUSH_PEAK, RECORDING, SEAM, TURN, BURST1, hardPulses } from '../src/shows/versions/heptapod-b/logogram/music'
import { CARDS, CREDITS_OK, creditsAt } from '../src/shows/versions/heptapod-b/logogram/credits'
import { PUNCHES, VEILED, veilAt } from '../src/shows/versions/heptapod-b/logogram/score'
import { FIRST } from '../src/shows/versions/heptapod-b/logogram/seams'
import type { LogogramShow } from '../src/shows/versions/heptapod-b/logogram/show'
import { rollAt } from '../src/shows/versions/heptapod-b/logogram/shell/shaft'
import { TURN_FOR } from '../src/shows/versions/heptapod-b/logogram/shell/shaft-path'
import { CLOSE } from '../src/shows/versions/heptapod-b/logogram/shell/chamber-path'
import { RING_AT, ringR } from '../src/shows/versions/heptapod-b/logogram/shell/chamber-heptapods'
import { BROW, V1_AT } from '../src/shows/versions/heptapod-b/logogram/lake/house-plan'
import { CUT_IN } from '../src/shows/versions/heptapod-b/logogram/valley/depart'
import { R } from '../src/parts'

type Check = (name: string, ok: boolean, detail?: string) => void

export function checkLogogram(perf: Performance, version: ShowVersion, check: Check): void {
  const show = perf.show as LogogramShow
  const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps
  const cam = perf.camera!

  check('logogram: one take, Logogram, Opus 5.5, with an about and a still, and no byline',
    version.title === 'Logogram' && version.label === 'Opus 5.5' && !!version.about && typeof version.still === 'number' && !('director' in version))
  check('logogram: the whole recording from zero, credited to Jóhann Jóhannsson and the film, played from the label\'s upload, and the credits after it',
    near(perf.duration, DURATION) && (perf.soundtrack?.offset ?? 0) === 0 && DURATION > RECORDING + 20 &&
    !perf.soundtrack?.src &&
    ['Jóhann Jóhannsson', 'Heptapod B', 'Arrival'].every((w) => perf.soundtrack?.credit?.includes(w)) &&
    !/private tech demo|not for release/i.test(perf.soundtrack?.credit ?? '') &&
    perf.soundtrack?.href === 'https://www.youtube.com/watch?v=KzaqrQuwr1k' && perf.soundtrack?.youtube?.[0]?.id === 'KzaqrQuwr1k')

  // The places, in the order the story goes, each cut on the recording.
  const order = show.legs.map((l) => l.world).join(',')
  check('logogram: the lake house, the valley, the shell, the fog, three visions of the lake house between the fog, the valley, the lake house',
    order === 'lake,valley,shell,fog,lake,fog,lake,fog,lake,fog,valley,lake', order)
  const onPulse = (t: number, eps: number) => PULSES.some((p) => Math.abs(p.t - t) <= eps)
  const onOnset = (t: number, eps: number, min = 0.2) => ONSETS.some((o) => o.s >= min && Math.abs(o.t - t) <= eps)
  const cuts = show.legs.slice(1).map((l) => l.from)
  const seams = Object.values(SEAM)
  const offSeam = seams.filter((t) => !onOnset(t, 0.02, 0.3) && !onPulse(t, 0.02))
  check('logogram: every seam and every cut is on a pulse or a measured onset',
    offSeam.length === 0 && cuts.length === 11 && cuts.every((c) => seams.some((s) => near(s, c, 1e-3))), offSeam.map((t) => t.toFixed(3)).join(', '))
  check('logogram: no portal anywhere, and no cut drawn', [0, 9, 50, 66, 100, 131, 140, 170, 190, 200].every((t) => perf.cuts?.(t) === false))

  // One ball, one path: in a place it never jumps; at a cut the camera carries it, so on the screen it holds still
  // (turned by the camera's roll, where there is one).
  let jump = 0
  let jumpAt = 0
  let screen = 0
  let screenAt = 0
  let prev = show.where(0)
  let prevLeg = show.owner(0)
  const onScreen = (t: number): [number, number] => {
    const h = show.at(t)
    const f = cam(t)
    const a = f.angle ?? 0
    const dx = (h.x - f.x) / f.cells
    const dy = (h.y - f.y) / f.cells
    return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)]
  }
  let prevS = onScreen(0)
  for (let t = 0.001; t <= perf.duration; t += 0.001) {
    const here = show.where(t)
    const leg = show.owner(t)
    if (leg === prevLeg) {
      const d = Math.hypot(here[0] - prev[0], here[1] - prev[1])
      if (d > jump) { jump = d; jumpAt = t }
    }
    const s = onScreen(t)
    const cutHere = show.cameraCuts.some((c) => c > t - 0.001 - 1e-9 && c <= t + 1e-9)
    const ds = cutHere ? 0 : Math.hypot(s[0] - prevS[0], s[1] - prevS[1])
    if (ds > screen) { screen = ds; screenAt = t }
    prev = here
    prevLeg = leg
    prevS = s
  }
  check('logogram: inside a place the ball never jumps (no more than 0.04 cells a millisecond)', jump <= 0.04, `${jump.toFixed(3)} at ${jumpAt.toFixed(3)} s`)
  check('logogram: every cut is a match cut: on the screen the ball never jumps (no more than 1% of the frame a millisecond)', screen <= 0.01, `${screen.toFixed(4)} at ${screenAt.toFixed(3)} s`)

  // Their eyes are how they act, and the eye a look turns is turned from the roll: it never snaps, at a cut, at a seam
  // between parts, or where a look takes it from the roll or hands it back. Beyond what the ball's own roll turns it, an
  // eye turns no more than 0.15 rad in a 120th of a second (the prologue's quickest glance is 0.13).
  {
    const wrap = (a: number) => {
      const d = a % (2 * Math.PI)
      return d > Math.PI ? d - 2 * Math.PI : d < -Math.PI ? d + 2 * Math.PI : d
    }
    const eyes = (t: number) => {
      const h = show.at(t)
      const col = h.universe.pieces[0]?.col ?? 0
      const out = new Map<string, { s: number; x: number }>()
      for (const b of h.balls ?? [{ id: h.ball.id, x: h.x, spin: undefined }]) out.set(String(b.id), { s: b.spin ?? (b.x - col) / R, x: b.x })
      if (!out.has(String(h.ball.id))) out.set(String(h.ball.id), { s: (h.x - col) / R, x: h.x })
      return { out, leg: show.owner(t) }
    }
    const dt = 1 / 120
    let prev = eyes(0)
    let worst = 0
    let worstAt = 0
    for (let t = dt; t < perf.duration; t += dt) {
      const cur = eyes(t)
      if (cur.leg === prev.leg) {
        for (const [id, b] of cur.out) {
          const a = prev.out.get(id)
          if (!a) continue
          const over = Math.abs(wrap(b.s - a.s)) - Math.abs((b.x - a.x) / R) * 1.6
          if (over > worst) {
            worst = over
            worstAt = t
          }
        }
      }
      prev = cur
    }
    check('logogram: their eyes never snap (no more than 0.15 rad in a 120th of a second beyond their roll)', worst <= 0.15, `${worst.toFixed(3)} at ${worstAt.toFixed(3)} s`)
  }
  // Two balls never pass into each other: Louise, Ian and Hannah keep their own room, at every 120th of a second.
  {
    let worst = 0
    let worstAt = 0
    for (let t = 0; t < perf.duration; t += 1 / 120) {
      const balls = show.at(t).balls ?? []
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const a = balls[i]
          const b = balls[j]
          if ((a.scale ?? 1) === 0 || (b.scale ?? 1) === 0) continue
          const over = (R * (a.scale ?? 1) + R * (b.scale ?? 1) - Math.hypot(a.x - b.x, a.y - b.y)) / R
          if (over > worst) {
            worst = over
            worstAt = t
          }
        }
      }
    }
    check('logogram: no two balls ever pass into each other (overlap under 5% of a radius)', worst <= 0.05, `${worst.toFixed(3)} R at ${worstAt.toFixed(3)} s`)
  }

  // Every strike lands on something the recording has: a pulse, or a measured onset.
  const within = (t: number) => onPulse(t, 0.03) || onOnset(t, 0.04)
  const off: string[] = []
  let count = 0
  for (const [name, list] of Object.entries(STRIKES)) for (const t of list) { count++; if (!within(t)) off.push(`${name} ${t.toFixed(3)}`) }
  check('logogram: every strike lands on a pulse or a measured onset', off.length === 0, `${count} strikes; off: ${off.slice(0, 12).join(', ')}`)
  const quiet = Object.entries(STRIKES).filter(([, list]) => list.length === 0).map(([name]) => name)
  check('logogram: every part strikes', quiet.length === 0, `no strikes yet: ${quiet.join(', ')}`)
  const all = Object.values(STRIKES).flat()
  const hit = (t: number, eps = 0.03) => all.some((s) => Math.abs(s - t) <= eps)
  const cover = (ts: number[]) => ({ n: ts.filter((t) => hit(t)).length, of: ts.length })
  const burst = cover([...BURST1])
  const turn = cover(hardPulses(TURN - 0.01, 72.9, 0.75))
  const push = cover(hardPulses(PUSH - 0.01, PUSH_PEAK + 0.5, 0.8))
  check('logogram: the first burst is struck (the slot opening)', burst.n >= 5, `${burst.n}/${burst.of}`)
  check('logogram: gravity turns on the great burst, and its hard pulses are struck', hit(TURN) && turn.n >= turn.of - 1, `${turn.n}/${turn.of}`)
  check('logogram: the push strikes most of its hard pulses', push.n >= push.of * 0.75, `${push.n}/${push.of}`)

  // The camera cuts inside a place only on a strike, and otherwise never whips.
  const cameraCuts = show.cameraCuts
  const offStrike = cameraCuts.filter((c) => !all.some((s) => Math.abs(s - c) <= 0.005))
  check('logogram: the camera cuts inside a place only on a strike', offStrike.length === 0, `${cameraCuts.length} cuts${offStrike.length ? `; off: ${offStrike.map((c) => c.toFixed(3)).join(', ')}` : ''}`)
  let whip = 0
  let whipAt = 0
  const ZDT = 1 / 120
  for (let t = ZDT; t <= perf.duration; t += ZDT) {
    if (show.owner(t) !== show.owner(t - ZDT)) continue
    if (cameraCuts.some((c) => c > t - ZDT && c <= t + 1e-9)) continue
    if (PUNCHES.some(([at]) => t >= at - 0.01 && t <= at + 0.15)) continue
    const z = Math.abs(Math.log(cam(t).cells / cam(t - ZDT).cells)) / ZDT
    if (z > whip) { whip = z; whipAt = t }
  }
  check('logogram: the camera never whips: its zoom under 0.6 of a scale a second but for its punches (gravity\'s turn, the palm, the great ring) and its cuts',
    whip <= 0.6, `${whip.toFixed(2)} log/s at ${whipAt.toFixed(2)} s`)

  // The camera's roll: square everywhere but the shaft's mouth, where it is turned a quarter (the shell's +x up the
  // screen), and turns square with gravity on the great burst.
  const rolled = (t: number) => cam(t).angle ?? 0
  const square = [0, 30, 60, SEAM.shaft - 0.05, TURN + 3, 90, 120, 150, 190, 230].every((t) => Math.abs(rolled(t)) < 1e-6)
  check('logogram: the camera is square everywhere but the shaft\'s mouth, turned a quarter there, square again after gravity turns',
    square && near(rolled(SEAM.shaft + 0.05), -Math.PI / 2, 1e-3) && near(rolled(TURN - 0.4), -Math.PI / 2, 1e-3) && Math.abs(rolled(TURN + 3)) < 1e-6,
    [SEAM.shaft + 0.05, TURN - 0.4, TURN + 0.5, TURN + 3].map((t) => rolled(t).toFixed(3)).join(', '))

  // Gravity's turn: the camera turns after gravity as a heavy body on a spring would, never faster than a whip, and
  // settles past square by no more than a few degrees.
  let rollSpeed = 0
  let rollPast = 0
  for (let t = TURN; t <= TURN + 3; t += 0.001) {
    rollSpeed = Math.max(rollSpeed, (Math.abs(rollAt(t + 0.001) - rollAt(t)) / 0.001) * (180 / Math.PI))
    rollPast = Math.max(rollPast, rollAt(t) * (180 / Math.PI))
  }
  const lagging = rollAt(TURN + TURN_FOR) * (180 / Math.PI)
  check('logogram: the shaft\'s roll follows gravity round and settles: still a third of the way from square when gravity has turned, under 160° a second, no more than 5° past square',
    lagging < -30 && rollSpeed < 160 && rollPast > 0.5 && rollPast < 5, `${lagging.toFixed(1)}° at TURN + ${TURN_FOR}, ${rollSpeed.toFixed(0)}°/s at most, ${rollPast.toFixed(1)}° past`)

  // The first logogram: its two ends meet on a pulse, and from then until the white takes it the whole ring is in the
  // frame, for more than three seconds and a half.
  const inside = show.legs.find((l) => l.key === 'inside')!
  const room = inside.placed.find((p) => p.start <= CLOSE && p.start + p.span > CLOSE)!
  const ring: [number, number] = [room.col + room.mirror * RING_AT[0], room.row + RING_AT[1]]
  const veilFrom = VEILED[1] - 0.7
  const cropped: string[] = []
  for (let t = CLOSE; t <= veilFrom; t += 0.05) {
    const f = cam(t)
    const reach = ringR(t) * 1.12
    if (Math.abs(ring[0] - f.x) + reach > (f.cells * 16) / 9 / 2 || Math.abs(ring[1] - f.y) + reach > f.cells / 2) cropped.push(t.toFixed(2))
  }
  check('logogram: the first logogram closes on a pulse and hangs whole in the frame from then until the white, over three seconds and a half',
    onPulse(CLOSE, 0.005) && hit(CLOSE) && veilFrom - CLOSE > 3.5 && cropped.length === 0, cropped.slice(0, 6).join(', '))

  // The two white-outs are white at their cuts, and nothing else is.
  check('logogram: the window\'s glare and the glass\'s light go to white at their cuts, and only there',
    VEILED.every((t) => veilAt(t).a > 0.99) && [5, 30, 100, 150, 200].every((t) => veilAt(t).a === 0) && near(VEILED[0], SEAM.flight) && near(VEILED[1], SEAM.fog1))

  // The circle: the last scene opens on the show's first frame, Louise where she was.
  const f0 = cam(0)
  const f1 = cam(SEAM.end + 0.001)
  const s0 = onScreen(0)
  const s1 = onScreen(SEAM.end + 0.001)
  check('logogram: the last scene opens on the first frame: the same place, the same framing, Louise where she was',
    show.legs[0].world === 'lake' && show.legs[show.legs.length - 1].world === 'lake' && near(f0.cells, FIRST.cells, 1e-6) && Math.abs(f1.cells - FIRST.cells) < 0.02 &&
    Math.hypot(f0.x - f1.x, f0.y - f1.y) < 0.02 && Math.hypot(s0[0] - s1[0], s0[1] - s1[1]) < 0.005,
    `${f0.x.toFixed(2)},${f0.y.toFixed(2)} ${f0.cells.toFixed(2)} vs ${f1.x.toFixed(2)},${f1.y.toFixed(2)} ${f1.cells.toFixed(2)}`)

  // And the valley side does not hurry to it: from the cut back in, her place on the screen is already the first
  // frame's, and the camera only pushes in on her.
  let slide = 0
  let slideAt = 0
  for (let t = CUT_IN + 0.2; t < SEAM.end; t += 0.05) {
    const s = onScreen(t)
    const d = Math.hypot(s[0] - s0[0], s[1] - s0[1])
    if (d > slide) { slide = d; slideAt = t }
  }
  check('logogram: into the circle the camera pushes in on her where the first frame has her, never sliding her to her mark',
    slide < 0.03, `${slide.toFixed(3)} of the frame at ${slideAt.toFixed(2)} s`)

  // Under Zoom (half as close again as the show's camera) the ball stays in the frame wherever it is to be seen. The
  // great wides: the reveal, the slot's burst under the belly, the lift under it, the chamber, the veil, the departure.
  const WIDE: [number, number][] = [[10, 21.5], [36.3, 38.6], [44, 66], [108, 115], [130, 131.5], [186, 196.5]]
  const outOfZoom: string[] = []
  for (let t = 0; t <= perf.duration; t += 0.05) {
    if (WIDE.some(([a, b]) => t >= a && t <= b)) continue
    const h = show.at(t)
    if (h.hidden || h.scale < 0.3) continue
    const s = onScreen(t)
    const u = Math.max(Math.abs(s[0]) * 1.5 / (16 / 9 / 2), Math.abs(s[1]) * 1.5 / 0.5)
    if (u > 1) outOfZoom.push(`${t.toFixed(2)} (${u.toFixed(2)})`)
  }
  check('logogram: under Zoom the ball never leaves the frame (but for the great wides)', outOfZoom.length === 0, outOfZoom.slice(0, 6).join(', '))

  // She can be found: outside the great wides she is never under 5.5 px across at 640x360 for more than 1.5 s.
  let small = 0
  let smallest = 0
  let smallAt = 0
  for (let t = 0; t <= perf.duration; t += 0.05) {
    const h = show.at(t)
    const px = (2 * R * (h.scale ?? 1) * 360) / cam(t).cells
    small = !h.hidden && px < 5.5 && !WIDE.some(([a, b]) => t >= a && t <= b) ? small + 0.05 : 0
    if (small > smallest) { smallest = small; smallAt = t }
  }
  check('logogram: she can be found: never under 5.5 px across for more than 1.5 s outside the great wides', smallest <= 1.5, `${smallest.toFixed(2)} s to ${smallAt.toFixed(2)}`)

  // The ball is never out of sight for long.
  let hidden = 0
  let longest = 0
  for (let t = 0; t <= perf.duration; t += 0.01) {
    const here = show.at(t)
    hidden = here.hidden || here.scale <= 0.02 ? hidden + 0.01 : 0
    longest = Math.max(longest, hidden)
  }
  check('logogram: the ball is never hidden for more than 2 s', longest <= 2, `${longest.toFixed(2)} s`)

  // Ian and Hannah: each only in their own places, never jumping, coming and going only out of shot or at a cut.
  const inShot = (t: number, b: { x: number; y: number; scale?: number } | null) => {
    if (!b || (b.scale ?? 1) <= 0.02) return false
    const f = cam(t)
    const a = f.angle ?? 0
    const dx = b.x - f.x
    const dy = b.y - f.y
    const x = dx * Math.cos(a) - dy * Math.sin(a)
    const y = dx * Math.sin(a) + dy * Math.cos(a)
    return Math.abs(x) < (f.cells * 16) / 9 / 2 && Math.abs(y) < f.cells / 2
  }
  for (const who of ['ian', 'hannah'] as const) {
    const get = (t: number) => (who === 'ian' ? show.ian(t) : show.hannah(t))
    let worst = 0
    let worstAt = 0
    let pops: string[] = []
    let last = get(0)
    let lastLeg = show.owner(0)
    for (let t = 0.005; t <= perf.duration; t += 0.005) {
      const b = get(t)
      const leg = show.owner(t)
      const changed = leg !== lastLeg
      if (b && last && !changed) {
        const d = Math.hypot(b.x - last.x, b.y - last.y)
        if (d > worst) { worst = d; worstAt = t }
      }
      if (!changed && !!b !== !!last && (inShot(t, b) || inShot(t - 0.005, last))) pops.push(t.toFixed(3))
      last = b
      lastLeg = leg
    }
    pops = pops.slice(0, 6)
    check(`logogram: ${who} never jumps`, worst <= 0.2, `${worst.toFixed(3)} at ${worstAt.toFixed(3)} s`)
    check(`logogram: ${who} only comes and goes out of shot, or at a cut`, pops.length === 0, pops.join(', '))
  }
  // The first vision is a child at play: Hannah in the picture the whole of it, running on the level, nowhere near the
  // bank down to the water.
  let v1Out = 0
  let v1Far = -Infinity
  for (let t = SEAM.v1; t < SEAM.fog2; t += 0.02) {
    const h = show.hannah(t)
    if (!inShot(t, h)) v1Out++
    if (h) v1Far = Math.max(v1Far, h.x - V1_AT[0])
  }
  check('logogram: in the first vision Hannah is in the picture throughout, running ahead on the level, never near the bank',
    v1Out === 0 && v1Far < BROW - 1.5, `${v1Out} samples out of shot; furthest ${v1Far.toFixed(2)} (brow ${BROW})`)
  const counts = [2, 15, 50, 80, 110, 140, 157, 190, 205].map((t) => (show.at(t).balls ?? []).filter((b) => b.id !== 0).map((b) => b.id))
  check('logogram: never two of anyone', counts.every((ids) => new Set(ids).size === ids.length))
  const worldAt = (t: number) => show.legs[show.owner(t)].world
  const ianWhere = Array.from({ length: Math.floor(perf.duration * 4) }, (_, i) => i / 4).filter((t) => show.ian(t)).map(worldAt)
  const hannahWhere = Array.from({ length: Math.floor(perf.duration * 4) }, (_, i) => i / 4).filter((t) => show.hannah(t)).map(worldAt)
  check('logogram: Ian is never at the lake house nor beyond the glass; Hannah is only ever at the lake house',
    ianWhere.every((w) => w === 'valley' || w === 'shell') && hannahWhere.every((w) => w === 'lake'))
  check('logogram: Ian is with her from the helicopter to the glass and at the end; Hannah at the first frame, in two visions, not in the third, and at the end',
    [12, 30, 50, 70, 95, 120].every((t) => inShot(t, show.ian(t))) && inShot(SEAM.end - 0.3, show.ian(SEAM.end - 0.3)) &&
    [0.5, 5, SEAM.v1 + 1, SEAM.v2 + 1, SEAM.end + 0.5, FLUTTER + 1].every((t) => inShot(t, show.hannah(t))) &&
    [SEAM.v3 + 0.5, SEAM.v3 + 1.5, SEAM.v3 + 2.5].every((t) => !show.hannah(t)))

  // The end credits: words the page sets over the lake house after the last flutter, owing what is owed.
  const said = CARDS.map((c) => [c.role ?? '', ...c.names.flat(), ...(c.notes ?? [])].join(' ')).join(' | ')
  check('logogram: end credits after the last flutter, set by the page, opening on Directed by Claude Opus 5.5 and naming Louise, Ian, Hannah, Abbott and Costello, Jóhann Jóhannsson, the cue, the film, Denis Villeneuve, Ted Chiang and p5.js',
    CREDITS_OK && perf.titles === creditsAt && CREDITS_AT > FLUTTER && creditsAt(CREDITS_AT - 0.1).length === 0 && creditsAt(perf.duration).length === 0 &&
    CARDS[0].role === 'Directed by' && CARDS[0].names.join() === 'Claude Opus 5.5' && CARDS.filter((c) => c.role === 'Directed by').length === 1 &&
    ['Louise Banks', 'Ian Donnelly', 'Hannah', 'Abbott and Costello', 'Jóhann Jóhannsson', 'Heptapod B', 'Arrival', 'Denis Villeneuve', 'Ted Chiang', 'p5.js'].every((w) => said.includes(w)) &&
    !/private tech demo|Stephen Wu/i.test(said), said)

  // The measured file is the one the parts were timed to.
  const m = measured as { duration: number; youtube: string }
  check('logogram: the onsets file is this recording\'s', near(m.duration, RECORDING, 1e-9) && m.youtube === 'KzaqrQuwr1k' && Math.abs(RECORDING - 222.085) < 0.01)
}
