import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgBootstrapAlertModule, NgBootstrapCardModule, NgBootstrapListGroupModule } from '@mintplayer/ng-bootstrap';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    NgBootstrapAlertModule,
    NgBootstrapCardModule,
    NgBootstrapListGroupModule
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
