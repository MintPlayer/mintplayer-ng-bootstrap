import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsForModule } from '../for/for.module';
import { BsProgressBarModule } from '../progress-bar';
import { BsFormatBytesModule } from '../../pipes/format-bytes/format-bytes.module';
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
    BsProgressBarModule
  ],
  exports: [
    BsFileUploadComponent,
    BsFileUploadTemplateDirective
  ]
})
export class BsFileUploadModule { }
