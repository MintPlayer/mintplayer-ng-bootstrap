import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsFileUploadModule, BsFormatBytesModule, BsProgressBarModule } from '@mintplayer/ng-bootstrap';

import { FileUploadRoutingModule } from './file-upload-routing.module';
import { FileUploadComponent } from './file-upload.component';


@NgModule({
  declarations: [
    FileUploadComponent
  ],
  imports: [
    CommonModule,
    BsFileUploadModule,
    BsProgressBarModule,
    BsFormatBytesModule,
    FileUploadRoutingModule
  ]
})
export class FileUploadModule { }
