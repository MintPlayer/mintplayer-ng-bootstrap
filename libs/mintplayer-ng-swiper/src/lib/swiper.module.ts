import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsSwipeDirective } from './directives/swipe/swipe.directive';
import { BsSwipeContainerDirective } from './directives/swipe-container/swipe-container.directive';

@NgModule({
  imports: [CommonModule],
  declarations: [BsSwipeDirective, BsSwipeContainerDirective],
  exports: [BsSwipeDirective, BsSwipeContainerDirective],
})
export class BsSwiperModule {}
