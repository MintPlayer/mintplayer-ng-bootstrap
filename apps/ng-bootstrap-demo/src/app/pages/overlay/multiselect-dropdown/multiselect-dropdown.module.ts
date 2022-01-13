import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsMultiselectModule } from '@mintplayer/ng-bootstrap';
import { FocusOnLoadModule } from '@mintplayer/ng-focus-on-load';

import { MultiselectDropdownRoutingModule } from './multiselect-dropdown-routing.module';
import { MultiselectDropdownComponent } from './multiselect-dropdown.component';


@NgModule({
  declarations: [
    MultiselectDropdownComponent
  ],
  imports: [
    CommonModule,
    BsMultiselectModule,
    FocusOnLoadModule,
    MultiselectDropdownRoutingModule
  ]
})
export class MultiselectDropdownModule { }
