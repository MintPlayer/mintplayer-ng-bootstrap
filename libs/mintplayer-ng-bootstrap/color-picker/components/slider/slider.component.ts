import { Component, Directive, ElementRef, EventEmitter, HostBinding, HostListener, Input, Output, ViewChild, NgZone } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, map, Observable } from 'rxjs';

@Component({
  selector: 'bs-slider',
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.scss']
})
export class BsSliderComponent {
  constructor(private element: ElementRef<HTMLElement>, private zone: NgZone) {
    this.value$.pipe(takeUntilDestroyed())
      .subscribe((value) => this.valueChange.emit(value));

    this.thumbMarginLeft$ = this.value$.pipe(map((value) => {
      const res = value * element.nativeElement.clientWidth - 12;
      return res;
    }));

    this.cursorClass$ = this.isPointerDown$.pipe(map((isPointerDown) => {
      return isPointerDown ? 'cursor-grabbing' : 'cursor-grab';
    }));
  }

  @HostBinding('class.d-block') dBlock = true;
  @HostBinding('class.position-relative') positionRelative = true;
  thumbMarginLeft$: Observable<number>;
  @ViewChild('track') track!: ElementRef<HTMLDivElement>;
  @ViewChild('thumb') thumb!: ElementRef<HTMLDivElement>;

  //#region Value
  value$ = new BehaviorSubject<number>(0.5);
  @Output() valueChange = new EventEmitter<number>();
  public get value() {
    return this.value$.value;
  }
  @Input() public set value(value: number) {
    this.value$.next(value);
  }
  //#endregion

  private isPointerDown$ = new BehaviorSubject<boolean>(false);
  cursorClass$: Observable<string>;

  onPointerDown(ev: MouseEvent | TouchEvent) {
    ev.preventDefault();
    this.zone.run(() => this.isPointerDown$.next(true));
    this.updateColor(ev);
  }

  @HostListener('document:mousemove', ['$event'])
  onPointerMove(ev: MouseEvent | TouchEvent) {
    if (this.isPointerDown$.value) {
      ev.preventDefault();
      ev.stopPropagation();
      this.updateColor(ev);
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onPointerUp(ev: MouseEvent | TouchEvent) {
    this.isPointerDown$.next(false);
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
    this.value$.next(limited);
  }
}

@Directive({ selector: '[bsThumb]' })
export class BsThumbDirective {
  @HostBinding('class.thumb')
  @HostBinding('class.position-absolute')
  thumbClass = true;
}

@Directive({ selector: '[bsTrack]' })
export class BsTrackDirective {
  @HostBinding('class.track') trackClass = true;
}