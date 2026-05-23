import { Route, Routes } from 'react-router-dom';
import { AppShell } from './shell/AppShell';
import { HomePage } from './pages/HomePage';
import { ComingSoonPage } from './pages/ComingSoonPage';

// Per-component pages are added incrementally in the WC-extraction PRs
// (PR-4 through PR-9). Until then every non-home route renders the
// ComingSoonPage placeholder so the AppShell's sidebar links don't 404.
export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<ComingSoonPage />} />
      </Routes>
    </AppShell>
  );
}

export default App;
