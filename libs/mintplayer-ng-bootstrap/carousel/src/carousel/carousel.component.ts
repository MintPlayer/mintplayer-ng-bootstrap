import { isPlatformServer } from '@angular/common';
import { ChangeDetectorRef, Component, ContentChildren, ElementRef, forwardRef, HostBinding, HostListener, Inject, Input, PLATFORM_ID, QueryList, TemplateRef, ViewChild, ViewChildren } from '@angular/core';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsSwipeContainerDirective } from '@mintplayer/ng-swiper';
import { BehaviorSubject, forkJoin, map, mergeMap, Observable } from 'rxjs';
import { BsCarouselImageDirective } from '../carousel-image/carousel-image.directive';
import { BsObserveSizeDirective, Size } from '@mintplayer/ng-bootstrap/observe-size';

@Component({
  selector: 'bs-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss'],
  animations: [FadeInOutAnimation]
})
export class BsCarouselComponent {

  constructor(@Inject(PLATFORM_ID) platformId: any, private cdRef: ChangeDetectorRef) {
    this.isServerSide = isPlatformServer(platformId);
    this.imageCount$ = this.images$.pipe(map((images) => images?.length ?? 0));
    this.firstImageTemplate$ = this.images$.pipe(map((images) => {
      if (!images) return null;
      if (images.length === 0) return null;

      const img = images.get(0);
      if (!img) return null;

      return img.itemTemplate;
    }));
    this.lastImageTemplate$ = this.images$.pipe(map((images) => {
      if (!images) return null;
      if (images.length === 0) return null;
      
      const img = images.get(images.length - 1);
      if (!img) return null;

      return img.itemTemplate;
    }));

    this.slideSizes$ = this.slideSizeObservers$
      .pipe(mergeMap(dir => forkJoin(dir.map(i => i.size$))));

    this.maxSize$ = this.slideSizes$
      .pipe(map((vals) => {
        if (vals.length === 0) {
          return ({ width: 0, height: 0 });
        } else {
          return ({
            width: Math.max(0, ...vals.map(v => v.width ?? 0)),
            height: Math.max(0, ...vals.map(v => v.height ?? 0)),
          });
        }
      }));
  }
  
  colors = Color;
  isServerSide: boolean;
  currentImageIndex = 0;
  images$ = new BehaviorSubject<QueryList<BsCarouselImageDirective> | null>(null);
  imageCount$: Observable<number>;
  firstImageTemplate$: Observable<TemplateRef<any> | null>;
  lastImageTemplate$: Observable<TemplateRef<any> | null>;
  slideSizeObservers$ = new BehaviorSubject<BsObserveSizeDirective[]>([]);
  @ViewChildren(forwardRef(() => BsObserveSizeDirective)) set slideSizeObservers(val: QueryList<BsObserveSizeDirective>) {
    this.slideSizeObservers$.next(val.toArray());
  }
  slideSizes$: Observable<Size[]>;
  maxSize$: Observable<Size>;

  @Input() indicators = false;
  @Input() keyboardEvents = true;

  @ViewChild('innerElement') innerElement!: ElementRef<HTMLDivElement>;
  @ViewChild('container') swipeContainer!: BsSwipeContainerDirective;
  @ContentChildren(forwardRef(() => BsCarouselImageDirective)) set images(value: QueryList<BsCarouselImageDirective>) {
    this.images$.next(value);
    value.forEach((item, index) => item.isFirst = (index === 0));
  }

  //#region Animation
  @HostBinding('@.disabled') public animationsDisabled = false;
  private _animation: 'fade' | 'slide' = 'slide';
  @Input() public set animation(value: 'fade' | 'slide') {
    this.animationsDisabled = true;
    this._animation = value;
    setTimeout(() => this.animationsDisabled = false, 20);
    setTimeout(() => this.cdRef.detectChanges(), 50);
  }
  public get animation() {
    return this._animation;
  }
  //#endregion

  @HostListener('document:keydown.ArrowLeft', ['$event'])
  @HostListener('document:keydown.ArrowRight', ['$event'])
  onKeyPress(ev: KeyboardEvent) {
    if (this.keyboardEvents) {
      switch (ev.key) {
        case 'ArrowLeft':
          this.previousImage();
          break;
        case 'ArrowRight':
          this.nextImage();
          break;
      }
      ev.preventDefault();
    }
  }

  previousImage() {
    switch (this.animation) {
      case 'fade':
        if (this.currentImageIndex > 0) {
          this.currentImageIndex--;
        } else {
          this.currentImageIndex = this.images$.value!.length - 1;
        }
        break;
      case 'slide':
        this.swipeContainer.previous();
        break;
    }
  }

  nextImage() {
    switch (this.animation) {
      case 'fade':
        if (this.currentImageIndex < this.images$.value!.length - 1) {
          this.currentImageIndex++;
        } else {
          this.currentImageIndex = 0;
        }
        break;
      case 'slide':
        this.swipeContainer.next();
        break;
    }
  }

  imageCounter = 1;
}
