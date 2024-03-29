import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EnhancedPasteModule } from '@mintplayer/ng-bootstrap/enhanced-paste';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { BsInputGroupModule } from '@mintplayer/ng-bootstrap/input-group';
import { BsDropdownMenuModule } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsHasOverlayModule } from '@mintplayer/ng-bootstrap/has-overlay';
import { BsTimepickerComponent } from './timepicker.component';

@NgModule({
  declarations: [
    BsTimepickerComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    EnhancedPasteModule,
    BsFormModule,
    BsDropdownModule,
    BsDropdownMenuModule,
    BsInputGroupModule,
    BsButtonTypeModule,
    BsHasOverlayModule,
  ],
  exports: [
    BsTimepickerComponent
  ]
})
export class BsTimepickerModule { }
