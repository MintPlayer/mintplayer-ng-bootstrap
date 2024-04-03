import { provideHttpClient } from "@angular/common/http";
import { ApplicationConfig } from "@angular/core";
import { provideAnimations } from "@angular/platform-browser/animations";
import { PreloadAllModules, provideRouter, withEnabledBlockingInitialNavigation, withPreloading, withInMemoryScrolling } from "@angular/router";
import { HIGHLIGHT_OPTIONS, HighlightOptions } from 'ngx-highlightjs';
import { provideAsyncHostBindings } from "@mintplayer/ng-bootstrap/async-host-binding";
import ngBootstrapJson from '@mintplayer/ng-bootstrap/package.json';

export const config: ApplicationConfig = {
    providers: [
        provideAnimations(),
        provideHttpClient(),
        provideRouter(
            [
                { path: '', loadChildren: () => import('./pages/pages.routes').then(m => m.ROUTES) },
            ],
            withPreloading(PreloadAllModules),
            withEnabledBlockingInitialNavigation(),
            withInMemoryScrolling({
                scrollPositionRestoration: 'enabled',
                anchorScrolling: 'enabled',
            })
        ),
        provideAsyncHostBindings(),
        {
            provide: HIGHLIGHT_OPTIONS,
            useValue: <HighlightOptions>{
                fullLibraryLoader: () => import('highlight.js'),
                themePath: 'solarized-dark.css'
            }
        },
        { provide: 'GIT_REPO', useValue: 'https://github.com/MintPlayer/mintplayer-ng-bootstrap/tree/master/apps/ng-bootstrap-demo/src/app/' },
        { provide: 'BOOTSTRAP_VERSION', useValue: ngBootstrapJson.version },
    ]
};