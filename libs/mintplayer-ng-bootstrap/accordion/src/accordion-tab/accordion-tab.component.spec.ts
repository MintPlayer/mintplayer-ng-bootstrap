import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MockComponent } from 'ng-mocks';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { BsAccordionTabHeaderComponent } from '../accordion-tab-header/accordion-tab-header.component';
import { BsAccordionComponent } from '../accordion/accordion.component';

import { BsAccordionTabComponent } from './accordion-tab.component';

class BsAccordionMockProvider {
  accordionTabCounter = 0;
  accordionId$ = new BehaviorSubject<number>(1);
  accordionName$: Observable<string> = this.accordionId$.pipe(map((id) => `bs-accordion-${id}`));
  tabPages: BsAccordionTabComponent[] = [];
}

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
  standalone: false,
  template: `
  <bs-accordion>
    <bs-accordion-tab>
      <bs-accordion-tab-header>
      </bs-accordion-tab-header>
    </bs-accordion-tab>
  </bs-accordion>`
})
class BsAccordionTestComponent {}
