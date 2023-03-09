import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsFileUploadModule } from '@mintplayer/ng-bootstrap/file-upload';
import { BsProgressBarModule } from '@mintplayer/ng-bootstrap/progress-bar';

import { FileUploadRoutingModule } from './file-upload-routing.module';
import { FileUploadComponent } from './file-upload.component';


@NgModule({
  declarations: [
    FileUploadComponent
  ],
  imports: [
    CommonModule,
    BsGridModule,
    BsFileUploadModule,
    BsProgressBarModule,
    FileUploadRoutingModule
  ]
})
export class FileUploadModule { }
