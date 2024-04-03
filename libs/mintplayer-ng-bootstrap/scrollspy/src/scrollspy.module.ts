import { NgModule } from '@angular/core';
import { BsScrollspyComponent } from './component/scrollspy.component';
import { BsScrollspyDirective } from './directives/scrollspy.directive';



@NgModule({
  declarations: [
    BsScrollspyComponent,
    BsScrollspyDirective
  ],
  imports: [],
  exports: [
    BsScrollspyComponent,
    BsScrollspyDirective
  ]
})
export class BsScrollspyModule { }
