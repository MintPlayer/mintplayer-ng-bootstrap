import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MockDirective } from 'ng-mocks';
import { BsSwipeDirective } from '../swipe/swipe.directive';
import { BsSwipeContainerDirective } from './swipe-container.directive';

@Component({
  selector: 'swipe-test-component',
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

  it('should create an instance', () => {
    expect(fixture).toBeTruthy();
  });
});
