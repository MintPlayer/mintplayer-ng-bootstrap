import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FocusOnLoadModule } from '@mintplayer/ng-focus-on-load';
import { BsFontColorModule } from '@mintplayer/ng-bootstrap/font-color';
import { BsSelect2Module } from '@mintplayer/ng-bootstrap/select2';

import { AutofocusRoutingModule } from './autofocus-routing.module';
import { AutofocusComponent } from './autofocus.component';


@NgModule({
  declarations: [
    AutofocusComponent
  ],
  imports: [
    CommonModule,
    BsSelect2Module,
    BsFontColorModule,
    FocusOnLoadModule,
    AutofocusRoutingModule
  ]
})
export class AutofocusModule { }
