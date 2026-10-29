import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { JsonPipe } from '@angular/common';
import { AbstractControl } from '@angular/forms';
import { map, startWith, switchMap } from 'rxjs';

/**
 * Shows a form control's live value and state, with a button that disables it.
 * Works for both form styles: pass `[formControl]`'s control, or `ngModel`'s
 * `.control` from a `#m="ngModel"` template reference.
 */
@Component({
  selector: 'demo-form-state',
  imports: [JsonPipe],
  template: `
    @let s = state();
    @if (s) {
      <div class="small mt-2">
        <div>Value: <code>{{ s.value | json }}</code></div>
        <div class="text-secondary">dirty: {{ s.dirty }} · touched: {{ s.touched }} · disabled: {{ s.disabled }}</div>
        <button type="button" class="btn btn-sm btn-outline-secondary mt-1" (click)="toggleDisabled()">
          {{ s.disabled ? 'Enable' : 'Disable' }}
        </button>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoFormStateComponent {
  readonly control = input.required<AbstractControl>();
  /** Summarises a large value (a signature's points) instead of printing it whole. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly format = input<(value: any) => unknown>((value) => value);

  protected readonly state = toSignal(toObservable(this.control).pipe(
    switchMap((c) => c.events.pipe(
      startWith(null),
      map(() => ({ value: this.format()(c.value), dirty: c.dirty, touched: c.touched, disabled: c.disabled })),
    )),
  ));

  protected toggleDisabled() {
    const c = this.control();
    if (c.disabled) c.enable();
    else c.disable();
  }
}
