/** Shared production pieces; generated sources and derivation are documented in docs/island-underside.md. */
export const ISLAND_ART = ['cliff', 'foundation', 'chunk-wide', 'chunk-round', 'chunk-deep', 'islet-wide', 'islet-small'].map(name => ({
  name, texture: `island-underside:${name}`, url: `${import.meta.env.BASE_URL}assets/island/${name}.png`,
}));
