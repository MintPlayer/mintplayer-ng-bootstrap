import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockDirective } from 'ng-mocks';
import { BsFloatingFormControlDirective } from '../floating-form-control/floating-form-control.directive';
import { BsFloatingLabelComponent } from './floating-label.component';

@Component({
  selector: 'bs-floating-label-test',
  template: `
    <bs-floating-label>
      <input type="email">
      <label>Email address</label>
    </bs-floating-label>`
})
class FloatingLabelTestComponent {}

describe('BsFloatingLabelComponent', () => {
  let component: FloatingLabelTestComponent;
  let fixture: ComponentFixture<FloatingLabelTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        BsFloatingLabelComponent,

        // Mock dependencies
        MockDirective(BsFloatingFormControlDirective),
      
        // Testbench
        FloatingLabelTestComponent,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FloatingLabelTestComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
