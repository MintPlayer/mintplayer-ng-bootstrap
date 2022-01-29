import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsTimepickerComponent } from './timepicker.component';
import { BsDropdownModule } from '../dropdown';
import { EnhancedPasteModule } from '../../directives/enhanced-paste/enhanced-paste.module';

@NgModule({
  declarations: [
    BsTimepickerComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    EnhancedPasteModule,
    BsDropdownModule
  ],
  exports: [
    BsTimepickerComponent
  ]
})
export class BsTimepickerModule { }
