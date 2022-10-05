import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsFileUploadModule, BsFormatBytesModule, BsGridModule, BsProgressBarModule } from '@mintplayer/ng-bootstrap';

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
    BsFormatBytesModule,
    FileUploadRoutingModule
  ]
})
export class FileUploadModule { }
