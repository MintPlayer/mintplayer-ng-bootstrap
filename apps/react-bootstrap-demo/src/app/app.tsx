import { Route, Routes } from 'react-router-dom';
import { AppShell } from './shell/AppShell';
import { HomePage } from './pages/HomePage';
import { CardPage } from './pages/CardPage';
import { DatepickerPage } from './pages/DatepickerPage';
import { CodeSnippetPage } from './pages/CodeSnippetPage';
import { SchedulerPage } from './pages/SchedulerPage';
import { DockPage } from './pages/DockPage';
import { RibbonPage } from './pages/RibbonPage';
import { CalendarPage } from './pages/CalendarPage';
import { DatetimePickerPage } from './pages/DatetimePickerPage';
import { TimepickerPage } from './pages/TimepickerPage';
import { CheckboxPage } from './pages/CheckboxPage';
import { RadioPage } from './pages/RadioPage';
import { ToggleButtonPage } from './pages/ToggleButtonPage';
import { PaginationPage } from './pages/PaginationPage';
import { TreeviewPage } from './pages/TreeviewPage';
import { TabControlPage } from './pages/TabControlPage';
import { SplitterPage } from './pages/SplitterPage';
import { OtpInputPage } from './pages/OtpInputPage';
import { MultiRangePage } from './pages/MultiRangePage';
import { TileManagerPage } from './pages/TileManagerPage';
import { QueryBuilderPage } from './pages/QueryBuilderPage';
import { DatatablePage } from './pages/DatatablePage';
import { FileManagerPage } from './pages/FileManagerPage';

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* Basic */}
        <Route path="/card" element={<CardPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/datepicker" element={<DatepickerPage />} />
        <Route path="/datetime-picker" element={<DatetimePickerPage />} />
        <Route path="/timepicker" element={<TimepickerPage />} />
        <Route path="/checkbox" element={<CheckboxPage />} />
        <Route path="/radio" element={<RadioPage />} />
        <Route path="/toggle-button" element={<ToggleButtonPage />} />
        <Route path="/pagination" element={<PaginationPage />} />
        <Route path="/treeview" element={<TreeviewPage />} />
        <Route path="/tab-control" element={<TabControlPage />} />
        <Route path="/code-snippet" element={<CodeSnippetPage />} />
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
    </AppShell>
  );
}

export default App;
