import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsButtonTypeMockDirective } from './button-type.directive';



@NgModule({
  declarations: [BsButtonTypeMockDirective],
  imports: [CommonModule],
  exports: [BsButtonTypeMockDirective]
})
export class BsButtonTypeTestingModule { }
