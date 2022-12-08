import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsInListModule } from '@mintplayer/ng-bootstrap';
import { BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';
import { BsDropdownMenuModule } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsItemTemplateDirective } from './directive/item-template.directive';
import { BsSelect2Component } from './component/select2.component';

@NgModule({
  declarations: [
    BsSelect2Component,
    BsItemTemplateDirective
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsDropdownModule,
    BsDropdownMenuModule,
    BsInListModule
  ],
  exports: [
    BsSelect2Component,
    BsItemTemplateDirective
  ]
})
export class BsSelect2Module { }
