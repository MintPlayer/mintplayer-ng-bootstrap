<script setup lang="ts">
import {
  BS_THEME_DEFAULT_MODES,
  BsThemeToggle,
  useBsTheme,
  type BsThemeMode,
  type BsThemeToggleMode,
} from '@mintplayer/vue-bootstrap/theming';
import { BsCodeSnippet } from '@mintplayer/vue-bootstrap/code-snippet';

const { mode, effectiveMode, setMode } = useBsTheme();

// A custom cycle: light and dark only (no auto), localized to Dutch. Built by
// spreading the defaults so the icons stay the stock ones.
const DUTCH: Record<string, Pick<BsThemeToggleMode, 'label' | 'announcement'>> = {
  light: { label: 'Schakel naar licht thema', announcement: 'Licht thema' },
  dark: { label: 'Schakel naar donker thema', announcement: 'Donker thema' },
};
const lightDarkNl: readonly BsThemeToggleMode[] = BS_THEME_DEFAULT_MODES
  .filter((m) => m.mode in DUTCH)
  .map((m) => ({ ...m, ...DUTCH[m.mode] }));

const MODES: readonly BsThemeMode[] = ['auto', 'light', 'dark'];

const TOGGLE_SNIPPET = `<script setup lang="ts">
import {
  BS_THEME_DEFAULT_MODES,
  BsThemeToggle,
  useBsTheme,
} from '@mintplayer/vue-bootstrap/theming';

// Custom modes: any subset, order, or extra entry. Localize by spreading
// the defaults and overriding label (the NEXT action) and announcement
// (the CURRENT state).
const modes = BS_THEME_DEFAULT_MODES
  .filter((m) => m.mode !== 'auto')
  .map((m) => ({ ...m, label: t(m.label), announcement: t(m.announcement) }));

// The same state from code, as readonly refs. They update on any change:
// a toggle, another tab, or the OS preference while in auto.
const { mode, effectiveMode, setMode } = useBsTheme();
<\/script>

<template>
  <!-- Default cycle: auto -> light -> dark. It drives the shared store itself. -->
  <BsThemeToggle />
  <BsThemeToggle :modes="modes" aria-describedby="theme-help" />
  <button type="button" @click="setMode('dark')">
    {{ mode }} ({{ effectiveMode }})
  </button>
</template>`;

const INDEX_HTML_SNIPPET = `<head>
  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff">
  <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#212529">
  <!-- The site default: auto, light, dark or a custom mode. -->
  <meta name="bs-theme-default-mode" content="auto">
  <!-- Blocking, BEFORE the stylesheets: applies the cookie (or the default,
       or the OS scheme) to <html data-bs-theme> before the first paint.
       Copy @mintplayer/web-components/theming/bs-theme-preboot.js to /theming/. -->
  <script src="/theming/bs-theme-preboot.js"><\/script>
  <link rel="stylesheet" href="/src/styles.css">
</head>`;

const STYLES_SNIPPET = `@import 'bootstrap/dist/css/bootstrap.min.css';
/* --mp-color-mode: the token the components' dark icons query. */
@import '@mintplayer/web-components/theming/color-mode.css';

/* A custom theme declares its own token next to its colours. */
[data-bs-theme=sepia] {
  --mp-color-mode: light;
  --bs-body-bg: #f4ecd8;
}`;

const SERVER_SNIPPET = `import { injectThemeAttribute, resolveServerTheme } from '@mintplayer/vue-bootstrap/theming';

// Keep defaultMode equal to the bs-theme-default-mode meta
// (this demo reads it from the template with a regex).
const mode = resolveServerTheme(req.headers.cookie, { defaultMode: 'auto' });
const html = injectThemeAttribute(template.replace('<!--app-html-->', appHtml), mode);

// The markup depends on the cookie: never let a shared cache mix visitors.
res.status(200).set({ 'Content-Type': 'text/html', Vary: 'Cookie' }).end(html);`;

