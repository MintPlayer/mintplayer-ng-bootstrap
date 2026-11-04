import { announceToPage } from '@mintplayer/ui-core/announce';
import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';
import { hydratedAttr } from '@mintplayer/ui-core/store';

/**
 * A file drop zone with a list of the files added (#458 M7).
 *
 *   <div class="file-upload">
 *     <div class="dropzone border p-5" role="region" aria-label=<label> [data-dragging]>
 *       <input type="file" id=<id>-input class="dropzone-input" multiple [name] [accept] aria-label=…>
 *       <span class="h3 d-block" aria-hidden="true">Drop your files here</span>
 *       <label class="btn btn-primary" for=<id>-input>Browse for files</label>
 *     </div>
 *     <ul class="list-group files-list">
 *       <li class="list-group-item">  (fileTemplate slot, or the default:)
 *         name, size, <div class="progress" role="progressbar" aria-label=… aria-valuenow=…>
 *       </li>
 *     </ul>
 *   </div>
 *
 * The native file input is the control: it is stretched over the zone, so a click anywhere
 * (or a file dropped on it) chooses files, and the browse button is its label. Hydrated, the
 * core adds the chosen or dropped files to the two-way `files` list, emits `filesDropped`
 * with the batch and announces it; the zone highlights while a file is dragged over it.
 *
 * No-JS tier 1 with `name`: the input submits its files with the form. Without `name` the
 * zone still renders; there is nothing to list until JavaScript runs.
 */

export interface FileUpload {
  file: File;
  /** Bytes uploaded so far, out of `file.size`. The consumer updates it. */
  progress: number;
  index: number;
}

export interface FileUploadInputs {
  /** The files added so far (two-way). */
  files: FileUpload[];
  /** The input's form name; null submits nothing. */
  name: string | null;
  /** The input's `accept` filter, e.g. `image/*,.pdf`. */
  accept: string | null;
  multiple: boolean;
  disabled: boolean;
  dropFilesCaption: string;
  browseFilesCaption: string;
  /** Names the drop zone region. A consumer `aria-label` wins. */
  label: string;
  /** Names the file input. */
  inputLabel: string;
  /** Live-region announcement after one file is added. Override to translate. */
  fileAddedAnnouncement: (fileName: string) => string;
  /** Live-region announcement after several files are added at once. Override to translate. */
  filesAddedAnnouncement: (count: number) => string;
  /** Accessible name of the default row's progress bar. Override to translate. */
  progressLabel: (fileName: string) => string;
  /** Formats a byte count for the default row; null uses formatBytes. Override to localise. */
  formatSize: ((bytes: number) => string) | null;
}

export interface FileUploadRow {
  readonly key: number;
  readonly upload: FileUpload;
  readonly item: CoreBag;
  readonly name: string;
  readonly size: string;
  readonly progress: CoreBag;
  readonly bar: CoreBag;
  /** The bar's width, as a geometry custom property. */
  readonly barStyle: Record<string, string>;
}

export interface FileUploadView {
  readonly root: CoreBag;
  readonly zone: CoreBag;
  readonly input: CoreBag;
  readonly caption: CoreBag;
  readonly dropFilesCaption: string;
  readonly browseFilesCaption: string;
  readonly browse: CoreBag;
  readonly list: CoreBag;
  readonly rows: readonly FileUploadRow[];
}

/** `2048` → `2 KB`, binary multiples, at most two decimals. */
export function formatBytes(value: number, decimals = 2): string {
  if (!value) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  // Clamped: below 1 byte the log is negative, and past the last unit there is no name.
  const i = Math.min(sizes.length - 1, Math.max(0, Math.floor(Math.log(value) / Math.log(k))));
  return `${parseFloat((value / Math.pow(k, i)).toFixed(Math.max(0, decimals)))} ${sizes[i]}`;
}

export const FILE_UPLOAD_INPUT_ATTR = 'data-file-upload-input';

