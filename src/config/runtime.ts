/** Compile-time flag: Vite's normal production build removes the test module. */
export const LABORATORY_BUILD = import.meta.env.MODE === 'laboratory';
export const DECORATIONS_PREVIEW_BUILD = import.meta.env.MODE === 'decorations-preview';

/** Future account/cloud adapters must receive this policy before initialization. */
export function sessionPolicy(test: boolean) {
  return Object.freeze({kind: test ? 'laboratory' : 'normal', onlineServicesAllowed: !test});
}
