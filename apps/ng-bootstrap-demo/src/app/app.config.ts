import { provideHttpClient, withFetch } from "@angular/common/http";
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from "@angular/core";
import { provideAnimations } from "@angular/platform-browser/animations";
import { PreloadAllModules, withEnabledBlockingInitialNavigation, withPreloading, withInMemoryScrolling } from "@angular/router";
import { provideHighlightOptions } from 'ngx-highlightjs';
import ngBootstrapJson from '@mintplayer/ng-bootstrap/package.json';
import { provideNavigationLock, provideNavigationLockRouter } from '@mintplayer/ng-bootstrap/navigation-lock';
import { GIT_REPO } from "./providers/git-repo.provider";
import { BOOTSTRAP_VERSION } from "./providers/bootstrap-version.provider";

export const config: ApplicationConfig = {
    providers: [
        provideAnimations(),
        provideHttpClient(withFetch()),
        provideZonelessChangeDetection(),
        provideBrowserGlobalErrorListeners(),
        provideNavigationLockRouter(
            [
                { path: '', loadChildren: () => import('./pages/pages.routes').then(m => m.ROUTES) },
            ],
            withPreloading(PreloadAllModules),
            withEnabledBlockingInitialNavigation(),
            withInMemoryScrolling({
                scrollPositionRestoration: 'enabled',
                anchorScrolling: 'enabled',
            }),
        ),
        provideNavigationLock(),
        provideHighlightOptions({
            fullLibraryLoader: () => import('highlight.js'),
            themePath: 'a11y-dark.css'
        }),
        { provide: GIT_REPO, useValue: 'https://github.com/MintPlayer/mintplayer-ng-bootstrap/tree/master/apps/ng-bootstrap-demo/src/app/' },
        { provide: BOOTSTRAP_VERSION, useValue: ngBootstrapJson.version },
    ]
};
