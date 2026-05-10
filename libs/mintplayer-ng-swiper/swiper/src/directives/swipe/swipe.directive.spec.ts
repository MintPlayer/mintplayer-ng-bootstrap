import { Component, computed, Directive, forwardRef, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { BsSwipeContainerDirective } from '../swipe-container/swipe-container.directive';
import { BsSwipeDirective } from './swipe.directive';

@Directive({
  selector: '[bsSwipeContainer]',
  providers: [
    { provide: BsSwipeContainerDirective, useExisting: forwardRef(() => BsSwipeContainerDirectiveStub) }
  ]
})
class BsSwipeContainerDirectiveStub {
  orientation = signal<'horizontal' | 'vertical'>('horizontal');
  maxSlideHeight = computed(() => 100);
  startTouch = signal<any>(null);
  lastTouch = signal<any>(null);
  pendingAnimation: { finish(): void } | null = null;
  // The real container computes actualSwipes from contentChildren; for the
  // creation smoke test the stub returns an empty list (effectiveAriaLabel
  // then resolves to null, which is fine).
  actualSwipes = computed<any[]>(() => []);

  onSwipe(_distance: number) {}
}

@Component({
  selector: 'swipe-test-component',
  imports: [BsSwipeContainerDirectiveStub, BsSwipeDirective],
  template: `
    <div bsSwipeContainer>
      @for (n of images; track n) {
        <div bsSwipe>Slide {{ n }}</div>
      }
    </div>`
})
class SwipeTestComponent {
  images = ['a', 'b', 'c', 'd'];
}

describe('BsSwipeDirective', () => {
  let fixture: ComponentFixture<SwipeTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SwipeTestComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SwipeTestComponent);
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(fixture).toBeTruthy();
  });
});

@Component({
  selector: 'swipe-aria-default-host',
  imports: [BsSwipeContainerDirective, BsSwipeDirective],
  template: `
    <div bsSwipeContainer>
      @for (n of slides(); track n) {
        <div bsSwipe>Slide {{ n }}</div>
      }
    </div>
  `,
})
class SwipeAriaDefaultHost {
  slides = signal(['a', 'b', 'c']);
}

@Component({
  selector: 'swipe-aria-offside-host',
  imports: [BsSwipeContainerDirective, BsSwipeDirective],
  template: `
    <div bsSwipeContainer>
      <div bsSwipe [offside]="true">offside-start</div>
      @for (n of slides(); track n) {
        <div bsSwipe>Slide {{ n }}</div>
      }
      <div bsSwipe [offside]="true">offside-end</div>
    </div>
  `,
})
class SwipeAriaOffsideHost {
  slides = signal(['a', 'b', 'c']);
}

@Component({
  selector: 'swipe-aria-override-host',
  imports: [BsSwipeContainerDirective, BsSwipeDirective],
  template: `
    <div bsSwipeContainer>
      @for (slide of slides(); track slide.id) {
        <div bsSwipe
             [ariaRoledescription]="slide.roledescription"
             [ariaLabel]="slide.label">
          {{ slide.id }}
        </div>
      }
    </div>
  `,
})
class SwipeAriaOverrideHost {
  slides = signal<{ id: string; roledescription: string | null; label: string | null }[]>([
    { id: 'a', roledescription: 'image', label: null },
    { id: 'b', roledescription: 'image', label: null },
    { id: 'c', roledescription: 'image', label: null },
  ]);
}

function visibleSlides<T>(fixture: ComponentFixture<T>): HTMLElement[] {
  return fixture.debugElement
    .queryAll(By.directive(BsSwipeDirective))
    .map(d => d.nativeElement as HTMLElement)
    .filter(el => el.getAttribute('aria-hidden') !== 'true');
}

