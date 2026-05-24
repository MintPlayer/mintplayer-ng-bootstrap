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
const CodeSnippetPage  = lazyNamed(() => import('./pages/CodeSnippetPage'),  'CodeSnippetPage');
const PaginationPage   = lazyNamed(() => import('./pages/PaginationPage'),   'PaginationPage');
const RadioPage        = lazyNamed(() => import('./pages/RadioPage'),        'RadioPage');
const TimepickerPage   = lazyNamed(() => import('./pages/forms/TimepickerPage'),     'TimepickerPage');
const ToggleButtonPage = lazyNamed(() => import('./pages/ToggleButtonPage'), 'ToggleButtonPage');

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
          <Route path="/basic/forms/timepicker" element={<TimepickerPage />} />
          <Route path="/basic/pagination" element={<PaginationPage />} />
          <Route path="/basic/radio" element={<RadioPage />} />
          <Route path="/basic/toggle-button" element={<ToggleButtonPage />} />
          {/* Enterprise */}
          <Route path="/enterprise/datatables" element={<DatatablePage />} />
          <Route path="*" element={<ComingSoonPage />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

export default App;
