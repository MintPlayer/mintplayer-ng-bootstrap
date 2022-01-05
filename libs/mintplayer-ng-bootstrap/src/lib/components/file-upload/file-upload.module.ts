import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsFileUploadComponent } from './file-upload.component';
import { BsForModule } from '../for/for.module';

@NgModule({
  declarations: [
    BsFileUploadComponent
  ],
  imports: [
    CommonModule,
    BsForModule
  ],
  exports: [
    BsFileUploadComponent
  ]
})
export class BsFileUploadModule { }
