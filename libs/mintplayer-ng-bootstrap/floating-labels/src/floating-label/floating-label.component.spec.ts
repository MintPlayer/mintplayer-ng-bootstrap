import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';
import { MockComponent } from 'ng-mocks';
import { BsFloatingLabelComponent } from './floating-label.component';

@Component({
  selector: 'bs-floating-label-test',
  template: `
    <bs-form>
      <bs-floating-label>
        <input type="email">
        <label>Email address</label>
      </bs-floating-label>
    </bs-form>`
})
class FloatingLabelTestComponent {}

describe('BsFloatingLabelComponent', () => {
  let component: FloatingLabelTestComponent;
  let fixture: ComponentFixture<FloatingLabelTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // Unit to test
        BsFloatingLabelComponent,
      ],
      declarations: [
        // Mock dependencies
        MockComponent(BsFormComponent),
      
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
