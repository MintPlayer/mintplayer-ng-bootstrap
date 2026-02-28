import { Component, signal, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsSelectModule } from '@mintplayer/ng-bootstrap/select';
import { BsCarouselModule } from '@mintplayer/ng-bootstrap/carousel';

@Component({
  selector: 'demo-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss'],
  standalone: true,
  imports: [FormsModule, BsFormModule, BsGridModule, BsSelectModule, BsCarouselModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarouselComponent {
  mode = signal<'slide' | 'fade'>('slide');
  orientation = signal<'horizontal' | 'vertical'>('horizontal');
}
