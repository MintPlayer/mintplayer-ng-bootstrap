import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockDirective } from 'ng-mocks';
import { Component, Directive, forwardRef, signal } from '@angular/core';
import { BsStickyFooterComponent } from './sticky-footer.component';
import { BsStickyFooterParentDirective } from '../sticky-footer-parent/sticky-footer-parent.directive';
import { BsObserveSizeDirective } from '@mintplayer/ng-swiper/observe-size';

@Directive({
  selector: '[bsObserveSize]',
  exportAs: 'bsObserveSize',
  providers: [
    { provide: BsObserveSizeDirective, useExisting: forwardRef(() => BsObserveSizeDirectiveStub) }
  ]
})
class BsObserveSizeDirectiveStub {
  size = signal<{ width: number; height: number } | undefined>({ width: 100, height: 50 });
  width = signal<number | undefined>(100);
  height = signal<number | undefined>(50);
}

@Component({
  selector: 'sticky-footer-test',
  template: `
    <div bsStickyFooterParent>
      <bs-sticky-footer>
        Content
      </bs-sticky-footer>
    </div>`
})
class BsStickyFooterTestComponent {
}

describe('BsStickyFooterComponent', () => {
  let component: BsStickyFooterTestComponent;
  let fixture: ComponentFixture<BsStickyFooterTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BsObserveSizeDirectiveStub,
        // Unit test
        BsStickyFooterComponent,

        // Mock dependencies
        MockDirective(BsStickyFooterParentDirective),

        // Testbench
        BsStickyFooterTestComponent
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BsStickyFooterTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
