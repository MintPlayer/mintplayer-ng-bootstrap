import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ObserveSizeDirective } from '@mintplayer/ng-bootstrap/observe-size';
import { BsPrioNavDirective } from './prio-nav.directive';
import { BsPrioNavElementDirective } from './prio-nav-element.directive';

@NgModule({
  declarations: [BsPrioNavDirective, BsPrioNavElementDirective],
  imports: [CommonModule, ObserveSizeDirective],
  exports: [BsPrioNavDirective, BsPrioNavElementDirective],
})
export class BsPrioNavModule { }
