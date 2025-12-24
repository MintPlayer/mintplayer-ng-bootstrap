import { NgModule } from '@angular/core';
import { BsSwipeDirective } from './directives/swipe/swipe.directive';
import { BsSwipeContainerDirective } from './directives/swipe-container/swipe-container.directive';

@NgModule({
  imports: [BsSwipeDirective, BsSwipeContainerDirective],
  exports: [BsSwipeDirective, BsSwipeContainerDirective],
})
export class BsSwiperModule {}
