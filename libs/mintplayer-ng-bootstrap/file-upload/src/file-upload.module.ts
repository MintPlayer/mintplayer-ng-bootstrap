import { NgModule } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { BsForDirective } from '@mintplayer/ng-bootstrap/for';
import { BsProgressBarModule } from '@mintplayer/ng-bootstrap/progress-bar';
import { BsListGroupComponent, BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsFileUploadComponent } from './component/file-upload.component';
import { BsFileUploadTemplateDirective } from './directive/file-upload-template.directive';
import { BsFormatBytesPipe } from './pipes/format-bytes/format-bytes.pipe';

@NgModule({
  declarations: [
    BsFileUploadComponent,
    BsFileUploadTemplateDirective,
    BsFormatBytesPipe
  ],
  imports: [
    NgTemplateOutlet,
    BsForDirective,
    BsProgressBarModule,
    BsListGroupComponent, BsListGroupItemComponent,
    BsButtonTypeDirective,
  ],
  exports: [
    BsFileUploadComponent,
    BsFileUploadTemplateDirective,
    BsFormatBytesPipe
  ]
})
export class BsFileUploadModule { }
