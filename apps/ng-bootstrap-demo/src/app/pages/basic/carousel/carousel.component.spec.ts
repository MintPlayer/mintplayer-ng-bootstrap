import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { CarouselComponent } from './carousel.component';

@Component({
  selector: 'bs-carousel',
  template: 'carousel works'
})
class BsCarouselMockComponent {

  @Input() public animation: 'fade' | 'slide' = 'slide';
  @Input() public indicators = true;

}

describe('CarouselComponent', () => {
  let component: CarouselComponent;
  let fixture: ComponentFixture<CarouselComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule
      ],
      declarations: [
        // Unit to test
        CarouselComponent,
      
        // Mock dependencies
        BsCarouselMockComponent
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CarouselComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
