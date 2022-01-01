import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsDropdownModule } from '../dropdown/dropdown.module';
import { BsTypeaheadComponent } from './typeahead.component';



@NgModule({
  declarations: [
    BsTypeaheadComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsDropdownModule
  ],
  exports: [
    BsTypeaheadComponent
  ]
})
export class BsTypeaheadModule { }
