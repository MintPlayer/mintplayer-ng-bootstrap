import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { MintOtpInputElement } from '../web-components/mint-otp-input.element';
import { BsOtpInputValueAccessor } from '../value-accessor/otp-input-value-accessor';
import { OtpInputType } from '../types/otp-input-type';
import { OtpInputCase } from '../types/otp-input-case';
import { OtpInputSize } from '../types/otp-input-size';

@Component({
  selector: 'bs-otp-input',
  template: `
    <mp-otp-input
      #el
      class="bs-otp-input"
      [attr.type]="type()"
      [attr.case]="case()"
      [attr.size]="size()"
      [attr.invalid]="invalidAttr()"
      [attr.label]="label()"
      (value-change)="onValueChange($event)"
      (complete)="onCompleteEvent($event)"
    ></mp-otp-input>
  `,
  styles: [`
    :host { display: inline-block; }
    .bs-otp-input { display: inline-flex; }
  `],
  host: {
    '[attr.size]': 'size()',
  },
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [BsOtpInputValueAccessor],
})
export class BsOtpInputComponent {
  readonly groups = input<number[]>([1, 1, 1, 1, 1, 1]);
  readonly type = input<OtpInputType>('numeric');
  readonly case = input<OtpInputCase>('upper');
  readonly size = input<OtpInputSize>('md');
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly label = input<string | null>(null);

  readonly value = model<string | undefined>(undefined);

  readonly valueChange = output<string>();
  readonly complete = output<string>();

  readonly elementRef = viewChild.required<ElementRef<MintOtpInputElement>>('el');

  private readonly hostRef = inject(ElementRef<HTMLElement>);

  protected readonly invalidAttr = computed(() => (this.invalid() ? '' : null));

  constructor() {
    // Override the host DOM element's `.focus` so external directives that look
    // up the element and call `.focus()` on it (e.g. FocusOnLoadDirective's
    // `*[autofocus]`) route into the internal hidden input. Without this, the
    // call hits HTMLElement.prototype.focus which is a no-op on a non-focusable
    // host. Capture the WC ref lazily because viewChild isn't available in the
    // constructor and external directives may call .focus() before our
    // ngAfterViewInit runs.
    const host = this.hostRef.nativeElement as HTMLElement & { focus: (o?: FocusOptions) => void };
    Object.defineProperty(host, 'focus', {
      value: (options?: FocusOptions) => {
        const wc = this.elementRef()?.nativeElement;
        if (wc) {
          wc.focus(options);
        } else {
          // Defer to a microtask so a focus() call landing before the view is
          // ready still hits the WC once it mounts. FocusOnLoadDirective uses
          // setTimeout(10) which runs after microtasks, so this path is mostly
          // defensive — but it cheaply handles the race.
          Promise.resolve().then(() => this.elementRef()?.nativeElement.focus(options));
        }
      },
      configurable: true,
      writable: true,
    });

    // Forward signal inputs that aren't attributes (groups is a number[] —
    // attribute serialisation works for it, but property write is the canonical
    // path and avoids the "string-from-attribute" parse round-trip).
    effect(() => {
      const ref = this.elementRef();
      if (!ref) return;
      ref.nativeElement.groups = this.groups();
    });

    // Forward `value` model writes to the WC. Skip undefined so a freshly-set
    // form control's writeValue(null) can still clear the field (we map null
    // to '' inside the WC's normaliseValue).
    effect(() => {
      const ref = this.elementRef();
      if (!ref) return;
      const v = this.value();
      if (v === undefined) return;
      ref.nativeElement.value = v;
    });

    // Forward the `invalid` boolean to the WC's invalid property (mirrors the
    // attribute, but property write is the canonical path for a boolean).
    effect(() => {
      const ref = this.elementRef();
      if (!ref) return;
      ref.nativeElement.invalid = this.invalid();
    });

    // Forward `disabled` via attribute. This used to be `[attr.disabled]` in the
    // template, but that creates a race with the CVA's `setDisabledState`:
    // both write to the same DOM attribute, and any signal change in the
    // wrapper re-fires the template binding which clobbers the CVA's
    // form-disabled state. Using an effect makes the write fire only when the
    // `disabled` signal actually changes; the CVA's imperative writes are
    // unaffected because Angular doesn't reconcile attribute bindings in the
    // template anymore for this attr.
    effect(() => {
      const ref = this.elementRef();
      if (!ref) return;
      if (this.disabled()) {
        ref.nativeElement.setAttribute('disabled', '');
      } else {
        ref.nativeElement.removeAttribute('disabled');
      }
    });
  }

  protected onValueChange(event: Event): void {
    const detail = (event as CustomEvent<string>).detail ?? '';
    this.value.set(detail);
    this.valueChange.emit(detail);
  }

  protected onCompleteEvent(event: Event): void {
    // The WC's `complete` DOM event bubbles. The wrapper's Output is also
    // named `complete`. Without stopPropagation, the parent's `(complete)`
    // binding would catch BOTH the bubbled DOM event AND the Output emit
    // below — Angular's `(name)` binding on a child component listens to
    // both channels when their names collide.
    event.stopPropagation();
    const detail = (event as CustomEvent<string>).detail ?? '';
    this.complete.emit(detail);
  }

  /** Move focus into the hidden input. */
  focus(options?: FocusOptions): void {
    this.elementRef()?.nativeElement.focus(options);
  }

  /** Reset the value to empty string. */
  clear(): void {
    this.elementRef()?.nativeElement.clear();
  }
}
