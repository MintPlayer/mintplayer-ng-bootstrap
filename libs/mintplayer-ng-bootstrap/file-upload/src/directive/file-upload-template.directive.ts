import { Directive, inject, input, TemplateRef } from '@angular/core';
import { BsFileUploadComponent } from '../component/file-upload.component';
import { FileUpload } from '../file-upload';

@Directive({
  selector: '[bsFileUploadTemplate]',
  standalone: true,
})
export class BsFileUploadTemplateDirective {
  private fileUploadComponent = inject(BsFileUploadComponent);

  constructor() {
    const templateRef = inject(TemplateRef);
    this.fileUploadComponent.fileTemplate = templateRef;

    // TODO: fileUploadComponent.files is now an input() signal and cannot be assigned from the directive.
    // Consider converting files to model() on BsFileUploadComponent to restore this functionality.
  }

  readonly bsFileUploadTemplateOf = input<FileUpload[] | undefined>(undefined);

  static ngTemplateContextGuard(dir: BsFileUploadTemplateDirective, ctx: any): ctx is BsFileUploadTemplateContext {
    return true;
  }

}

export class BsFileUploadTemplateContext {
  $implicit: FileUpload = null!;
}