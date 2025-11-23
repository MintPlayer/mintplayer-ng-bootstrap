import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridColDirective, BsGridComponent, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsSelectComponent, BsSelectOption } from '@mintplayer/ng-bootstrap/select';
import { BsCarouselModule } from '@mintplayer/ng-bootstrap/carousel';

@Component({
  selector: 'demo-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss'],
  imports: [FormsModule, BsFormModule, BsGridComponent, BsGridRowDirective, BsGridColDirective, BsSelectComponent, BsSelectOption, BsCarouselModule]
})
export class CarouselComponent {
  mode: 'slide' | 'fade' = 'slide';

  onModeChange(value: any) {
    this.mode = value;
  }
}
