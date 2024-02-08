import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';
import { HIGHLIGHT_OPTIONS, HighlightOptions } from 'ngx-highlightjs';
import { provideHttpClient } from '@angular/common/http';
import { BsAsyncHostBindingModule } from '@mintplayer/ng-bootstrap/async-host-binding';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(appRoutes),
    provideAnimations(),
    provideHttpClient(),
    importProvidersFrom(BsAsyncHostBindingModule),
    {
      provide: HIGHLIGHT_OPTIONS,
      useValue: <HighlightOptions>{
        fullLibraryLoader: () => import('highlight.js'),
        themePath: 'solarized-dark.css'
      }
    },
    {
      provide: 'GIT_REPO',
      useValue: 'https://github.com/MintPlayer/mintplayer-ng-bootstrap/tree/master/apps/ng-bootstrap-demo/src/app/'
    },
  ],
};
