import p5 from 'p5'
import { drawWorld, setupCanvas } from '../rube/src/engine'
import { instruments, PAPER } from './instruments'
import { STEP, type Take } from './model'

export interface StageState { take: Take; time: number; running: boolean; touched: boolean; preview: { slot: number; at: number; local: number } | null }
export function createOrchestraStage(host: HTMLElement, cells: HTMLElement, state: () => StageState): () => void {
  let release = () => {}
  const instance = new p5(p => {
    p.setup = () => { release = setupCanvas(p, host).release; p.frameRate(60); p.describe('Small musical mechanisms. Use the numbered step buttons to arrange and play them.') }
    p.draw = () => {
      p.clear()
      const s = state(), cycle = s.take.slots.length * STEP, origin = host.getBoundingClientRect()
      const buttons = Array.from(cells.querySelectorAll<HTMLElement>('.step'))
      for (let i = 0; i < s.take.slots.length; i++) {
        const note = s.take.slots[i], button = buttons[i]
        if (!note || note.kind === 'rest' || !button) continue
        const rect = button.getBoundingClientRect()
        const view = { x: rect.left - origin.left + 6, y: rect.top - origin.top + 28, w: rect.width - 12, h: rect.height - 61 }
        const inst = instruments[note.kind]
        let local = -1
        if (s.touched) local = ((s.time - i * STEP + inst.lead) % cycle + cycle) % cycle
        if (s.running && s.time < i * STEP - inst.lead && s.time < cycle - inst.lead) local = -1
        if (s.preview?.slot === i) {
          const elapsed = (performance.now() - s.preview.at) / 1000
          local = s.preview.local + elapsed
        }
        const here = inst.show.at(local)
        const scale = Math.min(view.w / inst.frame.w, view.h / inst.frame.h) * .88
        drawWorld(p, inst.show, local, here, inst.frame, scale, view, false)
        // A modest pitch tally, part of the printed instrument label.
        p.push(); p.stroke('#303a35'); p.strokeWeight(1.5)
        const x = view.x + view.w - 7, y = view.y + 10
        for (let j = 0; j <= note.pitch; j++) p.line(x - j * 4, y, x - j * 4, y + 4)
        p.pop()
      }
      p.frameRate(s.running || s.preview ? 60 : 12)
    }
  }, host)
  host.style.background = PAPER
  return () => { release(); instance.remove() }
}
