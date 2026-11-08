// Background music files in public/assets/audio/music/ (see docs/audio.md).
/**
 * Owner's rule (8 November 2026): the seven Christmas tracks are the game's theme, heard everywhere except in the kitchen and
 * during Dadi's music (the former « Music chill (dragon vibe) » theme is deleted for good). A track drawn at random starts at
 * its beginning when the game is launched; the others follow at random, never the same one twice in a row.
 */
export const MEADOW_TRACKS = ['noel-1.mp3', 'noel-2.mp3', 'noel-3.mp3', 'noel-4.mp3', 'noel-5.mp3', 'noel-6.mp3', 'noel-7.mp3'] as const;
/** The three « Indian vibe » tracks play only while the kitchen is open. */
export const KITCHEN_TRACKS = ['indian-vibe-1.mp3', 'indian-vibe-2.mp3', 'indian-vibe-3.mp3'] as const;
/** Owner's rule (31 October 2026): Dadi's own music, cut to start at 1:38, played once to its end when Dadi is
 * welcomed, put in the nest or has its sheet opened; then the meadow music resumes. */
export const RABBIT_THEMES = {dadi: 'dadi.mp3'} as const;
