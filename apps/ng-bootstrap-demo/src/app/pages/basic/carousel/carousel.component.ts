import { Component, signal, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColDirective, BsColFormLabelDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsSelectComponent } from '@mintplayer/ng-bootstrap/select';
import { BsCarouselComponent, BsCarouselImageDirective } from '@mintplayer/ng-bootstrap/carousel';

@Component({
  selector: 'demo-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss'],
  imports: [FormsModule, BsFormComponent, BsGridComponent, BsGridRowDirective, BsGridColDirective, BsColFormLabelDirective, BsSelectComponent, BsCarouselComponent, BsCarouselImageDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarouselComponent {
  mode = signal<'slide' | 'fade'>('slide');
  orientation = signal<'horizontal' | 'vertical'>('horizontal');
}
