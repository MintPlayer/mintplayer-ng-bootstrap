import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, input, model, output, signal, viewChildren } from '@angular/core';

@Component({
  selector: 'bs-rating',
  templateUrl: './rating.component.html',
  styleUrls: ['./rating.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'role': 'radiogroup',
    'aria-label': 'Rating',
    '(mouseleave)': 'onMouseLeave()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class BsRatingComponent {

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

  readonly starButtons = viewChildren<ElementRef<HTMLButtonElement>>('star');

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

  onMouseLeave() {
    this.previewValue.set(null);
  }

  onKeydown(event: KeyboardEvent) {
    const max = this.maximum();
    const cur = this.value();
    let next: number | null = null;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = Math.min(cur + 1, max);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = Math.max(cur - 1, 1);
        break;
      case 'Home':
        next = 1;
        break;
      case 'End':
        next = max;
        break;
      default:
        return;
    }
    event.preventDefault();
    if (next !== cur) {
      this.value.set(next);
    }
    this.starButtons()[next - 1]?.nativeElement.focus();
  }
}
