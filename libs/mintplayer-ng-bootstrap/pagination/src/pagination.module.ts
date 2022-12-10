import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsPaginationComponent } from './component/pagination/pagination.component';



@NgModule({
  declarations: [
    BsPaginationComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsPaginationComponent
  ]
})
export class BsPaginationModule { }
