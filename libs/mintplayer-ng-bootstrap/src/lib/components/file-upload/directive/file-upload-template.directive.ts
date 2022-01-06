import { Directive, TemplateRef } from '@angular/core';
import { BsFileUploadComponent } from '../component/file-upload.component';

@Directive({
  selector: '[bsFileUploadTemplate]'
})
export class BsFileUploadTemplateDirective {

  constructor(fileUploadComponent: BsFileUploadComponent, templateRef: TemplateRef<any>) {
    fileUploadComponent.fileTemplate = templateRef;
  }

}
