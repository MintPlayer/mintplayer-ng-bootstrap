import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MockDirective } from 'ng-mocks';
import { BsSwipeDirective } from '../swipe/swipe.directive';
import { BsSwipeContainerDirective } from './swipe-container.directive';

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

describe('BsSwipeContainerDirective', () => {
  let fixture: ComponentFixture<SwipeTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule
      ],
      declarations: [
        // Unit to test
        BsSwipeContainerDirective,

        // Mock dependencies
        MockDirective(BsSwipeDirective),

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
