import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ObserversModule } from '@angular/cdk/observers';
import { BsSwipeDirective } from './directives/swipe/swipe.directive';
import { BsSwipeContainerDirective } from './directives/swipe-container/swipe-container.directive';

@NgModule({
  imports: [CommonModule, ObserversModule],
  declarations: [BsSwipeDirective, BsSwipeContainerDirective],
  exports: [BsSwipeDirective, BsSwipeContainerDirective],
})
export class BsSwiperModule {}
