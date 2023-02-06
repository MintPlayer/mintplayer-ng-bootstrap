import { AfterContentChecked, ContentChildren, Directive, QueryList } from '@angular/core';
import { SwipeDirective } from '../swipe/swipe.directive';

@Directive({
  selector: '[bsSwipeContainer]'
})
export class BsSwipeContainerDirective implements AfterContentChecked {

  @ContentChildren(SwipeDirective) swipes!: QueryList<SwipeDirective>;
  currentSlide?: SwipeDirective;

  ngAfterContentChecked(): void {
    if (!this.currentSlide || !this.swipes.find((s) => s === this.currentSlide)) {
      this.currentSlide = this.swipes.length === 0 ? undefined : this.swipes.get(0);
    }
  }

}
