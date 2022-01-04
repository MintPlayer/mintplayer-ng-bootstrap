import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsDropdownModule } from '../dropdown/dropdown.module';
import { BsItemTemplateDirective } from './directive/item-template.directive';
import { BsSelect2Component } from './component/select2.component';
import { BsInListModule } from '../../pipes/in-list/in-list.module';

@NgModule({
  declarations: [
    BsSelect2Component,
    BsItemTemplateDirective
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsDropdownModule,
    BsInListModule
  ],
  exports: [
    BsSelect2Component,
    BsItemTemplateDirective
  ]
})
export class BsSelect2Module { }
