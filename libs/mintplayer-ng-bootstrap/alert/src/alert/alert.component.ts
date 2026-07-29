import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, input, model, output } from '@angular/core';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss'],
  animations: [ FadeInOutAnimation ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsAlertComponent {

  private destroyRef = inject(DestroyRef);
  private hostRef = inject(ElementRef<HTMLElement>);

  type = input<Color>(Color.primary);
  /** Opt-in role="alert" for genuinely dynamic alerts (defaults off — static banners must not interrupt). */
  readonly announce = input(false);
  colors = Color;

  isVisible = model<boolean>(true);

  /**
   * Dismissing destroys the close button the user just pressed, which drops
   * focus to <body> — their next keystroke goes nowhere. Re-home it on the next
   * tabbable after the alert (reading order continues naturally), falling back
   * to the previous one at the end of a page.
   */
  rescueFocus(): void {
    const host = this.hostRef.nativeElement as HTMLElement;
    if (!host.contains(document.activeElement)) return;
    const tabbables = Array.from(
      document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !host.contains(el));
    const after = tabbables.find(
      (el) => host.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING,
    );
    (after ?? tabbables[tabbables.length - 1])?.focus();
  }

  afterOpenedOrClosed = output<boolean>();

  onAfterOpenedOrClosed(isVisible: boolean) {
    // During SSR prerender, the FadeInOut `done` callback can fire after
    // Angular has torn down the route's application — emitting on a
    // destroyed OutputRef hits NG0953 on every prerendered page.
    if (this.destroyRef.destroyed) return;
    this.afterOpenedOrClosed.emit(isVisible);
  }
}
