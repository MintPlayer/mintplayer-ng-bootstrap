import { BsInputGroup } from '@mintplayer/react-bootstrap/input-group';
import { BsPhoneInput } from '@mintplayer/react-bootstrap/phone-input';
import * as React from 'react';

import { BsAccordion, BsAccordionItem } from '@mintplayer/react-bootstrap/accordion';
import { BsCarousel } from '@mintplayer/react-bootstrap/carousel';
import { BsHierarchyChart } from '@mintplayer/react-bootstrap/charts/hierarchy';
import { BsSparkline } from '@mintplayer/react-bootstrap/charts/sparkline';
import { BsTrendChart } from '@mintplayer/react-bootstrap/charts/trend';
import { BsDropdownMenu } from '@mintplayer/react-bootstrap/dropdown-menu';
import { BsNavbar, BsNavbarBrand, BsNavbarDropdown, BsNavbarItem } from '@mintplayer/react-bootstrap/navbar';
import { BsShell } from '@mintplayer/react-bootstrap/shell';
import { BsThemeToggle } from '@mintplayer/react-bootstrap/theming';
import { BsTimeline, BsTimelineItem } from '@mintplayer/react-bootstrap/timeline';
import { BsCalendar } from '@mintplayer/react-bootstrap/calendar';
import {
  BsCard, BsCardBody, BsCardFooter, BsCardGroup, BsCardHeader, BsCardImg, BsCardLink, BsCardSubtitle,
  BsCardText, BsCardTitle,
} from '@mintplayer/react-bootstrap/card';
import { BsCheckbox } from '@mintplayer/react-bootstrap/checkbox';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import { BsDatatable } from '@mintplayer/react-bootstrap/datatable';
import { BsDatepicker } from '@mintplayer/react-bootstrap/datepicker';
import { BsDatetimePicker } from '@mintplayer/react-bootstrap/datetime-picker';
import { BsDockManager } from '@mintplayer/react-bootstrap/dock';
import { BsDropdownDivider, BsDropdownHeader, BsDropdownItem } from '@mintplayer/react-bootstrap/dropdown-menu';
import { BsFileManager } from '@mintplayer/react-bootstrap/file-manager';
import { BsMultiRange } from '@mintplayer/react-bootstrap/multi-range';
import { BsOtpInput } from '@mintplayer/react-bootstrap/otp-input';
import { BsPagination } from '@mintplayer/react-bootstrap/pagination';
import { BsQueryBuilder } from '@mintplayer/react-bootstrap/query-builder';
import { BsRadio } from '@mintplayer/react-bootstrap/radio';
import { BsRadioGroup } from '@mintplayer/react-bootstrap/radio-group';
import {
  BsQuickAccessToolbar, BsRibbon, BsRibbonButton, BsRibbonCheckBox, BsRibbonColorPicker, BsRibbonComboBox,
  BsRibbonContextualTabSet, BsRibbonDropdownButton, BsRibbonGallery, BsRibbonGalleryItem, BsRibbonGroup,
  BsRibbonGroupButton, BsRibbonMenuItem, BsRibbonMenuSeparator, BsRibbonSplitButton, BsRibbonTab,
  BsRibbonTemplateItem, BsRibbonToggleButton,
} from '@mintplayer/react-bootstrap/ribbon';
import { BsScheduler } from '@mintplayer/react-bootstrap/scheduler';
import { BsSelect } from '@mintplayer/react-bootstrap/select';
import { BsSignaturePad } from '@mintplayer/react-bootstrap/signature-pad';
import { BsSplitter } from '@mintplayer/react-bootstrap/splitter';
import { BsTabControl, BsTabPage } from '@mintplayer/react-bootstrap/tab-control';
import { BsTileManager } from '@mintplayer/react-bootstrap/tile-manager';
import { BsTimeList, BsTimepicker } from '@mintplayer/react-bootstrap/timepicker';
import { BsToggleButton } from '@mintplayer/react-bootstrap/toggle-button';
import { BsTreeSelect } from '@mintplayer/react-bootstrap/tree-select';
import { BsTreeview } from '@mintplayer/react-bootstrap/treeview';

/**
 * Compile-time half of the React passthrough guard: do these components' props types
 * *accept* the standard DOM attributes a consumer needs for accessibility? Run by
 * `nx run mintplayer-react-bootstrap:typecheck-a11y`; there is nothing to execute.
 *
 * **The probe uses `role`, `id` and `tabIndex` and deliberately avoids `aria-*`.**
 * TypeScript exempts hyphenated JSX attribute names from excess-property checking,
 * so a probe written with `aria-label` compiles against *any* props type — including
 * one that rejects everything else — and would pass vacuously while proving nothing.
 * That is why the original audit reported these wrappers as fine. Only bare and
 * camelCase names actually exercise the type.
 *
 * A type error here is the guard firing. It means a consumer cannot write the
 * attribute at all, regardless of whether the runtime would have forwarded it —
 * which is a separate failure covered by `attribute-passthrough.spec.tsx`.
 */

