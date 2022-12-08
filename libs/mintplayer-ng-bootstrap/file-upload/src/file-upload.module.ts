import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsFormatBytesModule } from '@mintplayer/ng-bootstrap';
import { BsForModule } from '@mintplayer/ng-bootstrap/for';
import { BsProgressBarModule } from '@mintplayer/ng-bootstrap/progress-bar';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';
import { BsFileUploadComponent } from './component/file-upload.component';
import { BsFileUploadTemplateDirective } from './directive/file-upload-template.directive';

@NgModule({
  declarations: [
    BsFileUploadComponent,
    BsFileUploadTemplateDirective
  ],
  imports: [
    CommonModule,
    BsForModule,
    BsFormatBytesModule,
    BsProgressBarModule,
    BsListGroupModule
  ],
  exports: [
    BsFileUploadComponent,
    BsFileUploadTemplateDirective
  ]
})
export class BsFileUploadModule { }
