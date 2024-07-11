import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsCheckboxComponent } from './checkbox.component';
import { Component, Directive, forwardRef, input } from '@angular/core';
import { MockComponent } from 'ng-mocks';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';
import { BsCheckboxGroupDirective } from '../directives/checkbox-group/checkbox-group.directive';

// Temp fix
@Directive({
  selector: '[bsCheckboxGroup]',
  standalone: true,
  providers: [
    { provide: BsCheckboxGroupDirective, useExisting: forwardRef(() => BsCheckboxGroupMockDirective) }
  ]
})
class BsCheckboxGroupMockDirective{
  name = input.required<string>();
}

@Component({
  selector: 'demo-checkbox-test',
  template: `
    <div bsCheckboxGroup [name]="'group'">
      <bs-checkbox>
        This is a checkbox
      </bs-checkbox>
    </div>`
})
class BsCheckboxTestComponent {}

describe('BsCheckboxComponent', () => {
  let component: BsCheckboxTestComponent;
  let fixture: ComponentFixture<BsCheckboxTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // Mock dependencies
        MockComponent(BsToggleButtonComponent),
        BsCheckboxGroupMockDirective
      ],
      declarations: [
        // Unit to test
        BsCheckboxComponent,

        // Mock dependencies
        // Temp fix
        // MockDirective(BsCheckboxGroupDirective),

        // Testbench
        BsCheckboxTestComponent,
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BsCheckboxTestComponent);
    await fixture.whenStable();
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
