import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent, MockComponents, MockProvider, MockProviders } from 'ng-mocks';
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

        // Mock in-module components
        MockComponent(BsAccordionComponent),
        MockComponent(BsAccordionTabComponent),
      
        // Testbench
        BsAccordionTestComponent,
      ],
      providers: [
        MockProvider(BsAccordionComponent),
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
class BsAccordionTestComponent {}