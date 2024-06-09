import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsObserveSizeDirective, Size } from '@mintplayer/ng-swiper/observe-size';

@Component({
  selector: 'demo-observe-size',
  standalone: true,
  imports: [CommonModule, BsObserveSizeDirective, BsGridModule],
  templateUrl: './observe-size.component.html',
  styleUrl: './observe-size.component.scss',
})
export class ObserveSizeComponent {
  lastSize?: Size;
}
