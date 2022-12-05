import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsTypeaheadComponent } from './typeahead.component';
import { BsProgressBarModule } from '../progress-bar/progress-bar.module';
import { BsDropdownModule } from '../dropdown/dropdown.module';
import { BsDropdownMenuModule } from '../dropdown-menu/dropdown-menu.module';



@NgModule({
  declarations: [
    BsTypeaheadComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsDropdownModule,
    BsDropdownMenuModule,
    BsProgressBarModule
  ],
  exports: [
    BsTypeaheadComponent
  ]
})
export class BsTypeaheadModule { }
