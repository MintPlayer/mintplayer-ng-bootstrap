import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EnhancedPasteModule } from '@mintplayer/ng-bootstrap/enhanced-paste';
import { BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { BsDropdownMenuModule } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsTimepickerComponent } from './timepicker.component';

@NgModule({
  declarations: [
    BsTimepickerComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    EnhancedPasteModule,
    BsDropdownModule,
    BsDropdownMenuModule,
    BsButtonTypeModule,
  ],
  exports: [
    BsTimepickerComponent
  ]
})
export class BsTimepickerModule { }
