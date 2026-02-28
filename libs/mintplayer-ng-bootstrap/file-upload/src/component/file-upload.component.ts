import { Component, input, output, TemplateRef, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { FileUpload } from '../file-upload';

@Component({
  selector: 'bs-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(dragover)': 'onDragOver($event)',
    '(dragleave)': 'onDragLeave($event)',
    '(drop)': 'onDrop($event)',
  },
})
export class BsFileUploadComponent {

  readonly dropFilesCaption = input('Drop your files here');
  readonly browseFilesCaption = input('Browse for files');
  readonly placeholder = input('Drop files to upload');

  colors = Color;
  isDraggingFile = false;
  fileTemplate?: TemplateRef<FileUpload>;
  readonly files = input<FileUpload[]>([]);
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
      this.isDraggingFile = true;
      event.dataTransfer.effectAllowed = "copy";
    }
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingFile = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingFile = false;
    if (event.dataTransfer && event.dataTransfer.files) {
      this.processDroppedFiles(event.dataTransfer.files);
    }
  }

  private processDroppedFiles(fileList: FileList) {
    const newFiles = [...Array(fileList.length).keys()]
      .map(i => fileList.item(i))
      .filter(f => !!f)
      .map((file, index) => <FileUpload>{ file, progress: 0, index: this.files().length + index });

    this.files().push(...newFiles);
    this.filesDropped.emit(newFiles);
  }
}
