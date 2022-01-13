import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsDropdownModule } from '../dropdown/dropdown.module';
import { FocusOnLoadModule } from '@mintplayer/ng-focus-on-load';
import { BsMultiselectComponent } from './component/multiselect.component';
import { BsHeaderTemplateDirective } from './directives/header-template/header-template.directive';
import { BsFooterTemplateDirective } from './directives/footer-template/footer-template.directive';
import { BsButtonTemplateDirective } from './directives/button-template/button-template.directive';

@NgModule({
  declarations: [
    BsMultiselectComponent,
    BsHeaderTemplateDirective,
    BsFooterTemplateDirective,
    BsButtonTemplateDirective
  ],
  imports: [
    CommonModule,
    BsDropdownModule,
    FocusOnLoadModule,
  ],
  exports: [
    BsMultiselectComponent,
    BsHeaderTemplateDirective,
    BsFooterTemplateDirective,
    BsButtonTemplateDirective
  ]
})
export class BsMultiselectModule { }
