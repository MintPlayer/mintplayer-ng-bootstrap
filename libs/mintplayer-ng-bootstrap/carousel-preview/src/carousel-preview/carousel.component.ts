import { isPlatformServer } from '@angular/common';
import { ChangeDetectorRef, Component, ContentChildren, forwardRef, HostBinding, HostListener, Inject, Input, PLATFORM_ID, QueryList, ViewChild } from '@angular/core';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsSwipeContainerDirective } from '@mintplayer/ng-swiper';
import { BsCarouselPreviewImageDirective } from '../carousel-preview-image/carousel-image.directive';

@Component({
  selector: 'bs-carousel-preview',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss'],
  animations: [FadeInOutAnimation]
})
export class BsCarouselPreviewComponent {

  constructor(@Inject(PLATFORM_ID) platformId: any, private cdRef: ChangeDetectorRef) {
    this.isServerSide = isPlatformServer(platformId);
  }
  
  colors = Color;
  isServerSide: boolean;
  currentImageIndex = 0;
  @Input() indicators = false;
  @Input() keyboardEvents = true;

  @ViewChild('container') swipeContainer!: BsSwipeContainerDirective;
  @ContentChildren(forwardRef(() => BsCarouselPreviewImageDirective)) images!: QueryList<BsCarouselPreviewImageDirective>;

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
          this.currentImageIndex = this.images.length - 1;
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
        if (this.currentImageIndex < this.images.length - 1) {
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


}
