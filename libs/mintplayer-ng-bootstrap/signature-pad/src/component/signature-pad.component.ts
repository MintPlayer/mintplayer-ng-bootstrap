import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  effect,
  input,
  model,
  viewChild,
} from '@angular/core';
import { MpSignaturePadElement, Signature } from '@mintplayer/web-components/signature-pad';
import { BsForwardAriaDirective } from '@mintplayer/ng-bootstrap/a11y';

// Side-effect: ensure mp-signature-pad is registered (a type-only usage would
// let TypeScript elide the import and the element would never be defined).
void MpSignaturePadElement;

/**
 * `<bs-signature-pad>` — Angular wrapper around the `<mp-signature-pad>` web
 * component. The WC owns drawing, the typed-signature alternative, Undo/Clear
 * and ARIA; this wrapper bridges the `signature` two-way model and forwards
 * the optional label overrides.
 */
@Component({
  selector: 'bs-signature-pad',
  template: `
    <mp-signature-pad bsForwardAria
      #el
      [attr.width]="width()"
      [attr.height]="height()"
      [attr.input-label]="inputLabel()"
      [attr.type-label]="typeLabel()"
      [attr.undo-label]="undoLabel()"
      [attr.clear-label]="clearLabel()"
      (signature-change)="onSignatureChange($event)"
    ></mp-signature-pad>
  `,
  // max-width mirrors the WC host's own cap: an inline-block's shrink-to-fit
  // floor is its content's intrinsic width, which percentage caps on the WC
  // cannot influence — without this the wrapper holds the pad at ~310px on
  // narrow viewports and the page scrolls horizontally.
  styles: [':host { display: inline-block; max-width: 100%; }'],
  imports: [BsForwardAriaDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsSignaturePadComponent {
  readonly width = input(500);
  readonly height = input(300);
  readonly inputLabel = input<string | null>(null);
  readonly typeLabel = input<string | null>(null);
  readonly undoLabel = input<string | null>(null);
  readonly clearLabel = input<string | null>(null);

  // `model()` already exposes a `signatureChange` output for two-way
  // [(signature)] binding; `signature.set()` in onSignatureChange drives it.
  readonly signature = model<Signature>({ strokes: [] });

  readonly elementRef = viewChild.required<ElementRef<MpSignaturePadElement>>('el');

  constructor() {
    // Forward model writes to the WC property. Writing back the same object
    // the WC just emitted is a no-op inside Lit (same reference), so the
    // event → model → property round trip cannot loop.
    effect(() => {
      const ref = this.elementRef();
      if (!ref) return;
      ref.nativeElement.signature = this.signature();
    });
  }

  protected onSignatureChange(event: Event): void {
    this.signature.set((event as CustomEvent<Signature>).detail);
  }

  /** Remove the most recent stroke. */
  undo(): void {
    this.elementRef()?.nativeElement.undo();
  }

  /** Wipe strokes and typed text. */
  clear(): void {
    this.elementRef()?.nativeElement.clear();
  }
}
