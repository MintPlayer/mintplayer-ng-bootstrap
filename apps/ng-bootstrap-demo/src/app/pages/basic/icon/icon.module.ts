import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsIconPipe } from '@mintplayer/ng-bootstrap/icon';
import { BsCodeSnippetModule } from '@mintplayer/ng-bootstrap/code-snippet';

import { IconRoutingModule } from './icon-routing.module';
import { IconComponent } from './icon.component';

@NgModule({
  declarations: [
    IconComponent
  ],
  imports: [
    CommonModule,
    BsIconPipe,
    BsCodeSnippetModule,
    IconRoutingModule
  ]
})
export class IconModule { }
