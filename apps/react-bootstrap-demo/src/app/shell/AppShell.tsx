import { type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { FrameworkLinks } from './FrameworkLinks';

const SECTIONS = [
  { title: 'Basic', routes: [
    { path: '/card', label: 'Card' },
    { path: '/calendar', label: 'Calendar' },
    { path: '/datepicker', label: 'Datepicker' },
    { path: '/datetime-picker', label: 'Datetime picker' },
    { path: '/timepicker', label: 'Timepicker' },
    { path: '/checkbox', label: 'Checkbox' },
    { path: '/radio', label: 'Radio' },
    { path: '/toggle-button', label: 'Toggle button' },
    { path: '/pagination', label: 'Pagination' },
    { path: '/treeview', label: 'Treeview' },
    { path: '/tab-control', label: 'Tab control' },
    { path: '/code-snippet', label: 'Code snippet' },
  ]},
  { title: 'Advanced', routes: [
    { path: '/advanced/splitter', label: 'Splitter' },
    { path: '/advanced/otp-input', label: 'OTP input' },
    { path: '/advanced/multi-range', label: 'Multi-range' },
  ]},
  { title: 'Enterprise', routes: [
    { path: '/enterprise/scheduler', label: 'Scheduler' },
    { path: '/enterprise/dock', label: 'Dock manager' },
    { path: '/enterprise/ribbon', label: 'Ribbon' },
    { path: '/enterprise/tile-manager', label: 'Tile manager' },
    { path: '/enterprise/query-builder', label: 'Query builder' },
    { path: '/enterprise/datatables', label: 'Datatable' },
    { path: '/enterprise/file-manager', label: 'File manager' },
  ]},
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="d-flex flex-column min-vh-100">
      <header className="border-bottom bg-body-tertiary">
        <div className="d-flex align-items-center px-3 py-2" style={{ gap: '1rem' }}>
          <Link to="/" className="text-decoration-none fw-semibold text-body fs-5">
            @mintplayer/react-bootstrap
          </Link>
          <span className="text-body-secondary small">demo</span>
          <div className="flex-grow-1" />
          <FrameworkLinks />
        </div>
      </header>
      <div className="d-flex flex-grow-1">
        <aside className="border-end bg-body-tertiary p-3" style={{ width: '14rem', minWidth: '14rem' }}>
          <nav>
            {SECTIONS.map((section) => (
              <div key={section.title} className="mb-3">
                <div className="text-uppercase small text-body-secondary fw-semibold mb-2">
                  {section.title}
                </div>
                <ul className="list-unstyled mb-0">
                  {section.routes.map((r) => (
                    <li key={r.path}>
                      <NavLink
                        to={r.path}
                        className={({ isActive }) =>
                          `d-block px-2 py-1 rounded text-decoration-none ${isActive ? 'bg-primary-subtle text-primary fw-semibold' : 'text-body'}`
                        }
                      >
                        {r.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>
        <main className="flex-grow-1">{children}</main>
      </div>
    </div>
  );
}
