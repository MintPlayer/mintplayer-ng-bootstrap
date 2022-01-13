import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FocusOnLoadModule } from '@mintplayer/ng-focus-on-load';
import { BsFontColorPipeModule, BsSelect2Module } from '@mintplayer/ng-bootstrap';

import { AutofocusRoutingModule } from './autofocus-routing.module';
import { AutofocusComponent } from './autofocus.component';


@NgModule({
  declarations: [
    AutofocusComponent
  ],
  imports: [
    CommonModule,
    BsSelect2Module,
    BsFontColorPipeModule,
    FocusOnLoadModule,
    AutofocusRoutingModule
  ]
})
export class AutofocusModule { }
