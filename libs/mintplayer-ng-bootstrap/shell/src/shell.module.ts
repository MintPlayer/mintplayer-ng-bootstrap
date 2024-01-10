import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { BsShellDirective } from './shell.directive';

@NgModule({
  declarations: [BsShellDirective],
  imports: [CommonModule, OverlayModule],
  exports: [BsShellDirective]
})
export class BsShellModule { }
