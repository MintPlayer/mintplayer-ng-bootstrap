import { Component, ContentChildren, forwardRef, QueryList } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

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

@Component({
  selector: 'bs-accordion-tab',
  template: 'accordion-tab works'
})
class BsAccordionTabMockComponent {
  @ContentChildren(() => forwardRef(() => BsAccordionComponent)) childAccordions!: QueryList<BsAccordionComponent>;
}

@Component({
  selector: 'bs-accordion-tab-header',
  template: 'accordion-tab-header works'
})
class BsAccordionTabHeaderMockComponent {
}
