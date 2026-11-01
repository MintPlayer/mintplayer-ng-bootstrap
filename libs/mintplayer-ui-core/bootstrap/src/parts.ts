// The per-component Bootstrap parts (#452, docs/prd/per-component-styles-452.md).
// Each is one stock partial in the shared `mp.bootstrap.components` sublayer, in
// two variants under ONE registry key:
//
// - `bootstrap<Partial>`: attribute-scoped, `:where([data-mps])` on the leftmost
//   class the partial owns. It matches only DOM a @mintplayer component rendered
//   (and stamped). Every component installs this one.
// - `bootstrap<Partial>Page`: verbatim stock Bootstrap, for raw Bootstrap markup a
//   page component renders itself. Installing it replaces the scoped copy (it
//   matches a superset with identical specificity), so a page never holds two.
//
// `order` is the partial's position in stock bootstrap.scss: the registry keeps
// part sheets in that order, so equal-specificity ties between partials
// (`.card-header-tabs` over `.nav-tabs`) resolve as in stock Bootstrap.
//
// Object literals only, so a bundler drops every part nobody imports, and each
// part rides the lazy chunk of the component (or page) that installs it.

import { containersBootstrapPageStyles, containersBootstrapStyles } from '../../styles/parts/containers.bootstrap.styles';
import { gridBootstrapPageStyles, gridBootstrapStyles } from '../../styles/parts/grid.bootstrap.styles';
import { tablesBootstrapPageStyles, tablesBootstrapStyles } from '../../styles/parts/tables.bootstrap.styles';
import { formsBootstrapPageStyles, formsBootstrapStyles } from '../../styles/parts/forms.bootstrap.styles';
import { transitionsBootstrapPageStyles, transitionsBootstrapStyles } from '../../styles/parts/transitions.bootstrap.styles';
import { dropdownBootstrapPageStyles, dropdownBootstrapStyles } from '../../styles/parts/dropdown.bootstrap.styles';
import { buttonGroupBootstrapPageStyles, buttonGroupBootstrapStyles } from '../../styles/parts/button-group.bootstrap.styles';
import { navBootstrapPageStyles, navBootstrapStyles } from '../../styles/parts/nav.bootstrap.styles';
import { navbarBootstrapPageStyles, navbarBootstrapStyles } from '../../styles/parts/navbar.bootstrap.styles';
import { cardBootstrapPageStyles, cardBootstrapStyles } from '../../styles/parts/card.bootstrap.styles';
import { accordionBootstrapPageStyles, accordionBootstrapStyles } from '../../styles/parts/accordion.bootstrap.styles';
import { breadcrumbBootstrapPageStyles, breadcrumbBootstrapStyles } from '../../styles/parts/breadcrumb.bootstrap.styles';
import { paginationBootstrapPageStyles, paginationBootstrapStyles } from '../../styles/parts/pagination.bootstrap.styles';
import { badgeBootstrapPageStyles, badgeBootstrapStyles } from '../../styles/parts/badge.bootstrap.styles';
import { alertBootstrapPageStyles, alertBootstrapStyles } from '../../styles/parts/alert.bootstrap.styles';
import { progressBootstrapPageStyles, progressBootstrapStyles } from '../../styles/parts/progress.bootstrap.styles';
import { listGroupBootstrapPageStyles, listGroupBootstrapStyles } from '../../styles/parts/list-group.bootstrap.styles';
import { closeBootstrapPageStyles, closeBootstrapStyles } from '../../styles/parts/close.bootstrap.styles';
import { toastsBootstrapPageStyles, toastsBootstrapStyles } from '../../styles/parts/toasts.bootstrap.styles';
import { modalBootstrapPageStyles, modalBootstrapStyles } from '../../styles/parts/modal.bootstrap.styles';
import { tooltipBootstrapPageStyles, tooltipBootstrapStyles } from '../../styles/parts/tooltip.bootstrap.styles';
import { popoverBootstrapPageStyles, popoverBootstrapStyles } from '../../styles/parts/popover.bootstrap.styles';
import { carouselBootstrapPageStyles, carouselBootstrapStyles } from '../../styles/parts/carousel.bootstrap.styles';
import { spinnersBootstrapPageStyles, spinnersBootstrapStyles } from '../../styles/parts/spinners.bootstrap.styles';
import { offcanvasBootstrapPageStyles, offcanvasBootstrapStyles } from '../../styles/parts/offcanvas.bootstrap.styles';
import { placeholdersBootstrapPageStyles, placeholdersBootstrapStyles } from '../../styles/parts/placeholders.bootstrap.styles';

