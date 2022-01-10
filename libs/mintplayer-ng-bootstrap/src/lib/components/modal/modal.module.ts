import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsModalComponent } from './component/modal.component';
import { BsModalDirective } from './directive/modal.directive';

@NgModule({
  declarations: [
    BsModalComponent,
    BsModalDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsModalComponent,
    BsModalDirective
  ]
})
export class BsModalModule { }
