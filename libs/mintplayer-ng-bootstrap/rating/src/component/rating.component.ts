import { ChangeDetectionStrategy, Component, computed, effect, HostBinding, HostListener, input, model, output, signal } from '@angular/core';

@Component({
  selector: 'bs-rating',
  standalone: true,
  templateUrl: './rating.component.html',
  styleUrls: ['./rating.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsRatingComponent {
  @HostBinding('attr.role') role = 'group';
  @HostBinding('attr.aria-label') ariaLabel = 'Rating';

  constructor() {
    effect(() => {
      const v = this.previewValue() ?? this.value();
      this.starsChange.emit(v);
    });
  }

  maximum = input<number>(5);
  value = model<number>(3);
  previewValue = signal<number | null>(null);
  starsChange = output<number>();

  stars = computed(() => {
    const v = this.previewValue() ?? this.value();
    const max = this.maximum();
    return [
      ...[...Array(v).keys()].map(() => true),
      ...[...Array(max - v).keys()].map(() => false)
    ];
  });

  hoverValue(index: number) {
    this.previewValue.set(index + 1);
  }

  selectValue(index: number) {
    this.value.set(index + 1);
  }

  @HostListener('mouseleave') onMouseLeave() {
    this.previewValue.set(null);
  }
}
