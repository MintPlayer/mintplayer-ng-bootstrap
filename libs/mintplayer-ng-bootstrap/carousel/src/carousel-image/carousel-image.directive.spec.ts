import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent } from 'ng-mocks';
import { BsCarouselComponent } from '../carousel/carousel.component';
import { BsCarouselImageDirective } from './carousel-image.directive';

@Component({
  selector: 'bs-carousel-image-test',
  template: `
    <bs-carousel>
      <div class="w-100" *bsCarouselImage>
        <img src="/assets/resized/deer.png" class="w-100">
      </div>
      <div class="w-100" *bsCarouselImage>
        <img src="/assets/resized/duck.png" class="w-100">
      </div>
      <div class="w-100" *bsCarouselImage>
        <img src="/assets/resized/leopard.png" class="w-100">
      </div>
      <div class="w-100" *bsCarouselImage>
        <img src="/assets/resized/lion.png" class="w-100">
      </div>
      <div class="w-100" *bsCarouselImage>
        <img src="/assets/resized/peacock.png" class="w-100">
      </div>
      <div class="w-100" *bsCarouselImage>
        <img src="/assets/resized/tiger.png" class="w-100">
      </div>
    </bs-carousel>`
})
class BsCarouselImageTestComponent {
}

describe('CarouselImageDirective', () => {
  let component: BsCarouselImageTestComponent;
  let fixture: ComponentFixture<BsCarouselImageTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      declarations: [
        // Directive to test
        BsCarouselImageDirective,

        // Mock components
        MockComponent(BsCarouselComponent),

        // Testbench
        BsCarouselImageTestComponent
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsCarouselImageTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(component).toBeTruthy();
  });
});
