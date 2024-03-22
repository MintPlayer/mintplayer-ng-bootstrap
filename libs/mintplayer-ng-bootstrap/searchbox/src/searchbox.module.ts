import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsLetModule } from '@mintplayer/ng-bootstrap/let';
import { FocusOnLoadModule } from '@mintplayer/ng-focus-on-load';
import { BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';
import { BsProgressBarModule } from '@mintplayer/ng-bootstrap/progress-bar';
import { BsDropdownMenuModule } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { BsHasOverlayModule } from '@mintplayer/ng-bootstrap/has-overlay';
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
    CommonModule,
    FormsModule,
    FocusOnLoadModule,
    BsLetModule,
    BsDropdownModule,
    BsDropdownMenuModule,
    BsButtonTypeModule,
    BsProgressBarModule,
    BsHasOverlayModule,
  ],
  exports: [
    BsSearchboxComponent,
    BsEnterSearchTermTemplateDirective,
    BsSuggestionTemplateDirective,
    BsNoResultsTemplateDirective,
  ],
})
export class BsSearchboxModule {}
