import type { ComponentGroup } from '@mintplayer/ui-core/component';

/**
 * The file-upload group's manifest (#458 M7): `@mintplayer/nx-component-compiler` generates
 * `bs-file-upload` (Angular), `BsFileUpload` (React, Vue) and `mp-file-upload` (Lit) from it,
 * the core in `file-upload.core.ts` and the template in `templates/`.
 */
export default {
  group: 'file-upload',
  style: { scope: 'file-upload', bootstrap: ['list-group', 'progress'] },
  components: {
    'file-upload': {
      core: 'fileUploadCore',
      doc: [
        'A file drop zone over a native file input, with the list of files added. Drop files on it, click',
        'it or use the browse button; each batch is added to the two-way `files` list, emitted as',
        '`filesDropped` and announced. Rows show the name, size and a progress bar the consumer updates;',
        'the `fileTemplate` slot replaces a row. With `name` the input submits its files with a form, no',
        'JavaScript needed.',
      ].join('\n'),
      inputs: {
        type: 'FileUploadInputs',
        fields: {
          files: { default: '[]', kind: false, model: true },
          name: { default: 'null', kind: 'string' },
          accept: { default: 'null', kind: 'string' },
          multiple: { default: 'true', kind: 'boolean' },
          disabled: { default: 'false', kind: 'boolean', reflect: true },
          dropFilesCaption: { default: "'Drop your files here'", kind: 'string' },
          browseFilesCaption: { default: "'Browse for files'", kind: 'string' },
          label: { default: "'File upload drop zone'", kind: 'string' },
          inputLabel: { default: "'Choose files to upload'", kind: 'string' },
          fileAddedAnnouncement: { default: '(fileName: string) => `Added ${fileName}`', kind: false },
          filesAddedAnnouncement: { default: '(count: number) => `Added ${count} files`', kind: false },
          progressLabel: { default: '(fileName: string) => `Upload progress for ${fileName}`', kind: false },
          formatSize: { default: 'null', kind: false },
        },
      },
      outputs: {
        filesChange: { type: 'FileUpload[]', doc: 'The files list grew: the whole new list.' },
        filesDropped: { type: 'FileUpload[]', doc: 'Files were chosen or dropped: the batch just added.' },
      },
    },
  },
} satisfies ComponentGroup;
