import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsFileUploadMockComponent } from './file-upload/file-upload.component';
import { BsFileUploadTemplateMockDirective } from './file-upload-template/file-upload-template.directive';
import { BsFileUploadComponent } from '@mintplayer/ng-bootstrap/file-upload';

@NgModule({
  declarations: [BsFileUploadMockComponent, BsFileUploadTemplateMockDirective],
  imports: [CommonModule],
  exports: [BsFileUploadMockComponent, BsFileUploadTemplateMockDirective],
  providers: [
    { provide: BsFileUploadComponent, useClass: BsFileUploadMockComponent }
  ]
})
export class BsFileUploadTestingModule {}
