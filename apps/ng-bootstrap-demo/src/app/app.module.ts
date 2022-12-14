import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule, JsonPipe } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HighlightOptions, HIGHLIGHT_OPTIONS } from 'ngx-highlightjs';
import { BS_DEVELOPMENT } from '@mintplayer/ng-bootstrap';
import { BsNavbarModule } from '@mintplayer/ng-bootstrap/navbar';
import ngBootstrapJson from '@mintplayer/ng-bootstrap/package.json';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { DirectivesModule } from './directives/directives.module';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    CommonModule,
    BrowserAnimationsModule,
    BsNavbarModule,
    HttpClientModule,
    AppRoutingModule,
    DirectivesModule
  ],
  providers: [
    {
      provide: HIGHLIGHT_OPTIONS,
      useValue: <HighlightOptions>{
        fullLibraryLoader: () => import('highlight.js'),
        themePath: 'solarized-dark.css'
      }
    },
    {
      provide: BS_DEVELOPMENT,
      useValue: false
    },
    {
      provide: 'GIT_REPO',
      useValue: 'https://github.com/MintPlayer/mintplayer-ng-bootstrap/tree/master/apps/ng-bootstrap-demo/src/app/'
    },
    {
      provide: 'BOOTSTRAP_VERSION',
      useValue: ngBootstrapJson.version
    },
    JsonPipe
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

