import { Component, Input, ContentChildren, QueryList, TemplateRef } from '@angular/core';
import { BsCardHeaderDirective } from '../card-header/card-header.directive';
import { BsCardFooterDirective } from '../card-footer/card-footer.directive';
import { BsCardImageDirective } from '../card-image/card-image.directive';
import { BehaviorSubject, Observable, combineLatest, debounceTime, filter, find, findIndex, first, map, mergeMap, of, switchMap } from 'rxjs';

@Component({
  selector: 'bs-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss']
})
export class BsCardComponent {
  @Input() rounded = true;
  // hasHeader = false;
  // hasFooter = false;
  images$ = new BehaviorSubject<BsCardImageDirective[]>([]);
  topImage$: Observable<BsCardImageDirective>;
  bottomImage$: Observable<BsCardImageDirective>;
  
  constructor() {
    const topIndex$ = this.images$.pipe(switchMap(images => combineLatest(images.map(i => i.position$))))
      .pipe(map(pos => pos.findIndex(p => p === 'top')));

    const bottomIndex$ = this.images$.pipe(switchMap(images => combineLatest(images.map(i => i.position$))))
      .pipe(map(pos => pos.findIndex(p => p === 'bottom')));

    this.topImage$ = combineLatest([this.images$, topIndex$])
      .pipe(debounceTime(1), map(([images, index]) => images[index]));

    this.bottomImage$ = combineLatest([this.images$, bottomIndex$])
      .pipe(debounceTime(1), map(([images, index]) => images[index]));


    // let list1 = of(11, 22, 33, 44, 55, 66, 77, 88, 99);  
    // let final_val = list1.pipe(findIndex(x => x % 2 === 0),);  
    // final_val.subscribe(x => console.log(x));  

    // this.positions$ = this.images$.pipe(mergeMap(img => combineLatest(img.map(i => i.position$))));
    // this.hasTopImage$ = this.positions$.pipe(map(pos => pos.includes('top')));
    // this.hasBottomImage$ = this.positions$.pipe(map(pos => pos.includes('bottom')));
  }

  headerTemplate?: TemplateRef<any>;
  footerTemplate?: TemplateRef<any>;

  @ContentChildren(BsCardImageDirective) set images(value: QueryList<BsCardImageDirective>) {
    this.images$.next(value.toArray());
  }
}
