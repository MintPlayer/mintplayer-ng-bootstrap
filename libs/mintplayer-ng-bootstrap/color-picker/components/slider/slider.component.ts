import { ChangeDetectionStrategy, Component, computed, Directive, ElementRef, effect, inject, input, model, output, signal, viewChild } from '@angular/core';
import { BsObserveSizeDirective } from '@mintplayer/ng-swiper/observe-size';

@Component({
  selector: 'bs-slider',
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [BsObserveSizeDirective],
  host: {
    'class': 'd-block position-relative',
    '(document:mousemove)': 'onPointerMove($event)',
    '(document:mouseup)': 'onPointerUp($event)',
  },
})
export class BsSliderComponent {
  private observeSize = inject(BsObserveSizeDirective);
  readonly track = viewChild.required<ElementRef<HTMLDivElement>>('track');
  readonly thumb = viewChild.required<ElementRef<HTMLDivElement>>('thumb');

  disabled = input<boolean>(false);
  value = model<number>(0.5);
  valueChange = output<number>();
  private isPointerDown = signal<boolean>(false);

  thumbMarginLeft = computed(() => {
    const value = this.value();
    const width = this.observeSize.width() ?? 0;
    return value * width - 12;
  });

  cursorClass = computed(() => {
    return this.isPointerDown() ? 'cursor-grabbing' : 'cursor-grab';
  });

  constructor() {
    effect(() => {
      const value = this.value();
      this.valueChange.emit(value);
    });
  }

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

  onPointerUp(ev: MouseEvent | TouchEvent) {
    this.isPointerDown.set(false);
  }

  private updateColor(ev: MouseEvent | TouchEvent) {
    let co: { x: number };
    const rect = this.track().nativeElement.getBoundingClientRect();
    if ('touches' in ev) {
      co = {
        x: ev.touches[0].clientX - rect.left,
      };
    } else {
      co = {
        x: ev.clientX - rect.left,
      };
    }

    const percent = co.x / this.track().nativeElement.clientWidth;
    const limited = Math.max(0, Math.min(1, percent));
    this.value.set(limited);
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