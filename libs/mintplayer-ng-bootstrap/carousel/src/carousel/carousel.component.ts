import { isPlatformServer } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, ContentChildren, ElementRef, forwardRef, HostBinding, HostListener, Inject, input, OnDestroy, PLATFORM_ID, QueryList, signal, TemplateRef, ViewChild } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCarouselComponent implements AfterViewInit, OnDestroy {

  constructor(@Inject(PLATFORM_ID) platformId: any, private cdRef: ChangeDetectorRef) {
    this.isServerSide = isPlatformServer(platformId);

    if (!isPlatformServer(platformId)) {
      this.resizeObserver = new ResizeObserver(() => {
        this.cdRef.detectChanges();
      });
    }
  }

  colors = Color;
  isServerSide: boolean;
  currentImageIndex = 0;
  images = signal<QueryList<BsCarouselImageDirective> | null>(null);
  resizeObserver?: ResizeObserver;

  indicators = input(false);
  keyboardEvents = input(true);
  orientation = input<'horizontal' | 'vertical'>('horizontal');
  animation = input<'fade' | 'slide'>('slide');

  imageCount = computed(() => this.images()?.length ?? 0);

  firstImageTemplate = computed<TemplateRef<any> | null>(() => {
    const images = this.images();
    if (!images) return null;
    if (images.length === 0) return null;

    const img = images.get(0);
    if (!img) return null;

    return img.itemTemplate;
  });

  lastImageTemplate = computed<TemplateRef<any> | null>(() => {
    const images = this.images();
    if (!images) return null;
    if (images.length === 0) return null;

    const img = images.get(images.length - 1);
    if (!img) return null;

    return img.itemTemplate;
  });

  @ViewChild('innerElement') innerElement!: ElementRef<HTMLDivElement>;
  @ViewChild('container') swipeContainer!: BsSwipeContainerDirective;
  @ContentChildren(forwardRef(() => BsCarouselImageDirective)) set imagesQuery(value: QueryList<BsCarouselImageDirective>) {
    this.images.set(value);
    value.forEach((item, index) => item.isFirst = (index === 0));
  }

  @HostBinding('@.disabled') public animationsDisabled = false;

  @HostListener('document:keydown.ArrowLeft', ['$event'])
  @HostListener('document:keydown.ArrowRight', ['$event'])
  @HostListener('document:keydown.ArrowUp', ['$event'])
  @HostListener('document:keydown.ArrowDown', ['$event'])
  onKeyPress(event: Event) {
    const ev = event as KeyboardEvent;
    if (this.keyboardEvents()) {
      let handled = false;
      const orientation = this.orientation();
      switch (ev.key) {
        case 'ArrowLeft':
          if (orientation === 'horizontal') {
            this.previousImage();
            handled = true;
          }
          break;
        case 'ArrowRight':
          if (orientation === 'horizontal') {
            this.nextImage();
            handled = true;
          }
          break;
        case 'ArrowUp':
          if (orientation === 'vertical') {
            this.previousImage();
            handled = true;
          }
          break;
        case 'ArrowDown':
          if (orientation === 'vertical') {
            this.nextImage();
            handled = true;
          }
          break;
      }
      if (handled) {
        ev.preventDefault();
      }
    }
  }

  previousImage() {
    switch (this.animation()) {
      case 'fade':
        if (this.currentImageIndex > 0) {
          this.currentImageIndex--;
        } else {
          this.currentImageIndex = this.images()!.length - 1;
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
        if (this.currentImageIndex < this.images()!.length - 1) {
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
