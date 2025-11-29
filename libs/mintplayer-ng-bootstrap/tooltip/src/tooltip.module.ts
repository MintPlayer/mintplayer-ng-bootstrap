import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { BsOverlayComponent } from '@mintplayer/ng-bootstrap/overlay';
import { BsTooltipDirective } from './directive/tooltip.directive';
import { BsTooltipComponent } from './component/tooltip.component';

@NgModule({
  declarations: [
    BsTooltipDirective,
    BsTooltipComponent
  ],
  imports: [
    CommonModule,
    OverlayModule,
    BsOverlayComponent,
  ],
  exports: [
    BsTooltipDirective
  ]
})
export class BsTooltipModule { }
