import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import { FocusOnLoadDirective } from '@mintplayer/ng-focus-on-load';
import { BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';
import { BsProgressBarModule } from '@mintplayer/ng-bootstrap/progress-bar';
import { BsDropdownMenuModule } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { BsSearchboxComponent } from './searchbox/searchbox.component';
import { BsEnterSearchTermTemplateDirective } from './directives/enter-search-term.directive';
import { BsSuggestionTemplateDirective } from './directives/suggestion.directive';
import { BsNoResultsTemplateDirective } from './directives/no-results.directive';

@NgModule({
  declarations: [
    BsSearchboxComponent,
    BsEnterSearchTermTemplateDirective,
    BsSuggestionTemplateDirective,
    BsNoResultsTemplateDirective,
  ],
  imports: [
    FormsModule,
    AsyncPipe,
    NgTemplateOutlet,
    FocusOnLoadDirective,
    BsDropdownModule,
    BsDropdownMenuModule,
    BsButtonTypeDirective,
    BsProgressBarModule,
    BsHasOverlayComponent,
  ],
  exports: [
    BsSearchboxComponent,
    BsEnterSearchTermTemplateDirective,
    BsSuggestionTemplateDirective,
    BsNoResultsTemplateDirective,
  ],
})
export class BsSearchboxModule {}
