import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsMarkdownModule } from '@mintplayer/ng-bootstrap/markdown';

import { MarkdownRoutingModule } from './markdown-routing.module';
import { MarkdownComponent } from './markdown.component';


@NgModule({
  declarations: [
    MarkdownComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsFormModule,
    BsGridModule,
    BsMarkdownModule,
    MarkdownRoutingModule
  ]
})
export class MarkdownModule { }