describe('BsSwipeDirective — default ARIA host bindings', () => {
  let fixture: ComponentFixture<SwipeAriaDefaultHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, SwipeAriaDefaultHost],
    }).compileComponents();
    fixture = TestBed.createComponent(SwipeAriaDefaultHost);
    fixture.detectChanges();
  });

  it('renders role="group" on every slide', () => {
    const slides = fixture.debugElement.queryAll(By.directive(BsSwipeDirective));
    expect(slides.length).toBe(3);
    for (const slide of slides) {
      expect((slide.nativeElement as HTMLElement).getAttribute('role')).toBe('group');
    }
  });

  it('defaults aria-roledescription to "slide"', () => {
    for (const slide of visibleSlides(fixture)) {
      expect(slide.getAttribute('aria-roledescription')).toBe('slide');
    }
  });

  it('auto-computes aria-label as "N of M" using non-offside ordinal', () => {
    const slides = visibleSlides(fixture);
    expect(slides[0].getAttribute('aria-label')).toBe('1 of 3');
    expect(slides[1].getAttribute('aria-label')).toBe('2 of 3');
    expect(slides[2].getAttribute('aria-label')).toBe('3 of 3');
  });

  it('recomputes aria-label when slides are added or removed', () => {
    fixture.componentInstance.slides.set(['a', 'b']);
    fixture.detectChanges();
    let slides = visibleSlides(fixture);
    expect(slides.length).toBe(2);
    expect(slides[0].getAttribute('aria-label')).toBe('1 of 2');
    expect(slides[1].getAttribute('aria-label')).toBe('2 of 2');

    fixture.componentInstance.slides.set(['a', 'b', 'c', 'd', 'e']);
    fixture.detectChanges();
    slides = visibleSlides(fixture);
    expect(slides.length).toBe(5);
    expect(slides[4].getAttribute('aria-label')).toBe('5 of 5');
  });
});

describe('BsSwipeDirective — offside slides', () => {
  let fixture: ComponentFixture<SwipeAriaOffsideHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, SwipeAriaOffsideHost],
    }).compileComponents();
    fixture = TestBed.createComponent(SwipeAriaOffsideHost);
    fixture.detectChanges();
  });

  it('omits aria-label, aria-roledescription on offside slides and sets aria-hidden="true"', () => {
    const all = fixture.debugElement.queryAll(By.directive(BsSwipeDirective));
    const offside = all
      .map(d => d.nativeElement as HTMLElement)
      .filter(el => el.getAttribute('aria-hidden') === 'true');
    expect(offside.length).toBe(2);
    for (const el of offside) {
      expect(el.getAttribute('aria-label')).toBeNull();
      expect(el.getAttribute('aria-roledescription')).toBeNull();
    }
  });

  it('non-offside slides labelled "N of M" against the non-offside count even when clones surround them', () => {
    const slides = visibleSlides(fixture);
    expect(slides.length).toBe(3);
    expect(slides[0].getAttribute('aria-label')).toBe('1 of 3');
    expect(slides[2].getAttribute('aria-label')).toBe('3 of 3');
  });
});

describe('BsSwipeDirective — input overrides', () => {
  let fixture: ComponentFixture<SwipeAriaOverrideHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, SwipeAriaOverrideHost],
    }).compileComponents();
    fixture = TestBed.createComponent(SwipeAriaOverrideHost);
    fixture.detectChanges();
  });

  it('honours [ariaRoledescription] override', () => {
    for (const slide of visibleSlides(fixture)) {
      expect(slide.getAttribute('aria-roledescription')).toBe('image');
    }
  });

  it('removes aria-roledescription when input is empty string', () => {
    fixture.componentInstance.slides.update(slides =>
      slides.map(s => ({ ...s, roledescription: '' }))
    );
    fixture.detectChanges();
    for (const slide of visibleSlides(fixture)) {
      expect(slide.getAttribute('aria-roledescription')).toBeNull();
    }
  });

  it('honours [ariaLabel] override', () => {
    fixture.componentInstance.slides.update(slides =>
      slides.map((s, i) => ({ ...s, label: ['First', 'Second', 'Third'][i] }))
    );
    fixture.detectChanges();
    const slides = visibleSlides(fixture);
    expect(slides[0].getAttribute('aria-label')).toBe('First');
    expect(slides[1].getAttribute('aria-label')).toBe('Second');
    expect(slides[2].getAttribute('aria-label')).toBe('Third');
  });
});
