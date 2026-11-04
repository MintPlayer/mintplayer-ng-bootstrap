import { describe, expect, it } from 'vitest';
import { connectFileUpload, formatBytes, toUploads, type FileUploadInputs } from './file-upload.core';

const inputs: FileUploadInputs = {
  files: [],
  name: null,
  accept: null,
  multiple: true,
  disabled: false,
  dropFilesCaption: 'Drop your files here',
  browseFilesCaption: 'Browse for files',
  label: 'File upload drop zone',
  inputLabel: 'Choose files to upload',
  fileAddedAnnouncement: (name) => `Added ${name}`,
  filesAddedAnnouncement: (count) => `Added ${count} files`,
  progressLabel: (name) => `Upload progress for ${name}`,
  formatSize: null,
};

const upload = (name: string, size: number, progress = 0, index = 0) =>
  ({ file: { name, size } as File, progress, index });

describe('file-upload', () => {
  it('is a named region holding a named native file input that the browse button labels', () => {
    const view = connectFileUpload(inputs, [], false, 'f1', false);
    expect(view.zone).toMatchObject({ role: 'region', 'aria-label': 'File upload drop zone' });
    expect(view.input).toMatchObject({ type: 'file', id: 'f1-input', multiple: '', 'aria-label': 'Choose files to upload' });
    expect(view.browse['for']).toBe('f1-input');
    expect(view.caption['aria-hidden']).toBe('true');
    expect(connectFileUpload(inputs, [], false, 'f1', false, 'Attachments').zone['aria-label']).toBe('Attachments');
  });

  it('submits under its form name and filter, and disables the input', () => {
    const view = connectFileUpload({ ...inputs, name: 'docs', accept: '.pdf', multiple: false, disabled: true }, [], false, 'f1', false);
    expect(view.input).toMatchObject({ name: 'docs', accept: '.pdf', multiple: null, disabled: '' });
    expect(view.zone['data-disabled']).toBe('');
  });

  it('marks the zone while a file is dragged over it', () => {
    expect(connectFileUpload(inputs, [], true, 'f1', true).zone['data-dragging']).toBe('');
    expect(connectFileUpload(inputs, [], false, 'f1', true).zone['data-dragging']).toBeNull();
  });

  it('lists each file with its size and a named progress bar', () => {
    const [row] = connectFileUpload(inputs, [upload('e.txt', 2048, 512)], false, 'f1', true).rows;
    expect(row.name).toBe('e.txt');
    expect(row.size).toBe('2 KB');
    expect(row.progress).toMatchObject({
      role: 'progressbar',
      'aria-label': 'Upload progress for e.txt',
      'aria-valuemin': '0',
      'aria-valuemax': '2048',
      'aria-valuenow': '512',
    });
    expect(row.barStyle).toEqual({ '--mp-file-upload-progress': '25%' });
  });

  it('localises the size and the progress name', () => {
    const view = connectFileUpload({ ...inputs, formatSize: (n) => `${n} o`, progressLabel: (n) => `Voortgang van ${n}` }, [upload('f.txt', 10)], false, 'f1', true);
    expect(view.rows[0].size).toBe('10 o');
    expect(view.rows[0].progress['aria-label']).toBe('Voortgang van f.txt');
  });

  it('formats bytes in binary multiples', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(0.5)).toBe('0.5 Bytes');
  });

  it('numbers new files on from those already added', () => {
    const files = [new File(['1'], 'a.txt'), new File(['2'], 'b.txt')];
    const list = { length: 2, item: (i: number) => files[i] ?? null } as unknown as FileList;
    expect(toUploads(list, 3).map((u) => [u.file.name, u.index, u.progress])).toEqual([['a.txt', 3, 0], ['b.txt', 4, 0]]);
    expect(toUploads(null, 0)).toEqual([]);
  });
});
