import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverlayModule } from '@angular/cdk/overlay';
import { BsDropdownDirective } from './dropdown.directive';
import { BsDropdownMenuDirective } from '../dropdown-menu/dropdown-menu.directive';
import { MockDirective, MockModule, MockProvider } from 'ng-mocks';
import { BsDropdownToggleDirective } from '../dropdown-toggle/dropdown-toggle.directive';
import { BS_DEVELOPMENT } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-dropdown-test',
  standalone: false,
  template: `
    <div bsDropdown [closeOnClickOutside]="true">
      <button bsDropdownToggle>Dropdown</button>
      <div *bsDropdownMenu>
        Dropdown contents
      </div>
    </div>`
})
class BsDropdownTestComponent {
}

describe('BsDropdownDirective', () => {
  let component: BsDropdownTestComponent;
  let fixture: ComponentFixture<BsDropdownTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(OverlayModule),
      ],
      declarations: [
        // Directive to test
        BsDropdownDirective,

        // Mock directives
        MockDirective(BsDropdownMenuDirective),
        MockDirective(BsDropdownToggleDirective),

        // Testbench
        BsDropdownTestComponent
      ],
      providers: [
        MockProvider(BS_DEVELOPMENT)
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsDropdownTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });
});
