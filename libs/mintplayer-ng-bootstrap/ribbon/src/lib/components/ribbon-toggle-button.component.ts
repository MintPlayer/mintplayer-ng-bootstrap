import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, forwardRef, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
@Component({
  selector: 'bs-ribbon-toggle-button',
  templateUrl: './ribbon-toggle-button.component.html',
  styles: [`:host { display: inline-flex; }`],
  host: {
    '[attr.size]': 'size()',
    '[attr.data-size]': 'size()',
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => BsRibbonToggleButtonComponent),
      multi: true,
    },
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsRibbonToggleButtonComponent implements ControlValueAccessor {
  readonly itemId = input<string>('');
  readonly label = input<string>('');
  readonly icon = input<string>('');
  readonly size = input<'large' | 'medium' | 'small'>('medium');
  readonly tooltip = input<string>('');

  readonly pressed = signal<boolean>(false);
  readonly disabledState = signal<boolean>(false);

  readonly pressedChange = output<boolean>();

  private onChange: (v: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  onToggle(event: Event): void {
    const detail = (
      event as CustomEvent<{ itemId: string; pressed: boolean }>
    ).detail;
    this.pressed.set(detail.pressed);
    this.onChange(detail.pressed);
    this.onTouched();
    this.pressedChange.emit(detail.pressed);
  }

  writeValue(value: boolean): void {
    this.pressed.set(!!value);
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
