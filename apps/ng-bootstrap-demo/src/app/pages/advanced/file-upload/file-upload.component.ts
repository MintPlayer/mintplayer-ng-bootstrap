import { Component, signal, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsFileUploadComponent, BsFileUploadTemplateDirective, BsFormatBytesPipe, FileUpload } from '@mintplayer/ng-bootstrap/file-upload';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsProgressComponent, BsProgressBarComponent } from '@mintplayer/ng-bootstrap/progress-bar';

@Component({
  selector: 'demo-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
  standalone: true,
  imports: [BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsFileUploadComponent, BsFileUploadTemplateDirective, BsFormatBytesPipe, BsProgressComponent, BsProgressBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileUploadComponent {

  files = signal<FileUpload[]>([]);
  colors = Color;

  logFilesForUpload(files: FileUpload[]) {
    console.log('Now we must upload following files to the server', files);
    files.forEach((upload) => {
      this.incrementProgress(upload);
    });
  }

  incrementProgress(file: FileUpload) {
    if (file.progress < file.file.size) {
      file.progress += 10;
      setTimeout(() => {
        this.incrementProgress(file);
      }, 1000);
    }
  }

  removeFile(file: FileUpload) {
    this.files.update(list => list.filter(f => f !== file));
  }
}
