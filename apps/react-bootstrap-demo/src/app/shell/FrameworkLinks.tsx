/**
 * Cross-framework brand-mark links per Decision 8 of the PRD. The
 * active framework is highlighted. Path is preserved across origins
 * so a user on /enterprise/scheduler in Angular lands on the same
 * route in React or Vue.
 *
 * In dev the cross-framework hosts don't exist, so links point at
 * localhost ports (Angular 4200, React 4000, Vue 4100 by convention).
 * In production they point at the subdomain Traefik routes (per phase 8).
 */
import { useLocation } from 'react-router-dom';
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

// Decide dev vs prod from Vite's build-time flag rather than `window.location`
// — under SSR the server has a shimmed `window` whose location wouldn't match
// the client, causing a hydration mismatch. `import.meta.env.DEV` is replaced
// identically in the server and client builds, so the hrefs always agree.
function originFor(framework: Framework): string {
  return import.meta.env.DEV ? DEV_HOSTS[framework] : PROD_HOSTS[framework];
}

const ACTIVE: Framework = 'react';

export function FrameworkLinks() {
  const { pathname } = useLocation();

  return (
    <nav className="framework-nav" aria-label="Switch demo framework">
      <a
        href={`${originFor('angular')}${pathname}`}
        title="Angular demo"
        aria-label="Open the same page in the Angular demo"
        className={ACTIVE === 'angular' ? 'active' : ''}
      >
        <AngularMark />
      </a>
      <a
        href={`${originFor('react')}${pathname}`}
        title="React demo"
        aria-label="Open the same page in the React demo"
        className={ACTIVE === 'react' ? 'active' : ''}
      >
        <ReactMark />
      </a>
      <a
        href={`${originFor('vue')}${pathname}`}
        title="Vue demo"
        aria-label="Open the same page in the Vue demo"
        className={ACTIVE === 'vue' ? 'active' : ''}
      >
        <VueMark />
      </a>
    </nav>
  );
}

function AngularMark() {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M16 2L3 6.5l2 17L16 30l11-6.5 2-17L16 2z" fill="#DD0031" />
      <path d="M16 2v28l11-6.5 2-17L16 2z" fill="#C3002F" />
      <path d="M16 6l-7.5 16.5h2.8L13 19h6l1.7 3.5h2.8L16 6zm-2.2 10.7L16 11.4l2.2 5.3h-4.4z" fill="#FFF" />
    </svg>
  );
}

function ReactMark() {
  return (
    <svg viewBox="-11.5 -10.23174 23 20.46348" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle r="2.05" fill="#61DAFB" />
      <g stroke="#61DAFB" strokeWidth="1" fill="none">
        <ellipse rx="11" ry="4.2" />
        <ellipse rx="11" ry="4.2" transform="rotate(60)" />
        <ellipse rx="11" ry="4.2" transform="rotate(120)" />
      </g>
    </svg>
  );
}

function VueMark() {
  return (
    <svg viewBox="0 0 261.76 226.69" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M161.096.001l-30.225 52.351L100.647.001H-.005L130.871 226.69 261.749.001z" fill="#41B883" />
      <path d="M161.096.001l-30.225 52.351L100.647.001H52.346l78.526 136.01L209.398.001z" fill="#34495E" />
    </svg>
  );
}
