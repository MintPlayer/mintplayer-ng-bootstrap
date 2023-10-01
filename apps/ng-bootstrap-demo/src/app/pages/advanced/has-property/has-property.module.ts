import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { BsButtonGroupModule } from '@mintplayer/ng-bootstrap/button-group';
import { BsHasPropertyModule } from '@mintplayer/ng-bootstrap/has-property';

import { HasPropertyRoutingModule } from './has-property-routing.module';
import { HasPropertyComponent } from './has-property.component';


@NgModule({
  declarations: [
    HasPropertyComponent
  ],
  imports: [
    CommonModule,
    BsHasPropertyModule,
    BsButtonTypeModule,
    BsButtonGroupModule,
    HasPropertyRoutingModule
  ]
})
export class HasPropertyModule { }
