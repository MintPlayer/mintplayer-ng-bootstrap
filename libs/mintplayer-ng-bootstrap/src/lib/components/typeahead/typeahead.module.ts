import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsTypeaheadComponent } from './typeahead.component';
import { ClickOutsideModule } from '../click-outside/click-outside.module';



@NgModule({
  declarations: [
    BsTypeaheadComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ClickOutsideModule
  ],
  exports: [
    BsTypeaheadComponent
  ]
})
export class BsTypeaheadModule { }
