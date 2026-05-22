import { DOCUMENT } from '@angular/common';
import { Directive, inject, input, output } from '@angular/core';

@Directive({
  selector: '[bsCopy]',
  host: {
    '(click)': 'click($event)',
  },
})
export class BsCopyDirective {
  private doc = inject<Document>(DOCUMENT);

  readonly bsCopy = input<string | null>(null);
  readonly bsCopied = output<string>();

  click(event: MouseEvent) {
    event.preventDefault();
    const listener = (e: ClipboardEvent) => {
      const bsCopyValue = this.bsCopy();
      if (!!bsCopyValue && !!window) {
        const clipboard = e.clipboardData || <DataTransfer | null>(<any>window)['clipboardData'] || null;
        if (clipboard) {
          clipboard.setData('text', bsCopyValue.toString());
          e.preventDefault();
          this.bsCopied.emit(bsCopyValue);
        }
      }
    };
    this.doc.addEventListener('copy', listener, false);
    this.doc.execCommand('copy');
    this.doc.removeEventListener('copy', listener, false);
  }
}
