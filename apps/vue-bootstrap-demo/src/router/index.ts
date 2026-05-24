import { createRouter, createWebHistory } from 'vue-router';

// Per-component views are added incrementally in the WC-extraction PRs
// (PR-4 through PR-9). Until then every non-home route renders the
// ComingSoonView placeholder so the App's sidebar links don't 404.
//
// Each route loads its view via a dynamic import, so Vue Router code-
// splits one chunk per view — the initial bundle only ships shell +
// router + Home.
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
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
    // Advanced
    { path: '/advanced/otp-input',  name: 'otp-input',     component: () => import('../views/advanced/OtpInputView.vue') },
    { path: '/basic/pagination',    name: 'pagination',    component: () => import('../views/PaginationView.vue') },
    { path: '/basic/radio',         name: 'radio',         component: () => import('../views/RadioView.vue') },
    { path: '/basic/toggle-button', name: 'toggle-button', component: () => import('../views/ToggleButtonView.vue') },
    { path: '/basic/tab-control',   name: 'tab-control',   component: () => import('../views/TabControlView.vue') },
    // Enterprise
    { path: '/enterprise/datatables', name: 'datatable', component: () => import('../views/DatatableView.vue') },
    { path: '/enterprise/file-manager', name: 'file-manager', component: () => import('../views/enterprise/FileManagerView.vue') },
    { path: '/enterprise/query-builder', name: 'query-builder', component: () => import('../views/enterprise/QueryBuilderView.vue') },
    { path: '/enterprise/ribbon', name: 'ribbon', component: () => import('../views/enterprise/RibbonView.vue') },
    { path: '/:pathMatch(.*)*', name: 'coming-soon', component: () => import('../views/ComingSoonView.vue') },
  ],
});

export default router;
