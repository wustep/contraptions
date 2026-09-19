// Run as a browser evaluation on the local Première preview page and save the
// returned JSON to out/premiere-video-parts/part-NN.json. See docs/promo/PREMIERE_PREVIEW.md.
async () => {
  const canvas = document.querySelector('#stage canvas')
  const chunks = []
  let failure
  const fps = 60, duration = window.premierePreview.state().duration
  const totalFrames = Math.ceil(duration * fps)
  const startFrame = window.premiereExportRange?.startFrame ?? 0
  const frames = Math.min(window.premiereExportRange?.frames ?? totalFrames, totalFrames - startFrame)
  if (!Number.isInteger(startFrame) || startFrame < 0 || !Number.isInteger(frames) || frames <= 0) throw new Error('Invalid frame range')
  if (window.premierePreview.state().revision !== 4) throw new Error('Export requires the complete Première revision')
  const config = { codec: 'avc1.420032', width: 1600, height: 900, bitrate: 8000000, framerate: fps, avc: { format: 'annexb' } }
  if (!(await VideoEncoder.isConfigSupported(config)).supported) throw new Error('This browser does not support H.264 export')
  const encoder = new VideoEncoder({
    output: (chunk) => {
      const bytes = new Uint8Array(chunk.byteLength)
      chunk.copyTo(bytes)
      chunks.push(bytes)
    },
    error: (error) => { failure = error },
  })
  encoder.configure(config)
  try {
    for (let frame = 0; frame < frames; frame++) {
      window.premierePreview.render((startFrame + frame) / fps)
      const videoFrame = new VideoFrame(canvas, { timestamp: Math.round((startFrame + frame) * 1000000 / fps), duration: Math.round(1000000 / fps) })
      encoder.encode(videoFrame, { keyFrame: frame === 0 || (startFrame + frame) % (2 * fps) === 0 })
      videoFrame.close()
      if (encoder.encodeQueueSize > 8) await encoder.flush()
      if (failure) throw failure
    }
    await encoder.flush()
    if (failure) throw failure
    const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
    let binary = ''
    for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768))
    return { revision: 4, startFrame, frames, totalFrames, duration, fps, width: 1600, height: 900, audioOffset: 2.38, h264: btoa(binary) }
  } finally {
    encoder.close()
    window.premierePreview.render(0)
  }
}
