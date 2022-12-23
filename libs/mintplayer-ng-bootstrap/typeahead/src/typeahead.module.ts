import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';
import { BsDropdownMenuModule } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsProgressBarModule } from '@mintplayer/ng-bootstrap/progress-bar';
import { BsHasOverlayModule } from '@mintplayer/ng-bootstrap/has-overlay';
import { BsTypeaheadComponent } from './typeahead.component';



@NgModule({
  declarations: [
    BsTypeaheadComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsDropdownModule,
    BsDropdownMenuModule,
    BsProgressBarModule,
    BsHasOverlayModule,
  ],
  exports: [
    BsTypeaheadComponent
  ]
})
export class BsTypeaheadModule { }
