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
import type { RibbonComboBoxOption } from '../web-components/items/mp-ribbon-combobox.element';

@Component({
  selector: 'bs-ribbon-combo-box',
  template: `
    <mp-ribbon-combobox
      [attr.item-id]="itemId()"
      [attr.label]="label()"
      [attr.size]="size()"
      [attr.disabled]="disabledState() ? '' : null"
      [attr.tooltip]="tooltip()"
      [attr.value]="value()"
      [options]="options()"
      (value-change)="onValueChange($event)"
    ></mp-ribbon-combobox>
  `,
  styles: [`:host { display: inline-flex; }`],
  host: {
    '[attr.size]': 'size()',
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => BsRibbonComboBoxComponent),
      multi: true,
    },
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsRibbonComboBoxComponent implements ControlValueAccessor {
  readonly itemId = input<string>('');
  readonly label = input<string>('');
  readonly size = input<'large' | 'medium' | 'small'>('medium');
  readonly tooltip = input<string>('');
  readonly options = input<RibbonComboBoxOption[]>([]);

  readonly value = signal<string>('');
  readonly disabledState = signal<boolean>(false);

  readonly valueChange = output<string>();

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  onValueChange(event: Event): void {
    const detail = (
      event as CustomEvent<{ itemId: string; value: string }>
    ).detail;
    this.value.set(detail.value);
    this.onChange(detail.value);
    this.onTouched();
    this.valueChange.emit(detail.value);
  }

  writeValue(value: string): void {
    this.value.set(value ?? '');
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
