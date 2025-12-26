import { Component, computed, Directive, forwardRef, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsSwipeContainerDirective } from '../swipe-container/swipe-container.directive';
import { BsSwipeDirective } from './swipe.directive';

@Directive({
  selector: '[bsSwipeContainer]',
  standalone: true,
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

  onSwipe(_distance: number) {}
}

@Component({
  selector: 'swipe-test-component',
  standalone: true,
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