export function connectFileUpload(
  inputs: FileUploadInputs,
  files: readonly FileUpload[],
  dragging: boolean,
  id: string,
  hydrated: boolean,
  consumerLabel: string | null = null,
): FileUploadView {
  const inputId = `${id}-input`;
  return {
    root: { class: 'file-upload', ...hydratedAttr(hydrated) },
    zone: {
      class: 'dropzone border position-relative p-5',
      role: 'region',
      'aria-label': consumerLabel ?? inputs.label,
      'data-dragging': dragging ? '' : null,
      'data-disabled': inputs.disabled ? '' : null,
    },
    input: {
      type: 'file',
      id: inputId,
      class: 'dropzone-input',
      name: inputs.name,
      accept: inputs.accept,
      multiple: inputs.multiple ? '' : null,
      disabled: inputs.disabled ? '' : null,
      'aria-label': inputs.inputLabel,
      [FILE_UPLOAD_INPUT_ATTR]: '',
    },
    caption: { class: 'h3 d-block', 'aria-hidden': 'true' },
    dropFilesCaption: inputs.dropFilesCaption,
    browseFilesCaption: inputs.browseFilesCaption,
    browse: { class: `btn btn-primary position-relative${inputs.disabled ? ' disabled' : ''}`, for: inputId },
    list: { class: 'list-group files-list' },
    rows: files.map((upload) => {
      const size = upload.file.size;
      const progress = Math.min(Math.max(upload.progress, 0), size);
      return {
        key: upload.index,
        upload,
        item: { class: 'list-group-item' },
        name: upload.file.name,
        size: (inputs.formatSize ?? formatBytes)(size),
        progress: {
          class: 'progress',
          role: 'progressbar',
          'aria-label': inputs.progressLabel(upload.file.name),
          'aria-valuemin': '0',
          'aria-valuemax': String(size),
          'aria-valuenow': String(progress),
        },
        bar: { class: 'progress-bar' },
        barStyle: { '--mp-file-upload-progress': `${size ? (progress / size) * 100 : 0}%` },
      };
    }),
  };
}

/** The files of a list, numbered on from the files already added. */
export function toUploads(list: FileList | null | undefined, from: number): FileUpload[] {
  if (!list) return [];
  return Array.from({ length: list.length }, (_, i) => list.item(i))
    .filter((file): file is File => !!file)
    .map((file, i) => ({ file, progress: 0, index: from + i }));
}

export const fileUploadCore = defineCore<
  FileUploadInputs,
  { files: FileUpload[]; dragging: boolean },
  { view: FileUploadView },
  { filesChange: FileUpload[]; filesDropped: FileUpload[] }
>({
  state: (inputs) => ({ files: inputs.files ?? [], dragging: false }),
  view: ({ inputs, state, id, hydrated, label }) => ({
    view: connectFileUpload(inputs, state.files, state.dragging, id, hydrated, label),
  }),
  attach: (api) => {
    const host = api.host;
    const add = (list: FileList | null | undefined) => {
      const current = api.state().files;
      const added = toUploads(list, current.length);
      if (!added.length) return;
      const files = [...current, ...added];
      api.setState({ files });
      api.emit('filesDropped', added);
      const inputs = api.inputs();
      const message = added.length === 1
        ? inputs.fileAddedAnnouncement(added[0].file.name)
        : inputs.filesAddedAnnouncement(added.length);
      announceToPage(host.ownerDocument, message, 'polite');
    };
    const ownInput = (target: EventTarget | null): HTMLInputElement | null => {
      const el = target as HTMLInputElement | null;
      return el?.hasAttribute?.(FILE_UPLOAD_INPUT_ATTR) && host.contains(el) ? el : null;
    };
    const onChange = (event: Event) => {
      const input = ownInput(event.target);
      if (!input) return;
      add(input.files);
      // With no form name the list holds the files; clearing the input lets the same file be
      // chosen again. A named input keeps its files, because they are what the form submits.
      if (!api.inputs().name) input.value = '';
    };
    const dragging = (on: boolean) => {
      if (api.state().dragging !== on) api.setState({ dragging: on });
    };
    const onDragOver = (event: DragEvent) => {
      if (api.inputs().disabled) return;
      event.preventDefault();
      event.stopPropagation();
      if (!event.dataTransfer) return;
      event.dataTransfer.dropEffect = 'copy';
      dragging(true);
    };
    const onDragLeave = (event: DragEvent) => {
      // Moving between the zone's own children fires a leave too: only leaving the host counts.
      if (event.relatedTarget && host.contains(event.relatedTarget as Node)) return;
      dragging(false);
    };
    const onDrop = (event: DragEvent) => {
      if (api.inputs().disabled) return;
      event.preventDefault();
      event.stopPropagation();
      dragging(false);
      add(event.dataTransfer?.files);
    };
    host.addEventListener('change', onChange);
    host.addEventListener('dragover', onDragOver);
    host.addEventListener('dragleave', onDragLeave);
    host.addEventListener('drop', onDrop);
    return () => {
      host.removeEventListener('change', onChange);
      host.removeEventListener('dragover', onDragOver);
      host.removeEventListener('dragleave', onDragLeave);
      host.removeEventListener('drop', onDrop);
    };
  },
  inputsChanged: (api, prev) => {
    const files = api.inputs().files ?? [];
    if (files === prev.files || files === api.state().files) return;
    api.setState({ files });
  },
});
