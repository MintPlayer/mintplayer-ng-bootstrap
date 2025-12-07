import { Component, Directive, ElementRef, EventEmitter, HostBinding, HostListener, Input, Output, ViewChild, NgZone, signal, computed, effect } from '@angular/core';

@Component({
  selector: 'bs-slider',
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.scss'],
  standalone: false,
})
export class BsSliderComponent {
  constructor(private element: ElementRef<HTMLElement>, private zone: NgZone) {
    effect(() => {
      this.valueChange.emit(this.valueSignal());
    });

    this.thumbMarginLeft = computed(() => {
      const value = this.valueSignal();
      const res = value * this.element.nativeElement.clientWidth - 12;
      return res;
    });

    this.cursorClass = computed(() => {
      return this.isPointerDown() ? 'cursor-grabbing' : 'cursor-grab';
    });
  }

  @HostBinding('class.d-block') dBlock = true;
  @HostBinding('class.position-relative') positionRelative = true;
  thumbMarginLeft;
  @ViewChild('track') track!: ElementRef<HTMLDivElement>;
  @ViewChild('thumb') thumb!: ElementRef<HTMLDivElement>;

  //#region Value
  valueSignal = signal<number>(0.5);
  @Input() set value(val: number) {
    this.valueSignal.set(val);
  }
  get value() {
    return this.valueSignal();
  }
  @Output() valueChange = new EventEmitter<number>();
  //#endregion

  private isPointerDown = signal<boolean>(false);
  cursorClass;

  onPointerDown(ev: MouseEvent | TouchEvent) {
    ev.preventDefault();
    this.zone.run(() => this.isPointerDown.set(true));
    this.updateColor(ev);
  }

  @HostListener('document:mousemove', ['$event'])
  onPointerMove(ev: MouseEvent | TouchEvent) {
    if (this.isPointerDown()) {
      ev.preventDefault();
      ev.stopPropagation();
      this.updateColor(ev);
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onPointerUp(ev: MouseEvent | TouchEvent) {
    this.isPointerDown.set(false);
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
    this.valueSignal.set(limited);
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
