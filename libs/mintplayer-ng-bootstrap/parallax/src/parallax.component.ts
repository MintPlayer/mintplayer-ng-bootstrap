import { Component, Input, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'bs-parallax',
  templateUrl: './parallax.component.html',
  styleUrl: './parallax.component.scss',
  imports: [CommonModule],
})
export class BsParallaxComponent {
  height = input<number>(150);
  image = input.required<string>();
  imageStyle = computed(() => {
    const img = this.image();
    return !!img ? `url(${img})` : '';
  });
}
