import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const folder = 'out/premiere-video-parts'
const score = JSON.parse(readFileSync('apps/rube/src/timed/premiere-arabesque/score.generated.json', 'utf8'))
const files = readdirSync(folder).filter(name => /^part-\d+\.json$/.test(name)).sort()
const chunks = []
let expectedFrame = 0
for (const file of files) {
  const video = JSON.parse(readFileSync(`${folder}/${file}`, 'utf8'))
  if (video.revision !== score.revision || video.startFrame !== expectedFrame || video.totalFrames !== Math.ceil(score.duration * 60)
    || video.fps !== 60 || video.audioOffset !== score.audioOffset || video.duration !== score.duration
    || video.width !== 1600 || video.height !== 900 || video.frames <= 0) throw new Error(`Invalid or stale export part ${file}`)
  chunks.push(Buffer.from(video.h264, 'base64'))
  expectedFrame += video.frames
}
if (expectedFrame !== Math.ceil(score.duration * 60)) throw new Error(`Missing frames: ${expectedFrame}`)
writeFileSync('out/premiere-video.h264', Buffer.concat(chunks))
const output = 'docs/promo/premiere-arabesque-full-preview.mp4'
execFileSync('ffmpeg', [
  '-nostdin', '-hide_banner', '-loglevel', 'error', '-y',
  '-fflags', '+genpts', '-r', '60', '-f', 'h264', '-i', 'out/premiere-video.h264',
  '-ss', String(score.audioOffset), '-i', 'docs/promo/premiere-arabesque-prati.mp3',
  '-map', '0:v:0', '-map', '1:a:0', '-t', String(score.duration),
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
  '-metadata', 'title=Première Arabesque: the complete Contraptions journey',
  '-metadata', 'artist=Claude Debussy; piano by Patrizia Prati',
  '-metadata', 'comment=CC BY-SA 4.0. Recording: Patrizia Prati, Museo del Romanticismo, Madrid, 2016-05-17, via Wikimedia Commons. Leading 2.38 seconds removed. Contraptions visuals added. Attribution and source: docs/promo/PREMIERE_ARABESQUE_ATTRIBUTION.txt',
  output,
], { stdio: 'inherit' })
console.log(`Wrote ${output}, ${expectedFrame} frames at 60 fps, with the approved Première recording.`)
