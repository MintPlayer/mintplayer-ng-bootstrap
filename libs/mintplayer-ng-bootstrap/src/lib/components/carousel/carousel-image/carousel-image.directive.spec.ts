import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
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

@Component({
  selector: 'bs-carousel',
  template: `
  <div class="carousel">
    <div class="carousel-inner">
      <ng-container *ngFor="let image of images">
          <div class="carousel-item">
            <ng-container [ngTemplateOutlet]="image.itemTemplate"></ng-container>    
          </div>
      </ng-container>
    </div>
  </div>`
})
class BsCarouselMockComponent {
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
        BsCarouselMockComponent,

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
