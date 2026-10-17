import { GOLD, GREEN, INK, PAPER, RED } from './performance'
import { OPTIONS, recipient, sender, type Recipe } from './recipe'

/** A real personalized keepsake, independent of the stock booth's miniature strip. */
export async function saveSouvenir(recipe: Recipe): Promise<void> {
  const canvas = document.createElement('canvas')
  canvas.width = 1200; canvas.height = 900
  const c = canvas.getContext('2d')!
  c.fillStyle = PAPER; c.fillRect(0, 0, 1200, 900)
  c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(40, 40, 1120, 820)
  c.fillStyle = INK; c.textAlign = 'left'; c.font = '16px monospace'; c.fillText('CONTRAPTIONS / EXTREMELY NORMAL GIFTS', 85, 101)
  c.textAlign = 'right'; c.fillText(`DELIVERY ${String(recipe.hop + 1).padStart(3, '0')}`, 1115, 101)
  c.beginPath(); c.moveTo(85, 130); c.lineTo(1115, 130); c.stroke()
  c.textAlign = 'center'; c.fillStyle = GREEN; c.font = '20px monospace'; c.fillText(`FOR ${recipient(recipe).toUpperCase()}`, 600, 195)
  const words = recipe.message.split(/\s+/)
  const lines: string[] = []
  c.font = 'bold 57px Georgia, serif'
  let line = ''
  for (const word of words) {
    if (c.measureText(`${line} ${word}`).width > 950 && line) { lines.push(line); line = '' }
    // Long unbroken words also fit within the printable area.
    for (const char of word) {
      if (c.measureText(line + char).width > 950) { lines.push(line); line = '' }
      line += char
    }
    line += ' '
  }
  if (line) lines.push(line.trim())
  c.fillStyle = INK
  lines.forEach((text, i) => c.fillText(text.trim(), 600, 300 + i * 72))
  const portraitY = 570
  for (let i = 0; i < 3; i++) {
    const x = 430 + i * 170
    c.fillStyle = i === 1 ? '#e5eade' : '#ebe5d6'; c.fillRect(x - 65, portraitY - 70, 130, 135)
    c.fillStyle = i === 0 ? RED : recipe.picks[1] === 0 ? '#ffffff' : recipe.picks[1] === 2 ? GOLD : GREEN
    c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.arc(x, portraitY - 5, 32, 0, Math.PI * 2); c.fill(); c.stroke()
    c.fillStyle = INK; c.beginPath(); c.arc(x + 9, portraitY - 13 + i * 8, 4, 0, Math.PI * 2); c.fill()
    c.font = '12px monospace'; c.fillText(['BEFORE', 'DURING', 'STILL YOU'][i], x, portraitY + 48)
  }
  c.fillStyle = INK; c.font = '23px Georgia, serif'; c.fillText(`with unnecessary effort, ${sender(recipe)}`, 600, 720)
  c.font = '14px monospace'; c.fillStyle = GREEN
  c.fillText(recipe.picks.map((pick, i) => OPTIONS[i][pick].name.toUpperCase()).join('  →  '), 600, 775)
  c.fillStyle = INK; c.font = '13px monospace'; c.fillText('ONE TINY COMPLIMENT. ENTIRELY TOO MUCH MACHINERY.', 600, 820)
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Could not create the keepsake')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'an-extremely-normal-gift.png'; a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 10000)
}
