import { Component } from '@angular/core';
import { Color, FileUpload } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss']
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
