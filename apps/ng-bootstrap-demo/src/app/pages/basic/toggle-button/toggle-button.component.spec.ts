import { Component, ContentChildren, Directive, EventEmitter, forwardRef, Input, Output, QueryList } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ToggleButtonComponent } from './toggle-button.component';

type BsCheckStyleMock = 'checkbox' | 'radio' | 'switch' | 'toggle_button' | 'radio_toggle_button';

@Component({
  selector: 'bs-grid',
  template: 'grid'
})
class BsGridMockComponent { }

@Directive({
  selector: '[bsColumn]'
})
class BsGridColumnMockDirective {
  @Input() public bsColumn: string | null = '';
}

@Component({
  selector: 'bs-toggle-button',
  template: 'toggle-button'
})
class BsToggleButtonMockComponent {
  @Output() public isToggledChange = new EventEmitter<boolean | null>();
  @Input() public isToggled: boolean | null = false;
  @Input() public round = true;
  @Input() public disabled = false;
  @Input() public group: BsToggleButtonGroupMockDirective | null = null;
  @Input() public type: BsCheckStyleMock = 'checkbox';
  @Input() public value: string | null = null;
  @Input() public name: string | null = null;

}

@Directive({
  selector: '[bsToggleButtonGroup]',
  exportAs: 'bsToggleButtonGroup'
})
class BsToggleButtonGroupMockDirective {

  constructor() { }

  @ContentChildren(BsToggleButtonMockComponent, { descendants: true }) toggleButtons!: QueryList<BsToggleButtonMockComponent>;
}

@Directive({
  selector: 'bs-toggle-button',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BsToggleButtonMockValueAccessor),
    multi: true,
  }],
})
class BsToggleButtonMockValueAccessor implements ControlValueAccessor {
  onValueChange?: (value: boolean | string | string[]) => void;
  onTouched?: () => void;

  registerOnChange(fn: (_: any) => void) {
    this.onValueChange = fn;
  }
  
  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  writeValue(value: boolean | string | string[]) {
  }

  setDisabledState(isDisabled: boolean) {
  }
}

describe('ToggleButtonComponent', () => {
  let component: ToggleButtonComponent;
  let fixture: ComponentFixture<ToggleButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule
      ],
      declarations: [
        // Unit to test
        ToggleButtonComponent,

        // Mock dependencies
        BsGridMockComponent,
        BsGridColumnMockDirective,
        BsToggleButtonMockComponent,
        BsToggleButtonGroupMockDirective,
        BsToggleButtonMockValueAccessor
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ToggleButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
