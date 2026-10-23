/** Blob URLs outlive the click briefly for mobile Safari, then are always released. */
export function fileExporter() {
  const resources = new Map<string, number>();
  let disposed = false;
  function download(json: string, filename: string): void {
    if (disposed) return;
    const url = URL.createObjectURL(new Blob([json], {type: 'application/json;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.hidden = true;
    document.body.append(link);
    try { link.click(); }
    finally {
      link.remove();
      resources.set(url, window.setTimeout(() => { URL.revokeObjectURL(url); resources.delete(url); }, 60_000));
    }
  }
  return {
    async export(json: string, filename: string): Promise<'shared' | 'download' | 'cancelled' | 'fallback'> {
      if (disposed) return 'cancelled';
      const file = new File([json], filename, {type: 'application/json'});
      let shareable = false;
      try { shareable = !!navigator.share && !!navigator.canShare?.({files: [file]}); } catch { /* download fallback */ }
      if (shareable) {
        try { await navigator.share({files: [file], title: 'Prairie de lapins'}); return 'shared'; }
        catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
          // Another explicit click is needed if the sharing operation used up activation.
          return 'fallback';
        }
      }
      download(json, filename); return 'download';
    },
    download,
    dispose() {
      disposed = true;
      for (const [url, timer] of resources) { window.clearTimeout(timer); URL.revokeObjectURL(url); }
      resources.clear();
    },
  };
}
