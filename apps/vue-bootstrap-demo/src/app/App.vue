<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
import FrameworkLinks from './FrameworkLinks.vue';

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
      <main class="flex-grow-1">
        <RouterView />
      </main>
    </div>
  </div>
</template>