const CONFIG_SNIPPET = `import { configureBsTheme } from '@mintplayer/vue-bootstrap/theming';

// Before the first toggle or useBsTheme() call: share the cookie across subdomains.
configureBsTheme({ cookieDomain: '.example.com' });`;

const COOKIE_PATTERN = '^[a-z0-9-]{1,32}$';
</script>

<template>
  <div class="demo-page">
    <h1>Theming &amp; dark mode</h1>
    <p class="text-body-secondary">
      Bootstrap 5.3 switches colours with <code>&lt;html data-bs-theme&gt;</code>. The theme store
      in <code>@mintplayer/web-components/theming</code> owns the user&apos;s choice, persists it in
      the <code>bs-theme-mode</code> cookie and resolves <code>auto</code> from
      <code>prefers-color-scheme</code>, live. <code>BsThemeToggle</code> and
      <code>useBsTheme()</code> are two views of that one store, shared with every other
      framework&apos;s adapter on the page.
    </p>

    <section>
      <h2>Toggle</h2>
      <div class="d-flex flex-wrap align-items-center gap-4 mb-3">
        <div class="d-flex align-items-center gap-2">
          <BsThemeToggle />
          <span>Default: auto, light, dark</span>
        </div>
        <div class="d-flex align-items-center gap-2">
          <BsThemeToggle :modes="lightDarkNl" />
          <span>Custom <code>modes</code>: light and dark, in Dutch</span>
        </div>
      </div>
      <p class="text-body-secondary">
        The button&apos;s name is the next action (&ldquo;Switch to dark theme&rdquo;), its
        description is the current state, and each click is announced. Enter and Space cycle it.
        More than about three modes wants a menu (a radio group) rather than a cycling button.
      </p>
    </section>

    <section>
      <h2>From code: useBsTheme()</h2>
      <p>
        Mode <code>{{ mode }}</code>, effective <code>{{ effectiveMode }}</code>.
      </p>
      <div class="btn-group mb-3" role="group" aria-label="Theme mode">
        <button
          v-for="m in MODES"
          :key="m"
          type="button"
          :class="['btn', m === mode ? 'btn-primary' : 'btn-outline-primary']"
          :aria-pressed="m === mode"
          @click="setMode(m)"
        >
          {{ m }}
        </button>
      </div>
      <BsCodeSnippet :code="TOGGLE_SNIPPET" language="html" />
    </section>

    <section>
      <h2>No flash on load</h2>
      <p>
        The pre-boot script is generated from the same core as the store (ES5, under 1 KB). It
        runs before the stylesheets, so a dark user never sees a light frame: with or without
        SSR, and on cached or prerendered pages. The <code>color-scheme</code> meta themes native
        controls and scrollbars; the two <code>theme-color</code> metas tint the browser chrome.
      </p>
      <BsCodeSnippet :code="INDEX_HTML_SNIPPET" language="html" />
      <p class="mt-3">
        Stock <code>bootstrap.min.css</code> has no <code>--mp-color-mode</code> token, which the
        components&apos; dark select carets and switch knobs query through shadow roots. Import it
        beside Bootstrap:
      </p>
      <BsCodeSnippet :code="STYLES_SNIPPET" language="css" />
    </section>

    <section>
      <h2>Server-side rendering</h2>
      <p>
        Splice the attribute onto <code>&lt;html&gt;</code> on the server so even a visitor with
        JavaScript disabled gets their theme. A valid cookie wins (an explicit <code>auto</code>
        included), then the meta default, then <code>auto</code>, which renders no attribute.
        Invalid cookie values are ignored, so the result is always safe to splice.
      </p>
      <BsCodeSnippet :code="SERVER_SNIPPET" language="ts" />
    </section>

    <section>
      <h2>Cookie</h2>
      <p>
        <code>bs-theme-mode</code>: <code>Path=/</code>, <code>SameSite=Lax</code>, one year,
        <code>Secure</code> on https. Values match <code>{{ COOKIE_PATTERN }}</code>; localStorage is
        never used.
      </p>
      <BsCodeSnippet :code="CONFIG_SNIPPET" language="ts" />
    </section>
  </div>
</template>
