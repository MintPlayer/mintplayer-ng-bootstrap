import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { BsAccordionModule, BsAlertModule, BsCalendarModule, BsCardModule, BsListGroupModule, BsNavbarModule, BsTabControlModule } from '@mintplayer/ng-bootstrap';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BsAlertModule,
    BsCalendarModule,
    BsCardModule,
    BsListGroupModule,
    BsAccordionModule,
    BsTabControlModule,
    BsNavbarModule,
    RouterModule.forRoot([])
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
