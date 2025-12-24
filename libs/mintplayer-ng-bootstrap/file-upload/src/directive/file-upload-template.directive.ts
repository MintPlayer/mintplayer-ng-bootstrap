import { Directive, inject, Input, TemplateRef } from '@angular/core';
import { BsFileUploadComponent } from '../component/file-upload.component';
import { FileUpload } from '../file-upload';

@Directive({
  selector: '[bsFileUploadTemplate]',
  standalone: false,
})
export class BsFileUploadTemplateDirective {
  private fileUploadComponent = inject(BsFileUploadComponent);

  constructor() {
    const templateRef = inject<TemplateRef<any>>(TemplateRef);
    this.fileUploadComponent.fileTemplate = templateRef;
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