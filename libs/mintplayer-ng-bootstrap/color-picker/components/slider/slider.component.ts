import { AfterViewInit, Component, Directive, ElementRef, EventEmitter, HostBinding, HostListener, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable, Subject, takeUntil } from 'rxjs';
import { HS } from '../../interfaces/hs';

@Component({
  selector: 'bs-slider',
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.scss']
})
export class BsSliderComponent implements OnDestroy {
  constructor(private element: ElementRef<HTMLElement>) {
    this.value$.pipe(takeUntil(this.destroyed$))
      .subscribe((value) => this.valueChange.emit(value));

    this.resultBackground$ = combineLatest([this.hs$, this.value$])
      .pipe(map(([hs, v]) => {
        return `hsl(${hs.hue}, ${hs.saturation * 100}%, ${v * 100}%)`;
      }));

    this.thumbMarginLeft$ = this.value$.pipe(map((value) => {
      const res = value * element.nativeElement.clientWidth - 12;
      return res;
    }));
  }

  @HostBinding('class.d-block') dBlock = true;
  @HostBinding('style.height.px') height = 20;
  @HostBinding('class.position-relative') positionRelative = true;
  thumbMarginLeft$: Observable<number>;
  @ViewChild('track') track!: ElementRef<HTMLDivElement>;
  @ViewChild('thumb') thumb!: ElementRef<HTMLDivElement>;

  //#region HS
  hs$ = new BehaviorSubject<HS>({ hue: 0, saturation: 0 });
  public get hs() {
    return this.hs$.value;
  }
  @Input() public set hs(value: HS) {
    this.hs$.next(value);
  }
  //#endregion
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

  private isPointerDown = false;
  resultBackground$: Observable<string>;

  onPointerDown(ev: MouseEvent | TouchEvent) {
    ev.preventDefault();
    this.isPointerDown = true;
    this.updateColor(ev);
  }

  @HostListener('document:mousemove', ['$event'])
  onPointerMove(ev: MouseEvent | TouchEvent) {
    if (this.isPointerDown) {
      ev.preventDefault();
      ev.stopPropagation();
      this.updateColor(ev);
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onPointerUp(ev: MouseEvent | TouchEvent) {
    this.isPointerDown = false;
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

  destroyed$ = new Subject();
  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}

@Directive({ selector: 'bsThumb' })
export class BsThumbDirective {}

@Directive({ selector: 'bsTrack' })
export class BsTrackDirective {}