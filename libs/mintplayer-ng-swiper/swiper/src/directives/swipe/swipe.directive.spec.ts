import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Directive, forwardRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BsSwipeContainerDirective } from '../swipe-container/swipe-container.directive';
import { BsSwipeDirective } from './swipe.directive';

@Directive({
  selector: '[bsSwipeContainer]',
  standalone: false,
  providers: [
    { provide: BsSwipeContainerDirective, useExisting: forwardRef(() => BsSwipeContainerDirectiveStub) }
  ]
})
class BsSwipeContainerDirectiveStub {
  orientation$ = new BehaviorSubject<'horizontal' | 'vertical'>('horizontal');
  maxSlideHeight$ = new BehaviorSubject<number>(100);
  startTouch$ = new BehaviorSubject<any>(null);
  lastTouch$ = new BehaviorSubject<any>(null);
  pendingAnimation: { finish(): void } | null = null;

  onSwipe(_distance: number) {}
}

@Component({
  selector: 'swipe-test-component',
  standalone: false,
  template: `
    <div bsSwipeContainer>
      <div *ngFor="let n of images" bsSwipe>Slide {{ n }}</div>
    </div>`
})
class SwipeTestComponent {
  images = ['a', 'b', 'c', 'd'];
}

describe('BsSwipeDirective', () => {
  let fixture: ComponentFixture<SwipeTestComponent>;
  
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      declarations: [
        // Unit to test
        BsSwipeDirective,

        // Mock dependencies
        BsSwipeContainerDirectiveStub,

        // Testbench
        SwipeTestComponent
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SwipeTestComponent);
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(fixture).toBeTruthy();
  });
});
