import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsDropdownDirective } from '../dropdown/dropdown.directive';
import { BsDropdownMenuDirective } from './dropdown-menu.directive';
import { OverlayModule } from '@angular/cdk/overlay';
import { MockDirective, MockModule, MockProvider } from 'ng-mocks';
import { BsDropdownToggleDirective } from '../dropdown-toggle/dropdown-toggle.directive';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'bs-dropdown-menu-test',
  template: `
    <div bsDropdown [closeOnClickOutside]="true">
      <button bsDropdownToggle>Dropdown</button>
      <div *bsDropdownMenu>
        Dropdown contents
      </div>
    </div>`
})
class BsDropdownMenuTestComponent {
}

describe('BsDropdownMenuDirective', () => {
  let component: BsDropdownMenuTestComponent;
  let fixture: ComponentFixture<BsDropdownMenuTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(OverlayModule),
      ],
      declarations: [
        // Directive to test
        BsDropdownMenuDirective,

        // Mock directives
        // MockDirective(BsDropdownDirective, { isOpen$: new BehaviorSubject<boolean>(false) }),
        MockDirective(BsDropdownDirective),
        MockDirective(BsDropdownToggleDirective),

        // Testbench
        BsDropdownMenuTestComponent
      ],
      providers: [
        MockProvider(BsDropdownDirective, {
          isOpen$: new BehaviorSubject<boolean>(false)
        })
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsDropdownMenuTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });
});
