import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsWordCountModule } from '@mintplayer/ng-bootstrap/word-count';

import { WordCountRoutingModule } from './word-count-routing.module';
import { WordCountComponent } from './word-count.component';


@NgModule({
  declarations: [
    WordCountComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsFormModule,
    BsWordCountModule,
    WordCountRoutingModule
  ]
})
export class WordCountModule { }
