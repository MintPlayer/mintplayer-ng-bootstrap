import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { BsAccordionModule, BsAlertModule, BsCalendarModule, BsCardModule, BsCarouselModule, BsListGroupModule, BsNavbarModule, BsTabControlModule } from '@mintplayer/ng-bootstrap';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    FormsModule,
    BsAlertModule,
    BsCalendarModule,
    BsCardModule,
    BsCarouselModule,
    BsListGroupModule,
    BsAccordionModule,
    BsTabControlModule,
    BsNavbarModule,
    RouterModule.forRoot([], { initialNavigation: 'enabledBlocking' })
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
