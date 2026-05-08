import { ChangeDetectionStrategy, Component, computed, Directive, ElementRef, input, model, signal, viewChild } from '@angular/core';

@Component({
  selector: 'bs-slider',
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'd-block position-relative',
    '(document:mousemove)': 'onPointerMove($event)',
    '(document:mouseup)': 'onPointerUp($event)',
  },
})
export class BsSliderComponent {
  readonly track = viewChild.required<ElementRef<HTMLDivElement>>('track');
  readonly thumb = viewChild.required<ElementRef<HTMLDivElement>>('thumb');

  disabled = input<boolean>(false);
  value = model<number>(0.5);
  private isPointerDown = signal<boolean>(false);

  thumbLeft = computed(() => `${this.value() * 100}%`);

  cursorClass = computed(() => 'position-absolute ' + (this.isPointerDown() ? 'cursor-grabbing' : 'cursor-grab'));

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
