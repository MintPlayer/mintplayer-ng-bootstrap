import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import CardView from '../views/CardView.vue';
import DatepickerView from '../views/DatepickerView.vue';
import CodeSnippetView from '../views/CodeSnippetView.vue';
import SchedulerView from '../views/SchedulerView.vue';
import DockView from '../views/DockView.vue';
import RibbonView from '../views/RibbonView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/card', name: 'card', component: CardView },
    { path: '/datepicker', name: 'datepicker', component: DatepickerView },
    { path: '/code-snippet', name: 'code-snippet', component: CodeSnippetView },
    { path: '/enterprise/scheduler', name: 'scheduler', component: SchedulerView },
    { path: '/enterprise/dock', name: 'dock', component: DockView },
    { path: '/enterprise/ribbon', name: 'ribbon', component: RibbonView },
  ],
});

export default router;
