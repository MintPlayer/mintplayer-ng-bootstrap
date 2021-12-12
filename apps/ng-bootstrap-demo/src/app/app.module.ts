import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { BsNavbarModule } from '@mintplayer/ng-bootstrap';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BsNavbarModule,
    RouterModule.forRoot([])
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
