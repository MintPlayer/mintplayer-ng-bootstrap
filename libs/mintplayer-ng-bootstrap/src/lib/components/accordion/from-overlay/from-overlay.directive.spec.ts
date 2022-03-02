import { Component, ContentChildren, Directive, forwardRef, QueryList } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsFromOverlayDirective } from './from-overlay.directive';

@Component({
  selector: 'bs-from-overlay-test',
  template: `
    <ng-template #sidebarTemplate let-offcanvas>
      <bs-accordion [(bsFromOverlay)]="level1Menu" class="d-block">
        <bs-accordion-tab bsFromOverlayId="dishes">
          <!-- Header -->
          <bs-accordion-tab-header>Dishes</bs-accordion-tab-header>

          <bs-accordion [(bsFromOverlay)]="level2Menu" class="d-block">
            <bs-accordion-tab bsFromOverlayId="appetizer">
              <bs-accordion-tab-header>Appetizer</bs-accordion-tab-header>
              <bs-accordion class="d-block">
                <a [routerLink]='[]' class="d-block p-2">Shrimp salad</a>
                <a [routerLink]='[]' class="d-block p-2">Cucumber salad</a>
                <a [routerLink]='[]' class="d-block p-2">Egg salad</a>
              </bs-accordion>
            </bs-accordion-tab>
            <bs-accordion-tab bsFromOverlayId="firstcourse">
              <bs-accordion-tab-header>First course</bs-accordion-tab-header>
              <bs-accordion class="d-block">
                <a [routerLink]='[]' class="d-block p-2">Croque monsieur</a>
                <a [routerLink]='[]' class="d-block p-2">Mini pizzas</a>
              </bs-accordion>
            </bs-accordion-tab>
            <bs-accordion-tab bsFromOverlayId="maincourse">
              <bs-accordion-tab-header>Main course</bs-accordion-tab-header>
              <bs-accordion class="d-block">
                <a [routerLink]='[]' class="d-block p-2">Macaroni</a>
                <a [routerLink]='[]' class="d-block p-2">Lasagne Bolognaise</a>
                <a [routerLink]='[]' class="d-block p-2">Gratin</a>
              </bs-accordion>
            </bs-accordion-tab>

            <bs-accordion-tab bsFromOverlayId="dessert">
              <bs-accordion-tab-header>Dessert</bs-accordion-tab-header>
              <bs-accordion [(bsFromOverlay)]="level3Menu" class="d-block">
                <bs-accordion-tab bsFromOverlayId="chocolate">
                  <bs-accordion-tab-header>Anything with chocolate</bs-accordion-tab-header>
                  <bs-accordion class="d-block">
                    <a [routerLink]='[]' class="d-block p-2">Chocolate mousse</a>
                    <a [routerLink]='[]' class="d-block p-2">Chocolate cake</a>
                    <a [routerLink]='[]' class="d-block p-2">Chocolate ice cream</a>
                  </bs-accordion>
                </bs-accordion-tab>

                <bs-accordion-tab bsFromOverlayId="cream">
                  <bs-accordion-tab-header>Anything with cream</bs-accordion-tab-header>
                  <bs-accordion class="d-block">
                    <a [routerLink]='[]' class="d-block p-2">Ice cream</a>
                    <a [routerLink]='[]' class="d-block p-2">Dame blanche</a>
                  </bs-accordion>
                </bs-accordion-tab>
              </bs-accordion>
            </bs-accordion-tab>
          </bs-accordion>
        </bs-accordion-tab>
        <bs-accordion-tab bsFromOverlayId="management">
          <!-- Header -->
          <bs-accordion-tab-header>Management</bs-accordion-tab-header>
          <bs-accordion class="d-block">
            <a [routerLink]='[]' class="d-block p-2">Manage categories</a>
            <a [routerLink]='[]' class="d-block p-2">Manage dishes</a>
          </bs-accordion>
        </bs-accordion-tab>
      </bs-accordion>
    </ng-template>`
})
class BsFromOverlayTestComponent {
}

@Component({
  selector: 'bs-accordion',
  template: 'accordion works'
})
class BsAccordionMockComponent {
}

@Component({
  selector: 'bs-accordion-tab',
  template: 'accordion-tab works'
})
class BsAccordionTabMockComponent {
  @ContentChildren(() => forwardRef(() => BsAccordionMockComponent)) childAccordions!: QueryList<BsAccordionMockComponent>;
}

@Component({
  selector: 'bs-accordion-tab-header',
  template: 'accordion-tab-header works'
})
class BsAccordionTabHeaderMockComponent {
}

@Directive({
  selector: 'bs-accordion-tab[bsFromOverlayId]'
})
class BsFromOverlayIdMockDirective {
}

describe('BsFromOverlayDirective', () => {
  let component: BsFromOverlayTestComponent;
  let fixture: ComponentFixture<BsFromOverlayTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      declarations: [
        // Unit to test
        BsFromOverlayDirective,

        // Mock dependencies
        BsFromOverlayIdMockDirective,
        BsAccordionMockComponent,
        BsAccordionTabMockComponent,
        BsAccordionTabHeaderMockComponent,
        
        // Testbench
        BsFromOverlayTestComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsFromOverlayTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });
});
