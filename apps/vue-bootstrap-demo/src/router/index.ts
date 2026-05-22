import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import CardView from '../views/CardView.vue';
import DatepickerView from '../views/DatepickerView.vue';
import CodeSnippetView from '../views/CodeSnippetView.vue';
import SchedulerView from '../views/SchedulerView.vue';
import DockView from '../views/DockView.vue';
import RibbonView from '../views/RibbonView.vue';
import CalendarView from '../views/CalendarView.vue';
import DatetimePickerView from '../views/DatetimePickerView.vue';
import TimepickerView from '../views/TimepickerView.vue';
import CheckboxView from '../views/CheckboxView.vue';
import RadioView from '../views/RadioView.vue';
import ToggleButtonView from '../views/ToggleButtonView.vue';
import PaginationView from '../views/PaginationView.vue';
import TreeviewView from '../views/TreeviewView.vue';
import TabControlView from '../views/TabControlView.vue';
import SplitterView from '../views/SplitterView.vue';
import OtpInputView from '../views/OtpInputView.vue';
import MultiRangeView from '../views/MultiRangeView.vue';
import TileManagerView from '../views/TileManagerView.vue';
import QueryBuilderView from '../views/QueryBuilderView.vue';
import DatatableView from '../views/DatatableView.vue';
import FileManagerView from '../views/FileManagerView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    // Basic
    { path: '/card', name: 'card', component: CardView },
    { path: '/calendar', name: 'calendar', component: CalendarView },
    { path: '/datepicker', name: 'datepicker', component: DatepickerView },
    { path: '/datetime-picker', name: 'datetime-picker', component: DatetimePickerView },
    { path: '/timepicker', name: 'timepicker', component: TimepickerView },
    { path: '/checkbox', name: 'checkbox', component: CheckboxView },
    { path: '/radio', name: 'radio', component: RadioView },
    { path: '/toggle-button', name: 'toggle-button', component: ToggleButtonView },
    { path: '/pagination', name: 'pagination', component: PaginationView },
    { path: '/treeview', name: 'treeview', component: TreeviewView },
    { path: '/tab-control', name: 'tab-control', component: TabControlView },
    { path: '/code-snippet', name: 'code-snippet', component: CodeSnippetView },
    // Advanced
    { path: '/advanced/splitter', name: 'splitter', component: SplitterView },
    { path: '/advanced/otp-input', name: 'otp-input', component: OtpInputView },
    { path: '/advanced/multi-range', name: 'multi-range', component: MultiRangeView },
    // Enterprise
    { path: '/enterprise/scheduler', name: 'scheduler', component: SchedulerView },
    { path: '/enterprise/dock', name: 'dock', component: DockView },
    { path: '/enterprise/ribbon', name: 'ribbon', component: RibbonView },
    { path: '/enterprise/tile-manager', name: 'tile-manager', component: TileManagerView },
    { path: '/enterprise/query-builder', name: 'query-builder', component: QueryBuilderView },
    { path: '/enterprise/datatables', name: 'datatable', component: DatatableView },
    { path: '/enterprise/file-manager', name: 'file-manager', component: FileManagerView },
  ],
});

export default router;
