import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsParallaxComponent } from '@mintplayer/ng-bootstrap/parallax';

@Component({
  selector: 'demo-parallax',
  standalone: true,
  imports: [CommonModule, BsParallaxComponent],
  templateUrl: './parallax.component.html',
  styleUrl: './parallax.component.scss',
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
