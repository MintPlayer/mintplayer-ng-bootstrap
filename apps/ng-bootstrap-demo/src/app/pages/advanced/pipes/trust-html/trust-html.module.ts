import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsTrustHtmlModule } from '@mintplayer/ng-bootstrap/trust-html';

import { TrustHtmlRoutingModule } from './trust-html-routing.module';
import { TrustHtmlComponent } from './trust-html.component';


@NgModule({
  declarations: [
    TrustHtmlComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsFormModule,
    BsGridModule,
    BsTrustHtmlModule,
    TrustHtmlRoutingModule
  ]
})
export class TrustHtmlModule { }
