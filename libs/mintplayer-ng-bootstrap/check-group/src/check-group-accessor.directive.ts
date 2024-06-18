import { Directive, forwardRef } from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import { BsCheckGroupDirective } from "./check-group.directive";

@Directive({
    selector: '[bsCheckGroup]',
    providers: [{
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => BsCheckGroupValueAccessor),
        multi: true,
    }],
})
export class BsCheckGroupValueAccessor implements ControlValueAccessor {
    constructor(private host: BsCheckGroupDirective) { }

    onValueChange?: (value: number) => void;
    onTouched?: () => void;

    //#region ControlValueAccessor implementation
    registerOnChange(fn: (_: any) => void) {
        this.onValueChange = fn;
    }

    registerOnTouched(fn: () => void) {
        this.onTouched = fn;
    }

    writeValue(value?: any) {
        this.host.setValue(value);
        // if (this.host.slider && (typeof value === 'number')) {
        //     this.host.slider.nativeElement.value = value.toString();
        // }
    }

    setDisabledState(isDisabled: boolean) {
        this.host.setDisabled(isDisabled);
        // if (this.host.slider) {
        //     this.host.slider.nativeElement.disabled = isDisabled;
        // }
    }
    //#endregion
}