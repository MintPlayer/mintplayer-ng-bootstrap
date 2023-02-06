import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SwipeDirective } from './directives/swipe/swipe.directive';
import { BsSwipeContainerDirective } from './directives/swipe-container/swipe-container.directive';

@NgModule({
  imports: [CommonModule],
  declarations: [SwipeDirective, BsSwipeContainerDirective],
  exports: [SwipeDirective, BsSwipeContainerDirective],
})
export class SwiperModule {}
