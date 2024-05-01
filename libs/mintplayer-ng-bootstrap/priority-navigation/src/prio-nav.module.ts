import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';
import { BsDropdownMenuModule } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsObserveSizeDirective } from '@mintplayer/ng-bootstrap/observe-size';
import { BsPrioNavComponent } from './component/prio-nav.component';
import { BsPrioNavElementDirective } from './prio-nav-element.directive';
import { BsPrioNavButtonDirective } from './prio-nav-button.directive';

@NgModule({
  declarations: [BsPrioNavComponent, BsPrioNavElementDirective, BsPrioNavButtonDirective],
  imports: [CommonModule, BsObserveSizeDirective, BsDropdownModule, BsDropdownMenuModule],
  exports: [BsPrioNavComponent, BsPrioNavElementDirective, BsPrioNavButtonDirective],
})
export class BsPrioNavModule { }
