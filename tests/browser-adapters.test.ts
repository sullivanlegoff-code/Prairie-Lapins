import {afterEach, describe, expect, it, vi} from 'vitest';
import {browserStorage} from '../src/persistence/browserStorage';
import {fileExporter} from '../src/display/fileExport';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('browser storage adapter', () => {
  it('filters external events by save key and storage area, and releases its listener', () => {
    const target = Object.assign(new EventTarget(), {localStorage: {}}); vi.stubGlobal('window', target);
    const notify = vi.fn(), stop = browserStorage().onChange!('save', notify);
    const changed = (key: string | null, area = target.localStorage) => target.dispatchEvent(Object.assign(new Event('storage'), {key, storageArea: area}));
    changed('unrelated'); changed('save', {}); expect(notify).not.toHaveBeenCalled();
    changed('save'); changed(null); expect(notify).toHaveBeenCalledTimes(2);
    stop(); changed('save'); expect(notify).toHaveBeenCalledTimes(2);
  });

  it('does not read the localStorage property until an operation is attempted', () => {
    const target = {}; Object.defineProperty(target, 'localStorage', {get() { throw new Error('SecurityError'); }});
    vi.stubGlobal('window', target);
    const storage = browserStorage();
    expect(() => storage.getItem('save')).toThrow('SecurityError');
    expect(() => storage.setItem('save', '{}')).toThrow('SecurityError');
  });
});

function exportEnvironment() {
  vi.useFakeTimers();
  const click = vi.fn(), remove = vi.fn(), append = vi.fn();
  const link = {href: '', download: '', hidden: false, click, remove};
  const createObjectURL = vi.fn(() => 'blob:test'), revokeObjectURL = vi.fn();
  vi.stubGlobal('window', {setTimeout, clearTimeout});
  vi.stubGlobal('document', {createElement: () => link, body: {append}});
  vi.stubGlobal('URL', {createObjectURL, revokeObjectURL});
  vi.stubGlobal('navigator', {});
  return {link, click, remove, append, createObjectURL, revokeObjectURL};
}

describe('backup file export', () => {
  it('starts a JSON download and releases its temporary resources after a delay', async () => {
    const environment = exportEnvironment(); const exporter = fileExporter();
    expect(await exporter.export('{"version":1}', 'prairie-2026-10-05.json')).toBe('download');
    expect(environment.link.download).toBe('prairie-2026-10-05.json'); expect(environment.link.href).toBe('blob:test');
    expect(environment.click).toHaveBeenCalledOnce(); expect(environment.remove).toHaveBeenCalledOnce();
    expect(environment.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000); expect(environment.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    exporter.dispose(); expect(environment.revokeObjectURL).toHaveBeenCalledOnce();
  });
  it('releases URLs and timers when the panel is disposed', async () => {
    const environment = exportEnvironment(); const exporter = fileExporter();
    await exporter.export('{}', 'backup.json'); exporter.dispose();
    expect(environment.revokeObjectURL).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
    expect(await exporter.export('{}', 'backup.json')).toBe('cancelled');
  });
  it('uses native file sharing when supported, without creating a Blob URL', async () => {
    const environment = exportEnvironment(); const share = vi.fn(async (_data: {files: File[]; title: string}) => {});
    vi.stubGlobal('navigator', {canShare: () => true, share});
    const exporter = fileExporter(); expect(await exporter.export('{}', 'backup.json')).toBe('shared');
    const file = share.mock.calls[0]?.[0] as unknown as {files: File[]};
    expect(file.files[0].name).toBe('backup.json'); expect(await file.files[0].text()).toBe('{}');
    expect(environment.createObjectURL).not.toHaveBeenCalled(); exporter.dispose();
  });
  it('does not download after the native share sheet is cancelled', async () => {
    const environment = exportEnvironment();
    vi.stubGlobal('navigator', {canShare: () => true, share: async () => { throw new DOMException('cancelled', 'AbortError'); }});
    const exporter = fileExporter(); expect(await exporter.export('{}', 'backup.json')).toBe('cancelled');
    expect(environment.click).not.toHaveBeenCalled(); exporter.dispose();
  });
  it('offers an explicit download fallback if native sharing fails', async () => {
    const environment = exportEnvironment();
    vi.stubGlobal('navigator', {canShare: () => true, share: async () => { throw new Error('share unavailable'); }});
    const exporter = fileExporter(); expect(await exporter.export('{}', 'backup.json')).toBe('fallback');
    expect(environment.click).not.toHaveBeenCalled(); exporter.download('{}', 'backup.json');
    expect(environment.click).toHaveBeenCalledOnce(); exporter.dispose();
  });
});
