/** Small ink drawings, shared by buttons, instructions, and the podium. */
export function icon(name: string, extra = ''): string {
  const drawings: Record<string, string> = {
    snail:
      '<path d="M5 27h24c3 0 5-3 5-6v-3M29 19l-2-6m6 6 3-6"/><circle cx="17" cy="19" r="9" fill="currentColor" fill-opacity=".17"/><path d="M19 23c-8 1-9-9-3-10 6-1 8 7 3 7-3 0-3-3-1-3"/><circle cx="27" cy="12" r="1.5"/><circle cx="36" cy="12" r="1.5"/>',
    dunk: '<path d="M10 16v18h22V16M8 16h26M12 24q5-4 10 0t10 0M15 6h14M22 7v8"/><circle cx="22" cy="12" r="4" fill="currentColor"/><path d="m5 22-3-3m34 3 3-3"/>',
    shield: '<path d="M20 4 34 10v10c0 9-14 16-14 16S6 29 6 20V10Z" fill="currentColor" fill-opacity=".12"/><path d="m13 20 5 5 10-11"/>',
    boost: '<path d="m23 3-15 21h12l-2 13 15-22H21Z" fill="currentColor" fill-opacity=".16"/><path d="M3 13h6m-5 6h3m22 12h7"/>',
    clean:
      '<path d="M8 26c0-6 5-6 5-6V9a3 3 0 0 1 6 0v10-14a3 3 0 0 1 6 0v14-11a3 3 0 0 1 6 0v13-6a3 3 0 0 1 6 0v9c0 9-6 13-13 13-6 0-9-5-16-11Z"/>',
    rocket:
      '<path d="m12 27 4-13L30 5l4 16-9 10Z" fill="currentColor" fill-opacity=".14"/><circle cx="26" cy="16" r="4"/><path d="m14 21-7 1-3 9 10-1m15-6 2 10-9 3-1-8m-8 3-6 5m3-9-5 6"/>',
    covered:
      '<path d="M5 16 20 5l15 11M8 15v19m24-19v19M5 34h30M12 27l16-10"/><circle cx="12" cy="27" r="3"/><circle cx="28" cy="17" r="3"/><path d="m15 31 16-10"/>',
    trophy:
      '<path d="M11 6h18v11c0 7-4 11-9 11s-9-4-9-11ZM11 10H5v7c0 5 4 7 9 7m15-14h6v7c0 5-4 7-9 7M20 28v6m-8 3h16" fill="currentColor" fill-opacity=".12"/>',
    flag: '<path d="M9 36V5m0 1h23v17H9"/><path d="M10 7h7v7h-7m7 0h7v8h-7m7-15h7v7h-7" fill="currentColor" stroke="none"/>',
    sound: '<path d="m6 16 7 0 9-8v24l-9-8H6ZM28 13q8 7 0 14m5-19q12 12 0 24"/>',
    mute: '<path d="m6 16 7 0 9-8v24l-9-8H6Zm23 0 8 8m0-8-8 8"/>',
    arrow: '<path d="M6 20h27m-9-9 9 9-9 9"/>',
    replay: '<path d="M9 14a13 13 0 1 1-1 12M9 5v10H0"/>',
    lock: '<rect x="9" y="17" width="22" height="18" rx="3"/><path d="M13 17V11a7 7 0 0 1 14 0v6M20 24v4"/>',
    mark: '<path d="m4 26 32 7M20 30l-7 8h14Z"/><circle cx="13" cy="16" r="8" fill="currentColor" fill-opacity=".2"/>',
  }
  return `<svg class="icon ${extra}" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${drawings[name] ?? drawings.mark}</svg>`
}
