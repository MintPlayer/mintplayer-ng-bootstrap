import { AfterViewInit, DestroyRef, Directive, forwardRef } from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import { BsCheckboxComponent } from "./checkbox.component";
import { fromEvent } from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

@Directive({
    selector: 'bs-checkbox',
    providers: [{
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => BsCheckboxValueAccessor),
        multi: true,
    }],
})
export class BsCheckboxValueAccessor implements ControlValueAccessor, AfterViewInit {
    constructor(private host: BsCheckboxComponent, private destroy: DestroyRef) {}

    ngAfterViewInit() {
        fromEvent(this.host.checkbox.nativeElement, 'change')
            .pipe(takeUntilDestroyed(this.destroy))
            .subscribe((ev) => {
                if (this.onValueChange && this.host.checkbox) {
                    const group = this.host.group$.value;
                    const isChecked = (<HTMLInputElement>ev.target).checked;
                    console.log('group', group);
                    if (!group) {
                    //     console.log('group.checkboxes', group.checkboxes);
                    //     if (group.checkboxes) {
                    //         const result = group.checkboxes
                    //             .map(tb => ({ value: tb.value, checked: tb.checkbox.nativeElement.checked }))
                    //             .filter(tb => !!tb.value && tb.checked)
                    //             .map(tb => <string>tb.value);

                    //         this.onValueChange(result);
                    //     }
                    // } else {
                        // console.log('onValueChange', { onValueChange: this.onValueChange,isChecked});
                        this.onValueChange(isChecked);
                    }
                }
            });
    }

    onValueChange?: (value: boolean | string[]) => void;
    onTouched?: () => void;

    //#region ControlValueAccessor implementation
    registerOnChange(fn: (_: any) => void) {
        // console.warn('never called', fn);
        this.onValueChange = fn;
    }

    registerOnTouched(fn: () => void) {
        this.onTouched = fn;
    }

    writeValue(value: boolean | null) {
        // console.warn('write', value);
        this.host.isChecked = value;
    }

    setDisabledState(isDisabled: boolean) {
        this.host.isEnabled = !isDisabled;
    }
    //#endregion
}