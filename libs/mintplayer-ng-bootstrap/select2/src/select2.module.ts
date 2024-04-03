import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { BsInListPipe } from '@mintplayer/ng-bootstrap/in-list';
import { BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';
import { BsDropdownMenuModule } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { BsSelect2Component } from './component/select2.component';
import { BsItemTemplateDirective } from './directive/item-template/item-template.directive';
import { BsSuggestionTemplateDirective } from './directive/suggestion-template/suggestion-template.directive';

@NgModule({
  declarations: [
    BsSelect2Component,
    BsItemTemplateDirective,
    BsSuggestionTemplateDirective,
  ],
  imports: [
    NgTemplateOutlet,
    FormsModule,
    BsDropdownModule,
    BsDropdownMenuModule,
    BsHasOverlayComponent,
    BsInListPipe,
  ],
  exports: [
    BsSelect2Component,
    BsItemTemplateDirective,
    BsSuggestionTemplateDirective,
  ],
})
export class BsSelect2Module {}
