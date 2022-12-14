import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsAccordionTabMockComponent, BsAccordionTabHeaderMockComponent } from '@mintplayer/ng-bootstrap/testing';
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
        BsAccordionTabMockComponent,
        BsAccordionTabHeaderMockComponent,
      ],
      providers: [
        { provide: BsAccordionTabComponent, useClass: BsAccordionTabMockComponent },
        { provide: BsAccordionTabHeaderComponent, useClass: BsAccordionTabHeaderMockComponent },
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
