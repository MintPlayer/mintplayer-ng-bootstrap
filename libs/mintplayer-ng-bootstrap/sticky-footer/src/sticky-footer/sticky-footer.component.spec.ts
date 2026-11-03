import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, computed, Directive, signal } from '@angular/core';
import { BsStickyFooterComponent } from './sticky-footer.component';
import { BsStickyFooterParentDirective } from '../sticky-footer-parent/sticky-footer-parent.directive';
import { BsObserveSizeDirective } from '@mintplayer/ng-bootstrap/observe-size';

/** The footer's size observer, with a size the test controls (jsdom has no layout). */
@Directive({
  selector: '[bsObserveSize]',
  exportAs: 'bsObserveSize',
})
class BsObserveSizeDirectiveStub {
  readonly size = signal<{ width: number; height: number } | undefined>({ width: 100, height: 50 });
  readonly width = computed(() => this.size()?.width);
  readonly height = computed(() => this.size()?.height);
}

@Component({
  selector: 'sticky-footer-test',
  template: `
    <div bsStickyFooterParent>
      <bs-sticky-footer>
        Content
      </bs-sticky-footer>
    </div>`,
  imports: [BsStickyFooterComponent, BsStickyFooterParentDirective],
})
class BsStickyFooterTestComponent {}

describe('BsStickyFooterComponent', () => {
  let fixture: ComponentFixture<BsStickyFooterTestComponent>;

  beforeEach(async () => {
    TestBed.overrideComponent(BsStickyFooterComponent, {
      remove: { imports: [BsObserveSizeDirective] },
      add: { imports: [BsObserveSizeDirectiveStub] },
    });
    await TestBed.configureTestingModule({ imports: [BsStickyFooterTestComponent] }).compileComponents();
    fixture = TestBed.createComponent(BsStickyFooterTestComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const parent = () => fixture.nativeElement.querySelector('[bsStickyFooterParent]') as HTMLElement;
  const observer = () => fixture.debugElement.query((de) => de.name === 'footer').injector.get(BsObserveSizeDirectiveStub);

  // The parent reserved nothing in a zoneless app: the footer wrote a plain
  // field, which a host binding never re-renders.
  it('reserves the footer height on the parent', () => {
    expect(parent().style.marginBottom).toBe('50px');
  });

  it('follows a footer resize', async () => {
    observer().size.set({ width: 100, height: 80 });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(parent().style.marginBottom).toBe('80px');
  });
});
