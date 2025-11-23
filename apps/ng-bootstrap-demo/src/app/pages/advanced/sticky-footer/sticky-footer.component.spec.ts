import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockModule } from 'ng-mocks';
import { BsGridComponent, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsAccordionModule } from '@mintplayer/ng-bootstrap/accordion';
import { BsStickyFooterModule } from '@mintplayer/ng-bootstrap/sticky-footer';

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
        MockModule(BsAccordionModule),
        MockModule(BsStickyFooterModule),
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
