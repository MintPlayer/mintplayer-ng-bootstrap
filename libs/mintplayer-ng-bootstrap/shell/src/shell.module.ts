import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsShellComponent } from './shell/shell.component';
import { BsShellSidebarDirective } from './shell-sidebar/shell-sidebar.directive';



@NgModule({
  declarations: [BsShellComponent, BsShellSidebarDirective],
  imports: [CommonModule],
  exports: [BsShellComponent, BsShellSidebarDirective]
})
export class BsShellModule { }
