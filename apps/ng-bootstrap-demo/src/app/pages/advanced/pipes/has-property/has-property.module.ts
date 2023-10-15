import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsHasPropertyModule } from '@mintplayer/ng-bootstrap/has-property';
import { BsCodeSnippetModule } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';

import { HasPropertyRoutingModule } from './has-property-routing.module';
import { HasPropertyComponent } from './has-property.component';


@NgModule({
  declarations: [
    HasPropertyComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsHasPropertyModule,
    BsCodeSnippetModule,
    BsToggleButtonModule,
    HasPropertyRoutingModule
  ]
})
export class HasPropertyModule { }
