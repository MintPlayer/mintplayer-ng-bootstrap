import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsNoNoscriptDirective } from './no-noscript/no-noscript.directive';



@NgModule({
  declarations: [BsNoNoscriptDirective],
  imports: [CommonModule],
  exports: [BsNoNoscriptDirective]
})
export class BsNoNoscriptModule { }
