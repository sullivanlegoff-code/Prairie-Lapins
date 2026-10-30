// Background music files in public/assets/audio/music/ (see docs/audio.md).
/** Owner's rule (30 October 2026): « Music chill (dragon vibe) » is the only music of the game, except in the kitchen. */
export const MEADOW_TRACKS = ['dragon-chill.mp3'] as const;
/** The three « Indian vibe » tracks play only while the kitchen is open. */
export const KITCHEN_TRACKS = ['indian-vibe-1.mp3', 'indian-vibe-2.mp3', 'indian-vibe-3.mp3'] as const;
/** The meadow music is cut into 10 equal parts and starts at the beginning of one of them, at random. */
export const MEADOW_START_SEGMENTS = 10;
/** Owner's rule (31 October 2026): Dadi's own music, cut to start at 1:38, played once to its end when Dadi is
 * welcomed, put in the nest or has its sheet opened; then the meadow music resumes. */
export const RABBIT_THEMES = {dadi: 'dadi.mp3'} as const;
