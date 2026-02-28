import { Component, Input, computed, input, ChangeDetectionStrategy} from '@angular/core';


@Component({
  selector: 'bs-parallax',
  standalone: true,
  templateUrl: './parallax.component.html',
  styleUrl: './parallax.component.scss',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsParallaxComponent {
  height = input<number>(150);
  image = input.required<string>();
  imageStyle = computed(() => {
    const img = this.image();
    return !!img ? `url(${img})` : '';
  });
}
