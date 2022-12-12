import { Component, Input } from '@angular/core';
import { BsFileUploadComponent } from '@mintplayer/ng-bootstrap/file-upload';
import { FileUpload } from '../file-upload';

@Component({
  selector: 'bs-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
  providers: [
    { provide: BsFileUploadComponent, useExisting: BsFileUploadMockComponent }
  ]
})
export class BsFileUploadMockComponent {
  @Input() files: FileUpload[] = [];
}
