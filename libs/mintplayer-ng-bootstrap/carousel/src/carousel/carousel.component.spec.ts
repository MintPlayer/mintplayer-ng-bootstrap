import { Component, Directive, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MockDirective } from 'ng-mocks';
import { BsCarouselImageDirective } from '../carousel-image/carousel-image.directive';

import { BsCarouselComponent } from './carousel.component';

describe('CarouselComponent', () => {
  let component: BsCarouselTestComponent;
  let fixture: ComponentFixture<BsCarouselTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Component to test
        BsCarouselComponent,

        // Testbench
        BsCarouselTestComponent,

        // Mock dependencies
        MockDirective(BsCarouselImageDirective),
      ],
      imports: [
        NoopAnimationsModule
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(BsCarouselTestComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    fixture.whenStable().then(() => {
      expect(component).toBeTruthy();
    });
  });

  // it('should contain 6 img elements', async () => {
  //   fixture.detectChanges();
  //   await fixture.whenStable();
  //   const images = fixture.debugElement.queryAll(By.directive(BsCarouselImageMockDirective));
  //   expect(images.length).toBe(6);
  // });
});

@Component({
  selector: 'bs-carousel-test',
  template: `
  <bs-carousel #carousel>
    <img bsCarouselImage src="/assets/resized/deer.png">
    <img bsCarouselImage src="/assets/resized/duck.png">
    <img bsCarouselImage src="/assets/resized/leopard.png">
    <img bsCarouselImage src="/assets/resized/lion.png">
    <img bsCarouselImage src="/assets/resized/peacock.png">
    <img bsCarouselImage src="/assets/resized/tiger.png">
  </bs-carousel>`
})
class BsCarouselTestComponent {
  @ViewChild('carousel') carousel!: BsCarouselComponent;
}
