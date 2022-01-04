import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, JsonPipe } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { BsAccordionModule, BsAlertModule, BsCalendarModule, BsCardModule, BsCarouselModule, BsContextMenuModule, BsDatatableModule, BsDatepickerModule, BsDropdownModule, BsListGroupModule, BsMultiselectModule, BsNavbarModule, BsProgressBarModule, BsScrollspyModule, BsTabControlModule, BsToggleButtonModule, BsTooltipModule, BsTypeaheadModule } from '@mintplayer/ng-bootstrap';
import { BASE_URL } from '@mintplayer/ng-base-url';
import { API_VERSION } from '@mintplayer/ng-client';
import { FocusOnLoadModule } from '@mintplayer/ng-focus-on-load';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    BsAlertModule,
    BsCalendarModule,
    BsCardModule,
    BsCarouselModule,
    BsDatatableModule,
    BsDatepickerModule,
    BsListGroupModule,
    BsAccordionModule,
    BsTabControlModule,
    BsNavbarModule,
    BsScrollspyModule,
    BsDropdownModule,
    BsMultiselectModule,
    BsProgressBarModule,
    BsTypeaheadModule,
    BsContextMenuModule,
    BsToggleButtonModule,
    BsTooltipModule,
    HttpClientModule,
    FocusOnLoadModule,
    RouterModule.forRoot([], { initialNavigation: 'enabledBlocking', scrollOffset: [0, 56] })
  ],
  providers: [
    { provide: BASE_URL, useValue: 'https://mintplayer.com' },
    { provide: API_VERSION, useValue: 'v3' },
    JsonPipe
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
