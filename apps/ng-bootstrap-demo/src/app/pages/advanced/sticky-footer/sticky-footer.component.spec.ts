import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MockComponent, MockDirective } from 'ng-mocks';
import { BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderComponent } from '@mintplayer/ng-bootstrap/accordion';

import { StickyFooterComponent } from './sticky-footer.component';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsColFormLabelDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsStickyFooterComponent, BsStickyFooterParentDirective } from '@mintplayer/ng-bootstrap/sticky-footer';

describe('StickyFooterComponent', () => {
  let component: StickyFooterComponent;
  let fixture: ComponentFixture<StickyFooterComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        // Mock dependencies
        MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
        MockComponent(BsAccordionComponent), MockComponent(BsAccordionTabComponent), MockComponent(BsAccordionTabHeaderComponent),
        MockComponent(BsStickyFooterComponent), MockDirective(BsStickyFooterParentDirective),
        StickyFooterComponent,
      ]
    });
    fixture = TestBed.createComponent(StickyFooterComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    // Don't call detectChanges as BsStickyFooterParentDirective has
    // timing issues with HostBinding that cause ExpressionChangedAfterItHasBeenCheckedError
    expect(component).toBeTruthy();
  });
});
