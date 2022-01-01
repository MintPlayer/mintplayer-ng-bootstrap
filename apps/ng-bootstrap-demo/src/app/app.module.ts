import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { BsAccordionModule, BsAlertModule, BsCalendarModule, BsCardModule, BsCarouselModule, BsDatatableModule, BsDatepickerModule, BsDropdownModule, BsListGroupModule, BsMultiselectModule, BsNavbarModule, BsScrollspyModule, BsTabControlModule } from '@mintplayer/ng-bootstrap';
import { BASE_URL } from '@mintplayer/ng-base-url';
import { API_VERSION } from '@mintplayer/ng-client';

import { AppComponent } from './app.component';
import { FocusOnLoadModule } from '@mintplayer/ng-focus-on-load';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
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
    HttpClientModule,
    FocusOnLoadModule,
    RouterModule.forRoot([], { initialNavigation: 'enabledBlocking' })
  ],
  providers: [
    { provide: BASE_URL, useValue: 'https://mintplayer.com' },
    { provide: API_VERSION, useValue: 'v3' }
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
