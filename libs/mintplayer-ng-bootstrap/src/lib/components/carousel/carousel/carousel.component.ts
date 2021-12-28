import { AfterContentInit, Component, ContentChildren, ElementRef, OnDestroy, OnInit, QueryList, TemplateRef } from '@angular/core';
import { FadeInOutAnimation, CarouselSlideAnimation } from '@mintplayer/ng-animations';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map, take, takeUntil } from 'rxjs/operators';
import { ModuloService } from '../../../services/modulo/modulo.service';
import { BsCarouselSlideDirective } from '../carousel-slide/carousel-slide.directive';

@Component({
  selector: 'bs-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss'],
  animations: [FadeInOutAnimation, CarouselSlideAnimation]
})
export class BsCarouselComponent implements OnInit, OnDestroy, AfterContentInit {

  constructor(private moduloService: ModuloService) {
    this.currentSlideIndex$ = this.currentSlideCounter$
      .pipe(map((index) => moduloService.modulo(index, this.slides.length)))
      .pipe(takeUntil(this.destroyed$));
  }

  ngOnInit(): void { }

  ngOnDestroy() {
    this.destroyed$.next(true);
  }

  ngAfterContentInit() {
    if (this.slides.length > 0) {
      this.currentSlideCounter$.next(0);
    } else {
      this.currentSlideCounter$.next(-1);
    }
  }

  destroyed$ = new Subject();
  currentSlideCounter$ = new BehaviorSubject<number>(Number.NaN);
  currentSlideIndex$: Observable<number>;

  previousSlide() {
    this.currentSlideCounter$
      .pipe(take(1))
      .subscribe((currentSlideCounter) => {
        this.currentSlideCounter$.next(currentSlideCounter - 1);
      });
  }

  nextSlide() {
    this.currentSlideCounter$
      .pipe(take(1))
      .subscribe((currentSlideCounter) => {
        this.currentSlideCounter$.next(currentSlideCounter + 1);
      });
  }

  setcurrentSlide(index: number) {
    this.currentSlideCounter$.next(index);
  }

  @ContentChildren(BsCarouselSlideDirective) slides!: QueryList<BsCarouselSlideDirective>;

}
