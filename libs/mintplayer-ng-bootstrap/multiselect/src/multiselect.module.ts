import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { FocusOnLoadDirective } from '@mintplayer/ng-focus-on-load';
import { BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
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
    NgTemplateOutlet,
    FormsModule,
    BsDropdownModule,
    BsToggleButtonComponent,
    BsButtonTypeDirective,
    BsHasOverlayComponent,
    FocusOnLoadDirective,
  ],
  exports: [
    BsMultiselectComponent,
    BsHeaderTemplateDirective,
    BsFooterTemplateDirective,
    BsButtonTemplateDirective
  ]
})
export class BsMultiselectModule { }
