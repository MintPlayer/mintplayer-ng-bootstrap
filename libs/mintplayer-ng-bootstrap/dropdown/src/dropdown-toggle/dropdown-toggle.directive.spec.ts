import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsDropdownDirective } from '../dropdown/dropdown.directive';
import { BsDropdownToggleDirective } from './dropdown-toggle.directive';
import { MockDirectives } from 'ng-mocks';
import { BsDropdownMenuDirective } from '../dropdown-menu/dropdown-menu.directive';

@Component({
  selector: 'bs-dropdown-toggle-test',
  standalone: false,
  template: `
    <div bsDropdown [closeOnClickOutside]="true">
      <button bsDropdownToggle>Dropdown</button>
      <div *bsDropdownMenu>
        Dropdown contents
      </div>
    </div>`
})
class BsDropdownToggleTestComponent {
}

describe('BsDropdownToggleDirective', () => {
  let component: BsDropdownToggleTestComponent;
  let fixture: ComponentFixture<BsDropdownToggleTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      declarations: [
        // Directive to test
        BsDropdownToggleDirective,

        // Mock directives
        MockDirectives(BsDropdownDirective, BsDropdownMenuDirective),

        // Testbench
        BsDropdownToggleTestComponent
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsDropdownToggleTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });
});
