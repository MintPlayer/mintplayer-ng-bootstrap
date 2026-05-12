import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  forwardRef,
  input,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import type { RibbonGroupButtonOption } from '../web-components/items/mp-ribbon-group-button.element';

@Component({
  selector: 'bs-ribbon-group-button',
  template: `
    <mp-ribbon-group-button
      [attr.item-id]="itemId()"
      [attr.label]="label()"
      [attr.size]="size()"
      [attr.disabled]="disabledState() ? '' : null"
      [attr.tooltip]="tooltip()"
      [attr.selected-value]="selectedValue()"
      [buttons]="buttons()"
      (group-select)="onGroupSelect($event)"
    ></mp-ribbon-group-button>
  `,
  styles: [`:host { display: inline-flex; }`],
  host: {
    '[attr.size]': 'size()',
    '[attr.data-size]': 'size()',
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => BsRibbonGroupButtonComponent),
      multi: true,
    },
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsRibbonGroupButtonComponent implements ControlValueAccessor {
  readonly itemId = input<string>('');
  readonly label = input<string>('');
  readonly size = input<'large' | 'medium' | 'small'>('medium');
  readonly tooltip = input<string>('');
  readonly buttons = input<RibbonGroupButtonOption[]>([]);

  readonly selectedValue = signal<string>('');
  readonly disabledState = signal<boolean>(false);

  readonly selectedValueChange = output<string>();

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  onGroupSelect(event: Event): void {
    const detail = (event as CustomEvent<{ itemId: string; value: string }>)
      .detail;
    this.selectedValue.set(detail.value);
    this.onChange(detail.value);
    this.onTouched();
    this.selectedValueChange.emit(detail.value);
  }

  writeValue(value: string): void {
    this.selectedValue.set(value ?? '');
  }
  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabledState.set(isDisabled);
  }
}
