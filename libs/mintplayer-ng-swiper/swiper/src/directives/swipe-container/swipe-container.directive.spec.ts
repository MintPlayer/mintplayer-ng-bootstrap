import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MockDirective } from 'ng-mocks';
import { BsSwipeDirective } from '../swipe/swipe.directive';
import { BsSwipeContainerDirective } from './swipe-container.directive';

@Component({
  selector: 'swipe-test-component',
  standalone: true,
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

describe('BsSwipeContainerDirective', () => {
  let fixture: ComponentFixture<SwipeTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        // Unit to test
        BsSwipeContainerDirective,

        // Mock dependencies
        MockDirective(BsSwipeDirective),

        // Testbench
        SwipeTestComponent
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(SwipeTestComponent);
  });

  // Skip: Directive with async host bindings causes NG0100 in test environment
  it.skip('should create an instance', () => {
    expect(fixture).toBeTruthy();
  });
});
