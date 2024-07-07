import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsRadioComponent } from './radio.component';
import { MockComponent, MockDirective, MockProvider } from 'ng-mocks';
import { BsRadioGroupDirective } from '../directives/radio-group/radio-group.directive';
import { Component } from '@angular/core';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';

@Component({
  selector: 'demo-radio-test',
  template: `
    <div bsRadioGroup>
      <bs-radio>
        This is a radio button
      </bs-radio>
    </div>`
})
class BsRadioTestComponent {}

describe('BsRadioComponent', () => {
  let component: BsRadioTestComponent;
  let fixture: ComponentFixture<BsRadioTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // Mock dependencies
        MockComponent(BsToggleButtonComponent),
      ],
      declarations: [
        // Unit to test
        BsRadioComponent,
        
        // Mock dependencies
        MockDirective(BsRadioGroupDirective),

        // Testbench
        BsRadioTestComponent
      ],
      providers: [
        MockProvider(BsRadioGroupDirective)
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BsRadioTestComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
