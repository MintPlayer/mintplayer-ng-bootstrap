import { createRouter, createMemoryHistory, createWebHistory } from 'vue-router';

// Per-component views are added incrementally in the WC-extraction PRs
// (PR-4 through PR-9). Until then every non-home route renders the
// ComingSoonView placeholder so the App's sidebar links don't 404.
//
// Each route loads its view via a dynamic import, so Vue Router code-
// splits one chunk per view — the initial bundle only ships shell +
// router + Home.
//
// Created per request so SSR gets its own router instance with in-memory
// history (the client uses real browser history). Sharing one router across
// SSR requests would leak navigation state between responses. The history mode
// is passed in explicitly by the entry rather than sniffed from
// `import.meta.env.SSR` — the lit-ssr DOM shim defines a global `window`, which
// makes runtime environment detection unreliable.
export function createAppRouter(ssr: boolean) {
  return createRouter({
    history: ssr
      ? createMemoryHistory(import.meta.env.BASE_URL)
      : createWebHistory(import.meta.env.BASE_URL),
    routes: [
    { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
    // Basic
    { path: '/basic/calendar',      name: 'calendar',      component: () => import('../views/CalendarView.vue') },
    { path: '/basic/card',          name: 'card',          component: () => import('../views/CardView.vue') },
    { path: '/basic/checkbox',      name: 'checkbox',      component: () => import('../views/CheckboxView.vue') },
    { path: '/basic/code-snippet',  name: 'code-snippet',  component: () => import('../views/CodeSnippetView.vue') },
    { path: '/basic/forms/datepicker',      name: 'datepicker',      component: () => import('../views/forms/DatepickerView.vue') },
    { path: '/basic/forms/datetime-picker', name: 'datetime-picker', component: () => import('../views/forms/DatetimePickerView.vue') },
    { path: '/basic/forms/timepicker',      name: 'timepicker',      component: () => import('../views/forms/TimepickerView.vue') },
    { path: '/basic/forms/multi-range',     name: 'multi-range',     component: () => import('../views/forms/MultiRangeView.vue') },
    { path: '/basic/forms/select',          name: 'select',          component: () => import('../views/forms/SelectView.vue') },
    // Advanced
    { path: '/advanced/otp-input',  name: 'otp-input',     component: () => import('../views/advanced/OtpInputView.vue') },
    { path: '/advanced/splitter',   name: 'splitter',      component: () => import('../views/advanced/SplitterView.vue') },
    { path: '/basic/pagination',    name: 'pagination',    component: () => import('../views/PaginationView.vue') },
    { path: '/basic/radio',         name: 'radio',         component: () => import('../views/RadioView.vue') },
    { path: '/basic/toggle-button', name: 'toggle-button', component: () => import('../views/ToggleButtonView.vue') },
    { path: '/basic/tab-control',   name: 'tab-control',   component: () => import('../views/TabControlView.vue') },
    { path: '/basic/treeview',      name: 'treeview',      component: () => import('../views/TreeviewView.vue') },
    { path: '/basic/tree-select',   name: 'tree-select',   component: () => import('../views/TreeSelectView.vue') },
    // Enterprise
    { path: '/enterprise/datatables', name: 'datatable', component: () => import('../views/DatatableView.vue') },
    { path: '/enterprise/dock',         name: 'dock',          component: () => import('../views/enterprise/DockView.vue') },
    { path: '/enterprise/tile-manager', name: 'tile-manager',  component: () => import('../views/enterprise/TileManagerView.vue') },
    { path: '/enterprise/file-manager', name: 'file-manager', component: () => import('../views/enterprise/FileManagerView.vue') },
    { path: '/enterprise/query-builder', name: 'query-builder', component: () => import('../views/enterprise/QueryBuilderView.vue') },
    { path: '/enterprise/ribbon', name: 'ribbon', component: () => import('../views/enterprise/RibbonView.vue') },
    { path: '/enterprise/scheduler', name: 'scheduler', component: () => import('../views/enterprise/SchedulerView.vue') },
    { path: '/enterprise/timeline', name: 'timeline', component: () => import('../views/enterprise/TimelineView.vue') },
    { path: '/enterprise/shell', name: 'shell', component: () => import('../views/enterprise/ShellView.vue') },
    { path: '/:pathMatch(.*)*', name: 'coming-soon', component: () => import('../views/ComingSoonView.vue') },
    ],
  });
}
