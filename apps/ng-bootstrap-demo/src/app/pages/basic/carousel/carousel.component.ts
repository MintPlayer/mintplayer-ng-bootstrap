import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsSelectModule } from '@mintplayer/ng-bootstrap/select';
import { BsCarouselModule } from '@mintplayer/ng-bootstrap/carousel';
import { BehaviorSubject } from 'rxjs';
import { Orientation } from '@mintplayer/ng-swiper/swiper';

@Component({
  selector: 'demo-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss'],
  standalone: true,
  imports: [AsyncPipe, FormsModule, BsFormModule, BsGridModule, BsSelectModule, BsCarouselModule]
})
export class CarouselComponent {
  mode: 'slide' | 'fade' = 'slide';
  orientation$ = new BehaviorSubject<Orientation>('horizontal');

  onModeChange(value: any) {
    this.mode = value;
  }
}
