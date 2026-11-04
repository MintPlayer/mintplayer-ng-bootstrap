import { afterEach, describe, expect, it } from 'vitest';
import { MpFileUpload } from './generated';

void MpFileUpload; // force the side-effect registration

/**
 * The Lit file-upload front (#458 M7). The core's aria spec covers the bags; this pins the DOM
 * behaviour: a drop adds rows, writes the two-way list back and emits the batch; a drag-over
 * marks the zone; a change on the native input adds its files too.
 */

async function settle(el: HTMLElement & { updateComplete?: Promise<unknown> }): Promise<void> {
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
}

function mount(markup: string): MpFileUpload {
  const host = document.createElement('div');
  host.innerHTML = markup;
  document.body.append(host);
  return host.querySelector('mp-file-upload') as MpFileUpload;
}

/** jsdom has no DataTransfer: a FileList-shaped stand-in is all the core reads. */
function fileList(...files: File[]): FileList {
  return Object.assign([...files], { item: (i: number) => files[i] ?? null }) as unknown as FileList;
}

function dragEvent(type: string, files: File[] = []): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: { files: fileList(...files), dropEffect: 'none' } });
  return event;
}

const rows = (el: Element) => [...el.querySelectorAll('li')];
const zone = (el: Element) => el.querySelector('[role=region]') as HTMLElement;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mp-file-upload', () => {
  it('adds a dropped batch as rows, writes the list back and emits the batch', async () => {
    const el = mount('<mp-file-upload></mp-file-upload>');
    await settle(el);
    const dropped: unknown[] = [];
    const changed: unknown[] = [];
    el.addEventListener('filesdropped', (e) => dropped.push((e as CustomEvent).detail));
    el.addEventListener('fileschange', (e) => changed.push((e as CustomEvent).detail));

    zone(el).dispatchEvent(dragEvent('drop', [new File(['abc'], 'a.txt'), new File(['de'], 'b.txt')]));
    await settle(el);

    expect(rows(el).map((li) => li.textContent)).toEqual([
      expect.stringContaining('a.txt'),
      expect.stringContaining('b.txt'),
    ]);
    expect(el.files.map((u) => u.file.name)).toEqual(['a.txt', 'b.txt']);
    expect(dropped).toHaveLength(1);
    expect((dropped[0] as unknown[]).length).toBe(2);
    expect(changed).toHaveLength(1);
  });

  it('marks the zone while files are dragged over it', async () => {
    const el = mount('<mp-file-upload></mp-file-upload>');
    await settle(el);
    const over = dragEvent('dragover');
    zone(el).dispatchEvent(over);
    await settle(el);
    expect(over.defaultPrevented).toBe(true);
    expect(zone(el).getAttribute('data-dragging')).not.toBeNull();
  });

  it('adds the files chosen in the native input', async () => {
    const el = mount('<mp-file-upload></mp-file-upload>');
    await settle(el);
    const input = el.querySelector('input[type=file]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: fileList(new File(['x'], 'c.txt')), configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(el);
    expect(el.files.map((u) => u.file.name)).toEqual(['c.txt']);
  });
});
