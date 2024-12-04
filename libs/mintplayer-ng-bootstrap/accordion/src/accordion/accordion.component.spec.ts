import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent } from 'ng-mocks';
import { BsAccordionTabHeaderComponent } from '../accordion-tab-header/accordion-tab-header.component';
import { BsAccordionTabComponent } from '../accordion-tab/accordion-tab.component';

import { BsAccordionComponent } from './accordion.component';

describe('BsAccordionComponent', () => {
  let component: BsAccordionComponent;
  let fixture: ComponentFixture<BsAccordionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Component to test
        BsAccordionComponent,

        // Testbench
        BsAccordionTestComponent,

        // Mock components
        MockComponent(BsAccordionTabComponent),
        MockComponent(BsAccordionTabHeaderComponent),
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsAccordionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

@Component({
  selector: 'bs-accordion-test',
  standalone: true,
  template: `
  <bs-accordion>
    <bs-accordion-tab>
      <bs-accordion-tab-header>
      </bs-accordion-tab-header>
    </bs-accordion-tab>
  </bs-accordion>`
})
class BsAccordionTestComponent {
}
