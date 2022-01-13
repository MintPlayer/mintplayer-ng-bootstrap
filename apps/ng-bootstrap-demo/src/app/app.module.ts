import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { BsNavbarModule } from '@mintplayer/ng-bootstrap';
import { BASE_URL } from '@mintplayer/ng-base-url';
import { API_VERSION } from '@mintplayer/ng-client';
import { HighlightOptions, HIGHLIGHT_OPTIONS } from 'ngx-highlightjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    CommonModule,
    BrowserAnimationsModule,
    BsNavbarModule,
    HttpClientModule,
    AppRoutingModule
  ],
  providers: [
    { provide: HIGHLIGHT_OPTIONS, useValue: <HighlightOptions>{
      fullLibraryLoader: () => import('highlight.js'),
      themePath: 'assets/styles/solarized-dark.css'
    } },
    { provide: BASE_URL, useValue: 'https://mintplayer.com' },
    { provide: API_VERSION, useValue: 'v3' },
    { provide: 'GIT_REPO', useValue: 'https://github.com/MintPlayer/mintplayer-ng-bootstrap/apps/ng-bootstrap-demo/src/app/' },
    JsonPipe
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

