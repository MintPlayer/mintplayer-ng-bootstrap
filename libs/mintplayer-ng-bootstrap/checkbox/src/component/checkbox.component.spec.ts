import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsCheckboxComponent } from './checkbox.component';
import { Component } from '@angular/core';
import { MockComponent, MockDirective } from 'ng-mocks';
import { BsCheckboxGroupDirective } from '../directives/checkbox-group/checkbox-group.directive';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';

@Component({
  selector: 'demo-checkbox-test',
  template: `
    <div bsCheckboxGroup>
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
      ],
      declarations: [
        // Unit to test
        BsCheckboxComponent,

        // Mock dependencies
        MockDirective(BsCheckboxGroupDirective),

        // Testbench
        BsCheckboxTestComponent,
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BsCheckboxTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
