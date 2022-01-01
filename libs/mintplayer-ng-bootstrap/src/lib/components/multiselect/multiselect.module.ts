import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsMultiselectComponent } from './multiselect.component';
import { BsDropdownModule } from '../dropdown/dropdown.module';
import { FocusOnLoadModule } from '@mintplayer/ng-focus-on-load';

@NgModule({
  declarations: [
    BsMultiselectComponent
  ],
  imports: [
    CommonModule,
    BsDropdownModule,
    FocusOnLoadModule,
  ],
  exports: [
    BsMultiselectComponent
  ]
})
export class BsMultiselectModule { }
