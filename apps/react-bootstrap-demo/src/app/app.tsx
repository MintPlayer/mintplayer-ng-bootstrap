import { lazy, Suspense, type ComponentType } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppShell } from './shell/AppShell';
import { HomePage } from './pages/HomePage';
import { ComingSoonPage } from './pages/ComingSoonPage';
// The route fallback's spinner: the shell renders it, so its styles ride the main bundle (#452).
import { BsSpinner } from '@mintplayer/react-bootstrap/spinner';

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
const BadgePage        = lazyNamed(() => import('./pages/BadgePage'),        'BadgePage');
const ButtonGroupPage  = lazyNamed(() => import('./pages/ButtonGroupPage'),  'ButtonGroupPage');
const ClosePage        = lazyNamed(() => import('./pages/ClosePage'),        'ClosePage');
const AlertPage        = lazyNamed(() => import('./pages/AlertPage'),        'AlertPage');
const BreadcrumbPage   = lazyNamed(() => import('./pages/BreadcrumbPage'),   'BreadcrumbPage');
const ListGroupPage    = lazyNamed(() => import('./pages/ListGroupPage'),    'ListGroupPage');
const ProgressPage     = lazyNamed(() => import('./pages/ProgressPage'),     'ProgressPage');
const PlaceholderPage  = lazyNamed(() => import('./pages/PlaceholderPage'),  'PlaceholderPage');
const TablePage        = lazyNamed(() => import('./pages/TablePage'),        'TablePage');
const CalendarPage     = lazyNamed(() => import('./pages/CalendarPage'),     'CalendarPage');
const CardPage         = lazyNamed(() => import('./pages/CardPage'),         'CardPage');
const CarouselPage     = lazyNamed(() => import('./pages/CarouselPage'),     'CarouselPage');
const CheckboxPage     = lazyNamed(() => import('./pages/CheckboxPage'),     'CheckboxPage');
const DatatablePage    = lazyNamed(() => import('./pages/DatatablePage'),    'DatatablePage');
const DatepickerPage   = lazyNamed(() => import('./pages/forms/DatepickerPage'),     'DatepickerPage');
const DatetimePickerPage = lazyNamed(() => import('./pages/forms/DatetimePickerPage'), 'DatetimePickerPage');
const PhoneInputPage   = lazyNamed(() => import('./pages/forms/PhoneInputPage'),     'PhoneInputPage');
const SelectPage       = lazyNamed(() => import('./pages/forms/SelectPage'),         'SelectPage');
const CodeSnippetPage  = lazyNamed(() => import('./pages/CodeSnippetPage'),  'CodeSnippetPage');
const PaginationPage   = lazyNamed(() => import('./pages/PaginationPage'),   'PaginationPage');
const RadioPage        = lazyNamed(() => import('./pages/RadioPage'),        'RadioPage');
const TimepickerPage   = lazyNamed(() => import('./pages/forms/TimepickerPage'),     'TimepickerPage');
const MultiRangePage   = lazyNamed(() => import('./pages/forms/MultiRangePage'),     'MultiRangePage');
const OtpInputPage     = lazyNamed(() => import('./pages/advanced/OtpInputPage'),    'OtpInputPage');
const SignaturePadPage = lazyNamed(() => import('./pages/advanced/SignaturePadPage'), 'SignaturePadPage');
const DockPage         = lazyNamed(() => import('./pages/enterprise/DockPage'),        'DockPage');
const TileManagerPage  = lazyNamed(() => import('./pages/enterprise/TileManagerPage'), 'TileManagerPage');
const FileManagerPage  = lazyNamed(() => import('./pages/enterprise/FileManagerPage'), 'FileManagerPage');
const QueryBuilderPage = lazyNamed(() => import('./pages/enterprise/QueryBuilderPage'), 'QueryBuilderPage');
const RibbonPage       = lazyNamed(() => import('./pages/enterprise/RibbonPage'),       'RibbonPage');
const ToggleButtonPage = lazyNamed(() => import('./pages/ToggleButtonPage'), 'ToggleButtonPage');
const TabControlPage   = lazyNamed(() => import('./pages/TabControlPage'),   'TabControlPage');
const TreeviewPage     = lazyNamed(() => import('./pages/TreeviewPage'),     'TreeviewPage');
const TreeSelectPage   = lazyNamed(() => import('./pages/TreeSelectPage'),   'TreeSelectPage');
const TypeaheadPage    = lazyNamed(() => import('./pages/TypeaheadPage'),    'TypeaheadPage');
const NavbarPage       = lazyNamed(() => import('./pages/NavbarPage'),       'NavbarPage');
const SplitterPage     = lazyNamed(() => import('./pages/advanced/SplitterPage'), 'SplitterPage');
const FloatingLabelsPage = lazyNamed(() => import('./pages/forms/FloatingLabelsPage'), 'FloatingLabelsPage');
const RangePage        = lazyNamed(() => import('./pages/forms/RangePage'),          'RangePage');
const MarqueePage      = lazyNamed(() => import('./pages/MarqueePage'),              'MarqueePage');
const ModalPage        = lazyNamed(() => import('./pages/overlay/ModalPage'),        'ModalPage');
const OffcanvasPage    = lazyNamed(() => import('./pages/overlay/OffcanvasPage'),    'OffcanvasPage');
const PopoverPage      = lazyNamed(() => import('./pages/overlay/PopoverPage'),      'PopoverPage');
const TooltipPage      = lazyNamed(() => import('./pages/overlay/TooltipPage'),      'TooltipPage');
const ToastPage        = lazyNamed(() => import('./pages/overlay/ToastPage'),        'ToastPage');
const DropdownPage     = lazyNamed(() => import('./pages/overlay/DropdownPage'),     'DropdownPage');
const ContextMenuPage  = lazyNamed(() => import('./pages/overlay/ContextMenuPage'),  'ContextMenuPage');
const ToggleButtonsPage = lazyNamed(() => import('./pages/advanced/ToggleButtonsPage'), 'ToggleButtonsPage');
const ParallaxPage     = lazyNamed(() => import('./pages/advanced/ParallaxPage'),    'ParallaxPage');
const StickyFooterPage = lazyNamed(() => import('./pages/advanced/StickyFooterPage'), 'StickyFooterPage');
const SchedulerPage    = lazyNamed(() => import('./pages/enterprise/SchedulerPage'), 'SchedulerPage');
const TimelinePage     = lazyNamed(() => import('./pages/enterprise/TimelinePage'),  'TimelinePage');
const ShellPage        = lazyNamed(() => import('./pages/enterprise/ShellPage'),     'ShellPage');
const AccordionPage    = lazyNamed(() => import('./pages/enterprise/AccordionPage'), 'AccordionPage');
const ChartsPage       = lazyNamed(() => import('./pages/enterprise/ChartsPage'),    'ChartsPage');
const ThemingPage      = lazyNamed(() => import('./pages/ThemingPage'),      'ThemingPage');

