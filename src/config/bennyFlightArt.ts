import flight from './bennyFlightFrames.json';
import {BENNY_EFFECTS} from './bennyArt';
import type {FlightView} from '../display/bennyFlight';

/**
 * Benny's flight over the island (paintings approved by the owner on 1 November 2026): bodies without wings and wings apart, laid
 * at the shoulder. One WebP atlas made by scripts/prepare-benny-flight.mjs: every body keeps its full square (body centre at its
 * centre) and every wing its own (shoulder at its centre), so the rig only places each frame's centre.
 */
export const BENNY_FLIGHT = flight as unknown as {
  scale: number; body: {source: number; size: number}; wing: {source: number; size: number}; beats: number;
  atlas: {width: number; height: number; bytes: number; sha256: string};
  views: Record<FlightView, {bodies: string[]; wings: BennyWing[]}>;
  transition: {shoulder: [number, number]; appear: string; disappear: string};
  frames: string[];
};
/** One wing layer: its series (frames `<series>-1..8`), its shoulder in the 900 body frame, drawn behind or in front of the body,
 * darkened (the far wing) or mirrored (the face's and back's right wings are mirrors of the left ones). */
export interface BennyWing {series: string; shoulder: [number, number]; layer: 'behind' | 'front'; darken: boolean; mirror: boolean}
export const BENNY_FLIGHT_ATLAS = {texture: 'benny-flight', url: `${import.meta.env.BASE_URL}assets/rabbits/benny/flight/benny-flight.webp`,
  atlas: `${import.meta.env.BASE_URL}assets/rabbits/benny/flight/benny-flight.json`} as const;
/** Width of the A1 master (assets-source/rabbits/benny/sprite.png) in source pixels: the flight bodies are painted at its scale. */
export const BENNY_MASTER_WIDTH = 466;
/** Multiply tint of the far wing: about 22 % darker, slightly violet (anchors.json). */
export const FAR_WING_TINT = 0xccc4dc;

/** The painted effects of her appearance reused in the meadow for her flight: sparkles, stardust, glow, burst and feathers. */
const effect = (name: string, url: string) => ({texture: `benny-fx-${name}`, url});
export const BENNY_FLIGHT_EFFECTS = {
  star: effect('star', BENNY_EFFECTS.star.url), starFive: effect('star-five', BENNY_EFFECTS.starFive.url), twinkle: effect('twinkle', BENNY_EFFECTS.twinkle.url),
  stardust: effect('stardust', BENNY_EFFECTS.stardust.url), glow: effect('glow', BENNY_EFFECTS.glow.url), burst: effect('burst', BENNY_EFFECTS.burst.url),
  feathers: BENNY_EFFECTS.feather.map((art, k) => effect(`feather-${k + 1}`, art.url)),
} as const;
/** What a meadow with Benny loads for her flight: the atlas and the effects, once. */
export const bennyFlightArt = (): {texture: string; url: string; atlas?: string}[] => {
  const {feathers, ...single} = BENNY_FLIGHT_EFFECTS;
  return [BENNY_FLIGHT_ATLAS, ...Object.values(single), ...feathers];
};
/** Window event of the laboratory's "Benny : pouvoir (animation seule)": plays her power's flight without touching the game. */
export const BENNY_FLIGHT_TEST_EVENT = 'prairie-benny-flight-test';
