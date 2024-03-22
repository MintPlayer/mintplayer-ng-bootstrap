import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';
import { BsCodeSnippetModule } from '@mintplayer/ng-bootstrap/code-snippet';

import { IconRoutingModule } from './icon-routing.module';
import { IconComponent } from './icon.component';


@NgModule({
  declarations: [
    IconComponent
  ],
  imports: [
    CommonModule,
    BsAlertModule,
    BsCodeSnippetModule,
    IconRoutingModule
  ]
})
export class IconModule { }
