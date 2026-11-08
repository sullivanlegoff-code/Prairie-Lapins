import twins from '../config/webpTwins.json';

/**
 * Light WebP twins of the PNG pictures (audit before the Christmas update, 8 November 2026; scripts/make-webp-twins.mjs): the
 * meadow, the menus and the pages load a picture's twin, about five times lighter, instead of its PNG. Only pictures listed in
 * `webpTwins.json` have one; any other URL is left as it is. The PNG files stay in place as the source and the fallback.
 */
const TWINS: ReadonlySet<string> = new Set(twins as string[]);

/** `url`: under the site's base (`/Prairie-Lapins/assets/...`), or relative to it (`assets/...`, as Phaser resolves it). */
export function preferWebp(url: string, base = import.meta.env.BASE_URL): string {
  if (!url.endsWith('.png')) return url;
  const path = url.startsWith(base) ? url.slice(base.length) : /^([a-z][a-z0-9+.-]*:|\/)/i.test(url) ? null : url;
  return path !== null && TWINS.has(path) ? url.slice(0, -4) + '.webp' : url;
}

let installed = false, imagesInstalled = false;
/**
 * Every image file any scene queues (`load.image`, the picture of `load.atlas`...) asks for its twin. Phaser gives each loader
 * its own `image` and `atlas` functions, but they all hand their files to `LoaderPlugin.prototype.addFile`, patched here once,
 * before the game starts (`Phaser.Loader.LoaderPlugin.prototype` is passed in so that this file does not load Phaser).
 */
export function installWebpTwins(loaderPrototype: object): void {
  if (installed) return;
  installed = true;
  const loader = loaderPrototype as {addFile: (file: unknown) => unknown};
  const original = loader.addFile;
  loader.addFile = function (this: unknown, file: unknown) {
    for (const f of (Array.isArray(file) ? file : [file]) as {type?: unknown; url?: unknown}[])
      if (f && f.type === 'image' && typeof f.url === 'string') f.url = preferWebp(f.url);
    return original.call(this, file);
  };
}

/**
 * Every picture a page or menu sets with `image.src = ...` (`new Image()`, `document.createElement('img')`) asks for its twin
 * too. Called once, before the game starts, with `HTMLImageElement.prototype`. Pictures written in HTML text use `preferWebp`.
 */
export function installImageTwins(imagePrototype: object): void {
  if (imagesInstalled) return;
  const descriptor = Object.getOwnPropertyDescriptor(imagePrototype, 'src');
  if (!descriptor?.set || !descriptor.get) return;
  imagesInstalled = true;
  const {get, set} = descriptor;
  Object.defineProperty(imagePrototype, 'src', {...descriptor, get, set(this: HTMLImageElement, value: string) { set.call(this, typeof value === 'string' ? preferWebp(value) : value); }});
}
