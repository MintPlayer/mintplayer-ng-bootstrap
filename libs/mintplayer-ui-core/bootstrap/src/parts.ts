// The per-component Bootstrap parts (#452, docs/prd/per-component-styles-452.md).
// Each is one stock partial in its own `mp.bootstrap.<partial>` sublayer, in two
// variants under ONE registry key:
//
// - `bootstrap<Partial>`: attribute-scoped, `:where([data-mps])` on the leftmost
//   class the partial owns. It matches only DOM a @mintplayer component rendered
//   (and stamped). Every component installs this one.
// - `bootstrap<Partial>Page`: verbatim stock Bootstrap, for raw Bootstrap markup a
//   page component renders itself. Installing it replaces the scoped copy (it
//   matches a superset with identical specificity), so a page never holds two.
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
}

export const bootstrapContainers: BootstrapPart = { key: 'bootstrap-containers', css: containersBootstrapStyles, page: false };
export const bootstrapContainersPage: BootstrapPart = { key: 'bootstrap-containers', css: containersBootstrapPageStyles, page: true };
export const bootstrapGrid: BootstrapPart = { key: 'bootstrap-grid', css: gridBootstrapStyles, page: false };
export const bootstrapGridPage: BootstrapPart = { key: 'bootstrap-grid', css: gridBootstrapPageStyles, page: true };
export const bootstrapTables: BootstrapPart = { key: 'bootstrap-tables', css: tablesBootstrapStyles, page: false };
export const bootstrapTablesPage: BootstrapPart = { key: 'bootstrap-tables', css: tablesBootstrapPageStyles, page: true };
export const bootstrapForms: BootstrapPart = { key: 'bootstrap-forms', css: formsBootstrapStyles, page: false };
export const bootstrapFormsPage: BootstrapPart = { key: 'bootstrap-forms', css: formsBootstrapPageStyles, page: true };
export const bootstrapTransitions: BootstrapPart = { key: 'bootstrap-transitions', css: transitionsBootstrapStyles, page: false };
export const bootstrapTransitionsPage: BootstrapPart = { key: 'bootstrap-transitions', css: transitionsBootstrapPageStyles, page: true };
export const bootstrapDropdown: BootstrapPart = { key: 'bootstrap-dropdown', css: dropdownBootstrapStyles, page: false };
export const bootstrapDropdownPage: BootstrapPart = { key: 'bootstrap-dropdown', css: dropdownBootstrapPageStyles, page: true };
export const bootstrapButtonGroup: BootstrapPart = { key: 'bootstrap-button-group', css: buttonGroupBootstrapStyles, page: false };
export const bootstrapButtonGroupPage: BootstrapPart = { key: 'bootstrap-button-group', css: buttonGroupBootstrapPageStyles, page: true };
export const bootstrapNav: BootstrapPart = { key: 'bootstrap-nav', css: navBootstrapStyles, page: false };
export const bootstrapNavPage: BootstrapPart = { key: 'bootstrap-nav', css: navBootstrapPageStyles, page: true };
export const bootstrapNavbar: BootstrapPart = { key: 'bootstrap-navbar', css: navbarBootstrapStyles, page: false };
export const bootstrapNavbarPage: BootstrapPart = { key: 'bootstrap-navbar', css: navbarBootstrapPageStyles, page: true };
export const bootstrapCard: BootstrapPart = { key: 'bootstrap-card', css: cardBootstrapStyles, page: false };
export const bootstrapCardPage: BootstrapPart = { key: 'bootstrap-card', css: cardBootstrapPageStyles, page: true };
export const bootstrapAccordion: BootstrapPart = { key: 'bootstrap-accordion', css: accordionBootstrapStyles, page: false };
export const bootstrapAccordionPage: BootstrapPart = { key: 'bootstrap-accordion', css: accordionBootstrapPageStyles, page: true };
export const bootstrapBreadcrumb: BootstrapPart = { key: 'bootstrap-breadcrumb', css: breadcrumbBootstrapStyles, page: false };
export const bootstrapBreadcrumbPage: BootstrapPart = { key: 'bootstrap-breadcrumb', css: breadcrumbBootstrapPageStyles, page: true };
export const bootstrapPagination: BootstrapPart = { key: 'bootstrap-pagination', css: paginationBootstrapStyles, page: false };
export const bootstrapPaginationPage: BootstrapPart = { key: 'bootstrap-pagination', css: paginationBootstrapPageStyles, page: true };
export const bootstrapBadge: BootstrapPart = { key: 'bootstrap-badge', css: badgeBootstrapStyles, page: false };
export const bootstrapBadgePage: BootstrapPart = { key: 'bootstrap-badge', css: badgeBootstrapPageStyles, page: true };
export const bootstrapAlert: BootstrapPart = { key: 'bootstrap-alert', css: alertBootstrapStyles, page: false };
export const bootstrapAlertPage: BootstrapPart = { key: 'bootstrap-alert', css: alertBootstrapPageStyles, page: true };
export const bootstrapProgress: BootstrapPart = { key: 'bootstrap-progress', css: progressBootstrapStyles, page: false };
export const bootstrapProgressPage: BootstrapPart = { key: 'bootstrap-progress', css: progressBootstrapPageStyles, page: true };
export const bootstrapListGroup: BootstrapPart = { key: 'bootstrap-list-group', css: listGroupBootstrapStyles, page: false };
export const bootstrapListGroupPage: BootstrapPart = { key: 'bootstrap-list-group', css: listGroupBootstrapPageStyles, page: true };
export const bootstrapClose: BootstrapPart = { key: 'bootstrap-close', css: closeBootstrapStyles, page: false };
export const bootstrapClosePage: BootstrapPart = { key: 'bootstrap-close', css: closeBootstrapPageStyles, page: true };
export const bootstrapToasts: BootstrapPart = { key: 'bootstrap-toasts', css: toastsBootstrapStyles, page: false };
export const bootstrapToastsPage: BootstrapPart = { key: 'bootstrap-toasts', css: toastsBootstrapPageStyles, page: true };
export const bootstrapModal: BootstrapPart = { key: 'bootstrap-modal', css: modalBootstrapStyles, page: false };
export const bootstrapModalPage: BootstrapPart = { key: 'bootstrap-modal', css: modalBootstrapPageStyles, page: true };
export const bootstrapTooltip: BootstrapPart = { key: 'bootstrap-tooltip', css: tooltipBootstrapStyles, page: false };
export const bootstrapTooltipPage: BootstrapPart = { key: 'bootstrap-tooltip', css: tooltipBootstrapPageStyles, page: true };
export const bootstrapPopover: BootstrapPart = { key: 'bootstrap-popover', css: popoverBootstrapStyles, page: false };
export const bootstrapPopoverPage: BootstrapPart = { key: 'bootstrap-popover', css: popoverBootstrapPageStyles, page: true };
export const bootstrapCarousel: BootstrapPart = { key: 'bootstrap-carousel', css: carouselBootstrapStyles, page: false };
export const bootstrapCarouselPage: BootstrapPart = { key: 'bootstrap-carousel', css: carouselBootstrapPageStyles, page: true };
export const bootstrapSpinners: BootstrapPart = { key: 'bootstrap-spinners', css: spinnersBootstrapStyles, page: false };
export const bootstrapSpinnersPage: BootstrapPart = { key: 'bootstrap-spinners', css: spinnersBootstrapPageStyles, page: true };
export const bootstrapOffcanvas: BootstrapPart = { key: 'bootstrap-offcanvas', css: offcanvasBootstrapStyles, page: false };
export const bootstrapOffcanvasPage: BootstrapPart = { key: 'bootstrap-offcanvas', css: offcanvasBootstrapPageStyles, page: true };
export const bootstrapPlaceholders: BootstrapPart = { key: 'bootstrap-placeholders', css: placeholdersBootstrapStyles, page: false };
export const bootstrapPlaceholdersPage: BootstrapPart = { key: 'bootstrap-placeholders', css: placeholdersBootstrapPageStyles, page: true };
