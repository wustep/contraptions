import { beatX, boardHeight, boardWidth, mod, NAMES, pitchName, STEP, TRACK_GAP, trackY, type Take } from './model'
import { mechanism, onSegment, routeAt, routesFor, segmentPath, type Point, type Route } from './instruments'

export interface StageState { take: Take; selected: string | null; activeTrack: string; armed: boolean; zoom: number }
export class OrchestraStage {
  readonly svg: SVGSVGElement
  routes: Route[] = []
  private state: StageState | null = null
  constructor(readonly host: HTMLElement) {
    host.innerHTML = '<svg id="machine" xmlns="http://www.w3.org/2000/svg" aria-label="Orchestra workbench. Drag instruments to shape the rails. Arrow keys move a selected instrument." role="group"></svg>'
    this.svg = host.querySelector('svg')!
  }
  render(state: StageState): void {
    this.state = state
    const { take, selected, zoom } = state, w = boardWidth(take), h = boardHeight(take)
    this.routes = routesFor(take)
    this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
    this.svg.style.width = `${w * zoom}px`; this.svg.style.height = `${h * zoom}px`
    this.host.classList.toggle('placing', state.armed)
    const lines = this.routes.map((route, i) => {
      const track = take.tracks[i], y = trackY(i)
      const rails = route.segments.map(s => {
        const d = segmentPath(s)
        let belt = ''
        if (s.lift && !s.returning) {
          const vertical = Math.abs(s.b.x - s.a.x) < 1
          belt = `<path d="${d}" transform="${vertical ? 'translate(14 9)' : 'translate(0 17)'}" class="belt"/>`
          for (let k = .1; k < .95; k += .09) { const p = onSegment(s, k); belt += `<path class="belt-rung" d="M${p.x} ${p.y + 10}${vertical ? 'h14' : 'v7'}"/>` }
          if (vertical) belt += `<circle class="paper" cx="${s.a.x + 7}" cy="${s.a.y + 9}" r="7"/><circle class="paper" cx="${s.b.x + 7}" cy="${s.b.y + 9}" r="7"/>`
        }
        return `<path class="rail-clear" d="${d}" transform="translate(0 9)"/><path class="rail ${s.returning ? 'return-rail' : ''}" d="${d}" transform="translate(0 9)"/>${belt}`
      }).join('')
      const teeth = Array.from({ length: 6 }, (_, k) => `<path class="fine" d="M28 ${y + k * 17 + 6}h16"/>`).join('')
      return `<g class="track ${track.muted ? 'muted' : ''}" data-route="${track.id}" style="--track:${track.color}">
        ${rails}<path class="fine" d="M16 ${y}h20M16 ${y + 100}h20M28 ${y}v100m16-100v100"/>${teeth}
        <g class="gear" data-cx="36" data-cy="${y}"><circle class="paper" cx="36" cy="${y}" r="12"/><path d="M36 ${y - 8}v16m-8-8h16"/><circle class="track-fill" cx="36" cy="${y}" r="3"/></g>
        <circle class="paper" cx="36" cy="${y + 90}" r="9"/><circle class="track-fill" cx="36" cy="${y + 90}" r="3"/>
        <path class="direction" d="m${w * .56} ${y + 103} -7 6 7 6m-12-6h38"/>
      </g>`
    }).join('')
    const notes = take.notes.map(n => {
      const track = take.tracks.find(t => t.id === n.track)!
      return `<g class="piece ${n.id === selected ? 'selected' : ''} ${track.muted ? 'muted' : ''}" data-note="${n.id}" data-shape="${n.kind}/${n.size}" data-beat="${n.beat}" role="button" tabindex="0" aria-pressed="${n.id === selected}" aria-label="${NAMES[n.kind]}, ${pitchName(n.pitch)}, beat ${(n.beat + 1).toFixed(2)}, track ${take.tracks.indexOf(track) + 1}" transform="translate(${beatX(n.beat)} ${n.y})" style="--track:${track.color}">
        <rect class="selection" x="${-48 * n.size}" y="-25" width="${96 * n.size}" height="105" rx="8"/>
        <g class="mechanism" transform="scale(${n.size} 1)">${mechanism(n.kind)}</g>
        <text class="note-label" y="96" text-anchor="middle">${pitchName(n.pitch)}</text>
        <path class="strike-lines" d="m-16-18-4-5m20 2v-7m16 10 4-5"/>
        <foreignObject x="${-46 * n.size}" y="-20" width="${92 * n.size}" height="100"><button xmlns="http://www.w3.org/1999/xhtml" class="hit-area" tabindex="-1" aria-hidden="true"></button></foreignObject>
      </g>`
    }).join('')
    const ruler = Array.from({ length: take.length }, (_, i) => `<path class="ruler-tick" d="M${beatX(i)} 12v${i % 4 === 0 ? 10 : 5}"/>${i % 2 === 0 ? `<text class="ruler-label" x="${beatX(i)}" y="38" text-anchor="middle">${i + 1}</text>` : ''}`).join('')
    // Keep focus and native touch targets stable while the rails are rebuilt.
    if (!this.svg.querySelector('#pieces-layer')) this.svg.innerHTML = '<rect class="board-paper"/><g id="ruler-layer"/><path class="chassis"/><g id="rails-layer"/><g id="pieces-layer"/><g id="balls-layer"/><circle id="playhead" cy="17" r="4"/>'
    const paper = this.svg.querySelector('.board-paper')!
    paper.setAttribute('width', String(w)); paper.setAttribute('height', String(h))
    this.svg.querySelector('#ruler-layer')!.innerHTML = ruler
    this.svg.querySelector('.chassis')!.setAttribute('d', `M16 65v${(take.tracks.length - 1) * TRACK_GAP + 120}m-7 0h23`)
    this.svg.querySelector('#rails-layer')!.innerHTML = lines
    const pieces = this.svg.querySelector('#pieces-layer')!, incoming = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    incoming.innerHTML = notes
    for (const el of Array.from(pieces.children)) if (!take.notes.some(n => n.id === el.getAttribute('data-note'))) el.remove()
    for (const next of Array.from(incoming.children)) {
      const current = pieces.querySelector(`[data-note="${next.getAttribute('data-note')}"]`)
      if (!current) { pieces.append(next); continue }
      const shapeChanged = current.getAttribute('data-shape') !== next.getAttribute('data-shape')
      for (const attr of Array.from(next.attributes)) current.setAttribute(attr.name, attr.value)
      if (shapeChanged) current.innerHTML = next.innerHTML
      else current.querySelector('.note-label')!.textContent = next.querySelector('.note-label')!.textContent
    }
    this.svg.querySelector('#balls-layer')!.innerHTML = take.tracks.map(t => `<g class="marble ${t.muted ? 'muted' : ''}" data-ball="${t.id}" style="--track:${t.color}"><circle class="track-fill" r="8"/><path d="M-3-3h1" class="ball-shine"/></g>`).join('')
    this.setTime(0)
  }
  setTime(seconds: number): void {
    if (!this.state) return
    const { take } = this.state, beat = mod(seconds / STEP, take.length)
    for (const route of this.routes) {
      const p = routeAt(route, beat, take.length)
      this.svg.querySelector(`[data-ball="${route.track}"]`)?.setAttribute('transform', `translate(${p.x} ${p.y})`)
    }
    this.svg.querySelector('#playhead')?.setAttribute('cx', String(beatX(beat)))
    for (const gear of this.svg.querySelectorAll<SVGElement>('.gear')) gear.setAttribute('transform', `rotate(${beat * 60} ${gear.dataset.cx} ${gear.dataset.cy})`)
    for (const note of take.notes) {
      const el = this.svg.querySelector<SVGGElement>(`[data-note="${note.id}"]`), age = mod(beat - note.beat, take.length) * STEP
      if (!el) continue
      const hit = age < .3, impulse = hit ? Math.sin(age * 60) * Math.exp(-age * 15) : 0
      el.classList.toggle('struck', hit)
      el.querySelector('.react')?.setAttribute('transform', `translate(0 ${impulse * 3})`)
      el.querySelector('.strings')?.setAttribute('transform', `skewX(${impulse * 3})`)
      el.querySelector('.wheel')?.setAttribute('transform', `rotate(${hit ? Math.min(1, age / .24) * 90 : 0} 0 32)`)
    }
  }
  point(clientX: number, clientY: number): Point {
    const box = this.svg.getBoundingClientRect(), zoom = this.state?.zoom || 1
    return { x: (clientX - box.left) / zoom, y: (clientY - box.top) / zoom }
  }
}
