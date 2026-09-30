import { ConnectedPosition, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { DestroyRef, Directive, ElementRef, inject, input, Injector, TemplateRef } from '@angular/core';
import { Position } from '@mintplayer/ng-bootstrap';
import { BsIdService, BsOverlayStackService } from '@mintplayer/ng-bootstrap/a11y';
import { BsTooltipComponent } from '../component/tooltip.component';
import { TOOLTIP_CONTENT } from '../providers/tooltip-content.provider';
import { TOOLTIP_ID } from '../providers/tooltip-id.provider';

/** Where the tooltip attaches for each side of the trigger. */
const POSITIONS: Record<Position, ConnectedPosition> = {
  bottom: { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top' },
  top: { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom' },
  start: { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center' },
  end: { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center' },
};

/** How long the pointer may travel from the trigger into the tooltip before it hides. */
export const TOOLTIP_HIDE_DELAY_MS = 150;

@Directive({
  selector: '*[bsTooltip]',
  host: {
    '(window:blur)': 'onBlur()',
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class BsTooltipDirective {
  private readonly overlay = inject(Overlay);
  private readonly overlayStack = inject(BsOverlayStackService);
  /** The element the structural directive sits on: the tooltip's trigger. */
  private readonly parent = inject<ElementRef<HTMLElement>>(ElementRef, { host: true, skipSelf: true });
  private readonly tooltipId = inject(BsIdService).next('bs-tooltip');
  private readonly portal = new ComponentPortal(BsTooltipComponent, null, Injector.create({
    providers: [
      { provide: TOOLTIP_CONTENT, useValue: inject(TemplateRef) },
      { provide: TOOLTIP_ID, useValue: this.tooltipId },
    ],
    parent: inject(Injector),
  }));

  private stackToken: symbol | null = null;
  private overlayRef: OverlayRef | null = null;

  readonly bsTooltip = input<Position>('bottom');

  constructor() {
    const el = this.parent.nativeElement;
    /* addEventListener rather than the on* properties the old code assigned —
       those silently CLOBBER any handler the consumer set on their own element. */
    // WCAG 1.4.13: content on hover must also appear on FOCUS. A keyboard user
    // could never see these tooltips at all.
    const listeners: [string, () => void][] = [
      ['mouseenter', () => this.showTooltip()],
      ['mouseleave', () => this.scheduleHide()],
      ['focusin', () => this.showTooltip()],
      ['focusout', () => this.hideTooltip()],
    ];
    listeners.map(([type, fn]) => el.addEventListener(type, fn));
    inject(DestroyRef).onDestroy(() => {
      listeners.map(([type, fn]) => el.removeEventListener(type, fn));
      this.hideTooltip();
    });
  }

  /**
   * WCAG 1.4.13 "hoverable": the pointer must be able to travel INTO the
   * tooltip (to select/zoom its text) without it vanishing. Hide on a short
   * delay; entering the overlay cancels it, leaving the overlay hides.
   */
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  private scheduleHide(): void {
    this.cancelScheduledHide();
    this.hideTimer = setTimeout(() => this.hideTooltip(), TOOLTIP_HIDE_DELAY_MS);
  }

  private cancelScheduledHide(): void {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  onBlur() {
    this.hideTooltip();
  }

  onEscape() {
    if (this.stackToken !== null && this.overlayStack.isTop(this.stackToken)) {
      this.hideTooltip();
    }
  }

  showTooltip() {
    this.cancelScheduledHide();
    if (this.overlayRef) return;

    this.overlayRef = this.overlay.create({
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      positionStrategy: this.overlay.position()
        .flexibleConnectedTo(this.parent)
        .withPositions([POSITIONS[this.bsTooltip()]]),
    });
    const component = this.overlayRef.attach<BsTooltipComponent>(this.portal);
    component.setInput('position', this.bsTooltip());

    // Hoverable half of 1.4.13 — see scheduleHide().
    this.overlayRef.overlayElement.addEventListener('mouseenter', () => this.cancelScheduledHide());
    this.overlayRef.overlayElement.addEventListener('mouseleave', () => this.scheduleHide());

    this.setDescribedBy(true);
    this.stackToken = this.overlayStack.push();
  }

  hideTooltip() {
    this.cancelScheduledHide();
    if (!this.overlayRef) return;
    this.overlayRef.dispose();
    this.overlayRef = null;
    this.setDescribedBy(false);
    if (this.stackToken !== null) {
      this.overlayStack.release(this.stackToken);
      this.stackToken = null;
    }
  }

  /**
   * Adds or removes the tooltip's id in the trigger's `aria-describedby` token list, leaving
   * any description the consumer set (a hint, a validation message) in place.
   */
  private setDescribedBy(present: boolean) {
    const el = this.parent.nativeElement;
    const others = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter((id) => id && id !== this.tooltipId);
    const ids = present ? [...others, this.tooltipId] : others;
    if (ids.length) el.setAttribute('aria-describedby', ids.join(' '));
    else el.removeAttribute('aria-describedby');
  }
}
