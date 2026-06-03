import { lazy, Suspense, type ComponentType } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppShell } from './shell/AppShell';
import { HomePage } from './pages/HomePage';
import { ComingSoonPage } from './pages/ComingSoonPage';

/**
 * React.lazy() expects a module with a `default` export. Our pages use
 * named exports for grep-friendliness, so we adapt with this tiny helper
 * that picks the named export and wraps it as the lazy module's default.
 */
function lazyNamed<P>(
  loader: () => Promise<Record<string, ComponentType<P>>>,
  name: string,
): ComponentType<P> {
  return lazy(() => loader().then((m) => ({ default: m[name] })));
}

// Per-component pages are added incrementally in the WC-extraction PRs
// (PR-4 through PR-9). Until then every non-home route renders the
// ComingSoonPage placeholder so the AppShell's sidebar links don't 404.
//
// Pages are code-split via lazyNamed so each page becomes its own JS
// chunk — the initial bundle only ships the shell + router + Home.
const CalendarPage     = lazyNamed(() => import('./pages/CalendarPage'),     'CalendarPage');
const CardPage         = lazyNamed(() => import('./pages/CardPage'),         'CardPage');
const CheckboxPage     = lazyNamed(() => import('./pages/CheckboxPage'),     'CheckboxPage');
const DatatablePage    = lazyNamed(() => import('./pages/DatatablePage'),    'DatatablePage');
const DatepickerPage   = lazyNamed(() => import('./pages/forms/DatepickerPage'),     'DatepickerPage');
const DatetimePickerPage = lazyNamed(() => import('./pages/forms/DatetimePickerPage'), 'DatetimePickerPage');
const SelectPage       = lazyNamed(() => import('./pages/forms/SelectPage'),         'SelectPage');
const CodeSnippetPage  = lazyNamed(() => import('./pages/CodeSnippetPage'),  'CodeSnippetPage');
const PaginationPage   = lazyNamed(() => import('./pages/PaginationPage'),   'PaginationPage');
const RadioPage        = lazyNamed(() => import('./pages/RadioPage'),        'RadioPage');
const TimepickerPage   = lazyNamed(() => import('./pages/forms/TimepickerPage'),     'TimepickerPage');
const MultiRangePage   = lazyNamed(() => import('./pages/forms/MultiRangePage'),     'MultiRangePage');
const OtpInputPage     = lazyNamed(() => import('./pages/advanced/OtpInputPage'),    'OtpInputPage');
const DockPage         = lazyNamed(() => import('./pages/enterprise/DockPage'),        'DockPage');
const TileManagerPage  = lazyNamed(() => import('./pages/enterprise/TileManagerPage'), 'TileManagerPage');
const FileManagerPage  = lazyNamed(() => import('./pages/enterprise/FileManagerPage'), 'FileManagerPage');
const QueryBuilderPage = lazyNamed(() => import('./pages/enterprise/QueryBuilderPage'), 'QueryBuilderPage');
const RibbonPage       = lazyNamed(() => import('./pages/enterprise/RibbonPage'),       'RibbonPage');
const ToggleButtonPage = lazyNamed(() => import('./pages/ToggleButtonPage'), 'ToggleButtonPage');
const TabControlPage   = lazyNamed(() => import('./pages/TabControlPage'),   'TabControlPage');
const TreeviewPage     = lazyNamed(() => import('./pages/TreeviewPage'),     'TreeviewPage');
const TreeSelectPage   = lazyNamed(() => import('./pages/TreeSelectPage'),   'TreeSelectPage');
const SplitterPage     = lazyNamed(() => import('./pages/advanced/SplitterPage'), 'SplitterPage');
const SchedulerPage    = lazyNamed(() => import('./pages/enterprise/SchedulerPage'), 'SchedulerPage');
const TimelinePage     = lazyNamed(() => import('./pages/enterprise/TimelinePage'),  'TimelinePage');
const ShellPage        = lazyNamed(() => import('./pages/enterprise/ShellPage'),     'ShellPage');

function PageFallback() {
  return (
    <div className="demo-page text-body-secondary">
      <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
      Loading…
    </div>
  );
}

export function App() {
  return (
    <AppShell>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          {/* Basic */}
          <Route path="/basic/calendar" element={<CalendarPage />} />
          <Route path="/basic/card" element={<CardPage />} />
          <Route path="/basic/checkbox" element={<CheckboxPage />} />
          <Route path="/basic/code-snippet" element={<CodeSnippetPage />} />
          <Route path="/basic/forms/datepicker" element={<DatepickerPage />} />
          <Route path="/basic/forms/datetime-picker" element={<DatetimePickerPage />} />
          <Route path="/basic/forms/select" element={<SelectPage />} />
          <Route path="/basic/forms/timepicker" element={<TimepickerPage />} />
          <Route path="/basic/forms/multi-range" element={<MultiRangePage />} />
          <Route path="/basic/pagination" element={<PaginationPage />} />
          <Route path="/basic/radio" element={<RadioPage />} />
          <Route path="/basic/toggle-button" element={<ToggleButtonPage />} />
          <Route path="/basic/tab-control" element={<TabControlPage />} />
          <Route path="/basic/treeview" element={<TreeviewPage />} />
          <Route path="/basic/tree-select" element={<TreeSelectPage />} />
          {/* Advanced */}
          <Route path="/advanced/otp-input" element={<OtpInputPage />} />
          <Route path="/advanced/splitter" element={<SplitterPage />} />
          {/* Enterprise */}
          <Route path="/enterprise/dock" element={<DockPage />} />
          <Route path="/enterprise/tile-manager" element={<TileManagerPage />} />
          <Route path="/enterprise/datatables" element={<DatatablePage />} />
          <Route path="/enterprise/file-manager" element={<FileManagerPage />} />
          <Route path="/enterprise/query-builder" element={<QueryBuilderPage />} />
          <Route path="/enterprise/ribbon" element={<RibbonPage />} />
          <Route path="/enterprise/scheduler" element={<SchedulerPage />} />
          <Route path="/enterprise/timeline" element={<TimelinePage />} />
          <Route path="/enterprise/shell" element={<ShellPage />} />
          <Route path="*" element={<ComingSoonPage />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

export default App;
