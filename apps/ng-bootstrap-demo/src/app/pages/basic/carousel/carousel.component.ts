import { Component, signal, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective, BsColFormLabelDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsSelectComponent } from '@mintplayer/ng-bootstrap/select';
import { BsCarouselComponent, BsCarouselImageDirective } from '@mintplayer/ng-bootstrap/carousel';

@Component({
  selector: 'demo-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss'],
  standalone: true,
  imports: [FormsModule, BsFormComponent, BsFormControlDirective, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective, BsColFormLabelDirective, BsSelectComponent, BsCarouselComponent, BsCarouselImageDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarouselComponent {
  mode = signal<'slide' | 'fade'>('slide');
  orientation = signal<'horizontal' | 'vertical'>('horizontal');
}
