import { type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { BsShell } from '@mintplayer/react-bootstrap/shell';
import { FrameworkLinks } from './FrameworkLinks';
import { GithubLink } from './GithubLink';
import { BsThemeToggle } from '@mintplayer/react-bootstrap/theming';
const SECTIONS = [
  { title: 'Basic', routes: [
    { path: '/basic/badge', label: 'Badge' },
    { path: '/basic/button-group', label: 'Button group' },
    { path: '/basic/card', label: 'Card' },
    { path: '/basic/close', label: 'Close button' },
    { path: '/basic/alert', label: 'Alert' },
    { path: '/basic/breadcrumb', label: 'Breadcrumb' },
    { path: '/basic/list-group', label: 'List group' },
    { path: '/basic/progress-bar', label: 'Progress' },
    { path: '/basic/placeholder', label: 'Placeholders' },
    { path: '/basic/table', label: 'Table' },
    { path: '/basic/marquee', label: 'Marquee' },
    { path: '/basic/carousel', label: 'Carousel' },
    { path: '/basic/calendar', label: 'Calendar' },
    { path: '/basic/forms/datepicker', label: 'Datepicker' },
    { path: '/basic/forms/datetime-picker', label: 'Datetime picker' },
    { path: '/basic/forms/timepicker', label: 'Timepicker' },
    { path: '/basic/forms/multi-range', label: 'Multi-range' },
    { path: '/basic/forms/floating-labels', label: 'Floating labels' },
    { path: '/basic/forms/range', label: 'Range' },
    { path: '/basic/forms/phone-input', label: 'Phone input' },
    { path: '/basic/forms/select', label: 'Select' },
    { path: '/basic/checkbox', label: 'Checkbox' },
    { path: '/basic/radio', label: 'Radio' },
    { path: '/basic/toggle-button', label: 'Toggle button' },
    { path: '/basic/pagination', label: 'Pagination' },
    { path: '/basic/treeview', label: 'Treeview' },
    { path: '/basic/tree-select', label: 'Tree select' },
    { path: '/basic/typeahead', label: 'Typeahead' },
    { path: '/basic/navbar', label: 'Navbar' },
    { path: '/basic/tab-control', label: 'Tab control' },
    { path: '/basic/code-snippet', label: 'Code snippet' },
  ]},
  { title: 'Overlay', routes: [
    { path: '/overlay/modal', label: 'Modal' },
    { path: '/overlay/offcanvas', label: 'Offcanvas' },
    { path: '/overlay/popover', label: 'Popover' },
    { path: '/overlay/tooltip', label: 'Tooltip' },
    { path: '/overlay/toast', label: 'Toast' },
    { path: '/overlay/dropdown', label: 'Dropdown' },
    { path: '/overlay/context-menu', label: 'Context menu' },
  ]},
  { title: 'Advanced', routes: [
    { path: '/advanced/splitter', label: 'Splitter' },
    { path: '/advanced/toggle-buttons', label: 'Toggle buttons' },
    { path: '/advanced/parallax', label: 'Parallax' },
    { path: '/advanced/sticky-footer', label: 'Sticky footer' },
    { path: '/advanced/otp-input', label: 'OTP input' },
    { path: '/advanced/signature-pad', label: 'Signature pad' },
  ]},
  { title: 'Enterprise', routes: [
    { path: '/enterprise/accordion', label: 'Accordion' },
    { path: '/enterprise/scheduler', label: 'Scheduler' },
    { path: '/enterprise/timeline', label: 'Timeline' },
    { path: '/enterprise/dock', label: 'Dock manager' },
    { path: '/enterprise/ribbon', label: 'Ribbon' },
    { path: '/enterprise/tile-manager', label: 'Tile manager' },
    { path: '/enterprise/query-builder', label: 'Query builder' },
    { path: '/enterprise/datatables', label: 'Datatable' },
    { path: '/enterprise/file-manager', label: 'File manager' },
    { path: '/enterprise/shell', label: 'Shell' },
    { path: '/enterprise/charts', label: 'Charts' },
  ]},
  { title: 'Additional samples', routes: [
    { path: '/additional-samples/theming', label: 'Theming & dark mode' },
  ]},
];

export function AppShell({ children }: { children: ReactNode }) {
  // Top bar: the shell renders the hamburger toggle at its left; `topbar`
  // fills the rest with the brand + framework links.
  const topbar = (
    <div className="d-flex align-items-center px-3 py-2 app-shell-header flex-grow-1">
      <Link to="/" className="text-decoration-none fw-semibold text-body fs-5">
        @mintplayer/react-bootstrap
      </Link>
      <span className="text-body-secondary small">demo</span>
      <div className="flex-grow-1" />
      <FrameworkLinks />
      {/* Cycles auto / light / dark and persists the choice in the bs-theme-mode cookie. */}
      <BsThemeToggle className="mx-2" />
      <GithubLink />
    </div>
  );
  const sidebar = (
    <nav className="border-end bg-body-tertiary p-3 app-shell-sidebar">
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
  );
  return (
    <BsShell breakpoint="md" size="14rem" className="app-shell" dismissOnNavigate topbar={topbar} sidebar={sidebar}>
      <main className="app-shell-main flex-grow-1">{children}</main>
    </BsShell>
  );
}
