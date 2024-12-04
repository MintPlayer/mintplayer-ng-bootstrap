import { isPlatformServer } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ContentChildren, ElementRef, forwardRef, HostBinding, HostListener, Inject, Input, OnDestroy, PLATFORM_ID, QueryList, TemplateRef, ViewChild } from '@angular/core';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsSwipeContainerDirective } from '@mintplayer/ng-swiper/swiper';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { BsCarouselImageDirective } from '../carousel-image/carousel-image.directive';

@Component({
  selector: 'bs-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss'],
  standalone: false,
  animations: [FadeInOutAnimation],
})
export class BsCarouselComponent implements AfterViewInit, OnDestroy {

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

    if (!isPlatformServer(platformId)) {
      this.resizeObserver = new ResizeObserver((entries) => {
        this.cdRef.detectChanges();
      });
    }
  }
  
  colors = Color;
  isServerSide: boolean;
  currentImageIndex = 0;
  images$ = new BehaviorSubject<QueryList<BsCarouselImageDirective> | null>(null);
  imageCount$: Observable<number>;
  firstImageTemplate$: Observable<TemplateRef<any> | null>;
  lastImageTemplate$: Observable<TemplateRef<any> | null>;
  resizeObserver?: ResizeObserver;

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

  ngAfterViewInit() {
    this.resizeObserver?.observe(this.innerElement.nativeElement);
  }

  ngOnDestroy() {
    this.resizeObserver?.unobserve(this.innerElement.nativeElement);
    this.resizeObserver?.disconnect();
  }
}
