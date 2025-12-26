import { provideHttpClient, withFetch } from "@angular/common/http";
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from "@angular/core";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import { PreloadAllModules, provideRouter, withEnabledBlockingInitialNavigation, withPreloading, withInMemoryScrolling } from "@angular/router";
import { provideHighlightOptions } from 'ngx-highlightjs';
import { provideAsyncHostBindings } from "@mintplayer/ng-bootstrap/async-host-binding";
import ngBootstrapJson from '@mintplayer/ng-bootstrap/package.json';
import { GIT_REPO } from "./providers/git-repo.provider";
import { BOOTSTRAP_VERSION } from "./providers/bootstrap-version.provider";

export const config: ApplicationConfig = {
    providers: [
        provideAnimationsAsync(),
        provideHttpClient(withFetch()),
        provideZonelessChangeDetection(),
        provideBrowserGlobalErrorListeners(),
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
        provideHighlightOptions({
            fullLibraryLoader: () => import('highlight.js'),
            themePath: 'solarized-dark.css'
        }),
        { provide: GIT_REPO, useValue: 'https://github.com/MintPlayer/mintplayer-ng-bootstrap/tree/master/apps/ng-bootstrap-demo/src/app/' },
        { provide: BOOTSTRAP_VERSION, useValue: ngBootstrapJson.version },
    ]
};