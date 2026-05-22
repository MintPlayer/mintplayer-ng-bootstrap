import { Component, signal, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsFileUploadComponent, BsFileUploadTemplateDirective, BsFormatBytesPipe, FileUpload } from '@mintplayer/ng-bootstrap/file-upload';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsProgressComponent, BsProgressBarComponent } from '@mintplayer/ng-bootstrap/progress-bar';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
  imports: [BsCodeSnippetComponent, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsFileUploadComponent, BsFileUploadTemplateDirective, BsFormatBytesPipe, BsProgressComponent, BsProgressBarComponent],
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

  protected readonly snippetBasicHtml = dedent`
    <bs-file-upload (filesDropped)="onFiles($event)">
      <div *bsFileUploadTemplate="let upload of files()">
        <span>{{ upload.file.name }}</span>
        <span>{{ upload.file.size | bsFormatBytes }}</span>
      </div>
    </bs-file-upload>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, signal } from '@angular/core';
    import {
      BsFileUploadComponent,
      BsFileUploadTemplateDirective,
      BsFormatBytesPipe,
      FileUpload,
    } from '@mintplayer/ng-bootstrap/file-upload';

    @Component({
      selector: 'my-file-upload-demo',
      templateUrl: './my-file-upload-demo.component.html',
      imports: [BsFileUploadComponent, BsFileUploadTemplateDirective, BsFormatBytesPipe],
    })
    export class MyFileUploadDemoComponent {
      protected files = signal<FileUpload[]>([]);

      onFiles(uploads: FileUpload[]) {
        this.files.update(list => [...list, ...uploads]);
      }
    }
  `;
}
