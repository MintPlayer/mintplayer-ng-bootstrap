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

@Component({
  selector: 'bs-ribbon-check-box',
  template: `
    <mp-ribbon-checkbox
      [attr.item-id]="itemId()"
      [attr.label]="label()"
      [attr.size]="size()"
      [attr.disabled]="disabledState() ? '' : null"
      [attr.tooltip]="tooltip()"
      [attr.checked]="checked() ? '' : null"
      (check-change)="onCheckChange($event)"
    ></mp-ribbon-checkbox>
  `,
  styles: [`:host { display: inline-flex; }`],
  host: {
    '[attr.size]': 'size()',
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => BsRibbonCheckBoxComponent),
      multi: true,
    },
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsRibbonCheckBoxComponent implements ControlValueAccessor {
  readonly itemId = input<string>('');
  readonly label = input<string>('');
  readonly size = input<'large' | 'medium' | 'small'>('medium');
  readonly tooltip = input<string>('');

  readonly checked = signal<boolean>(false);
  readonly disabledState = signal<boolean>(false);

  readonly checkedChange = output<boolean>();

  private onChange: (v: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  onCheckChange(event: Event): void {
    const detail = (
      event as CustomEvent<{ itemId: string; checked: boolean }>
    ).detail;
    this.checked.set(detail.checked);
    this.onChange(detail.checked);
    this.onTouched();
    this.checkedChange.emit(detail.checked);
  }

  writeValue(value: boolean): void {
    this.checked.set(!!value);
  }
  registerOnChange(fn: (v: boolean) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabledState.set(isDisabled);
  }
}
