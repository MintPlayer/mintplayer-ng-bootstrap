import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockDirective } from 'ng-mocks';
import { BsSwipeContainerDirective } from '../swipe-container/swipe-container.directive';
import { BsSwipeDirective } from './swipe.directive';

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
        MockDirective(BsSwipeContainerDirective),

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
