<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
import FrameworkLinks from './FrameworkLinks.vue';
import pkg from '@mintplayer/vue-bootstrap/package.json';

// Read the version from the wrapper package so the navbar tracks
// @mintplayer/vue-bootstrap rather than a hardcoded string, mirroring the
// Angular demo's GitHub link.
const version = pkg.version;
const repoUrl = 'https://github.com/MintPlayer/mintplayer-ng-bootstrap';

const SECTIONS = [
  {
    title: 'Basic',
    routes: [
      { path: '/basic/card', label: 'Card' },
      { path: '/basic/calendar', label: 'Calendar' },
      { path: '/basic/forms/datepicker', label: 'Datepicker' },
      { path: '/basic/forms/datetime-picker', label: 'Datetime picker' },
      { path: '/basic/forms/timepicker', label: 'Timepicker' },
      { path: '/basic/forms/multi-range', label: 'Multi-range' },
      { path: '/basic/forms/select', label: 'Select' },
      { path: '/basic/checkbox', label: 'Checkbox' },
      { path: '/basic/radio', label: 'Radio' },
      { path: '/basic/toggle-button', label: 'Toggle button' },
      { path: '/basic/pagination', label: 'Pagination' },
      { path: '/basic/treeview', label: 'Treeview' },
      { path: '/basic/tab-control', label: 'Tab control' },
      { path: '/basic/code-snippet', label: 'Code snippet' },
    ],
  },
  {
    title: 'Advanced',
    routes: [
      { path: '/advanced/splitter', label: 'Splitter' },
      { path: '/advanced/otp-input', label: 'OTP input' },
    ],
  },
  {
    title: 'Enterprise',
    routes: [
      { path: '/enterprise/scheduler', label: 'Scheduler' },
      { path: '/enterprise/timeline', label: 'Timeline' },
      { path: '/enterprise/dock', label: 'Dock manager' },
      { path: '/enterprise/ribbon', label: 'Ribbon' },
      { path: '/enterprise/tile-manager', label: 'Tile manager' },
      { path: '/enterprise/query-builder', label: 'Query builder' },
      { path: '/enterprise/datatables', label: 'Datatable' },
      { path: '/enterprise/file-manager', label: 'File manager' },
    ],
  },
];
</script>

<template>
  <div class="d-flex flex-column min-vh-100">
    <header class="border-bottom bg-body-tertiary">
      <div class="d-flex align-items-center px-3 py-2" style="gap: 1rem;">
        <RouterLink to="/" class="text-decoration-none fw-semibold text-body fs-5">
          @mintplayer/vue-bootstrap
        </RouterLink>
        <span class="text-body-secondary small">demo</span>
        <div class="flex-grow-1" />
        <FrameworkLinks />
        <a
          class="github-link"
          :href="repoUrl"
          target="_blank"
          rel="noreferrer"
          title="@mintplayer/vue-bootstrap on GitHub"
        >
          <span class="github-link-version">{{ version }}</span>
          <svg class="github-link-icon" viewBox="0 0 16 16" aria-hidden="true">
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
            />
          </svg>
        </a>
      </div>
    </header>
    <div class="d-flex flex-grow-1">
      <aside class="border-end bg-body-tertiary p-3" style="width: 14rem; min-width: 14rem;">
        <nav>
          <div v-for="section in SECTIONS" :key="section.title" class="mb-3">
            <div class="text-uppercase small text-body-secondary fw-semibold mb-2">{{ section.title }}</div>
            <ul class="list-unstyled mb-0">
              <li v-for="r in section.routes" :key="r.path">
                <RouterLink
                  :to="r.path"
                  class="d-block px-2 py-1 rounded text-decoration-none text-body"
                  active-class="bg-primary-subtle text-primary fw-semibold"
                >
                  {{ r.label }}
                </RouterLink>
              </li>
            </ul>
          </div>
        </nav>
      </aside>
      <main class="app-shell-main flex-grow-1">
        <RouterView />
      </main>
    </div>
  </div>
</template>
