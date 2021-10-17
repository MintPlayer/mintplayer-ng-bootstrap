import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsAccordionTabComponent } from '../accordion-tab/accordion-tab.component';
import { BsAccordionComponent } from '../accordion/accordion.component';

import { BsAccordionTabHeaderComponent } from './accordion-tab-header.component';

describe('AccordionTabHeaderComponent', () => {
  let component: BsAccordionTestComponent;
  let fixture: ComponentFixture<BsAccordionTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Component to test
        BsAccordionTabHeaderComponent,
      
        // Testbench
        BsAccordionTestComponent,

        // Mock components
        BsAccordionMockComponent,
        BsAccordionTabMockComponent,
      ],
      providers: [
        { provide: BsAccordionComponent, useClass: BsAccordionMockComponent },
        { provide: BsAccordionTabComponent, useClass: BsAccordionTabMockComponent },
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsAccordionTestComponent);
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

  ngOnInit() {
  }

}

@Component({
  selector: 'bs-accordion',
  template: 'accordion works'
})
class BsAccordionMockComponent {

  ngOnInit() {
  }

}

@Component({
  selector: 'bs-accordion-tab',
  template: 'accordion-tab works'
})
class BsAccordionTabMockComponent {

  ngOnInit() {
  }

}
