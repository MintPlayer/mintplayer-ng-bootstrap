import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockModule } from 'ng-mocks';
import { BsGridComponent, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderComponent } from '@mintplayer/ng-bootstrap/accordion';
import { BsStickyFooterComponent, BsStickyFooterParentDirective } from '@mintplayer/ng-bootstrap/sticky-footer';

import { StickyFooterComponent } from './sticky-footer.component';

describe('StickyFooterComponent', () => {
  let component: StickyFooterComponent;
  let fixture: ComponentFixture<StickyFooterComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [StickyFooterComponent],
      imports: [
        // Mock dependencies
        MockModule(BsGridComponent, BsGridRowDirective),
        MockModule(BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderComponent),
        MockModule(BsStickyFooterComponent, BsStickyFooterParentDirective),
      ]
    });
    fixture = TestBed.createComponent(StickyFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
