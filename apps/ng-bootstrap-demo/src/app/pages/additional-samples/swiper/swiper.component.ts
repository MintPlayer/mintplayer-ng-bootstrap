import { animate, AnimationBuilder, AnimationPlayer, state, style } from '@angular/animations';
import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { BehaviorSubject, combineLatest, filter, map, Observable, Subject, take, takeUntil, tap, delay, debounceTime, of } from 'rxjs';

export interface Point {
  x: number;
  y: number;
}

export interface StartTouch {
  position: Point;
  timestamp: number;
}

export interface LastTouch {
  position: Point;
  isTouching: boolean;
}

@Component({
  selector: 'demo-swiper',
  templateUrl: './swiper.component.html',
  styleUrls: ['./swiper.component.scss']
})
export class SwiperComponent {

  images$ = new BehaviorSubject<string[]>([
    '/assets/resized/deer.png',
    '/assets/resized/duck.png',
    '/assets/resized/leopard.png',
    '/assets/resized/lion.png',
    '/assets/resized/peacock.png',
    '/assets/resized/tiger.png',
  ]);

}
