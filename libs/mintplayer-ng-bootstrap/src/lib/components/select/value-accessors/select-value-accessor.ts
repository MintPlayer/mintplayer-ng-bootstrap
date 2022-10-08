// import { AfterViewInit, Directive, forwardRef, HostListener, Input, OnDestroy } from '@angular/core';
// import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
// import { fromEvent, Subject, takeUntil } from 'rxjs';
// import { BsSelectComponent } from '../component/select.component';

import { Directive, ElementRef, forwardRef, Host, HostListener, Input, OnDestroy, Optional, Renderer2 } from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR, SelectControlValueAccessor } from "@angular/forms";
import { BsSelectComponent } from "../component/select.component";

@Directive({
  selector: 'bs-select',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsSelectValueAccessor),
    multi: true,
  }],
})
export class BsSelectValueAccessor implements ControlValueAccessor {
  constructor(private _renderer: Renderer2, private _elementRef: ElementRef, private selectBox: BsSelectComponent) {}

  onChange = (_: any) => {};
  onTouched = () => {};

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  registerOnChange(fn: (p: any) => {}) {
    this.onChange = (valueString: string) => {
      // View -> Model
      this.value = this.getOptionValue(valueString);
      fn(this.value);
      // fn(valueString);
    };
  }
  setDisabledState(isDisabled: boolean): void {
    this.setProperty('disabled', isDisabled);
  }
  protected setProperty(key: string, value: any): void {
    // if (this._elementRef) {
    //   this._renderer.setProperty(this._elementRef.nativeElement, key, value);
    // }
    if (this.selectBox.selectBox) {
      this._renderer.setProperty(this.selectBox.selectBox.nativeElement, key, value);
    }
  }

  @HostListener('change', ['$event']) hostOnChange(ev: InputEvent) {
    this.onChange((<any>ev.target).value);
  }

  @HostListener('blur', ['$event']) hostBlur(ev: Event) {
    this.onTouched();
  }

  value: any;
  optionMap = new Map<string, any>();
  idCounter = 0;

  private compareWithFunction: (value1: any, value2: any) => boolean = Object.is;
  @Input() set compareWith(value: (value1: any, value2: any) => boolean) {
    if (typeof value !== 'function') {
      throw new Error('compareWith must be a function');
    }
    this.compareWithFunction = value;
  }

  buildValueString(id: string | null, value: any) {
    if (id == null) {
      return `${value}`;
    }

    if (value && (typeof value === 'object')) {
      value = 'Object';
    }

    return `${id}: ${value}`.slice(0, 50);
  }

  extractId(valueString: string) {
    return valueString.split(':')[0];
  }

  writeValue(value: any) {
    this.value = value;
    // console.log(`WriteValue ${this.selectBox.identifier}`, value);

    const id = this.getOptionId(value);
    const valueString = this.buildValueString(id, value);
    this.setProperty('value', valueString);
  }

  registerOption() {
    return (this.idCounter++).toString();
  }

  getOptionId(value: any) {
    for (const id of Array.from(this.optionMap.keys())) {
      if (this.compareWithFunction(this.optionMap.get(id), value)) {
        return id;
      }
    }

    // This shouldn't happen
    // debugger;
    
    return null;
  }

  getOptionValue(valueString: string) {
    const id = this.extractId(valueString);
    return this.optionMap.has(id) ? this.optionMap.get(id) : valueString;
  }
}

@Directive({ selector: 'option' })
export class BsSelectOption implements OnDestroy {
  constructor(private element: ElementRef, private renderer: Renderer2, @Optional() @Host() private select: BsSelectValueAccessor) {
    if (this.select) {
      this.id = this.select.registerOption();
    }
  }
  
  id!: string;

  @Input('ngValue') set ngValue(value: any) {
    if (this.select) {
      this.select.optionMap.set(this.id, value);
      this.setElementValue(this.select.buildValueString(this.id, value));
      // console.log('ngValue', this.select.value);
      this.select.writeValue(this.select.value);
    }
  }

  @Input('value') set value(value: any) {
    this.setElementValue(value);
    if (this.select) {
      this.select.writeValue(this.select.value);
    }
  }

  setElementValue(value: string) {
    // console.log('setElementValue', value);
    // const nativeSelect = this.select['selectBox'].selectBox;
    // if (nativeSelect) {
    //   this.renderer.setProperty(nativeSelect.nativeElement, 'value', value);
    // }
    this.renderer.setProperty(this.element.nativeElement, 'value', value);
  }

  ngOnDestroy() {
    if (this.select) {
      this.select.optionMap.delete(this.id);
      this.select.writeValue(this.select.value);
    }
  }
}

// @Directive({
//   selector: 'bs-select',
//   providers: [{
//     provide: NG_VALUE_ACCESSOR,
//     useExisting: forwardRef(() => BsSelectValueAccessor),
//     multi: true,
//   }],
// })
// export class BsSelectValueAccessor implements ControlValueAccessor, AfterViewInit, OnDestroy {
//   constructor(private host: BsSelectComponent) {}

//   destroyed$ = new Subject();

//   onValueChange?: (value: any) => void;
//   onTouched?: () => void;

//   //#region Lifecycle hooks
//   ngAfterViewInit() {
//     fromEvent(this.host.selectBox.nativeElement, 'change')
//       .pipe(takeUntil(this.destroyed$))
//       .subscribe((ev) => {
//         if (this.onValueChange) {
//           const val = (<HTMLSelectElement>ev.target).value;
//           console.log('selected', val);
//           this.onValueChange(val);
//         }
//       });
//   }

//   ngOnDestroy() {
//     this.destroyed$.next(true);
//   }
//   //#endregion

//   @Input('ngValue') set ngValue(value: any) {
//     if (this.host) {
//       this.host.opt
//     }
//   }

//   //#region OptionId mapping
//   private compareWithFunction: (value1: any, value2: any) => boolean = Object.is;
//   private optionMap = new Map<string, any>();
//   @Input() public set compareWith(fn: (value1: any, value2: any) => boolean) {
//     if (typeof fn !== 'function') {
//       throw new Error('compareWith must be a function');
//     }
//     this.compareWithFunction = fn;
//   }

//   private getOptionId(value: any) {
//     for (const id of Array.from(this.optionMap.keys())) {
//       if (this.compareWith(this.optionMap.get(id), value)) {
//         return id;
//       }
//     }
//     return null;
//   }

//   private getOptionValue(valueString: string) {
//     const id = this.extractId(valueString);
//     return this.optionMap.has(id) ? this.optionMap.get(id) : valueString;
//   }

//   private extractId(valueString: string) {
//     return valueString.split(':')[0];
//   }
//   //#endregion

//   //#region ControlValueAccessor implementation
//   registerOnChange(fn: (_: any) => void) {
//     this.onValueChange = (valueString: string) => {
//       this.value = this.getOptionValue(valueString);
//       fn(this.value);
//     };
//   }
  
//   registerOnTouched(fn: () => void) {
//     this.onTouched = fn;
//   }

//   value: any;
//   writeValue(value: any) {
//     this.value = value;
//     if (this.host.selectBox) {
//       // this.host.selectBox.nativeElement.selectedIndex = this.host.selectBox.nativeElement.options.item();
//     }
//   }

//   setDisabledState(isDisabled: boolean) {
//     if (this.host.selectBox) {
//       this.host.selectBox.nativeElement.disabled = isDisabled;
//     }
//   }
//   //#endregion

// }
