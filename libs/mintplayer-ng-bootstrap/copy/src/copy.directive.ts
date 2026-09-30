import { DOCUMENT } from '@angular/common';
import { Directive, inject, input, output } from '@angular/core';
import { BsLiveAnnouncerService } from '@mintplayer/ng-bootstrap/a11y';

@Directive({
  selector: '[bsCopy]',
  host: {
    '(click)': 'click($event)',
  },
})
export class BsCopyDirective {
  private doc = inject<Document>(DOCUMENT);
  private announcer = inject(BsLiveAnnouncerService);

  readonly bsCopy = input<string | null>(null);
  /** Announced to screen readers after a copy. Override to translate. */
  readonly copiedAnnouncement = input('Copied to clipboard.');
  readonly bsCopied = output<string>();

  click(event: MouseEvent) {
    event.preventDefault();
    const listener = (e: ClipboardEvent) => {
      const bsCopyValue = this.bsCopy();
      if (bsCopyValue) {
        const clipboard = e.clipboardData ?? (window as unknown as { clipboardData?: DataTransfer }).clipboardData ?? null;
        if (clipboard) {
          clipboard.setData('text', bsCopyValue.toString());
          e.preventDefault();
          this.bsCopied.emit(bsCopyValue);
          // Copying gives zero visual/SR feedback of its own.
          void this.announcer.announce(this.copiedAnnouncement());
        }
      }
    };
    this.doc.addEventListener('copy', listener, false);
    this.doc.execCommand('copy');
    this.doc.removeEventListener('copy', listener, false);
  }
}
