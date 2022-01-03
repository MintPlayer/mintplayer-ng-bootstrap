import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ClickOutsideModule } from '@mintplayer/ng-click-outside';
import { BsTypeaheadComponent } from './typeahead.component';
import { BsProgressBarModule } from '../progress-bar/progress-bar.module';



@NgModule({
  declarations: [
    BsTypeaheadComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ClickOutsideModule,
    BsProgressBarModule
  ],
  exports: [
    BsTypeaheadComponent
  ]
})
export class BsTypeaheadModule { }
