import { NgModule } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';
import { BsTypeaheadModule } from '@mintplayer/ng-bootstrap/typeahead';

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
  ],
  providers: [
    JsonPipe
  ]
})
export class TypeaheadModule { }
