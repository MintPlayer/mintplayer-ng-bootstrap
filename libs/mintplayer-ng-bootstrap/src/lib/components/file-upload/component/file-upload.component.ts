import { Component, EventEmitter, HostListener, Input, Output, TemplateRef } from '@angular/core';
import { FileUpload } from '../file-upload';

@Component({
  selector: 'bs-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss']
})
export class BsFileUploadComponent {

  @Input() public dropFilesCaption = 'Drop your files here';
  @Input() public browseFilesCaption = 'Browse for files';
  @Input() public placeholder = 'Drop files to upload';

  isDraggingFile = false;
  fileTemplate?: TemplateRef<FileUpload>;
  @Input() public files: FileUpload[] = [];
  @Output() public filesDropped = new EventEmitter<FileUpload[]>();

  onChange(event: Event) {
    if (!event.target) return;
    if (!('files' in event.target)) return;
    if (!event.target['files']) return;

    const files = (<HTMLInputElement>event.target).files;
    if (!files) return;
    
    this.processDroppedFiles(files);
  }

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer) {
      this.isDraggingFile = true;
      event.dataTransfer.effectAllowed = "copy";
    }
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingFile = false;
  }

  @HostListener('drop', ['$event'])
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
      .map(f => <FileUpload>{ file: f, progress: 0 });
    
    this.files.push(...newFiles);
    this.filesDropped.emit(newFiles);
  }
}