export interface BootstrapPart {
  /** Registry key, `bootstrap-<partial>`: one copy per page, whichever variant. */
  readonly key: string;
  readonly css: string;
  /** The verbatim variant: it replaces a scoped copy already installed under `key`. */
  readonly page: boolean;
  /** Position of the partial in stock bootstrap.scss (BOOTSTRAP_PARTIAL_ORDER). */
  readonly order: number;
}

export const bootstrapContainers: BootstrapPart = { key: 'bootstrap-containers', css: containersBootstrapStyles, page: false, order: 0 };
export const bootstrapContainersPage: BootstrapPart = { key: 'bootstrap-containers', css: containersBootstrapPageStyles, page: true, order: 0 };
export const bootstrapGrid: BootstrapPart = { key: 'bootstrap-grid', css: gridBootstrapStyles, page: false, order: 1 };
export const bootstrapGridPage: BootstrapPart = { key: 'bootstrap-grid', css: gridBootstrapPageStyles, page: true, order: 1 };
export const bootstrapTables: BootstrapPart = { key: 'bootstrap-tables', css: tablesBootstrapStyles, page: false, order: 2 };
export const bootstrapTablesPage: BootstrapPart = { key: 'bootstrap-tables', css: tablesBootstrapPageStyles, page: true, order: 2 };
export const bootstrapForms: BootstrapPart = { key: 'bootstrap-forms', css: formsBootstrapStyles, page: false, order: 3 };
export const bootstrapFormsPage: BootstrapPart = { key: 'bootstrap-forms', css: formsBootstrapPageStyles, page: true, order: 3 };
export const bootstrapTransitions: BootstrapPart = { key: 'bootstrap-transitions', css: transitionsBootstrapStyles, page: false, order: 5 };
export const bootstrapTransitionsPage: BootstrapPart = { key: 'bootstrap-transitions', css: transitionsBootstrapPageStyles, page: true, order: 5 };
export const bootstrapDropdown: BootstrapPart = { key: 'bootstrap-dropdown', css: dropdownBootstrapStyles, page: false, order: 6 };
export const bootstrapDropdownPage: BootstrapPart = { key: 'bootstrap-dropdown', css: dropdownBootstrapPageStyles, page: true, order: 6 };
export const bootstrapButtonGroup: BootstrapPart = { key: 'bootstrap-button-group', css: buttonGroupBootstrapStyles, page: false, order: 7 };
export const bootstrapButtonGroupPage: BootstrapPart = { key: 'bootstrap-button-group', css: buttonGroupBootstrapPageStyles, page: true, order: 7 };
export const bootstrapNav: BootstrapPart = { key: 'bootstrap-nav', css: navBootstrapStyles, page: false, order: 8 };
export const bootstrapNavPage: BootstrapPart = { key: 'bootstrap-nav', css: navBootstrapPageStyles, page: true, order: 8 };
export const bootstrapNavbar: BootstrapPart = { key: 'bootstrap-navbar', css: navbarBootstrapStyles, page: false, order: 9 };
export const bootstrapNavbarPage: BootstrapPart = { key: 'bootstrap-navbar', css: navbarBootstrapPageStyles, page: true, order: 9 };
export const bootstrapCard: BootstrapPart = { key: 'bootstrap-card', css: cardBootstrapStyles, page: false, order: 10 };
export const bootstrapCardPage: BootstrapPart = { key: 'bootstrap-card', css: cardBootstrapPageStyles, page: true, order: 10 };
export const bootstrapAccordion: BootstrapPart = { key: 'bootstrap-accordion', css: accordionBootstrapStyles, page: false, order: 11 };
export const bootstrapAccordionPage: BootstrapPart = { key: 'bootstrap-accordion', css: accordionBootstrapPageStyles, page: true, order: 11 };
export const bootstrapBreadcrumb: BootstrapPart = { key: 'bootstrap-breadcrumb', css: breadcrumbBootstrapStyles, page: false, order: 12 };
export const bootstrapBreadcrumbPage: BootstrapPart = { key: 'bootstrap-breadcrumb', css: breadcrumbBootstrapPageStyles, page: true, order: 12 };
export const bootstrapPagination: BootstrapPart = { key: 'bootstrap-pagination', css: paginationBootstrapStyles, page: false, order: 13 };
export const bootstrapPaginationPage: BootstrapPart = { key: 'bootstrap-pagination', css: paginationBootstrapPageStyles, page: true, order: 13 };
export const bootstrapBadge: BootstrapPart = { key: 'bootstrap-badge', css: badgeBootstrapStyles, page: false, order: 14 };
export const bootstrapBadgePage: BootstrapPart = { key: 'bootstrap-badge', css: badgeBootstrapPageStyles, page: true, order: 14 };
export const bootstrapAlert: BootstrapPart = { key: 'bootstrap-alert', css: alertBootstrapStyles, page: false, order: 15 };
export const bootstrapAlertPage: BootstrapPart = { key: 'bootstrap-alert', css: alertBootstrapPageStyles, page: true, order: 15 };
export const bootstrapProgress: BootstrapPart = { key: 'bootstrap-progress', css: progressBootstrapStyles, page: false, order: 16 };
export const bootstrapProgressPage: BootstrapPart = { key: 'bootstrap-progress', css: progressBootstrapPageStyles, page: true, order: 16 };
export const bootstrapListGroup: BootstrapPart = { key: 'bootstrap-list-group', css: listGroupBootstrapStyles, page: false, order: 17 };
export const bootstrapListGroupPage: BootstrapPart = { key: 'bootstrap-list-group', css: listGroupBootstrapPageStyles, page: true, order: 17 };
export const bootstrapClose: BootstrapPart = { key: 'bootstrap-close', css: closeBootstrapStyles, page: false, order: 18 };
export const bootstrapClosePage: BootstrapPart = { key: 'bootstrap-close', css: closeBootstrapPageStyles, page: true, order: 18 };
export const bootstrapToasts: BootstrapPart = { key: 'bootstrap-toasts', css: toastsBootstrapStyles, page: false, order: 19 };
export const bootstrapToastsPage: BootstrapPart = { key: 'bootstrap-toasts', css: toastsBootstrapPageStyles, page: true, order: 19 };
export const bootstrapModal: BootstrapPart = { key: 'bootstrap-modal', css: modalBootstrapStyles, page: false, order: 20 };
export const bootstrapModalPage: BootstrapPart = { key: 'bootstrap-modal', css: modalBootstrapPageStyles, page: true, order: 20 };
export const bootstrapTooltip: BootstrapPart = { key: 'bootstrap-tooltip', css: tooltipBootstrapStyles, page: false, order: 21 };
export const bootstrapTooltipPage: BootstrapPart = { key: 'bootstrap-tooltip', css: tooltipBootstrapPageStyles, page: true, order: 21 };
export const bootstrapPopover: BootstrapPart = { key: 'bootstrap-popover', css: popoverBootstrapStyles, page: false, order: 22 };
export const bootstrapPopoverPage: BootstrapPart = { key: 'bootstrap-popover', css: popoverBootstrapPageStyles, page: true, order: 22 };
export const bootstrapCarousel: BootstrapPart = { key: 'bootstrap-carousel', css: carouselBootstrapStyles, page: false, order: 23 };
export const bootstrapCarouselPage: BootstrapPart = { key: 'bootstrap-carousel', css: carouselBootstrapPageStyles, page: true, order: 23 };
export const bootstrapSpinners: BootstrapPart = { key: 'bootstrap-spinners', css: spinnersBootstrapStyles, page: false, order: 24 };
export const bootstrapSpinnersPage: BootstrapPart = { key: 'bootstrap-spinners', css: spinnersBootstrapPageStyles, page: true, order: 24 };
export const bootstrapOffcanvas: BootstrapPart = { key: 'bootstrap-offcanvas', css: offcanvasBootstrapStyles, page: false, order: 25 };
export const bootstrapOffcanvasPage: BootstrapPart = { key: 'bootstrap-offcanvas', css: offcanvasBootstrapPageStyles, page: true, order: 25 };
export const bootstrapPlaceholders: BootstrapPart = { key: 'bootstrap-placeholders', css: placeholdersBootstrapStyles, page: false, order: 26 };
export const bootstrapPlaceholdersPage: BootstrapPart = { key: 'bootstrap-placeholders', css: placeholdersBootstrapPageStyles, page: true, order: 26 };
