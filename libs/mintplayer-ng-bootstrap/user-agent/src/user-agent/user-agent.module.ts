import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsUserAgentDirective } from './user-agent.directive';



@NgModule({
  declarations: [
    BsUserAgentDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsUserAgentDirective
  ]
})
export class BsUserAgentModule { }
