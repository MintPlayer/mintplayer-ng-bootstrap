import { provideHttpClient, withFetch } from "@angular/common/http";
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from "@angular/core";
import { provideClientHydration, withEventReplay } from "@angular/platform-browser";
import { provideAnimations } from "@angular/platform-browser/animations";
import { PreloadAllModules, withPreloading, withInMemoryScrolling } from "@angular/router";
import { provideHighlightOptions } from 'ngx-highlightjs';
import ngBootstrapJson from '@mintplayer/ng-bootstrap/package.json';
import { provideNavigationLock, provideNavigationLockRouter } from '@mintplayer/ng-bootstrap/navigation-lock';
import { GIT_REPO } from "./providers/git-repo.provider";
import { BOOTSTRAP_VERSION } from "./providers/bootstrap-version.provider";

export const config: ApplicationConfig = {
    providers: [
        // Reuse the server-rendered DOM instead of a destructive re-render. This
        // removes the brief two-<mp-shell> overlap on reload (Angular used to build
        // its fresh tree — a second shell + hamburger — before discarding the SSR
        // one). The WC's DSD shadow is parser-attached and invisible to Angular's
        // light-DOM hydration walk, so the element + its slotted children are
        // simply adopted; Lit hydrates the DSD (see main.ts).
        provideClientHydration(withEventReplay()),
        provideAnimations(),
        provideHttpClient(withFetch()),
        provideZonelessChangeDetection(),
        provideBrowserGlobalErrorListeners(),
        provideNavigationLockRouter(
            [
                { path: '', loadChildren: () => import('./pages/pages.routes').then(m => m.ROUTES) },
            ],
            withPreloading(PreloadAllModules),
            // No withEnabledBlockingInitialNavigation(): it contradicts hydration
            // (NG05001). Hydration already blocks the initial navigation.
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
