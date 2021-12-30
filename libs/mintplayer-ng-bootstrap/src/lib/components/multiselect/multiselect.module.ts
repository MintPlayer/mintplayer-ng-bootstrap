import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsMultiselectComponent } from './multiselect.component';
import { BsDropdownModule } from '../dropdown/dropdown.module';

@NgModule({
  declarations: [
    BsMultiselectComponent
  ],
  imports: [
    CommonModule,
    BsDropdownModule
  ],
  exports: [
    BsMultiselectComponent
  ]
})
export class BsMultiselectModule { }
