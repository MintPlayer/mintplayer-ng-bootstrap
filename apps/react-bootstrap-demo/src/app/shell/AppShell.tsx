import { type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { BsShell } from '@mintplayer/react-bootstrap/shell';
import { FrameworkLinks } from './FrameworkLinks';
import { GithubLink } from './GithubLink';
const SECTIONS = [
  { title: 'Basic', routes: [
    { path: '/basic/card', label: 'Card' },
    { path: '/basic/calendar', label: 'Calendar' },
    { path: '/basic/forms/datepicker', label: 'Datepicker' },
    { path: '/basic/forms/datetime-picker', label: 'Datetime picker' },
    { path: '/basic/forms/timepicker', label: 'Timepicker' },
    { path: '/basic/forms/multi-range', label: 'Multi-range' },
    { path: '/basic/forms/select', label: 'Select' },
    { path: '/basic/checkbox', label: 'Checkbox' },
    { path: '/basic/radio', label: 'Radio' },
    { path: '/basic/toggle-button', label: 'Toggle button' },
    { path: '/basic/pagination', label: 'Pagination' },
    { path: '/basic/treeview', label: 'Treeview' },
    { path: '/basic/tree-select', label: 'Tree select' },
    { path: '/basic/tab-control', label: 'Tab control' },
    { path: '/basic/code-snippet', label: 'Code snippet' },
  ]},
  { title: 'Advanced', routes: [
    { path: '/advanced/splitter', label: 'Splitter' },
    { path: '/advanced/otp-input', label: 'OTP input' },
  ]},
  { title: 'Enterprise', routes: [
    { path: '/enterprise/scheduler', label: 'Scheduler' },
    { path: '/enterprise/timeline', label: 'Timeline' },
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
    <BsShell breakpoint="md" size="14rem" className="app-shell">
      {/* Top bar: the shell renders the hamburger toggle at its left; this slot
          fills the rest with the brand + framework links. */}
      <div slot="topbar" className="d-flex align-items-center px-3 py-2 app-shell-header flex-grow-1">
        <Link to="/" className="text-decoration-none fw-semibold text-body fs-5">
          @mintplayer/react-bootstrap
        </Link>
        <span className="text-body-secondary small">demo</span>
        <div className="flex-grow-1" />
        <FrameworkLinks />
        <GithubLink />
      </div>
      <nav slot="sidebar" className="border-end bg-body-tertiary p-3 app-shell-sidebar">
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
      <main className="app-shell-main flex-grow-1">{children}</main>
    </BsShell>
  );
}
