import { ChangeDetectionStrategy, Component, computed, Directive, effect, ElementRef, HostBinding, HostListener, inject, model, NgZone, output, signal, ViewChild } from '@angular/core';

@Component({
  selector: 'bs-slider',
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsSliderComponent {
  private element = inject(ElementRef<HTMLElement>);
  private zone = inject(NgZone);

  @HostBinding('class.d-block') dBlock = true;
  @HostBinding('class.position-relative') positionRelative = true;
  @ViewChild('track') track!: ElementRef<HTMLDivElement>;
  @ViewChild('thumb') thumb!: ElementRef<HTMLDivElement>;

  value = model<number>(0.5);
  valueChange = output<number>();
  private isPointerDown$ = signal<boolean>(false);

  thumbMarginLeft$ = computed(() => {
    const value = this.value();
    const res = value * this.element.nativeElement.clientWidth - 12;
    return res;
  });

  cursorClass$ = computed(() => {
    return this.isPointerDown$() ? 'cursor-grabbing' : 'cursor-grab';
  });

  constructor() {
    effect(() => {
      const value = this.value();
      this.valueChange.emit(value);
    });
  }

  onPointerDown(ev: MouseEvent | TouchEvent) {
    ev.preventDefault();
    this.zone.run(() => this.isPointerDown$.set(true));
    this.updateColor(ev);
  }

  @HostListener('document:mousemove', ['$event'])
  onPointerMove(ev: MouseEvent | TouchEvent) {
    if (this.isPointerDown$()) {
      ev.preventDefault();
      ev.stopPropagation();
      this.updateColor(ev);
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onPointerUp(ev: MouseEvent | TouchEvent) {
    this.isPointerDown$.set(false);
  }

  private updateColor(ev: MouseEvent | TouchEvent) {
    let co: { x: number };
    const rect = this.track.nativeElement.getBoundingClientRect();
    if ('touches' in ev) {
      co = {
        x: ev.touches[0].clientX - rect.left,
      };
    } else {
      co = {
        x: ev.clientX - rect.left,
      };
    }

    const percent = co.x / this.track.nativeElement.clientWidth;
    const limited = Math.max(0, Math.min(1, percent));
    this.value.set(limited);
  }
}

@Directive({
  selector: '[bsThumb]',
  standalone: false,
})
export class BsThumbDirective {
  @HostBinding('class.thumb')
  @HostBinding('class.position-absolute')
  thumbClass = true;
}

@Directive({
  selector: '[bsTrack]',
  standalone: false,
})
export class BsTrackDirective {
  @HostBinding('class.track') trackClass = true;
}