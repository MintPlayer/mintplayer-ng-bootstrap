import { Directive, inject, input, TemplateRef } from '@angular/core';
import { BsFileUploadComponent } from '../component/file-upload.component';
import { FileUpload } from '../file-upload';

@Directive({
  selector: '[bsFileUploadTemplate]',
})
export class BsFileUploadTemplateDirective {
  private fileUploadComponent = inject(BsFileUploadComponent);

  constructor() {
    const templateRef = inject(TemplateRef);
    this.fileUploadComponent.fileTemplate.set(templateRef);
  }

  readonly bsFileUploadTemplateOf = input<FileUpload[] | undefined>(undefined);

  static ngTemplateContextGuard(dir: BsFileUploadTemplateDirective, ctx: any): ctx is BsFileUploadTemplateContext {
    return true;
  }

}

export class BsFileUploadTemplateContext {
  $implicit: FileUpload = null!;
}