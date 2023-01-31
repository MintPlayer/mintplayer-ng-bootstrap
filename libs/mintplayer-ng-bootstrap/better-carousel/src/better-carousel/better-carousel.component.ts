import { isPlatformServer } from '@angular/common';
import { AfterContentInit, Component, ContentChildren, HostBinding, HostListener, Inject, Input, OnDestroy, PLATFORM_ID, QueryList, TemplateRef } from '@angular/core';
import { CarouselSlideAnimation, FadeInOutAnimation } from '@mintplayer/ng-animations';
import { BehaviorSubject, map, Observable, Subject, take, takeUntil } from 'rxjs';
import { BsCarouselImageDirective } from '../carousel-image/carousel-image.directive';

@Component({
  selector: 'bs-better-carousel',
  templateUrl: './better-carousel.component.html',
  styleUrls: ['./better-carousel.component.scss'],
  animations: [FadeInOutAnimation, CarouselSlideAnimation]
})
export class BsBetterCarouselComponent implements OnDestroy, AfterContentInit {
  constructor(@Inject(PLATFORM_ID) platformId: any) {
    this.isServerSide = isPlatformServer(platformId);
    this.currentImageIndex$ = this.currentImageCounter$
      .pipe(map((counter) => {
        const l = this.images.length;
        return ((counter % l) + l) % l;
      }))
      .pipe(takeUntil(this.destroyed$));
    this.currentImage$ = this.currentImageIndex$
      .pipe(map((index) => this.images.get(index)?.itemTemplate ?? null))
      .pipe(takeUntil(this.destroyed$));
  }

  @ContentChildren(BsCarouselImageDirective) images!: QueryList<BsCarouselImageDirective>;
  @Input() indicators = false;
  
  isServerSide: boolean;

  destroyed$ = new Subject();
  currentImageCounter$ = new BehaviorSubject<number>(-1);
  currentImageIndex$: Observable<number>;
  currentImage$: Observable<TemplateRef<any> | null>;
  
  ngOnDestroy() {
    this.destroyed$.next(true);
  }

  ngAfterContentInit() {
    if (this.images.length > 0) {
      this.currentImageCounter$.next(0);
    } else {
      this.currentImageCounter$.next(-1);
    }
  }

  //#region Animation
  @HostBinding('@.disabled') public animationsDisabled = false;
  private _animation: 'fade' | 'slide' = 'slide';
  @Input() public set animation(value: 'fade' | 'slide') {
    this.animationsDisabled = true;
    this._animation = value;
    setTimeout(() => {
      this.animationsDisabled = false;
    }, 20);
  }
  public get animation() {
    return this._animation;
  }
  //#endregion

  previousImage() {
    this.currentImageCounter$
      .pipe(take(1))
      .subscribe((currentImageCounter) => {
        this.currentImageCounter$.next(currentImageCounter - 1);
      });
  }

  nextImage() {
    this.currentImageCounter$
      .pipe(take(1))
      .subscribe((currentImageCounter) => {
        this.currentImageCounter$.next(currentImageCounter + 1);
      });
  }

  setCurrentImage(index: number) {
    const currentValue = this.currentImageCounter$.value;
    const l = this.images.length;
    const counterMod = ((currentValue % l) + l) % l;
    const newValue = currentValue - counterMod + index;
    this.currentImageCounter$.next(newValue);
  }

  @HostListener('document:keydown.ArrowLeft', ['$event'])
  @HostListener('document:keydown.ArrowRight', ['$event'])
  onKeyPress(ev: KeyboardEvent) {
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
