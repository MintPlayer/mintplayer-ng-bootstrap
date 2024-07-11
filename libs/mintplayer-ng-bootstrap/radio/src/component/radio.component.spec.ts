import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsRadioComponent } from './radio.component';
import { MockComponent, MockDirective, MockProvider } from 'ng-mocks';
import { BsRadioGroupDirective } from '../directives/radio-group/radio-group.directive';
import { Component, Directive, forwardRef, input } from '@angular/core';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';

@Directive({
  selector: '[bsRadioGroup]',
  standalone: true,
  providers: [
    { provide: BsRadioGroupDirective, useExisting: forwardRef(() => BsRadioGroupMockDirective) }
  ]
})
class BsRadioGroupMockDirective{
  public name = input.required<string>();
}

@Component({
  selector: 'demo-radio-test',
  template: `
    <div bsRadioGroup [name]="'group'">
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
        BsRadioGroupMockDirective
      ],
      declarations: [
        // Unit to test
        BsRadioComponent,
        
        // // Mock dependencies
        // Temp fix
        // MockDirective(BsRadioGroupDirective),

        // Testbench
        BsRadioTestComponent
      ],
      providers: [
        MockProvider(BsRadioGroupDirective)
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BsRadioTestComponent);
    await fixture.whenStable();
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
