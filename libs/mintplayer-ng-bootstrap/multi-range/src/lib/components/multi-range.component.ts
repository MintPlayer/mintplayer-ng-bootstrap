import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  computed,
  effect,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { MintMultiRangeElement } from '../web-components/mint-multi-range.element';
import { BsMultiRangeValueAccessor } from '../value-accessor/multi-range-value-accessor';
import { MultiRangeOrientation } from '../types/multi-range-orientation';

@Component({
  selector: 'bs-multi-range',
  template: `
    <mp-multi-range
      #el
      class="bs-multi-range"
      [attr.min]="min()"
      [attr.max]="max()"
      [attr.step]="step()"
      [attr.min-distance]="minDistance()"
      [attr.orientation]="orientation()"
      [attr.disabled]="disabledAttr()"
      [attr.aria-label]="label()"
      (value-input)="onValueInput($event)"
      (value-change)="onValueChange($event)"
    ></mp-multi-range>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .bs-multi-range { display: block; width: 100%; }
    :host([orientation='vertical']) { width: auto; height: 100%; }
  `],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [BsMultiRangeValueAccessor],
})
export class BsMultiRangeComponent {
  readonly min = input(0);
  readonly max = input(100);
  readonly step = input(1);
  readonly minDistance = input(0);
  readonly orientation = input<MultiRangeOrientation>('horizontal');
  readonly disabled = input(false);
  readonly formatValue = input<((value: number) => string) | null>(null);
  readonly label = input<string | null>(null);

  readonly value = model<number[]>([]);

  readonly valueChange = output<number[]>();
  readonly valueInput = output<number[]>();

  readonly elementRef = viewChild.required<ElementRef<MintMultiRangeElement>>('el');

  protected readonly disabledAttr = computed(() => (this.disabled() ? '' : null));

  constructor() {
    effect(() => {
      const ref = this.elementRef();
      if (!ref) return;
      ref.nativeElement.value = this.value();
    });
    effect(() => {
      const ref = this.elementRef();
      if (!ref) return;
      ref.nativeElement.formatValue = this.formatValue();
    });
  }

  protected onValueInput(event: Event): void {
    const detail = (event as CustomEvent<number[]>).detail;
    if (!detail) return;
    this.value.set(detail);
    this.valueInput.emit(detail);
  }

  protected onValueChange(event: Event): void {
    const detail = (event as CustomEvent<number[]>).detail;
    if (!detail) return;
    this.value.set(detail);
    this.valueChange.emit(detail);
  }

  /** Imperatively read the currently-rendered values from the WC. */
  getValues(): number[] {
    const ref = this.elementRef();
    return ref ? ref.nativeElement.getValues() : [];
  }
}
