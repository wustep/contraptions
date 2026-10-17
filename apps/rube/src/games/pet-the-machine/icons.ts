import type { Resident, Toy } from './model'

const svg = (content: string, viewBox = '0 0 48 48') => `<svg viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`
export const icons = {
  book: svg('<path d="M24 12c-6-4-13-4-19-2v29c6-2 13-2 19 2 6-4 13-4 19-2V10c-6-2-13-2-19 2Zm0 0v29"/><path d="m11 17 7 1m-7 6 7 1m12-7 7-1m-7 8 7-1"/>'),
  sound: svg('<path d="m9 19 8 0 10-8v26l-10-8H9Zm24-2c5 4 5 10 0 14m5-19c9 7 9 17 0 24"/>'),
  quiet: svg('<path d="m9 19 8 0 10-8v26l-10-8H9Zm24 0 10 10m0-10L33 29"/>'),
  pat: svg('<path d="M15 27V14a3 3 0 0 1 6 0v9-13a3 3 0 0 1 6 0v13-10a3 3 0 0 1 6 0v12-6a3 3 0 0 1 6 0v11c0 10-8 14-15 11-6-3-10-9-14-14-3-4 1-7 4-4l4 5"/>'),
  arrow: svg('<path d="M8 24h31M29 14l10 10-10 10"/>'),
  pencil: svg('<path d="m12 29-2 9 9-2 22-22-7-7-22 22Zm17-17 7 7M12 29l7 7"/>'),
  camera: svg('<path d="M5 15h10l4-6h10l4 6h10v25H5Z"/><circle cx="24" cy="27" r="8"/><path d="M35 20h3"/>'),
  leaf: svg('<path d="M12 37C1 15 20 8 39 8c1 19-7 32-26 25M8 41l21-23m-10 9V16m0 11h12"/>'),
  replay: svg('<path d="M10 17a16 16 0 1 1-1 16M10 7v11h11"/><path d="m21 18 10 7-10 7Z"/>'),
  close: svg('<path d="m13 13 22 22m0-22L13 35"/>'),
}

export const toyIcon = (toy: Toy): string => ({
  ball: svg('<circle cx="24" cy="24" r="15" fill="#c77851"/><path d="M14 16c8 4 9 16 19 16M23 10c9 4 12 11 12 18"/><circle cx="17" cy="25" r="2" fill="currentColor" stroke="none"/>'),
  bell: svg('<circle cx="24" cy="25" r="14" fill="#d6ae55"/><path d="M19 12V9a5 5 0 0 1 10 0v3M14 27h20"/><circle cx="15" cy="27" r="2" fill="currentColor"/><circle cx="33" cy="27" r="2" fill="currentColor"/>'),
  pompom: svg('<path d="m24 7 4 5 7-1 1 7 6 4-4 6 1 7-7 1-4 6-6-4-7 1-1-7-6-4 4-6-1-7 7-1Z" fill="#a1a7ba"/><path d="m17 17 14 14m-14 0 14-14m-7-4v23M13 24h23"/>'),
})[toy]

export const portrait = (id: Resident): string => ({
  snail: svg('<path d="M5 37h35q9-2 5-12l-6 3-3 8" fill="#e5d4bd"/><circle cx="22" cy="27" r="14" fill="#bd7352"/><path d="M29 36c-21-2-20-22-8-20 12 2 11 17 3 15-6-1-5-8 0-7M40 27l1-12m4 12 2-10"/><circle cx="41" cy="14" r="2" fill="#f6f3e9"/><circle cx="47" cy="16" r="2" fill="#f6f3e9"/>', '0 0 54 48'),
  frog: svg('<path d="M5 38h40M9 34c-5-13 1-21 9-17 5-8 21-5 24 4l-2 12-12 3Z" fill="#789575"/><path d="M30 24h13M11 27l11 9H9"/><circle cx="32" cy="15" r="7" fill="#f6f3e9"/><circle cx="34" cy="15" r="2.5" fill="#303b34"/><path d="M22 33h18"/>'),
  fern: svg('<path d="M16 34h19l-3 11H19ZM24 34V12" fill="#bd7352"/><path d="M25 24 7 12m18 7L38 6"/><path d="M10 14C1 10 4 5 10 8Zm6 4c-9-1-7-7-1-5Zm5 3c-8 2-8-4-3-6Zm9-7c0-9 5-11 7-5Zm-4 4c-2-7 3-11 6-7Zm8-8c3 1 8-2 7-6Z" fill="#789575"/>'),
})[id]
