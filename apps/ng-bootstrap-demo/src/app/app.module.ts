import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BsAccordionModule, BsAlertModule, BsCalendarModule, BsCardModule, BsListGroupModule } from '@mintplayer/ng-bootstrap';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BsAlertModule,
    BsCalendarModule,
    BsCardModule,
    BsListGroupModule,
    BsAccordionModule
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
