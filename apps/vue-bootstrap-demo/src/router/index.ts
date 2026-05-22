import { createRouter, createWebHistory } from 'vue-router';
// Each route becomes its own JS chunk. Vue Router resolves the dynamic
// import the first time the route is navigated to; the initial bundle
// only ships the shell + router.
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
    // Basic
    { path: '/basic/card', name: 'card', component: () => import('../views/CardView.vue') },
    { path: '/basic/calendar', name: 'calendar', component: () => import('../views/CalendarView.vue') },
    { path: '/basic/datepicker', name: 'datepicker', component: () => import('../views/DatepickerView.vue') },
    { path: '/basic/datetime-picker', name: 'datetime-picker', component: () => import('../views/DatetimePickerView.vue') },
    { path: '/basic/timepicker', name: 'timepicker', component: () => import('../views/TimepickerView.vue') },
    { path: '/basic/checkbox', name: 'checkbox', component: () => import('../views/CheckboxView.vue') },
    { path: '/basic/radio', name: 'radio', component: () => import('../views/RadioView.vue') },
    { path: '/basic/toggle-button', name: 'toggle-button', component: () => import('../views/ToggleButtonView.vue') },
    { path: '/basic/pagination', name: 'pagination', component: () => import('../views/PaginationView.vue') },
    { path: '/basic/treeview', name: 'treeview', component: () => import('../views/TreeviewView.vue') },
    { path: '/basic/tab-control', name: 'tab-control', component: () => import('../views/TabControlView.vue') },
    { path: '/basic/code-snippet', name: 'code-snippet', component: () => import('../views/CodeSnippetView.vue') },
    // Advanced
    { path: '/advanced/splitter', name: 'splitter', component: () => import('../views/SplitterView.vue') },
    { path: '/advanced/otp-input', name: 'otp-input', component: () => import('../views/OtpInputView.vue') },
    { path: '/advanced/multi-range', name: 'multi-range', component: () => import('../views/MultiRangeView.vue') },
    // Enterprise
    { path: '/enterprise/scheduler', name: 'scheduler', component: () => import('../views/SchedulerView.vue') },
    { path: '/enterprise/dock', name: 'dock', component: () => import('../views/DockView.vue') },
    { path: '/enterprise/ribbon', name: 'ribbon', component: () => import('../views/RibbonView.vue') },
    { path: '/enterprise/tile-manager', name: 'tile-manager', component: () => import('../views/TileManagerView.vue') },
    { path: '/enterprise/query-builder', name: 'query-builder', component: () => import('../views/QueryBuilderView.vue') },
    { path: '/enterprise/datatables', name: 'datatable', component: () => import('../views/DatatableView.vue') },
    { path: '/enterprise/file-manager', name: 'file-manager', component: () => import('../views/FileManagerView.vue') },
  ],
});

export default router;
