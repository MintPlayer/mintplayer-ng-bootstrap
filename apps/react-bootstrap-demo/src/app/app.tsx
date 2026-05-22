import { lazy, Suspense, type ComponentType } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppShell } from './shell/AppShell';

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

// Each page becomes its own JS chunk. Vite splits one file per dynamic
// import, so the initial bundle only ships the shell + router; pages
// load on demand when the user navigates to them.
const HomePage          = lazyNamed(() => import('./pages/HomePage'),          'HomePage');
const CardPage          = lazyNamed(() => import('./pages/CardPage'),          'CardPage');
const CalendarPage      = lazyNamed(() => import('./pages/CalendarPage'),      'CalendarPage');
const DatepickerPage    = lazyNamed(() => import('./pages/DatepickerPage'),    'DatepickerPage');
const DatetimePickerPage = lazyNamed(() => import('./pages/DatetimePickerPage'), 'DatetimePickerPage');
const TimepickerPage    = lazyNamed(() => import('./pages/TimepickerPage'),    'TimepickerPage');
const CheckboxPage      = lazyNamed(() => import('./pages/CheckboxPage'),      'CheckboxPage');
const RadioPage         = lazyNamed(() => import('./pages/RadioPage'),         'RadioPage');
const ToggleButtonPage  = lazyNamed(() => import('./pages/ToggleButtonPage'),  'ToggleButtonPage');
const PaginationPage    = lazyNamed(() => import('./pages/PaginationPage'),    'PaginationPage');
const TreeviewPage      = lazyNamed(() => import('./pages/TreeviewPage'),      'TreeviewPage');
const TabControlPage    = lazyNamed(() => import('./pages/TabControlPage'),    'TabControlPage');
const CodeSnippetPage   = lazyNamed(() => import('./pages/CodeSnippetPage'),   'CodeSnippetPage');
const SplitterPage      = lazyNamed(() => import('./pages/SplitterPage'),      'SplitterPage');
const OtpInputPage      = lazyNamed(() => import('./pages/OtpInputPage'),      'OtpInputPage');
const MultiRangePage    = lazyNamed(() => import('./pages/MultiRangePage'),    'MultiRangePage');
const SchedulerPage     = lazyNamed(() => import('./pages/SchedulerPage'),     'SchedulerPage');
const DockPage          = lazyNamed(() => import('./pages/DockPage'),          'DockPage');
const RibbonPage        = lazyNamed(() => import('./pages/RibbonPage'),        'RibbonPage');
const TileManagerPage   = lazyNamed(() => import('./pages/TileManagerPage'),   'TileManagerPage');
const QueryBuilderPage  = lazyNamed(() => import('./pages/QueryBuilderPage'),  'QueryBuilderPage');
const DatatablePage     = lazyNamed(() => import('./pages/DatatablePage'),     'DatatablePage');
const FileManagerPage   = lazyNamed(() => import('./pages/FileManagerPage'),   'FileManagerPage');

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
          <Route path="/basic/card" element={<CardPage />} />
          <Route path="/basic/calendar" element={<CalendarPage />} />
          <Route path="/basic/datepicker" element={<DatepickerPage />} />
          <Route path="/basic/datetime-picker" element={<DatetimePickerPage />} />
          <Route path="/basic/timepicker" element={<TimepickerPage />} />
          <Route path="/basic/checkbox" element={<CheckboxPage />} />
          <Route path="/basic/radio" element={<RadioPage />} />
          <Route path="/basic/toggle-button" element={<ToggleButtonPage />} />
          <Route path="/basic/pagination" element={<PaginationPage />} />
          <Route path="/basic/treeview" element={<TreeviewPage />} />
          <Route path="/basic/tab-control" element={<TabControlPage />} />
          <Route path="/basic/code-snippet" element={<CodeSnippetPage />} />
          {/* Advanced */}
          <Route path="/advanced/splitter" element={<SplitterPage />} />
          <Route path="/advanced/otp-input" element={<OtpInputPage />} />
          <Route path="/advanced/multi-range" element={<MultiRangePage />} />
          {/* Enterprise */}
          <Route path="/enterprise/scheduler" element={<SchedulerPage />} />
          <Route path="/enterprise/dock" element={<DockPage />} />
          <Route path="/enterprise/ribbon" element={<RibbonPage />} />
          <Route path="/enterprise/tile-manager" element={<TileManagerPage />} />
          <Route path="/enterprise/query-builder" element={<QueryBuilderPage />} />
          <Route path="/enterprise/datatables" element={<DatatablePage />} />
          <Route path="/enterprise/file-manager" element={<FileManagerPage />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

export default App;
