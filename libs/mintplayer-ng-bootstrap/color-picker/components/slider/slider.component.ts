import { ChangeDetectionStrategy, Component, computed, Directive, ElementRef, input, model, signal, viewChild } from '@angular/core';

@Component({
  selector: 'bs-slider',
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'd-block position-relative',
    'role': 'slider',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    'aria-orientation': 'horizontal',
    '[attr.aria-valuenow]': 'ariaValueNow()',
    '[attr.aria-valuetext]': 'ariaValueText()',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.tabindex]': 'disabled() ? -1 : 0',
    '(document:mousemove)': 'onPointerMove($event)',
    '(document:mouseup)': 'onPointerUp($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class BsSliderComponent {
  readonly track = viewChild.required<ElementRef<HTMLDivElement>>('track');
  readonly thumb = viewChild.required<ElementRef<HTMLDivElement>>('thumb');

  disabled = input<boolean>(false);
  value = model<number>(0.5);
  /** Accessible name for SR users. e.g. "Brightness", "Alpha", "Hue". */
  ariaLabel = input<string | null>(null);
  private isPointerDown = signal<boolean>(false);

  thumbLeft = computed(() => `${this.value() * 100}%`);

  cursorClass = computed(() => 'position-absolute top-0 ' + (this.isPointerDown() ? 'cursor-grabbing' : 'cursor-grab'));

  /** 0..100 for aria-valuenow per APG slider convention. */
  ariaValueNow = computed(() => Math.round(this.value() * 100));
  /** Human-readable value for SR; useful when 0..100 doesn't convey the unit. */
  ariaValueText = computed(() => `${Math.round(this.value() * 100)}%`);

  onPointerDown(ev: MouseEvent | TouchEvent) {
    if (this.disabled()) return;
    ev.preventDefault();
    ev.stopPropagation();
    this.isPointerDown.set(true);
    this.updateColor(ev);
  }

  onPointerMove(ev: MouseEvent | TouchEvent) {
    if (this.isPointerDown()) {
      ev.preventDefault();
      ev.stopPropagation();
      this.updateColor(ev);
    }
  }

  onPointerUp(_ev: MouseEvent | TouchEvent) {
    this.isPointerDown.set(false);
  }

  onKeydown(ev: KeyboardEvent) {
    if (this.disabled()) return;
    const cur = this.value();
    const step = ev.shiftKey ? 0.001 : 0.01; // 1% default, 0.1% with Shift
    const pageStep = 0.1; // 10% with PageUp/PageDown
    let next: number | null = null;
    switch (ev.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = Math.min(1, cur + step);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = Math.max(0, cur - step);
        break;
      case 'PageUp':
        next = Math.min(1, cur + pageStep);
        break;
      case 'PageDown':
        next = Math.max(0, cur - pageStep);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = 1;
        break;
      default:
        return;
    }
    ev.preventDefault();
    if (next !== cur) this.value.set(next);
  }

  private updateColor(ev: MouseEvent | TouchEvent) {
    const rect = this.track().nativeElement.getBoundingClientRect();
    const clientX = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
    const percent = (clientX - rect.left) / this.track().nativeElement.clientWidth;
    this.value.set(Math.max(0, Math.min(1, percent)));
  }
}

@Directive({
  selector: '[bsThumb]',
  host: {
    'class': 'thumb position-absolute',
  },
})
export class BsThumbDirective {
}

@Directive({
  selector: '[bsTrack]',
  host: {
    'class': 'track',
  },
})
export class BsTrackDirective {
}
