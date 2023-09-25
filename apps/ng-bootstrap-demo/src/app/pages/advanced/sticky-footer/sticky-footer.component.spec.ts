import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockModule } from 'ng-mocks';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsTrackByModule } from '@mintplayer/ng-bootstrap/track-by';
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
        MockModule(BsGridModule),
        MockModule(BsTrackByModule),
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
