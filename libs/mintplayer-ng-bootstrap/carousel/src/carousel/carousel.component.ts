import { isPlatformServer } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ContentChildren, ElementRef, forwardRef, HostBinding, HostListener, Inject, Input, OnDestroy, PLATFORM_ID, QueryList, TemplateRef, ViewChild, signal, computed, effect, untracked } from '@angular/core';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsSwipeContainerDirective } from '@mintplayer/ng-swiper/swiper';
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
    this.imageCount = computed(() => this.images()?.length ?? 0);
    this.firstImageTemplate = computed(() => {
      const images = this.images();
      if (!images) return null;
      if (images.length === 0) return null;

      const img = images.get(0);
      if (!img) return null;

      return img.itemTemplate;
    });
    this.lastImageTemplate = computed(() => {
      const images = this.images();
      if (!images) return null;
      if (images.length === 0) return null;

      const img = images.get(images.length - 1);
      if (!img) return null;

      return img.itemTemplate;
    });

    if (!isPlatformServer(platformId)) {
      this.resizeObserver = new ResizeObserver((entries) => {
        this.cdRef.detectChanges();
      });
    }
  }

  colors = Color;
  isServerSide: boolean;
  currentImageIndex = 0;
  images = signal<QueryList<BsCarouselImageDirective> | null>(null);
  imageCount;
  firstImageTemplate;
  lastImageTemplate;
  resizeObserver?: ResizeObserver;

  @Input() indicators = false;
  @Input() keyboardEvents = true;

  private _orientation: 'horizontal' | 'vertical' = 'horizontal';
  @Input() public set orientation(value: 'horizontal' | 'vertical') {
    this._orientation = value ?? 'horizontal';
    this.cdRef.detectChanges();
  }
  public get orientation() {
    return this._orientation;
  }

  @ViewChild('innerElement') innerElement!: ElementRef<HTMLDivElement>;
  @ViewChild('container') swipeContainer!: BsSwipeContainerDirective;
  @ContentChildren(forwardRef(() => BsCarouselImageDirective)) set imagesQuery(value: QueryList<BsCarouselImageDirective>) {
    this.images.set(value);
    value.forEach((item, index) => item.isFirst = (index === 0));
  }

  //#region Animation
  animationsDisabled = signal(true);
  @HostBinding('@.disabled') get animationsDisabledBinding() { return this.animationsDisabled(); }
  animation = signal<'fade' | 'slide'>('slide');
  @Input('animation') set animationInput(value: 'fade' | 'slide') {
    this.animation.set(value);
  }
  //#endregion

  @HostListener('document:keydown.ArrowLeft', ['$event'])
  @HostListener('document:keydown.ArrowRight', ['$event'])
  @HostListener('document:keydown.ArrowUp', ['$event'])
  @HostListener('document:keydown.ArrowDown', ['$event'])
  onKeyPress(ev: Event) {
    const keyboardEvent = ev as KeyboardEvent;
    if (this.keyboardEvents) {
      let handled = false;
      switch (keyboardEvent.key) {
        case 'ArrowLeft':
          if (this.orientation === 'horizontal') {
            this.previousImage();
            handled = true;
          }
          break;
        case 'ArrowRight':
          if (this.orientation === 'horizontal') {
            this.nextImage();
            handled = true;
          }
          break;
        case 'ArrowUp':
          if (this.orientation === 'vertical') {
            this.previousImage();
            handled = true;
          }
          break;
        case 'ArrowDown':
          if (this.orientation === 'vertical') {
            this.nextImage();
            handled = true;
          }
          break;
      }
      if (handled) {
        keyboardEvent.preventDefault();
      }
    }
  }

  previousImage() {
    switch (this.animation()) {
      case 'fade':
        const imagesVal = this.images();
        if (this.currentImageIndex > 0) {
          this.currentImageIndex--;
        } else {
          this.currentImageIndex = imagesVal!.length - 1;
        }
        break;
      case 'slide':
        this.swipeContainer.previous();
        break;
    }
  }

  nextImage() {
    switch (this.animation()) {
      case 'fade':
        const imagesVal = this.images();
        if (this.currentImageIndex < imagesVal!.length - 1) {
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
    // Enable animations after initial render to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => this.animationsDisabled.set(false));
  }

  ngOnDestroy() {
    this.resizeObserver?.unobserve(this.innerElement.nativeElement);
    this.resizeObserver?.disconnect();
  }
}
