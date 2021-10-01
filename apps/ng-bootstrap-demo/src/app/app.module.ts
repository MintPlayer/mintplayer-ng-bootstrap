import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BsAccordionModule, BsAlertModule, BsCalendarModule, BsCardModule, BsListGroupModule, BsTabControlModule } from '@mintplayer/ng-bootstrap';

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
    BsTabControlModule
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
