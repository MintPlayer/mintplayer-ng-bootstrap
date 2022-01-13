import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsTypeaheadModule } from '@mintplayer/ng-bootstrap';

import { TypeaheadRoutingModule } from './typeahead-routing.module';
import { TypeaheadComponent } from './typeahead.component';


@NgModule({
  declarations: [
    TypeaheadComponent
  ],
  imports: [
    CommonModule,
    BsTypeaheadModule,
    TypeaheadRoutingModule
  ]
})
export class TypeaheadModule { }
