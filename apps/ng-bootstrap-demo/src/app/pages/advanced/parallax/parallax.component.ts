import { Component, ChangeDetectionStrategy} from '@angular/core';

import { BsParallaxComponent } from '@mintplayer/ng-bootstrap/parallax';

@Component({
  selector: 'demo-parallax',
  imports: [BsParallaxComponent],
  templateUrl: './parallax.component.html',
  styleUrl: './parallax.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParallaxComponent {
  images = [
    '/assets/resized/deer.png',
    '/assets/resized/duck.png',
    '/assets/resized/leopard.png',
    '/assets/resized/lion.png',
    '/assets/resized/peacock.png',
    '/assets/resized/tiger.png',
  ];

  numbers = Array(8);
}
