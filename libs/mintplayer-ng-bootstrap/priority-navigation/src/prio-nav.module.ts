import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsObserveSizeDirective } from '@mintplayer/ng-bootstrap/observe-size';
import { BsPrioNavComponent } from './component/prio-nav.component';
import { BsPrioNavElementDirective } from './prio-nav-element.directive';

@NgModule({
  declarations: [BsPrioNavComponent, BsPrioNavElementDirective],
  imports: [CommonModule, BsObserveSizeDirective],
  exports: [BsPrioNavComponent, BsPrioNavElementDirective],
})
export class BsPrioNavModule { }
