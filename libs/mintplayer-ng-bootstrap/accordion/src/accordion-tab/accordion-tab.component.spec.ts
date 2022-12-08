import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BsAccordionTabHeaderComponent } from '../accordion-tab-header/accordion-tab-header.component';
import { BsAccordionComponent } from '../accordion/accordion.component';

import { BsAccordionTabComponent } from './accordion-tab.component';

describe('BsAccordionTabComponent', () => {
  let component: BsAccordionTabComponent;
  let fixture: ComponentFixture<BsAccordionTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
      ],
      declarations: [
        // Unit to test
        BsAccordionTabComponent,

        // Testbench
        BsAccordionTestComponent,
        
        // Mock components
        BsAccordionMockComponent,
        BsAccordionTabHeaderMockComponent,
      ],
      providers: [
        { provide: BsAccordionComponent, useClass: BsAccordionMockComponent },
        { provide: BsAccordionTabHeaderComponent, useClass: BsAccordionTabHeaderMockComponent },
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsAccordionTabComponent);
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
  template: 'accordion works'
})
class BsAccordionMockComponent {
}

@Component({
  selector: 'bs-accordion-tab-header',
  template: 'accordion-tab-header works'
})
class BsAccordionTabHeaderMockComponent {
}
