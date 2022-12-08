import { Component, Directive, forwardRef, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

import { SelectComponent } from './select.component';

@Component({
  selector: 'bs-grid',
  template: `
    <div>
      <ng-content></ng-content>
    </div>`
})
class BsGridMockComponent {
  @Input() stopFullWidthAt: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'never' = 'sm';
}

@Directive({
  selector: '[bsColumn]'
})
class BsColumnMockDirective {
  @Input() bsColumn?: object | '';
}

@Component({
  selector: 'bs-select',
  template: `
    <select>
      <ng-content></ng-content>
    </select>`
})
class BsSelectMockComponent {
  @Input() public identifier = 0;
}

@Directive({
  selector: 'bs-select',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsSelectMockValueAccessor),
    multi: true,
  }],
})
class BsSelectMockValueAccessor implements ControlValueAccessor {
  registerOnChange(fn: (_: any) => void) {}
  registerOnTouched(fn: () => void) {}
  writeValue(value: boolean | string | string[]) {}
  setDisabledState(isDisabled: boolean) {}
}


@Directive({ selector: 'option' })
class BsMockSelectOption {
  @Input('ngValue') ngValue: any = null;
  @Input('value') value: any = null;

  setElementValue(value: string) {}
}

describe('SelectComponent', () => {
  let component: SelectComponent;
  let fixture: ComponentFixture<SelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule
      ],
      declarations: [
        // Unit to test
        SelectComponent,

        // Mock dependencies
        BsGridMockComponent,
        BsColumnMockDirective,
        BsSelectMockComponent,
        BsSelectMockValueAccessor,
        BsMockSelectOption
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
