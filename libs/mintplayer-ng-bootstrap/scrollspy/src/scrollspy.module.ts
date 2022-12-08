import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsScrollspyComponent } from './component/scrollspy.component';
import { BsScrollspyDirective } from './directives/scrollspy.directive';



@NgModule({
  declarations: [
    BsScrollspyComponent,
    BsScrollspyDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsScrollspyComponent,
    BsScrollspyDirective
  ]
})
export class BsScrollspyModule { }
