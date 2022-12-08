import { Component, ContentChildren, forwardRef, QueryList } from '@angular/core';
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
}

@Component({
  selector: 'bs-accordion',
  template: '<ng-content></ng-content>',
  providers: [
    { provide: BsAccordionComponent, useExisting: BsAccordionMockComponent }
  ]
})
class BsAccordionMockComponent {
}

@Component({
  selector: 'bs-accordion-tab',
  template: '<ng-content></ng-content>',
  providers: [
    { provide: BsAccordionTabComponent, useExisting: BsAccordionTabMockComponent }
  ]
})
class BsAccordionTabMockComponent {
  
  accordion: BsAccordionMockComponent;
  constructor(accordion: BsAccordionMockComponent) {
    this.accordion = accordion;
  }

  @ContentChildren(() => forwardRef(() => BsAccordionComponent)) childAccordions!: QueryList<BsAccordionComponent>;

}
