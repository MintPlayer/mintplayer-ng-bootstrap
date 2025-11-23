import { Component } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsFileUploadModule, FileUpload } from '@mintplayer/ng-bootstrap/file-upload';
import { BsGridColumnDirective, BsGridComponent, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsProgressBarModule } from '@mintplayer/ng-bootstrap/progress-bar';

@Component({
  selector: 'demo-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
  standalone: true,
  imports: [BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsFileUploadModule, BsProgressBarModule],
})
export class FileUploadComponent {
  
  files: FileUpload[] = [];
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
    this.files.splice(this.files.indexOf(file), 1);
  }
}
