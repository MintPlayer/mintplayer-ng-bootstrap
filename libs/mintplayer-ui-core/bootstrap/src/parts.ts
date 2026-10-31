// The per-component Bootstrap parts (#452). Each is one stock partial,
// compiled into @layer mp.bootstrap; a front installs the parts its markup
// uses (Angular `useBootstrap`, elsewhere `installBootstrap`), once per page.
// Object literals only, so a bundler drops every part nobody imports.

import { containersBootstrapStyles } from '../../styles/parts/containers.bootstrap.styles';
import { gridBootstrapStyles } from '../../styles/parts/grid.bootstrap.styles';
import { tablesBootstrapStyles } from '../../styles/parts/tables.bootstrap.styles';
import { formsBootstrapStyles } from '../../styles/parts/forms.bootstrap.styles';
import { transitionsBootstrapStyles } from '../../styles/parts/transitions.bootstrap.styles';
import { dropdownBootstrapStyles } from '../../styles/parts/dropdown.bootstrap.styles';
import { buttonGroupBootstrapStyles } from '../../styles/parts/button-group.bootstrap.styles';
import { navBootstrapStyles } from '../../styles/parts/nav.bootstrap.styles';
import { navbarBootstrapStyles } from '../../styles/parts/navbar.bootstrap.styles';
import { cardBootstrapStyles } from '../../styles/parts/card.bootstrap.styles';
import { accordionBootstrapStyles } from '../../styles/parts/accordion.bootstrap.styles';
import { breadcrumbBootstrapStyles } from '../../styles/parts/breadcrumb.bootstrap.styles';
import { paginationBootstrapStyles } from '../../styles/parts/pagination.bootstrap.styles';
import { badgeBootstrapStyles } from '../../styles/parts/badge.bootstrap.styles';
import { alertBootstrapStyles } from '../../styles/parts/alert.bootstrap.styles';
import { progressBootstrapStyles } from '../../styles/parts/progress.bootstrap.styles';
import { listGroupBootstrapStyles } from '../../styles/parts/list-group.bootstrap.styles';
import { closeBootstrapStyles } from '../../styles/parts/close.bootstrap.styles';
import { toastsBootstrapStyles } from '../../styles/parts/toasts.bootstrap.styles';
import { modalBootstrapStyles } from '../../styles/parts/modal.bootstrap.styles';
import { tooltipBootstrapStyles } from '../../styles/parts/tooltip.bootstrap.styles';
import { popoverBootstrapStyles } from '../../styles/parts/popover.bootstrap.styles';
import { carouselBootstrapStyles } from '../../styles/parts/carousel.bootstrap.styles';
import { spinnersBootstrapStyles } from '../../styles/parts/spinners.bootstrap.styles';
import { offcanvasBootstrapStyles } from '../../styles/parts/offcanvas.bootstrap.styles';
import { placeholdersBootstrapStyles } from '../../styles/parts/placeholders.bootstrap.styles';

export interface BootstrapPart {
  /** Registry key, `bootstrap-<partial>`: installed once per page. */
  readonly key: string;
  readonly css: string;
}

export const bootstrapContainers: BootstrapPart = { key: 'bootstrap-containers', css: containersBootstrapStyles };
export const bootstrapGrid: BootstrapPart = { key: 'bootstrap-grid', css: gridBootstrapStyles };
export const bootstrapTables: BootstrapPart = { key: 'bootstrap-tables', css: tablesBootstrapStyles };
export const bootstrapForms: BootstrapPart = { key: 'bootstrap-forms', css: formsBootstrapStyles };
export const bootstrapTransitions: BootstrapPart = { key: 'bootstrap-transitions', css: transitionsBootstrapStyles };
export const bootstrapDropdown: BootstrapPart = { key: 'bootstrap-dropdown', css: dropdownBootstrapStyles };
export const bootstrapButtonGroup: BootstrapPart = { key: 'bootstrap-button-group', css: buttonGroupBootstrapStyles };
export const bootstrapNav: BootstrapPart = { key: 'bootstrap-nav', css: navBootstrapStyles };
export const bootstrapNavbar: BootstrapPart = { key: 'bootstrap-navbar', css: navbarBootstrapStyles };
export const bootstrapCard: BootstrapPart = { key: 'bootstrap-card', css: cardBootstrapStyles };
export const bootstrapAccordion: BootstrapPart = { key: 'bootstrap-accordion', css: accordionBootstrapStyles };
export const bootstrapBreadcrumb: BootstrapPart = { key: 'bootstrap-breadcrumb', css: breadcrumbBootstrapStyles };
export const bootstrapPagination: BootstrapPart = { key: 'bootstrap-pagination', css: paginationBootstrapStyles };
export const bootstrapBadge: BootstrapPart = { key: 'bootstrap-badge', css: badgeBootstrapStyles };
export const bootstrapAlert: BootstrapPart = { key: 'bootstrap-alert', css: alertBootstrapStyles };
export const bootstrapProgress: BootstrapPart = { key: 'bootstrap-progress', css: progressBootstrapStyles };
export const bootstrapListGroup: BootstrapPart = { key: 'bootstrap-list-group', css: listGroupBootstrapStyles };
export const bootstrapClose: BootstrapPart = { key: 'bootstrap-close', css: closeBootstrapStyles };
export const bootstrapToasts: BootstrapPart = { key: 'bootstrap-toasts', css: toastsBootstrapStyles };
export const bootstrapModal: BootstrapPart = { key: 'bootstrap-modal', css: modalBootstrapStyles };
export const bootstrapTooltip: BootstrapPart = { key: 'bootstrap-tooltip', css: tooltipBootstrapStyles };
export const bootstrapPopover: BootstrapPart = { key: 'bootstrap-popover', css: popoverBootstrapStyles };
export const bootstrapCarousel: BootstrapPart = { key: 'bootstrap-carousel', css: carouselBootstrapStyles };
export const bootstrapSpinners: BootstrapPart = { key: 'bootstrap-spinners', css: spinnersBootstrapStyles };
export const bootstrapOffcanvas: BootstrapPart = { key: 'bootstrap-offcanvas', css: offcanvasBootstrapStyles };
export const bootstrapPlaceholders: BootstrapPart = { key: 'bootstrap-placeholders', css: placeholdersBootstrapStyles };
