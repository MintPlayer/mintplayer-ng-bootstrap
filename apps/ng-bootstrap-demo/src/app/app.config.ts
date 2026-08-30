import { provideHttpClient, withFetch } from "@angular/common/http";
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from "@angular/core";
import { provideClientHydration, withEventReplay } from "@angular/platform-browser";
import { provideAnimations } from "@angular/platform-browser/animations";
import { PreloadAllModules, withPreloading, withInMemoryScrolling } from "@angular/router";
import ngBootstrapJson from '@mintplayer/ng-bootstrap/package.json';
import { provideNavigationLock, provideNavigationLockRouter } from '@mintplayer/ng-bootstrap/navigation-lock';
import { GIT_REPO } from "./providers/git-repo.provider";
import { BOOTSTRAP_VERSION } from "./providers/bootstrap-version.provider";

export const config: ApplicationConfig = {
    providers: [
        // Reuse the server-rendered DOM instead of a destructive re-render. This
        // removes the brief two-<mp-shell> overlap on reload (Angular used to build
        // its fresh tree — a second shell + hamburger — before discarding the SSR
        // one). Two different reasons the WC content survives the hydration
        // walk, depending on the component's tier:
        //  - Shadow-DOM WCs: the DSD shadow is parser-attached and therefore
        //    invisible to Angular's light-DOM walk, so the element + its
        //    slotted children are simply adopted; Lit hydrates the DSD (main.ts).
        //  - Light-tier WCs (mp-datatable, mp-treeview, mp-tree-select, the
        //    query-builder family): their content IS in that walk, but the
        //    wrappers guard rendering on isPlatformServer, so SSR emits the
        //    element EMPTY and lit fills it after hydration completes.
        //    Measured: no NG05xx mismatches, no ngSkipHydration needed.
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
        { provide: GIT_REPO, useValue: 'https://github.com/MintPlayer/mintplayer-ng-bootstrap/tree/master/apps/ng-bootstrap-demo/src/app/' },
        { provide: BOOTSTRAP_VERSION, useValue: ngBootstrapJson.version },
    ]
};
