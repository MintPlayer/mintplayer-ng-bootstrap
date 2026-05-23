import { createRouter, createWebHistory } from 'vue-router';

// Per-component views are added incrementally in the WC-extraction PRs
// (PR-4 through PR-9). Until then every non-home route renders the
// ComingSoonView placeholder so the App's sidebar links don't 404.
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
    { path: '/:pathMatch(.*)*', name: 'coming-soon', component: () => import('../views/ComingSoonView.vue') },
  ],
});

export default router;
