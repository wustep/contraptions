import type { LiveEngine, LiveMusic } from '../../../registry'
import { defineEngine, type Engine, type Strike } from './engine'
import { LIVE_GAIN, room } from './render'

/**
 * The instrument played live: the engine (`engine.ts`) in an audio thread, struck by the simulation's contacts as the
 * show reaches each one.
 *
 * The page tells the thread the show's notes once, and then only where the show is: from which moment, at which of
 * its own sample times, at what speed (`LiveEngine.play`). The thread strikes each note on the sample it falls on and
 * runs whatever is ringing, 128 samples at a time, through the room and the limiter (`render.ts`) to the speakers.
 * Nothing is rendered ahead: a part sounds because the playhead has just reached the moment a ball touched it.
 *
 * The thread runs the engine's own text: `defineEngine` refers to nothing outside itself, so its source is the
 * worklet's source (with `processor` round it), loaded from a blob.
 */

/** The worklet: the engine in an `AudioWorkletProcessor`, told notes and where the show is by messages. */
function processor(define: typeof defineEngine): void {
  const scope = globalThis as unknown as {
    AudioWorkletProcessor: new () => { readonly port: MessagePort }
    registerProcessor(name: string, ctor: unknown): void
    sampleRate: number
    currentFrame: number
  }
  const { makeEngine } = define()
  class Live extends scope.AudioWorkletProcessor {
    declare engine: Engine
    constructor() {
      super()
      this.engine = makeEngine(scope.sampleRate)
      this.port.onmessage = (e: MessageEvent) => {
        const m = e.data
        if (m.type === 'notes') this.engine.load(m.notes)
        else if (m.type === 'play') this.engine.go(m.from, Math.round(m.when * scope.sampleRate), m.speed, m.fresh)
        else if (m.type === 'stop') this.engine.stop(scope.currentFrame)
      }
    }
    process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
      const out = outputs[0]
      const L = out[0]
      const R = out[1] ?? out[0]
      L.fill(0)
      if (R !== L) R.fill(0)
      this.engine.process(L, R, 0, L.length, scope.currentFrame)
      return true
    }
  }
  scope.registerProcessor('orchestrion-live', Live)
}

let source: string | null = null
/** The worklet's module, once a page. */
const moduleUrl = (): string =>
  (source ??= URL.createObjectURL(new Blob([`(${processor.toString()})(${defineEngine.toString()})`], { type: 'text/javascript' })))
/** Which contexts have the module. */
const loaded = new WeakMap<BaseAudioContext, Promise<void>>()

/** Whether this page can play the instrument live. */
export const canPlayLive = (): boolean => typeof AudioWorkletNode === 'function' && typeof Blob === 'function'

/** The show's notes as live music, with the same notes rendered to a file (`render`) for what needs one. */
export function liveMusic(notes: Strike[], render: () => Promise<string>): LiveMusic {
  let made: Promise<string> | null = null
  return {
    async start(ctx) {
      if (!canPlayLive() || !ctx.audioWorklet) throw new Error('This browser has no AudioWorklet to play the instrument live.')
      let ready = loaded.get(ctx)
      if (!ready) {
        ready = ctx.audioWorklet.addModule(moduleUrl())
        loaded.set(ctx, ready)
        ready.catch(() => loaded.delete(ctx))
      }
      await ready
      const node = new AudioWorkletNode(ctx, 'orchestrion-live', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] })
      node.port.postMessage({ type: 'notes', notes })
      const output = ctx.createGain()
      /**
       * The room is taken down and put up again at every fresh start, so a pause, or a jump to another moment, lets
       * the hall's tail go with what was sounding (over a few hundredths of a second) instead of ringing on into the
       * silence or under the new moment. A change of speed keeps it.
       */
      let desk: ReturnType<typeof room> | null = null
      const letGo = () => {
        const old = desk
        desk = null
        if (!old) return
        old.output.gain.setTargetAtTime(0, ctx.currentTime, 0.02)
        setTimeout(() => {
          node.disconnect(old.input)
          old.dispose()
        }, 150)
      }
      const engine: LiveEngine = {
        output,
        play(from, when, speed, fresh) {
          if (fresh || !desk) {
            letGo()
            desk = room(ctx, LIVE_GAIN)
            node.connect(desk.input)
            desk.output.connect(output)
          }
          node.port.postMessage({ type: 'play', from, when, speed, fresh })
        },
        stop() {
          node.port.postMessage({ type: 'stop' })
          letGo()
        },
        dispose() {
          node.port.postMessage({ type: 'stop' })
          letGo()
          node.port.close()
          setTimeout(() => node.disconnect(), 200)
          output.disconnect()
        },
      }
      return engine
    },
    render() {
      made ??= render().catch((err) => {
        made = null
        throw err
      })
      return made
    },
  }
}