export const probes = [
  <BsInputGroup role="none" id="ig" tabIndex={-1} />,
  <BsPhoneInput role="none" id="pi" tabIndex={-1} />,
  <BsAccordion role="none" id="a" tabIndex={-1} />,
  <BsAccordion>
    <BsAccordionItem header="H" role="none" id="ai" tabIndex={-1} />
  </BsAccordion>,
  <BsCarousel role="none" id="c" tabIndex={-1} />,
  <BsDropdownMenu role="none" id="dm" tabIndex={-1} />,
  <BsHierarchyChart role="none" id="hc" tabIndex={-1} />,
  <BsSparkline role="none" id="sl" tabIndex={-1} />,
  <BsTrendChart role="none" id="tc" tabIndex={-1} />,
  <BsNavbar role="none" id="n" tabIndex={-1} />,
  <BsNavbar>
    <BsNavbarBrand role="none" id="nb" tabIndex={-1} />
  </BsNavbar>,
  <BsNavbar>
    <BsNavbarDropdown role="none" id="nd" tabIndex={-1}><span slot="label">Menu</span></BsNavbarDropdown>
  </BsNavbar>,
  <BsNavbar>
    <BsNavbarItem role="none" id="ni" tabIndex={-1} />
  </BsNavbar>,
  <BsShell role="none" id="s" tabIndex={-1} />,
  <BsThemeToggle role="none" id="tt" tabIndex={-1} />,
  <BsTimeline role="none" id="t" tabIndex={-1} />,
];

/**
 * Every remaining wrapper (PRD P2-D11): the `createComponent` one-liners and the
 * plain-element card and dropdown helpers. The runtime half lists the same set.
 */
export const everyWrapperProbes = [
  <BsCalendar role="none" id="x" tabIndex={-1} />,
  <BsCard role="none" id="x" tabIndex={-1} />,
  <BsCardBody role="none" id="x" tabIndex={-1} />,
  <BsCardFooter role="none" id="x" tabIndex={-1} />,
  <BsCardGroup role="none" id="x" tabIndex={-1} />,
  <BsCardHeader role="none" id="x" tabIndex={-1} />,
  <BsCardImg role="none" id="x" tabIndex={-1} />,
  <BsCardLink role="none" id="x" tabIndex={-1} />,
  <BsCardSubtitle role="none" id="x" tabIndex={-1} />,
  <BsCardText role="none" id="x" tabIndex={-1} />,
  <BsCardTitle role="none" id="x" tabIndex={-1} />,
  <BsCheckbox role="none" id="x" tabIndex={-1} />,
  <BsCodeSnippet role="none" id="x" tabIndex={-1} />,
  <BsDatatable role="none" id="x" tabIndex={-1} />,
  <BsDatepicker role="none" id="x" tabIndex={-1} />,
  <BsDatetimePicker role="none" id="x" tabIndex={-1} />,
  <BsDockManager role="none" id="x" tabIndex={-1} />,
  <BsDropdownItem role="none" id="x" tabIndex={-1} />,
  <BsDropdownHeader role="none" id="x" tabIndex={-1} />,
  <BsDropdownDivider role="none" id="x" tabIndex={-1} />,
  <BsFileManager role="none" id="x" tabIndex={-1} />,
  <BsMultiRange role="none" id="x" tabIndex={-1} />,
  <BsOtpInput role="none" id="x" tabIndex={-1} />,
  <BsPagination role="none" id="x" tabIndex={-1} />,
  <BsQueryBuilder role="none" id="x" tabIndex={-1} />,
  <BsRadio role="none" id="x" tabIndex={-1} />,
  <BsRadioGroup role="none" id="x" tabIndex={-1} />,
  <BsRibbon role="none" id="x" tabIndex={-1} />,
  <BsQuickAccessToolbar role="none" id="x" tabIndex={-1} />,
  <BsRibbonTab role="none" id="x" tabIndex={-1} />,
  <BsRibbonContextualTabSet role="none" id="x" tabIndex={-1} />,
  <BsRibbonGroup role="none" id="x" tabIndex={-1} />,
  <BsRibbonButton role="none" id="x" tabIndex={-1} />,
  <BsRibbonSplitButton role="none" id="x" tabIndex={-1} />,
  <BsRibbonDropdownButton role="none" id="x" tabIndex={-1} />,
  <BsRibbonMenuItem role="none" id="x" tabIndex={-1} />,
  <BsRibbonMenuSeparator role="none" id="x" tabIndex={-1} />,
  <BsRibbonToggleButton role="none" id="x" tabIndex={-1} />,
  <BsRibbonCheckBox role="none" id="x" tabIndex={-1} />,
  <BsRibbonComboBox role="none" id="x" tabIndex={-1} />,
  <BsRibbonColorPicker role="none" id="x" tabIndex={-1} />,
  <BsRibbonGroupButton role="none" id="x" tabIndex={-1} />,
  <BsRibbonGallery role="none" id="x" tabIndex={-1} />,
  <BsRibbonGalleryItem role="none" id="x" tabIndex={-1} />,
  <BsRibbonTemplateItem role="none" id="x" tabIndex={-1} />,
  <BsScheduler role="none" id="x" tabIndex={-1} />,
  <BsSelect role="none" id="x" tabIndex={-1} />,
  <BsSignaturePad role="none" id="x" tabIndex={-1} />,
  <BsSplitter role="none" id="x" tabIndex={-1} />,
  <BsTabControl role="none" id="x" tabIndex={-1} />,
  <BsTabPage role="none" id="x" tabIndex={-1} />,
  <BsTileManager role="none" id="x" tabIndex={-1} />,
  <BsTimelineItem role="none" id="x" tabIndex={-1} />,
  <BsTimeList role="none" id="x" tabIndex={-1} />,
  <BsTimepicker role="none" id="x" tabIndex={-1} />,
  <BsToggleButton role="none" id="x" tabIndex={-1} />,
  <BsTreeSelect role="none" id="x" tabIndex={-1} />,
  <BsTreeview role="none" id="x" tabIndex={-1} />,
];

/**
 * The counter-example, kept so the reason for the rule above stays visible: this
 * compiles even against a props type that declares none of it, because the name is
 * hyphenated. Never build a passthrough probe out of these.
 */
export const vacuousProbe = <BsCarousel aria-label="proves nothing" aria-invented="also fine" />;
