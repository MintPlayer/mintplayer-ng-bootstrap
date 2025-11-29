import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MockModule } from 'ng-mocks';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsAccordionModule } from '@mintplayer/ng-bootstrap/accordion';
import { BsStickyFooterModule } from '@mintplayer/ng-bootstrap/sticky-footer';

import { StickyFooterComponent } from './sticky-footer.component';

describe('StickyFooterComponent', () => {
  let component: StickyFooterComponent;
  let fixture: ComponentFixture<StickyFooterComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        // Mock dependencies
        MockModule(BsGridModule),
        MockModule(BsAccordionModule),
        MockModule(BsStickyFooterModule),
        StickyFooterComponent,
      ]
    });
    fixture = TestBed.createComponent(StickyFooterComponent);
    component = fixture.componentInstance;
  });

  it('should create', async () => {
    await fixture.whenStable();
    expect(component).toBeTruthy();
  });
});
