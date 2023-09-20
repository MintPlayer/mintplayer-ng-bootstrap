import { Directive, Input, TemplateRef } from '@angular/core';
import { BsFileUploadComponent } from '../component/file-upload.component';
import { FileUpload } from '../file-upload';

@Directive({
  selector: '[bsFileUploadTemplate]'
})
export class BsFileUploadTemplateDirective {

  constructor(private fileUploadComponent: BsFileUploadComponent, templateRef: TemplateRef<any>) {
    fileUploadComponent.fileTemplate = templateRef;
  }

  @Input() set bsFileUploadTemplateOf(value: FileUpload[]) {
    this.fileUploadComponent.files = value;
  }

  static ngTemplateContextGuard(dir: BsFileUploadTemplateDirective, ctx: any): ctx is BsFileUploadTemplateContext {
    return true;
  }

}

export class BsFileUploadTemplateContext {
  $implicit: FileUpload = null!;
}