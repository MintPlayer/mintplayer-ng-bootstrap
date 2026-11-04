import { applyBag, el, hostCore } from '../../_conformance/host-core';
import { connectFileUpload, fileUploadCore, formatBytes, toUploads, type FileUpload, type FileUploadInputs, type FileUploadView } from './file-upload.core';

const file = (name: string, size = 10) => new File(['x'.repeat(size)], name);
/** A FileList stand-in: jsdom cannot build one from files. */
const list = (...files: (File | null)[]) => ({ length: files.length, item: (i: number) => files[i] }) as unknown as FileList;

/** jsdom has no DragEvent: an Event carrying a dataTransfer. */
const drag = (type: string, o: { files?: FileList; relatedTarget?: Node | null; transfer?: boolean } = {}) => {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'dataTransfer', { value: o.transfer === false ? null : { dropEffect: 'none', files: o.files } });
  Object.defineProperty(ev, 'relatedTarget', { value: o.relatedTarget ?? null });
  return ev;
};

const inputs = (o: Partial<FileUploadInputs> = {}): FileUploadInputs => ({
  files: [],
  name: null,
  accept: null,
  multiple: true,
  disabled: false,
  dropFilesCaption: 'Drop',
  browseFilesCaption: 'Browse',
  label: 'Upload',
  inputLabel: 'Files',
  fileAddedAnnouncement: (n) => `${n} added`,
  filesAddedAnnouncement: (c) => `${c} files added`,
  progressLabel: (n) => `Uploading ${n}`,
  formatSize: null,
  ...o,
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

function mount(o: Partial<FileUploadInputs> = {}) {
  const markup = ({ view }: { view: FileUploadView }, host: HTMLElement) => {
    applyBag(host, view.root);
    return [el('div', view.zone, el('input', view.input), el('span', view.caption, view.dropFilesCaption)), el('ul', view.list)];
  };
  const h = hostCore(fileUploadCore, inputs(o), { markup });
  h.attach();
  const zone = () => h.host.querySelector<HTMLElement>('.dropzone')!;
  const input = () => h.host.querySelector<HTMLInputElement>('input')!;
  const choose = (files: FileList) => {
    const field = input();
    Object.defineProperty(field, 'files', { value: files, configurable: true });
    field.dispatchEvent(new Event('change', { bubbles: true }));
    return field;
  };
  return { ...h, zone, input, choose };
}

const announced = () => document.querySelector('[data-mp-page-announcer="polite"]')?.textContent;

describe('file upload helpers', () => {
  it('formats sizes and numbers uploads on', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(1536, -1)).toBe('2 KB');
    expect(formatBytes(0.5)).toBe('0.5 Bytes');
    expect(toUploads(null, 0)).toEqual([]);
    expect(toUploads(list(file('a'), null), 3).map((u) => u.index)).toEqual([3]);
  });

  it('renders progress rows, clamped, with a consumer name and size formatter', () => {
    const uploads: FileUpload[] = [
      { file: file('a.txt', 100), progress: 150, index: 0 },
      { file: file('empty.txt', 0), progress: -5, index: 1 },
    ];
    const view = connectFileUpload(inputs({ formatSize: (b) => `${b}b`, disabled: true }), uploads, true, 'f', true, 'Mine');
    expect(view.zone).toMatchObject({ 'aria-label': 'Mine', 'data-dragging': '', 'data-disabled': '' });
    expect(view.browse['class']).toContain('disabled');
    expect(view.rows[0]).toMatchObject({ size: '100b', barStyle: { '--mp-file-upload-progress': '100%' } });
    expect(view.rows[0].progress['aria-valuenow']).toBe('100');
    expect(view.rows[1].barStyle['--mp-file-upload-progress']).toBe('0%');
  });
});

describe('fileUploadCore', () => {
  it('adds chosen files, announces them and clears an unnamed input', () => {
    const h = mount();
    const field = h.choose(list(file('a.txt')));
    expect(h.state().files.map((f) => f.file.name)).toEqual(['a.txt']);
    expect(h.events('filesDropped')).toHaveLength(1);
    expect(h.events('filesChange')[0]).toHaveLength(1);
    vi.advanceTimersByTime(100);
    expect(announced()).toBe('a.txt added');
    expect(field.value).toBe('');

    h.choose(list(file('b'), file('c')));
    expect(h.state().files.map((f) => f.index)).toEqual([0, 1, 2]);
    vi.advanceTimersByTime(100);
    expect(announced()).toBe('2 files added');
    h.choose(list());
    expect(h.events('filesChange')).toHaveLength(2);
  });

  it('keeps a named input’s files for the form, and ignores other inputs', () => {
    const h = mount({ name: 'docs' });
    const clear = vi.fn();
    const field = h.input();
    Object.defineProperty(field, 'value', { set: clear, get: () => 'C:\\fakepath\\a', configurable: true });
    h.choose(list(file('a')));
    expect(clear).not.toHaveBeenCalled();
    const other = h.host.appendChild(el('input', { type: 'text' }));
    other.dispatchEvent(new Event('change', { bubbles: true }));
    expect(h.state().files).toHaveLength(1);
  });

  it('highlights while a file is dragged over, and adds dropped files', () => {
    const h = mount();
    const over = drag('dragover');
    h.zone().dispatchEvent(over);
    expect(over.defaultPrevented).toBe(true);
    expect(h.state().dragging).toBe(true);
    h.zone().dispatchEvent(drag('dragover'));
    h.zone().dispatchEvent(drag('dragover', { transfer: false }));
    // Leaving into its own child does not count; leaving the host does.
    h.zone().dispatchEvent(drag('dragleave', { relatedTarget: h.input() }));
    expect(h.state().dragging).toBe(true);
    h.zone().dispatchEvent(drag('dragleave', { relatedTarget: document.body }));
    expect(h.state().dragging).toBe(false);

    h.zone().dispatchEvent(drag('dragover'));
    const drop = drag('drop', { files: list(file('d')) });
    h.zone().dispatchEvent(drop);
    expect(drop.defaultPrevented).toBe(true);
    expect(h.state()).toMatchObject({ dragging: false });
    expect(h.state().files).toHaveLength(1);
    h.zone().dispatchEvent(drag('drop', { transfer: false }));
    expect(h.state().files).toHaveLength(1);
  });

  it('refuses drags and drops while disabled', () => {
    const h = mount({ disabled: true });
    const over = drag('dragover');
    h.zone().dispatchEvent(over);
    const drop = drag('drop', { files: list(file('d')) });
    h.zone().dispatchEvent(drop);
    expect(over.defaultPrevented || drop.defaultPrevented).toBe(false);
    expect(h.state()).toMatchObject({ dragging: false, files: [] });
  });

  it('follows the consumer’s list and stops listening once disposed', () => {
    const h = mount();
    const mine = [{ file: file('z'), progress: 1, index: 0 }];
    h.setInputs({ files: mine });
    expect(h.state().files).toBe(mine);
    h.setInputs({ files: mine });
    h.setInputs({ files: undefined as never });
    expect(h.state().files).toEqual([]);
    h.setInputs({ label: 'x' });
    const zone = h.zone();
    h.dispose();
    zone.dispatchEvent(drag('dragover'));
    expect(h.state().dragging).toBe(false);
  });
});
