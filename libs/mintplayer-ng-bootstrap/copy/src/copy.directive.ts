import { DOCUMENT } from '@angular/common';
import { Directive, EventEmitter, HostListener, inject, Inject, Input, Output } from '@angular/core';

@Directive({
  selector: '[bsCopy]',
  standalone: true,
})
export class BsCopyDirective {
  doc = inject(Document);

  @Input() public bsCopy: string | null = null;
  @Output() public bsCopied = new EventEmitter<string>();

  @HostListener('click', ['$event']) click(event: MouseEvent) {
    event.preventDefault();
    const listener = (e: ClipboardEvent) => {
      if (!!this.bsCopy && !!window) {
        const clipboard = e.clipboardData || <DataTransfer | null>(<any>window)['clipboardData'] || null;
        if (clipboard) {
          clipboard.setData('text', this.bsCopy?.toString());
          e.preventDefault();
          this.bsCopied.emit(this.bsCopy);
        }
      }
    };
    this.doc.addEventListener('copy', listener, false);
    this.doc.execCommand('copy');
    this.doc.removeEventListener('copy', listener, false);
  }
}
