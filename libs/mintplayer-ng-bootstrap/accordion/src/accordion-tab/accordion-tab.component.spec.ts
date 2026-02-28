import { Component, computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MockComponent } from 'ng-mocks';
import { BsAccordionTabHeaderComponent } from '../accordion-tab-header/accordion-tab-header.component';
import { BsAccordionComponent } from '../accordion/accordion.component';

import { BsAccordionTabComponent } from './accordion-tab.component';

class BsAccordionMockProvider {
  accordionTabCounter = 0;
  accordionId = signal<number>(1);
  accordionName = computed(() => `bs-accordion-${this.accordionId()}`);
  tabPages: BsAccordionTabComponent[] = [];
  disableAnimations = false;
}

describe('BsAccordionTabComponent', () => {
  let component: BsAccordionTabComponent;
  let fixture: ComponentFixture<BsAccordionTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        // Unit to test
        BsAccordionTabComponent,

        // Mock in-module components
        MockComponent(BsAccordionComponent),
        MockComponent(BsAccordionTabHeaderComponent),

        // Testbench
        BsAccordionTestComponent,
      ],
      providers: [
        { provide: BsAccordionComponent, useClass: BsAccordionMockProvider },
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
class BsAccordionTestComponent {}
