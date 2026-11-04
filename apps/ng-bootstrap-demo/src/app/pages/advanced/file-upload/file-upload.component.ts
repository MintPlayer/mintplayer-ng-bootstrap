import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal, type WritableSignal } from '@angular/core';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsFileUploadComponent, BsFileUploadFileTemplateDirective, type FileUpload } from '@mintplayer/ng-bootstrap/file-upload';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
  imports: [BsCodeSnippetComponent, BsFileUploadComponent, BsFileUploadFileTemplateDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileUploadComponent {
  protected readonly files = signal<FileUpload[]>([]);
  protected readonly customFiles = signal<FileUpload[]>([]);
  private readonly timers = new Set<ReturnType<typeof setInterval>>();

  constructor() {
    inject(DestroyRef).onDestroy(() => [...this.timers].map((timer) => clearInterval(timer)));
  }

  /** Simulates an upload: a tenth of each new file every half second. */
  protected upload(added: FileUpload[], list: WritableSignal<FileUpload[]> = this.files) {
    const indices = new Set(added.map((upload) => upload.index));
    const timer = setInterval(() => {
      list.update((files) => files.map((upload) => indices.has(upload.index)
        ? { ...upload, progress: Math.min(upload.file.size, upload.progress + Math.max(1, upload.file.size / 10)) }
        : upload));
      if (list().filter((upload) => indices.has(upload.index)).every((upload) => upload.progress >= upload.file.size)) {
        clearInterval(timer);
        this.timers.delete(timer);
      }
    }, 500);
    this.timers.add(timer);
  }

  protected remove(list: WritableSignal<FileUpload[]>, upload: FileUpload) {
    list.update((files) => files.filter((f) => f !== upload));
  }

  protected readonly snippetBasicHtml = dedent`
    <bs-file-upload [(files)]="files" (filesdropped)="upload($event)"></bs-file-upload>
  `;

  protected readonly snippetCustomHtml = dedent`
    <bs-file-upload [(files)]="files" (filesdropped)="upload($event)">
      <ng-template bsFileUploadFileTemplate let-upload="upload">
        <span>{{ upload.file.name }}</span>
        <button type="button" (click)="remove(upload)">Remove</button>
      </ng-template>
    </bs-file-upload>
  `;

  protected readonly snippetTs = dedent`
    import { Component, signal } from '@angular/core';
    import {
      BsFileUploadComponent,
      BsFileUploadFileTemplateDirective,
      FileUpload,
    } from '@mintplayer/ng-bootstrap/file-upload';

    @Component({
      selector: 'my-file-upload-demo',
      templateUrl: './my-file-upload-demo.component.html',
      imports: [BsFileUploadComponent, BsFileUploadFileTemplateDirective],
    })
    export class MyFileUploadDemoComponent {
      protected files = signal<FileUpload[]>([]);

      upload(added: FileUpload[]) {
        // Send the files; write progress back immutably:
        // this.files.update(list => list.map(f => f.index === i ? { ...f, progress } : f));
      }

      remove(upload: FileUpload) {
        this.files.update(list => list.filter(f => f !== upload));
      }
    }
  `;
}
