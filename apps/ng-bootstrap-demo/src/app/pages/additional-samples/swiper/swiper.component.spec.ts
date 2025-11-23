import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsAlertComponent, BsAlertCloseComponent } from '@mintplayer/ng-bootstrap/alert';
import { BsCarouselModule } from '@mintplayer/ng-bootstrap/carousel';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { MockModule } from 'ng-mocks';

import { SwiperComponent } from './swiper.component';

describe('SwiperComponent', () => {
  let component: SwiperComponent;
  let fixture: ComponentFixture<SwiperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsGridModule),
        MockModule(BsAlertComponent, BsAlertCloseComponent),
        MockModule(BsCarouselModule),
      ],
      declarations: [
        SwiperComponent
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SwiperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
