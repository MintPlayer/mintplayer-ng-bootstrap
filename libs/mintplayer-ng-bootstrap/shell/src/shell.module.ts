import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsShellComponent } from './shell/shell.component';
import { BsShellSidebarDirective } from './shell-sidebar/shell-sidebar.directive';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';



@NgModule({
  declarations: [BsShellComponent, BsShellSidebarDirective],
  imports: [CommonModule, BsHasOverlayComponent],
  exports: [BsShellComponent, BsShellSidebarDirective]
})
export class BsShellModule { }
