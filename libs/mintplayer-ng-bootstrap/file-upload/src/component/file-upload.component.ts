import { Component, inject, input, model, output, signal, TemplateRef, ChangeDetectionStrategy } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { BsLiveAnnouncerService } from '@mintplayer/ng-bootstrap/a11y';
import { BsForDirective } from '@mintplayer/ng-bootstrap/for';
import { BsListGroupComponent } from '@mintplayer/ng-bootstrap/list-group';
import { BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';
import { BsProgressComponent, BsProgressBarComponent } from '@mintplayer/ng-bootstrap/progress-bar';
import { Color } from '@mintplayer/ng-bootstrap';
import { FileUpload } from '../file-upload';
import { BsFormatBytesPipe } from '../pipes/format-bytes/format-bytes.pipe';

@Component({
  selector: 'bs-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
  imports: [NgTemplateOutlet, BsForDirective, BsListGroupComponent, BsListGroupItemComponent, BsProgressComponent, BsProgressBarComponent, BsFormatBytesPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(dragover)': 'onDragOver($event)',
    '(dragleave)': 'onDragLeave($event)',
    '(drop)': 'onDrop($event)',
  },
})
export class BsFileUploadComponent {
  private announcer = inject(BsLiveAnnouncerService);

  readonly dropFilesCaption = input('Drop your files here');
  readonly browseFilesCaption = input('Browse for files');
  readonly placeholder = input('Drop files to upload');
  readonly ariaLabel = input<string>('File upload drop zone');
  readonly inputAriaLabel = input<string>('Choose files to upload');
  /** Live-region announcement after one file is added. Override to translate. */
  readonly fileAddedAnnouncement = input<(fileName: string) => string>((fileName) => `Added ${fileName}`);
  /** Live-region announcement after several files are added at once. Override to translate. */
  readonly filesAddedAnnouncement = input<(count: number) => string>((count) => `Added ${count} files`);
  /** Accessible name of the default template's progress bar. Override to translate. */
  readonly progressLabel = input<(fileName: string) => string>((fileName) => `Upload progress for ${fileName}`);

  readonly colors = Color;
  isDraggingFile = signal(false);
  readonly fileTemplate = signal<TemplateRef<FileUpload> | undefined>(undefined);
  readonly files = model<FileUpload[]>([]);
  readonly filesDropped = output<FileUpload[]>();

  onChange(event: Event) {
    if (!event.target) return;
    if (!('files' in event.target)) return;
    if (!event.target['files']) return;

    const files = (<HTMLInputElement>event.target).files;
    if (!files) return;

    this.processDroppedFiles(files);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer) {
      this.isDraggingFile.set(true);
      event.dataTransfer.effectAllowed = "copy";
    }
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingFile.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingFile.set(false);
    if (event.dataTransfer && event.dataTransfer.files) {
      this.processDroppedFiles(event.dataTransfer.files);
    }
  }

  private processDroppedFiles(fileList: FileList) {
    const newFiles = [...Array(fileList.length).keys()]
      .map(i => fileList.item(i))
      .filter(f => !!f)
      .map((file, index) => <FileUpload>{ file, progress: 0, index: this.files().length + index });

    this.files.update(f => [...f, ...newFiles]);
    this.filesDropped.emit(newFiles);

    if (newFiles.length === 1) {
      this.announcer.announce(this.fileAddedAnnouncement()(newFiles[0].file.name));
    } else if (newFiles.length > 1) {
      this.announcer.announce(this.filesAddedAnnouncement()(newFiles.length));
    }
  }
}
