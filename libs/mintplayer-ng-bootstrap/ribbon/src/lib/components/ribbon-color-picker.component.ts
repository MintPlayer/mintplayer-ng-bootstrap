import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, forwardRef, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
@Component({
  selector: 'bs-ribbon-color-picker',
  templateUrl: './ribbon-color-picker.component.html',
  styles: [`:host { display: inline-flex; }`],
  host: {
    '[attr.size]': 'size()',
    '[attr.data-size]': 'size()',
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => BsRibbonColorPickerComponent),
      multi: true,
    },
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsRibbonColorPickerComponent implements ControlValueAccessor {
  readonly itemId = input<string>('');
  readonly label = input<string>('');
  readonly size = input<'large' | 'medium' | 'small'>('medium');
  readonly tooltip = input<string>('');

  readonly color = signal<string>('#000000');
  readonly disabledState = signal<boolean>(false);

  readonly colorChange = output<string>();

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  onColorChange(event: Event): void {
    const detail = (event as CustomEvent<{ itemId: string; color: string }>)
      .detail;
    this.color.set(detail.color);
    this.onChange(detail.color);
    this.onTouched();
    this.colorChange.emit(detail.color);
  }

  writeValue(value: string): void {
    this.color.set(value ?? '#000000');
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
