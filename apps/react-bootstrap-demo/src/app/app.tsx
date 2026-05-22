import { Route, Routes } from 'react-router-dom';
import { AppShell } from './shell/AppShell';
import { HomePage } from './pages/HomePage';
import { CardPage } from './pages/CardPage';
import { DatepickerPage } from './pages/DatepickerPage';
import { CodeSnippetPage } from './pages/CodeSnippetPage';
import { SchedulerPage } from './pages/SchedulerPage';
import { DockPage } from './pages/DockPage';
import { RibbonPage } from './pages/RibbonPage';

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/card" element={<CardPage />} />
        <Route path="/datepicker" element={<DatepickerPage />} />
        <Route path="/code-snippet" element={<CodeSnippetPage />} />
        <Route path="/enterprise/scheduler" element={<SchedulerPage />} />
        <Route path="/enterprise/dock" element={<DockPage />} />
        <Route path="/enterprise/ribbon" element={<RibbonPage />} />
      </Routes>
    </AppShell>
  );
}

export default App;
