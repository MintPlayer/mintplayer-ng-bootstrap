import { ChangeDetectionStrategy, Component, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';

type Framework = 'angular' | 'react' | 'vue';

const PROD_HOSTS: Record<Framework, string> = {
  angular: 'https://bootstrap.mintplayer.com',
  react: 'https://react.bootstrap.mintplayer.com',
  vue: 'https://vue.bootstrap.mintplayer.com',
};

const DEV_HOSTS: Record<Framework, string> = {
  angular: 'http://localhost:4200',
  react: 'http://localhost:4000',
  vue: 'http://localhost:4100',
};

@Component({
  selector: 'demo-framework-links',
  templateUrl: './framework-links.component.html',
  styleUrl: './framework-links.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FrameworkLinksComponent {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * Recompute hrefs on every navigation. We can't subscribe to a signal off
   * the router's URL directly, but NavigationEnd fires once per route — wrap
   * it as a signal so the template re-evaluates the computeds.
   */
  private readonly navTick = toSignal(
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)),
    { initialValue: null },
  );

  private isLocalhost(): boolean {
    if (isPlatformServer(this.platformId)) return false;
    return window.location.hostname === 'localhost';
  }

  private originFor(framework: Framework): string {
    return this.isLocalhost() ? DEV_HOSTS[framework] : PROD_HOSTS[framework];
  }

  readonly angularHref = computed(() => {
    this.navTick();
    return `${this.originFor('angular')}${this.router.url}`;
  });

  readonly reactHref = computed(() => {
    this.navTick();
    return `${this.originFor('react')}${this.router.url}`;
  });

  readonly vueHref = computed(() => {
    this.navTick();
    return `${this.originFor('vue')}${this.router.url}`;
  });
}