function PageFallback() {
  return (
    <div className="demo-page text-body-secondary">
      {/* The spinner announces "Loading…"; the visible copy stays out of the accessibility tree. */}
      <BsSpinner small className="me-2" />
      <span aria-hidden="true">Loading…</span>
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
          <Route path="/basic/badge" element={<BadgePage />} />
          <Route path="/basic/button-group" element={<ButtonGroupPage />} />
          <Route path="/basic/close" element={<ClosePage />} />
          <Route path="/basic/alert" element={<AlertPage />} />
          <Route path="/basic/breadcrumb" element={<BreadcrumbPage />} />
          <Route path="/basic/list-group" element={<ListGroupPage />} />
          <Route path="/basic/progress-bar" element={<ProgressPage />} />
          <Route path="/basic/placeholder" element={<PlaceholderPage />} />
          <Route path="/basic/table" element={<TablePage />} />
          <Route path="/basic/calendar" element={<CalendarPage />} />
          <Route path="/basic/card" element={<CardPage />} />
          <Route path="/basic/carousel" element={<CarouselPage />} />
          <Route path="/basic/checkbox" element={<CheckboxPage />} />
          <Route path="/basic/code-snippet" element={<CodeSnippetPage />} />
          <Route path="/basic/forms/datepicker" element={<DatepickerPage />} />
          <Route path="/basic/forms/datetime-picker" element={<DatetimePickerPage />} />
          <Route path="/basic/forms/phone-input" element={<PhoneInputPage />} />
          <Route path="/basic/forms/select" element={<SelectPage />} />
          <Route path="/basic/forms/timepicker" element={<TimepickerPage />} />
          <Route path="/basic/forms/multi-range" element={<MultiRangePage />} />
          <Route path="/basic/forms/floating-labels" element={<FloatingLabelsPage />} />
          <Route path="/basic/forms/range" element={<RangePage />} />
          <Route path="/basic/marquee" element={<MarqueePage />} />
          <Route path="/overlay/modal" element={<ModalPage />} />
          <Route path="/overlay/offcanvas" element={<OffcanvasPage />} />
          <Route path="/overlay/popover" element={<PopoverPage />} />
          <Route path="/overlay/tooltip" element={<TooltipPage />} />
          <Route path="/overlay/toast" element={<ToastPage />} />
          <Route path="/overlay/dropdown" element={<DropdownPage />} />
          <Route path="/overlay/context-menu" element={<ContextMenuPage />} />
          <Route path="/basic/pagination" element={<PaginationPage />} />
          <Route path="/basic/radio" element={<RadioPage />} />
          <Route path="/basic/toggle-button" element={<ToggleButtonPage />} />
          <Route path="/basic/tab-control" element={<TabControlPage />} />
          <Route path="/basic/treeview" element={<TreeviewPage />} />
          <Route path="/basic/tree-select" element={<TreeSelectPage />} />
          <Route path="/basic/typeahead" element={<TypeaheadPage />} />
          <Route path="/basic/navbar" element={<NavbarPage />} />
          {/* Advanced */}
          <Route path="/advanced/otp-input" element={<OtpInputPage />} />
          <Route path="/advanced/signature-pad" element={<SignaturePadPage />} />
          <Route path="/advanced/splitter" element={<SplitterPage />} />
          <Route path="/advanced/toggle-buttons" element={<ToggleButtonsPage />} />
          <Route path="/advanced/parallax" element={<ParallaxPage />} />
          <Route path="/advanced/sticky-footer" element={<StickyFooterPage />} />
          {/* Enterprise */}
          <Route path="/enterprise/accordion" element={<AccordionPage />} />
          <Route path="/enterprise/charts" element={<ChartsPage />} />
          <Route path="/enterprise/dock" element={<DockPage />} />
          <Route path="/enterprise/tile-manager" element={<TileManagerPage />} />
          <Route path="/enterprise/datatables" element={<DatatablePage />} />
          <Route path="/enterprise/file-manager" element={<FileManagerPage />} />
          <Route path="/enterprise/query-builder" element={<QueryBuilderPage />} />
          <Route path="/enterprise/ribbon" element={<RibbonPage />} />
          <Route path="/enterprise/scheduler" element={<SchedulerPage />} />
          <Route path="/enterprise/timeline" element={<TimelinePage />} />
          <Route path="/enterprise/shell" element={<ShellPage />} />
          {/* Additional samples */}
          <Route path="/additional-samples/theming" element={<ThemingPage />} />
          <Route path="*" element={<ComingSoonPage />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

export default App;
