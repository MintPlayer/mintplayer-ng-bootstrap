import { isPlatformServer, NgTemplateOutlet } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, computed, ContentChildren, DestroyRef, effect, ElementRef, forwardRef, HostBinding, HostListener, inject, input, OnDestroy, output, PLATFORM_ID, QueryList, signal, TemplateRef, ViewChild } from '@angular/core';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsSwipeContainerDirective, BsSwipeDirective } from '@mintplayer/ng-swiper/swiper';
import { BsNoNoscriptDirective } from '@mintplayer/ng-bootstrap/no-noscript';
import { BsCarouselImageDirective } from '../carousel-image/carousel-image.directive';

@Component({
  selector: 'bs-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss'],
  standalone: true,
  imports: [
    NgTemplateOutlet,
    BsSwipeContainerDirective,
    BsSwipeDirective,
    BsNoNoscriptDirective,
  ],
  animations: [FadeInOutAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCarouselComponent implements AfterViewInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);

  colors = Color;
  isServerSide = isPlatformServer(this.platformId);
  currentImageIndex = signal(0);
  images = signal<QueryList<BsCarouselImageDirective> | null>(null);
  resizeObserver?: ResizeObserver;
  private intervalId?: ReturnType<typeof setInterval>;
  private isDestroyed = false;

  // Inputs
  indicators = input(false);
  keyboardEvents = input(true);
  orientation = input<'horizontal' | 'vertical'>('horizontal');
  animation = input<'fade' | 'slide' | 'none'>('slide');
  interval = input<number | null>(null);
  wrap = input(true);

  // Outputs
  slideChange = output<number>();
  animationStart = output<void>();
  animationEnd = output<void>();

  // Computed signals
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
            this.previous();
            handled = true;
          }
          break;
        case 'ArrowRight':
          if (orientation === 'horizontal') {
            this.next();
            handled = true;
          }
          break;
        case 'ArrowUp':
          if (orientation === 'vertical') {
            this.previous();
            handled = true;
          }
          break;
        case 'ArrowDown':
          if (orientation === 'vertical') {
            this.next();
            handled = true;
          }
          break;
      }
      if (handled) {
        ev.preventDefault();
      }
    }
  }

  constructor() {
    // Setup auto-advance interval effect
    effect(() => {
      const intervalTime = this.interval();
      this.clearAutoAdvance();

      if (intervalTime && intervalTime > 0) {
        this.intervalId = setInterval(() => {
          this.next();
        }, intervalTime);
      }
    });

    // Emit slideChange when currentImageIndex changes
    effect(() => {
      const index = this.currentImageIndex();
      if (!this.isDestroyed) {
        this.slideChange.emit(index);
      }
    });

    // Cleanup on destroy
    this.destroyRef.onDestroy(() => {
      this.isDestroyed = true;
      this.clearAutoAdvance();
      this.resizeObserver?.disconnect();
    });
  }

  private clearAutoAdvance() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  previous() {
    const animation = this.animation();
    const imageCount = this.imageCount();
    const wrap = this.wrap();

    switch (animation) {
      case 'fade':
      case 'none': {
        const currentIndex = this.currentImageIndex();
        if (currentIndex > 0) {
          if (animation === 'none') {
            this.animationStart.emit();
          }
          this.currentImageIndex.set(currentIndex - 1);
          if (animation === 'none') {
            this.animationEnd.emit();
          }
        } else if (wrap) {
          if (animation === 'none') {
            this.animationStart.emit();
          }
          this.currentImageIndex.set(imageCount - 1);
          if (animation === 'none') {
            this.animationEnd.emit();
          }
        }
        break;
      }
      case 'slide':
        this.swipeContainer.previous();
        break;
    }
  }

  next() {
    const animation = this.animation();
    const imageCount = this.imageCount();
    const wrap = this.wrap();

    switch (animation) {
      case 'fade':
      case 'none': {
        const currentIndex = this.currentImageIndex();
        if (currentIndex < imageCount - 1) {
          if (animation === 'none') {
            this.animationStart.emit();
          }
          this.currentImageIndex.set(currentIndex + 1);
          if (animation === 'none') {
            this.animationEnd.emit();
          }
        } else if (wrap) {
          if (animation === 'none') {
            this.animationStart.emit();
          }
          this.currentImageIndex.set(0);
          if (animation === 'none') {
            this.animationEnd.emit();
          }
        }
        break;
      }
      case 'slide':
        this.swipeContainer.next();
        break;
    }
  }

  goto(index: number) {
    const animation = this.animation();
    switch (animation) {
      case 'fade':
      case 'none':
        if (animation === 'none') {
          this.animationStart.emit();
        }
        this.currentImageIndex.set(index);
        if (animation === 'none') {
          this.animationEnd.emit();
        }
        break;
      case 'slide':
        this.swipeContainer.goto(index);
        break;
    }
  }

  imageCounter = 1;

  ngAfterViewInit() {
    if (!this.isServerSide) {
      this.resizeObserver = new ResizeObserver(() => {
        // Signals automatically trigger change detection in zoneless mode
        // The resize will be picked up by the observe-size directive
      });
      this.resizeObserver.observe(this.innerElement.nativeElement);
    }
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    this.resizeObserver?.unobserve(this.innerElement?.nativeElement);
    this.resizeObserver?.disconnect();
    this.clearAutoAdvance();
  }

  onContainerAnimationStart() {
    this.animationStart.emit();
  }

  onContainerAnimationEnd() {
    this.animationEnd.emit();
  }

  onImageIndexChange(index: number) {
    this.currentImageIndex.set(index);
  }
}
