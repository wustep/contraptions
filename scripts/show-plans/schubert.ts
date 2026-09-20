/** Recording cues, in seconds after the 0.70s lead-in. Never mechanism clocks. */
export const schubert = {
  id: 'schubert-impromptu/take-a',
  title: 'Schubert · Impromptu No. 2',
  performer: 'Chiara Bertoglio',
  audioOffset: 0.70,
  duration: 261.116,
  // Phrase changes only adjust framing; the four maps continue through them.
  phrases: [
    [20.15, 'Running scales', 5.6],
    [40.56, 'The answering line', 5.4],
    [61.28, 'A darker swell', 5.8],
    [73.97, 'Accents gather', 5.2],
    [93.90, 'Branches and clipped chords', 5.4],
    [114.57, 'The emphatic answer', 5.2],
    [135.50, 'Renewed motion', 5.6],
    [156.17, 'Crest and falling away', 6.2],
    [176.00, 'The scales return', 5.8],
    [191.42, 'Across the water', 5.4],
    [208.83, 'The quieter answer', 6.0],
    [216.28, 'Gathering current', 5.4],
    [229.27, 'The closing drive', 5.2],
    [241.69, 'Chords in the dark', 5.6],
    [256.31, 'The final ascent', 5.2],
    [261.116, 'Last chord and resonance', 6.2],
  ] satisfies [number, string, number][],
  cues: [
    ['cannon', 13.76], ['hammer', 32.97], ['bell', 59.20],
    ['spade', 86.22], ['sprinkler', 93.90], ['frog', 124.16], ['croquet', 143.07],
    ['dolphin', 164.06], ['oyster', 191.42], ['blowhole', 208.83],
    ['striker', 229.27], ['hockey', 241.69], ['ticket', 256.31],
  ] satisfies [string, number][],
}
