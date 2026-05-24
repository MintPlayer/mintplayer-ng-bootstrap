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
    { path: '/basic/code-snippet',  name: 'code-snippet',  component: () => import('../views/CodeSnippetView.vue') },
    { path: '/basic/pagination',    name: 'pagination',    component: () => import('../views/PaginationView.vue') },
    { path: '/basic/toggle-button', name: 'toggle-button', component: () => import('../views/ToggleButtonView.vue') },
    { path: '/:pathMatch(.*)*', name: 'coming-soon', component: () => import('../views/ComingSoonView.vue') },
  ],
});

export default router;
