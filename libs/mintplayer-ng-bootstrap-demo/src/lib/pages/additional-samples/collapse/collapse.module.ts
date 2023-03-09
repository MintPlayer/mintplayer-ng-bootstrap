import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { BsCodeSnippetModule } from '@mintplayer/ng-bootstrap/code-snippet';

import { CollapseRoutingModule } from './collapse-routing.module';
import { CollapseComponent } from './collapse.component';


@NgModule({
  declarations: [
    CollapseComponent
  ],
  imports: [
    CommonModule,
    BsGridModule,
    BsAlertModule,
    BsCodeSnippetModule,
    BsButtonTypeModule,
    CollapseRoutingModule
  ]
})
export class CollapseModule { }
