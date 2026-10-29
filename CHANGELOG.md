# Changelog

All notable changes to `@mintplayer/ng-bootstrap` are documented here. The
package version aligns its major with the supported Angular major.

`@mintplayer/web-components` and `@mintplayer/ui-core` track no platform, so they follow semver: a
breaking change is a major. (2.20.0 and 2.21.0 broke `^2.x` consumers in a minor; 3.0.0 ends that.)

## [Unreleased]

### Breaking

- **Outputs no longer share a name with a native DOM event (issue #437).** Angular, Vue and Lit listen to a
  lowercased output name on the element, which also catches the native event of that name bubbling from inside
  the component, such as `selectionchange` from a filter `<input>` or `animationend` from a slide. The compiler
  now refuses such a name, and these outputs are renamed:
  - datatable, timeline and tree-select: `selectionChange` → `selectionChanged` (Angular `(selectionchanged)`,
    React `onSelectionChanged`, Vue `@selectionchanged`, Lit `selectionchanged`);
  - tree-select: `search` → `searchStart` (`searchstart`, `onSearchStart`);
  - carousel: `animationStart` / `animationEnd` → `slideStart` / `slideEnd`.
  **Migration**: rename the listener.

- **Card is plain Bootstrap markup (issue #437, wave A).** No front renders `<mp-card>` any more:
  `bs-card` (Angular) is the `.card` itself, `BsCard` (React/Vue) renders a `div.card`, and `mp-card` (Lit) is a
  light-DOM element that toggles the same classes on itself. The card ships no stylesheet; the layered Bootstrap
  baseline styles it, so the card renders with JS off and in Angular SSR.
  - **`navStyle` removed** from `bs-card-header` / `BsCardHeader` in all three frameworks, and
    `applyHeaderNavStyle` from `@mintplayer/web-components/card`. Put Bootstrap's own `card-header-tabs` /
    `card-header-pills` class on the nav: `<ul class="nav card-header-tabs">`.
  - The class mapping for `color` / `outline` / image `position` lives in `@mintplayer/ui-core/card`
    (`cardColorClasses`, `capColorClasses`, `cardImgClass`, `CARD_COLORS`, `CardColor`, `CardImagePosition`).
    `CardImagePosition` moved there from `@mintplayer/web-components/card`, which re-exports it.
  - `mp-card`'s shadow root, its `part`s, its `--mp-card-*` custom properties and its document-level card sheet
    are gone. Style a card with ordinary CSS on `.card`.
  - `bs-card-title`, `bs-card-subtitle` and `bs-card-text` hosts carry `d-block`, and `bs-card-group` drops its
    `:host { display: block }` so Bootstrap's `.card-group` flex layout applies.
- **Input group is a plain `.input-group` (issue #437, wave A).** `bs-input-group` (Angular) is the `.input-group`
  itself and `BsInputGroup` (React/Vue) renders a `div.input-group`, so the children are its direct children
  and render with JS off and in Angular SSR. `size` maps to `input-group-sm` / `input-group-lg`; the class and
  role mapping and the RTL / hosted-control sheet live in `@mintplayer/ui-core/input-group`.
  - `role="group"` is still added only when the group is named, but the Angular front reads the name from the
    host's static `aria-label` / `aria-labelledby`. A group named through a binding sets `role="group"` itself.
  - `size` is no longer mirrored onto `mp-*` controls inside the group; the controls read the group's size
    class themselves.
  - `<mp-input-group>` (Lit) is unchanged for now: `mp-phone-input` composes it in its shadow root.
- **Checkbox renders a native input (issue #437, wave A).** `bs-checkbox` / `BsCheckbox` render a plain
  `<input type=checkbox>` in Bootstrap's `.form-check` / `.form-switch` / `.btn-check` markup, with no
  `<mp-checkbox>`, so a checkbox renders with JS off and in Angular SSR. The class mapping and ARIA contract live in
  `@mintplayer/ui-core/checkbox` (`connectCheckbox`, `checkboxClasses`, `checkboxIds`).
  - Angular: `checkboxRef` is removed. `id` and `tabindex` move from the host to the input, and `aria-*` is
    copied onto it. Validation state from `BsControlValidityDirective` is rendered on the input with an
    `.invalid-feedback` message, not mirrored onto the host.
  - React: `onChange` is now the native input `change` event. Use the new `onCheckedChange(checked)` for the
    boolean. The ref is the `<input>`. `checked` / `defaultChecked` / `indeterminate` / `invalid` / `errorText`
    are props.
  - Vue: `v-model` is the checked state, and the new `v-model:indeterminate` is the mixed state. Attributes land on
    the input (`inheritAttrs: false`).
  - The mixed state is the `indeterminate` property plus `aria-checked="mixed"`. A user toggle clears it.
  - `FEEDBACK_CLASS` in `@mintplayer/ui-core/forms` is now `invalid-feedback d-block`.
  - `takeHostAria` moved to `@mintplayer/ng-bootstrap/a11y`.
  - `<mp-checkbox>` (Lit) is unchanged for now: `mp-datatable` renders it in its shadow root.
- **Toggle button is a checkbox toggle button in every front (issue #437, wave A).** It renders
  `input.btn-check` + `label.btn`, with the contract from `@mintplayer/ui-core/checkbox`. The input keeps the native
  checkbox role: `role="button"` + `aria-pressed` are removed, because `aria-pressed` froze at its server value when a
  click toggled the checkbox with JS off, while the native checked state stays correct either way.
  - Angular gains `<bs-toggle-button>`, a second selector of `BsCheckboxComponent` with the type fixed to
    `toggle_button`. It takes `[(isToggled)]`, `ngModel` / `formControl` and `color`.
  - React: `BsToggleButton` is `<BsCheckbox type="toggle_button">`. `onChange` is the native event; use
    `onCheckedChange(checked)` instead of `e.detail.checked`. `color` is a typed prop, and the ref is the input.
  - Vue: `BsToggleButton` is `<BsCheckbox type="toggle_button">`, so `v-model` is unchanged and attributes land on
    the input.
  - `<mp-toggle-button>` (Lit) renders in the light DOM. Its children become the label, and host `aria-label`,
    `aria-labelledby` and `aria-describedby` are written onto the input. The inner input has no `name`, because the
    form-associated host submits. `toggleButtonStyles` is still exported for `mp-checkbox`.

- **Radios are native radios sharing a name in every front (issue #437, wave A).** A radio renders a plain
  `<input type=radio>` in `.form-check` (or `.btn-check` + `label.btn` for `type="toggle_button"`) markup, and a
  group renders an element with `role="radiogroup"` that hands every radio one `name`. The browser then supplies
  one-of-N, the single tab stop, arrow move-and-select, position-in-set and form submission, with JS off and in
  Angular SSR. The contract lives in `@mintplayer/ui-core/radio` (`connectRadio`, `radioClasses`,
  `connectRadioGroup`, `radioGroupName`).
  - Angular: `bsRadioGroup` also matches a `<bs-radio-group>` element, which takes `name`, `required`, `disabled`
    and `ngModel` / `formControl`. `radioRef` is removed. `id`, `tabindex` and `aria-*` land on the input, and
    `[inputLabel]` names a radio that has no visible label. A choice made before hydration is adopted.
  - React: `BsRadioGroup` takes `value` + `onValueChange(value)` (or `defaultValue`), replacing `onGroupChange`.
    A standalone `BsRadio` takes `checked` + `onCheckedChange`. The refs are the `div` and the input.
  - Vue: `BsRadioGroup` keeps `v-model` and provides `radioGroupKey`. Attributes on `BsRadio` land on the input.
  - `<mp-radio>` / `<mp-radio-group>` (Lit) render in the light DOM. The group is no longer form-associated: the
    checked native input submits itself. The custom roving tabindex and arrow handling are gone in favour of the
    native set. The `checked` attribute is the initial state only; the `checked` property reads the input.
- **Pagination renders Bootstrap's `.pagination` markup in every front (issue #437, wave A).** Each front renders
  `<nav aria-label><ul class="pagination"><li class="page-item"><button class="page-link">` itself, from
  `@mintplayer/ui-core/pagination` (`connectPagination`, `buildPaginationLayout`, `previousPage`, `nextPage`), so
  Angular SSR emits the real control. A new `hrefFor(page)` renders every page as a link that works with JS off
  (a plain click still selects in place), and `labels` localizes the accessible names (default English).
  - Angular: no `<mp-pagination>` inside `bs-pagination`; `aria-*` / `id` / `tabindex` land on the `<nav>`.
    New `[labels]` and `[hrefFor]` inputs.
  - React: `BsPagination` is a plain component. `onMpPaginationPageChange(event)` is replaced by
    `onPageChange(page)`; `defaultSelectedPageNumber` makes it uncontrolled. The ref is the `<nav>`.
  - Vue: `pageNumbers`, `numberOfBoxes`, `showArrows`, `size`, `labels` and `hrefFor` are declared props;
    attributes land on the `<nav>`.
  - `<mp-pagination>` (Lit) is unchanged and keeps its shadow root until `mp-datatable` converts.

- **Shell renders its own HTML in every front (issue #437, wave A).** `bs-shell` (Angular) is the `.shell` itself,
  `BsShell` (React/Vue) renders a `div.shell`, and `mp-shell` (Lit) renders the same markup in its shadow root.
  The markup, ids and ARIA come from `@mintplayer/ui-core/shell`. The open state is one native checkbox per
  viewport mode, with a hamburger `<label>` for each. `checked` always means revealed, so the drawer toggles with
  JS off and in Angular SSR, and no viewport inverts it.
  - **Angular:** `*bsShellSidebar` is now a structural directive. A new `*bsShellTopbar` fills the top bar.
    `(statechange)` emits `BsShellStateChange` (`{ open }`), not the WC's `CustomEvent`.
  - **React:** the top bar and sidebar are the `topbar` / `sidebar` props instead of `slot=` children, and
    `onStatechange` receives `{ open }`. The ref is `BsShellHandle` (`{ element, toggle }`).
  - **Vue:** the top bar and sidebar are the `#topbar` / `#sidebar` named slots, and `@statechange` receives
    `ShellStateChange` (`{ open }`), now exported from `@mintplayer/vue-bootstrap/shell`.
  - **Removed:** the `hamburger` slot, `shellStyles` and the `::part(topbar)` hook. Style the shell's
    `.topbar` with ordinary CSS. Also removed: the `mp-shell` Declarative-Shadow-DOM chrome
    (`injectMpShellDsd`, `@mintplayer/web-components/shell/ssr`) and the `codegen-shell-chrome` target.

- **Accordion renders Bootstrap's accordion markup in every front (issue #437, wave A).** `bs-accordion` (Angular)
  is the `.accordion` itself, `BsAccordion` (React/Vue) renders a `div.accordion`, and `mp-accordion` (Lit)
  renders the same markup in its shadow root. Each row is a native `<details class="accordion-item">`, and the
  ids, `name` group and ARIA come from `@mintplayer/ui-core/accordion`. The server HTML is a working accordion
  with JS off. Single-open uses the `name` attribute, so no script or CSS state machine is involved.
  - **React/Vue:** `onTabToggle` / `@tab-toggle` receives `AccordionTabToggle` (`{ index, active }`), not a
    `CustomEvent` with `detail`. `AccordionTabToggleDetail` is replaced by `AccordionTabToggle`. The React ref
    is the `.accordion` `HTMLDivElement`.
  - **Lit:** the shadow ids and the group name changed (`acc-h<n>`, `acc-c<n>`, `acc-group`). The `tab-count`
    attribute and the `data-js` marker are gone.
  - **Theming:** set Bootstrap's `--bs-accordion-*` custom properties on `.accordion` with ordinary CSS.
    Bootstrap re-declares them on every `.accordion`, so a nested accordion needs its own rule. The
    `::part(header)`, `::part(button)` and `::part(content)` hooks are removed.
  - **Removed:** the Declarative-Shadow-DOM chrome (`injectMpAccordionDsd`,
    `@mintplayer/web-components/accordion/ssr`) and the `codegen-accordion-chrome` target.
  - **Vue:** the accordion's id comes from `useId()` rather than the instance `uid`, so the server and the
    hydrating client agree on every IDREF.
- **Tab control renders Bootstrap nav-tabs over native radios in every front (issue #437, wave A).** One radio
  per tab is the selection and the CSS pairs the n-th radio with the n-th pane, so the server HTML switches tabs
  with JS off (panes are `region`s labelled by their tab). After hydration the labels become APG tabs: roving
  tabindex, `aria-selected`, Left/Right/Home/End with automatic activation, disabled tabs skipped. Ids and ARIA
  come from `@mintplayer/ui-core/tab-control`.
  - **Angular:** `bs-tab-control` is the `.tab-control` itself. `bs-tab-page` renders nothing in place (its
    content is projected into the control's pane). `isServerSide`, `tabName` and `tabControlName` are removed.
  - **React:** `<BsTabPage tabId header disabled>` pages inside `<BsTabControl activeTab onTabActivate>`;
    `onTabActivate` receives the `tabId`. The ref is the `.tab-control` `HTMLDivElement`. Page attributes land
    on the pane (except `role`).
  - **Vue:** `<BsTabControl v-model>` with `<BsTabPage tab-id disabled>`, the tab content in a `#header` slot.
    `BsTabPage` is exported. Page attributes land on the pane (except `role`).
  - **Removed:** the `MpTabControl` / `MpTabPage` re-exports from the framework libraries. The Lit
    `mp-tab-control` stays unchanged until the dock, which depends on it, converts.
- **Sparkline renders its own svg in every front (issue #437, wave A).** The geometry and the accessible name
  come from `@mintplayer/ui-core/charts/sparkline`, so the server HTML is the finished chart. A `.sparkline` box
  holds a `role="img"` viewBox svg; the consumer's `aria-label` names the svg.
  - **Angular:** `bs-sparkline` is the `.sparkline` box itself. `sparklineRef` is removed. Without a `locale`,
    the summary is formatted for `LOCALE_ID`.
  - **React:** the ref is the `.sparkline` `HTMLSpanElement`. The props are React props, no longer
    custom-element properties. Other attributes land on the box.
  - **Vue:** `points`, `area`, `showLastDot`, `yMin`, `yMax`, `locale`, `inputLabel` and `summaryFormatter`
    are declared props, so numbers need a binding (`:y-min="0"`). Other attributes land on the box.
  - The Lit `mp-sparkline` renders from the same core and keeps its shadow root.
- **Navbar is generated from one source in every front (issue #437, wave A).** The navbar, nav, item and dropdown
  are written once in `@mintplayer/ui-core/navbar` and compiled into all four fronts by the new component compiler
  (`@mintplayer/nx-component-compiler`). Every front renders Bootstrap's `.navbar` markup, so the server HTML is the
  finished bar, and the collapse works with JS off.
  - **Every front:**
    - The landmark is named by the consumer's `aria-label`. The `label` input/prop is removed.
    - A new `navbar-nav` element groups items: `bs-navbar-nav` / `BsNavbarNav` / `mp-navbar-nav`, with `align`.
    - `expanded` is two-way: Angular `[(expanded)]`, Vue `v-model:expanded`; the Lit property follows the bar.
      The `expandedchange` output still reports only user toggles.
    - Item nesting inside a dropdown comes from the navbar's own context, not `BS_DROPDOWN_MENU_CONTEXT`.
  - **Angular:**
    - `bs-navbar-brand` is replaced by the `[bsNavbarBrand]` directive on an `<ng-template>`.
    - `bs-navbar-dropdown` takes a `label` input; `[bsNavbarDropdownLabel]` still overrides it with markup.
    - `[bsNavbarContent]` reserves `var(--bs-navbar-content-offset, 3.5rem)` on the server and with JS off, then
      follows the bar's measured height.
  - **React / Vue:** the components are `forwardRef` / `defineExpose` components with a `toggle()` method.
    Consumer attributes land on the rendered `.navbar`, `.navbar-nav`, `.nav-item` and `details.dropdown`.
  - **Lit:** the elements render in the light DOM. `mp-navbar-brand` is removed (put a `slot="brand"` child in
    `mp-navbar`), `slot="end"` is replaced by `<mp-navbar-nav align="end">`, `mp-navbar-dropdown` is a native `<details>` whose `label` attribute or `slot="label"` names it,
    and the DSD chrome is retired. `mp-dropdown-menu`'s `input-label` is removed: name it with `aria-label`.
- **Select is a native `<select>` generated from one source in every front (issue #437, wave B).** The select is
  written once in `@mintplayer/ui-core/select` and compiled into all four fronts. Every front renders a
  `<select class="form-select">` in the light DOM, so it opens, picks and submits with JS off and in Angular SSR;
  the selection is the options' `selected` attribute on the server (React's `defaultValue`).
  - **Every front:**
    - The change event is `valuechange` (Angular `(valuechange)`, React `onValueChange`, Vue `@valuechange`) and
      reports `{ value, values }`. React's callback receives that detail itself, not an event.
    - `value` and `values` are two-way. A `value=""` option means no selection (`null`).
    - The form value is the native select's own: there is no form-associated custom element any more. A `name`
      submits one entry per selected option.
    - `options` takes `{ value, label, disabled? }` items and `{ label, options }` groups (rendered as
      `<optgroup>`). Without `options`, `<option>` / `<optgroup>` children are rendered inside the select.
    - Rich options (customizable select, `appearance: base-select`) come from an `option` slot instead of an
      `optionRenderer` that returned an HTML string: Angular `<ng-template bsSelectOption let-option="option">`,
      React `option={({ option }) => …}`, Vue `#option="{ option }"`, Lit `optionRenderer` returning a template.
      Only where the engine supports it; elsewhere the option is its label.
    - A consumer's `aria-*`, `id` and `tabindex` reach the `<select>` in React and Vue, whose props are typed
      for `HTMLSelectElement`. In Angular and Lit, `aria-label` on the host names the select.
  - **Angular:** `identifier` is removed. `BsSelectOption` (the `option` directive) now writes the `selected`
    attribute for SSR. The generated slot directive is `BsSelectOptionDirective`.
  - **Vue:** `v-model` is now `v-model:value` (and `v-model:values` when `multiple`).
  - **Lit:** `mp-select` renders in the light DOM (no shadow root, no `part`s). Attributes are kebab-case
    (`input-label`, `error-text`, `number-visible`).
  - `mp-query-builder` and `mp-scheduler` use plain native selects internally.
- **OTP input is generated from one source in every front (issue #437, wave B).** It is written once in
  `@mintplayer/ui-core/otp-input` and compiled into all four fronts. Each front renders one real `<input>` in
  the light DOM, with the boxes as `aria-hidden` decoration. With JS off, and before hydration, it is a plain
  `.form-control` that submits under `name` (masked for a `password` code).
  - **Every front:**
    - `case` is renamed `letterCase` (`letter-case` on the Lit element). `case` cannot be a React prop binding.
    - The change event is `valuechange` (Angular `(valuechange)` and `[(value)]`, React `onValueChange`, Vue
      `v-model:value`). `complete` reports the full code (React `onComplete` receives the string itself).
    - The form value is the native input's own: there is no form-associated custom element any more.
    - `clear()` and `focusInput()` are methods. `focus()` on the Angular host moves into the input.
  - **Angular:** `BsOtpInputValueAccessor` is a host directive of `bs-otp-input`, and `BsControlValidityDirective`
    (`errorMessages`) is applied to it as well.
  - **Lit:** `mp-otp-input` renders in the light DOM (no shadow root, no `part`s). Attributes are kebab-case
    (`input-label`, `error-text`, `letter-case`).
- **Multi-range is generated from one source in every front (issue #437, wave B).** It is written once in
  `@mintplayer/ui-core/multi-range` and compiled into all four fronts. Every thumb is a native
  `<input type="range">` stacked over one track, in the light DOM. The browser now owns the slider role, the
  keyboard (including RTL mirroring) and form submission under `name`. With JS off the thumbs still drag, step
  and submit. The core adds the neighbour constraint, the fill and the press-on-track.
  - **Every front:**
    - The events are `valueinput` (while moving) and `valuechange` (on commit), each carrying the
      `number[]`. They were `value-input` and `value-change`.
    - The value is the `value` model: Angular `[(value)]`, React `value` + `onValueInput` / `onValueChange`
      (both receive the array itself), Vue `v-model:value`.
    - A written value is sorted and clamped. `null` shows as `[min, max]` and is not reported back.
    - `getValues()` is a method.
  - **Angular:** `BsMultiRangeValueAccessor` is a host directive of `bs-multi-range`. A form write never marks the
    control dirty.
  - **Lit:** `mp-multi-range` has no shadow root and no `part`s. The `.thumb` and `.track` classes are now
    `multi-range-thumb` and `multi-range-track`. `minDistance` is the `min-distance` attribute.
- **Calendar is generated from one source in every front (issue #437, wave B).** It is written once in
  `@mintplayer/ui-core/calendar` and compiled into all four fronts. The month grid, its keymap and its
  week numbers are pure functions there, so the date pickers render the same grid. With JS off the month
  renders inert: the month buttons are disabled and no day is tabbable until the page hydrates.
  - **Every front:**
    - `selectedDate` and `currentMonth` are two-way and default to `null`. Angular's `selectedDate` used to
      default to today. `null` for the month shows the selected day's month, else today's.
    - The events are `selecteddatechange` and `currentmonthchange` (were `selected-date-change` /
      `current-month-change`). React has `onSelectedDateChange` / `onCurrentMonthChange`; Vue has
      `v-model:selected-date` / `v-model:current-month`, replacing the plain `v-model`.
    - The methods are `previousMonth()`, `nextMonth()`, `select(date)` and `focusGrid()`. `goto(day)` and the
      Lit host's `focus()` override are gone.
    - `labels` localises the month buttons and the week column.
  - **Lit:** `mp-calendar` renders in the light DOM (no shadow root). Its classes are now `calendar-*`
    (`calendar-day-selected`, `calendar-chevron-previous`, …). `MpCalendarElement` is now `MpCalendar`.
- **Datepicker, timepicker and datetime picker are generated from one source in every front (issue #437,
  wave B).** Each is written once in `@mintplayer/ui-core/{datepicker,timepicker,datetime-picker}` and
  compiled into all four fronts. With JS off each is a native `date` / `time` / `datetime-local` field that
  submits `name` with the form and honours `min`, `max` and `step`. Once hydrated, the field becomes a
  readonly display, a hidden input carries `name` (ISO `YYYY-MM-DD`, `HH:MM` or `YYYY-MM-DDTHH:MM`), and the
  triggers open the grid and the slot list in native `popover="auto"` popups. The browser handles Escape,
  light dismiss and focus return. The popups no longer animate in.
  - **Every front:**
    - `selectedDate` / `selectedTime` default to `null` (Angular defaulted to now).
    - The events are `selecteddatechange`, `selectedtimechange` and `valuechange` (the Lit datetime picker
      emitted `value-change`). React has `onSelectedDateChange` / `onSelectedTimeChange` / `onValueChange`,
      which receive the value rather than an event. Vue has `v-model:selected-date` / `v-model:selected-time`
      / `v-model:value`.
    - Open state is an `openChange` event. The timepicker's `isOpen` model and the datetime picker's
      `opened` / `closed` outputs are gone. The methods are `open()` / `close()`, or `openDate()`,
      `openTime()`, `closePopups()` and `clear()` on the datetime picker.
    - Accessible names go through `labels`, which replaces `triggerLabel`, `dateButtonLabel`,
      `timeButtonLabel`, `clearLabel`, `todayLabel` and `nowLabel`. `calendarLabels` localises the grid.
      `inputLabel` names the field.
    - Each takes `name`, `required`, `invalid` and `errorText` (the forms contract). `min` / `max` default to
      `null`, not `undefined`.
  - **Angular:** every picker keeps a `ControlValueAccessor` and a validator (`min`, `max`, `disabledDate`)
    as a host directive (`BsDatepickerValueAccessor`, `BsTimepickerValueAccessor`,
    `BsDatetimePickerValueAccessor`). `BsControlValidityDirective` carries the control's errors to the field.
  - **Lit:** `mp-datepicker`, `mp-timepicker`, `mp-time-list` and `mp-datetime-picker` render in the light DOM
    (no shadow root, no `part`s, no `data-open`). A shadow-root host must call `adoptLightStyles` and provide
    Bootstrap's `.input-group` / `.btn`, as `mp-scheduler` now does. The classes are prefixed
    (`datetime-picker-date`, `time-slot`, …), and the host's `focus()` override is gone; focus the
    `.form-control` field instead. `MpDatepickerElement`, `MpTimepickerElement` and `MpDatetimePickerElement`
    are now `MpDatepicker`, `MpTimepicker` and `MpDatetimePicker`.
- **Signature pad is generated from one source in every front (issue #437).** It is written once in
  `@mintplayer/ui-core/signature-pad` and compiled into all four fronts. A canvas cannot draw without JS, so
  with JS off the pad renders but every control is disabled. The canvas repaints itself whenever a front
  rewrites its `width` / `height`.
  - **Every front:**
    - The event is `signaturechange` (the Lit element emitted `signature-change`). React has
      `onSignatureChange`, which receives the `Signature` rather than an event. Vue binds with
      `v-model:signature` (plain `v-model` is gone).
    - `labels` (`pad`, `type`, `undo`, `clear`) localises the names and button texts. `inputLabel` names the
      canvas.
    - Each takes `disabled`, `required`, `invalid` and `errorText`. The error describes the typed field, or
      the canvas when the typed field is off.
    - Undo and Clear stay enabled on an empty pad, so focus is never dropped; on an empty pad they do nothing.
    - `showAccessibilityToggle` is a boolean input or property. The attribute `show-accessibility-toggle="false"`
      no longer turns it off, because a present boolean attribute counts as true.
  - **Angular:** `BsSignaturePadValueAccessor` is a host directive, so `ngModel` / `formControl` need no
    extra import. `BsControlValidityDirective` carries the control's errors to the pad. A `null` write
    clears the pad.
  - **Lit:** `mp-signature-pad` renders in the light DOM (no shadow root, no `part`s). Its classes are
    `signature-pad-canvas`, `signature-pad-text`, `signature-pad-undo` and `signature-pad-clear`.
    `MpSignaturePadElement` is now `MpSignaturePad`. The `Signature`, `Stroke` and `Point` types come from
    `@mintplayer/ui-core/signature-pad` and are re-exported by every front.
- **Phone input is generated from one source in every front (issue #437).** It is written once in
  `@mintplayer/ui-core/phone-input` (`phoneInputCore`, `connectPhoneInput`) and compiled into all four
  fronts, so it is server-rendered everywhere. With JS off it is a plain country select and tel input, and
  the typed text submits under `name`; once live, a hidden input submits the E.164 value instead.
  - **Every front:** the root is `.phone-input` (a `div` in React and Vue, the host in Angular and Lit), and
    it holds one Bootstrap `.input-group`: a native `select.form-select`, a `span.input-group-text.addon`
    with the flag and dial code, and the `input[type=tel]`. Consumer attributes (`aria-label`, `id`, ...)
    land on the tel input. Validity is on that input too (`required`, and a custom error for a number the
    rules reject).
  - **Two-way:** `value` (E.164, or null) and `country`. The events are `valueChange` (the E.164 string),
    `countryChange` (the ISO code) and `phoneChange` (`PhoneChangeEventDetail`): Angular `(valuechange)`,
    `(countrychange)`, `(phonechange)`; React `onValueChange`, `onCountryChange`, `onPhoneChange`, each
    with the payload itself rather than a DOM event.
  - **Angular:** the component carries its own `ControlValueAccessor` and `BsControlValidityDirective` as
    host directives, so `[(ngModel)]`, `[formControl]` and `errorMessages` work as before.
  - **Narrow layout:** a container query on `.phone-input` stacks the picker above the number below 22rem.
    The `ResizeObserver` and the `stacked` attribute are gone.
  - **Methods:** `focusInput()` (the number field, never the picker) and `whenReady()` (flags and the rules in
    flight have landed).
  - **Removed:** the Lit element's form association (`formValue`, `formReset`, `formRestore`) and its
    `nationalNumber` / `dialCode` / `valid` getters; read them from `phoneChange`.
  - **Moved:** the flag corpus (`loadAllFlags`, `loadFlag`, `FlagMap`) is now `@mintplayer/ui-core/flags`,
    no longer `@mintplayer/web-components/flags`. `PhoneChangeEventDetail` comes from ui-core and every front
    re-exports it.
- **Timeline is generated from one source in every front (issue #437).** It is written once in
  `@mintplayer/ui-core/timeline` (`timelineCore`, `timelineItemCore`, `connectTimeline`) and compiled into all
  four fronts, so it is server-rendered everywhere and already laid out with JS off: side, reverse and the
  last connector are CSS on the root classes (`timeline-<orientation>`, `timeline-align-<align>`,
  `timeline-reverse`), not attributes a script writes. `@mintplayer/ui-core/timeline-core` is gone; its
  models and `resolveSides` are in `@mintplayer/ui-core/timeline` and re-exported by every front.
  - **Every front:** the root is `.timeline` (a `div` in React and Vue, the host in Angular and Lit) and each
    row is a `.timeline-item` child of it. There is no shadow root, so `::part()` hooks are gone; style the
    `.timeline-*` classes. `input-label` (`inputLabel`) names the list, and a host `aria-label` wins.
  - **Declarative items:** `<bs-timeline-item>` (Angular), `BsTimelineItem` (React/Vue) and
    `<mp-timeline-item>` (Lit). The `title` input is now `itemTitle` (it shadowed `HTMLElement.title`), the
    item's own content is its body (was `slot="content"`), and `opposite` / `heading` / `marker` /
    `connector` are slots (Angular `*bsTimelineItemOpposite`, ...; React node props; Vue `#opposite`). The
    authored `selected` attribute is gone: select through the timeline's `selectedIds`.
  - **Data rows:** the `title` slot is now `heading`. The region slots are scoped with `{ item, ctx }`:
    Angular `*bsTimelineMarker="let item = item"` (and `Heading`, `Timestamp`, `Opposite`, `Content`,
    `Connector`), React `marker={({ item }) => ...}` (the `render*` props are gone), Vue `#marker="{ item }"`,
    Lit `markerRenderer`.
  - **Selection is by key and two-way:** `selectedIds` holds strings (an item's `id`, else a data row's index
    or a declarative item's `itemId`). Angular `[(selectedIds)]` replaces the `selection` model of
    `TimelineItem[]`; Vue `v-model:selectedIds`; React `selectedIds` + `onSelectedIdsChange`.
    `selectionChange` still reports the consumer's own item objects.
  - **Events:** Angular `(itemclick)`, `(selectionchange)`, `(selectedidschange)`; Lit `itemclick`,
    `selectionchange`, `selectedidschange` (were `item-click` and `selection-change`).
- **Trend chart is generated from one source in every front (issue #437).** It is written once in
  `@mintplayer/ui-core/charts/trend` (`trendChartCore`, `connectTrendChart`, `layoutTrend`) and compiled
  into all four fronts, Vue included, so the server HTML is the finished SVG in every framework. Before
  hydration the points are named images; once live they are a roving set of buttons.
  - **Every front:** the root is `.trend-chart` (a `div` in React and Vue, the host in Angular and Lit) and
    the `<svg>` is its child. There is no shadow root; style the `.trend-chart` classes and the
    `--mp-trend-chart-*` custom properties.
  - **Events:** `trend-point-hover` / `trend-point-select` are now `pointHover` / `pointSelect`: Angular
    `(pointhover)` / `(pointselect)`, Lit `pointhover` / `pointselect`, React `onPointHover` /
    `onPointSelect` (the payload, not a `CustomEvent`), Vue `@pointhover` / `@pointselect`.
  - **Vue:** numeric inputs are typed numbers; bind them (`:y-min="0"`, not `y-min="0"`).
  - The `TrendSeries` / `TrendPoint` / event types come from `@mintplayer/ui-core/charts/trend` and every
    front re-exports them; `@mintplayer/web-components/charts/trend` no longer re-exports `charts/core`.
- **Splitter is generated from one source in every front, and its panels are declared (issue #437).** It is
  written once in `@mintplayer/ui-core/splitter` (`splitterCore`, `splitterPanelCore`) and compiled into all
  four fronts. The server HTML already splits the space evenly; the dividers take focus once live.
  - **Panels:** wrap every pane in a splitter panel: `<bs-splitter-panel>` (Angular), `<BsSplitterPanel>`
    (React, Vue), `<mp-splitter-panel>` (Lit). Direct children are no longer wrapped for you.
  - **Every front:** the root is `.splitter` (a `div` in React and Vue, the host in Angular and Lit). There is
    no shadow root. A panel is `.splitter-panel` (`display: contents`) holding a `.splitter-divider` and a
    `.splitter-pane`; the pane takes the size. The `--mp-splitter-*` custom properties are unchanged, set
    them on `.splitter`. `resizing` and `touch-mode` are classes on the root, not host attributes, and an
    active divider carries `data-active`, not `.active`.
  - **Events:** `resize-start` / `resize-end` are now `resizeStart` / `resizeEnd` (`resizing` keeps its
    name): Angular `(resizestart)` / `(resizing)` / `(resizeend)`, Lit the same lowercased names, React
    `onResizeStart` / `onResizing` / `onResizeEnd` (the payload), Vue `@resizestart` / `@resizing` /
    `@resizeend`.
  - **Accessible names** are localizable: `labels = { divider: 'Resize between panel ${before} and panel ${after}' }`.
  - `getPanelSizes()` / `setPanelSizes()` / `resizeDividerBy()` remain on the Angular component and the Lit
    element. The `SplitterStateManager`, `ResizeManager`, `InputHandler` and `splitterStyles` exports are
    gone; `Direction` is `SplitterOrientation`, `ResizeKey` is `SplitterResizeKey`.
- **File manager is generated from one source in every front, composed of the splitter, treeview and
  datatable (issue #437).** It is written once in `@mintplayer/ui-core/file-manager` (`fileManagerCore`,
  `connectFileManager`) and compiled into all four fronts. Each front renders its own splitter, treeview and
  datatable, so the server HTML is the whole browser (toolbar, breadcrumb, tree and list). The commands
  stay disabled until the component is live.
  - **Every front:** the root is `.file-manager` with `role="region"` (a `div` in React and Vue, the host in
    Angular and Lit). There is no shadow root, so page CSS reaches the internals. The `--mp-file-manager-*`
    custom properties are unchanged; set them on `.file-manager`.
  - **Two-way state:** `currentFolderId`, `viewMode`, `selectedIds`, `uploads` and `pending` are models.
    Angular: `[(uploads)]`, and `fm.uploads()` still reads the signal. Vue: `v-model:uploads`. The old
    `pendingOpIds` / `pendingCount` signals are gone; read `pending` instead (a `Record<id, OperationKind>`).
  - **Events** are lowercased like every compiled component. Angular uses `(navigate)`, `(nodeopen)`,
    `(selectionchanged)` (was `selectionChange`), `(uploadrequest)`, `(operation)`, `(errorreported)` and
    `(childrenloaded)`. Lit uses the same names. React uses `onNavigate`, `onNodeOpen`, `onSelectionChanged`
    and so on, receiving the payload. Vue uses `@navigate`, `@nodeopen` and so on.
  - **Sorting** is the file manager's own: the list hands the datatable rows already sorted (`autoSort` off),
    so folders-first ordering holds until a column is clicked.
  - **Messages:** two new keys, `renameLabel(name)` (the rename editor's accessible name) and
    `ariaFolderTree`.
  - `markPending` / `clearPending` / `reportError` / `reportUploadProgress` / `clearUpload` remain on the
    Angular component and the Lit element. The node, event and messages types come from
    `@mintplayer/ui-core/file-manager`, and every front re-exports them.
- **Dock manager is generated from one source in every front, composed of the splitter (issue #437).** It
  is written once in `@mintplayer/ui-core/dock` (`dockCore`, `connectDock`; the layout tree, geometry and
  sizing helpers moved there from `@mintplayer/web-components/dock`) and compiled into all four fronts.
  `<mint-dock-manager>` is replaced by `<mp-dock-manager>` (Lit) and the generated `BsDockManager`
  components.
  - **Pane content** comes from one `pane` slot, called with the pane's name, in place of
    `<bs-dock-pane name>` / `slot="<pane>"` children. Angular: `<ng-template bsDockManagerPane let-pane="pane">`
    (`BsDockPaneComponent` is gone). React: `pane={({ pane }) => …}`. Vue: `<template #pane="{ pane }">`.
    Lit: `paneRenderer` or `slot="pane"` children. Each pane renders once into a core-owned host that the
    dock moves between stacks, so its state survives every drag, drop and tear-off. A pane removed from
    the layout keeps its content alive, out of sight, as an unslotted child did before. Pane content is not
    server-rendered: the server HTML is the tabs and splits, inert until the dock is live.
  - **Every front:** the root is `.dock` with `role="region"` (a `div` in React and Vue, the host in Angular
    and Lit). There is no shadow root, so page CSS reaches the internals, and the tabs are plain
    `role="tab"` buttons (`mp-tab-control` is no longer used). Accessible names come from a new `labels`
    input (`DockLabels`, `DOCK_LABELS`, `mergeDockLabels`).
  - **Two-way `layout`:** Angular `[(layout)]` (type `DockLayoutInput`), Vue `v-model:layout`, Lit writes
    the property back. There is no JSON `layout` attribute any more.
  - **Events** are lowercased like every compiled component: `layoutchange` (replaces
    `dock-layout-changed` and Angular's `layoutSnapshotChange`) and the new `paneactivated`. React:
    `onLayoutChange`, `onPaneActivated`, receiving the payload.
  - `captureLayout()` remains on the Angular component, the Vue instance and the Lit element.
- **Ribbon is generated from one source in every front, its tab strip server-rendered (issue #437).** The
  ribbon, the quick access toolbar and all sixteen item / tab / group / menu elements are written once in
  `@mintplayer/ui-core/ribbon` and compiled into all four fronts. The `bs-ribbon-*` Angular, React and Vue
  wrappers around `<mp-ribbon-*>` are gone; the Lit elements keep their `mp-ribbon-*` tags.
  - **Nested children stay the API.** Tabs, groups and items are still authored as children. The ribbon
    reads its tabs (and the contextual sets around them) through a compiler content query, so the tab
    strip, the contextual bands and every panel are in the server HTML, in every front.
  - **No shadow root.** The root is `.ribbon` (`role="region"`), the QAT `.qat` (`role="toolbar"`, named by
    its `aria-label`). Page CSS reaches the internals; `::part()` hooks are gone. Every tab's
    `aria-controls` now resolves to its panel in the same tree. Item sizes are derived in CSS from the
    group's resolved size and the layout, so items no longer have their `size` attribute rewritten.
  - **`appAccent` is removed.** Set the `--bs-ribbon-accent` custom property on the ribbon or any
    ancestor (`.excel { --bs-ribbon-accent: #217346; }`).
  - **Contextual tab sets:** `hidden` is replaced by `visible` (default `true`):
    `<bs-ribbon-contextual-tab-set [visible]="pictureSelected()">`.
  - **Events** are lowercased like every compiled component: Angular `(itemclick)`, `(mainaction)`,
    `(menuselect)`, `(galleryselect)`, `(tabchange)`, `(dialoglauncherclick)`; React `onItemClick`,
    `onTabChange`, … receiving the payload rather than a `CustomEvent`; Vue `@itemclick`, `@tabchange`, ….
    The value events are replaced by two-way models: `pressed` (toggle button, was `toggle`), `checked`
    (check box, was `check-change`), `value` (combo box), `color` (colour picker), `selectedValue` (group
    button, was `group-select` with `value`), `minimized` (was `minimize-toggle`) and `activeTabId`.
    Angular `[(pressed)]` / `[(ngModel)]`, React `pressed` + `onPressedChange`, Vue `v-model:pressed`.
  - **Icons:** `slot="icon"` is replaced by the `iconTemplate` slot: Angular `*bsRibbonButtonIconTemplate`
    (one directive per item), React `iconTemplate={<svg …/>}`, Vue `<template #iconTemplate>`, Lit
    `slot="iconTemplate"`. The `.ribbon-icon-*` utility classes are gone; the icon is sized from the size
    the item renders at.
  - **Tell me:** `slot="tell-me"` is replaced by the `tellMe` slot: Angular `<ng-template bsRibbonTellMe>`,
    React `tellMe={…}`, Vue `<template #tellMe>`.
  - The ribbon types come from `@mintplayer/ui-core/ribbon` and every front re-exports them.
- **Scheduler is generated from one source in every front, its grid server-rendered (issue #437).** It is
  written once in `@mintplayer/ui-core/scheduler` (`schedulerCore`; the state manager, drag, geometry and
  keyboard-grid modules moved there from `@mintplayer/web-components/scheduler`) and compiled into all four
  fronts. The hand-written `bs-scheduler` Angular, React and Vue wrappers around `<mp-scheduler>` are gone;
  the Lit element keeps the `mp-scheduler` tag.
  - **Server-rendered grid.** Every view (year, month, week, day, timeline) is a static grid with events
    positioned by custom properties in slot units, so the server HTML is the whole grid, inert until the
    scheduler is live. The root carries `data-mp-hydrated` once it is.
  - **No shadow root.** The root is `.scheduler` (a `div` in React and Vue, the host in Angular and Lit).
    Page CSS reaches the internals; `::part()` hooks are gone. The day popover, row panel and event editor
    are native popovers; the editor composes the datetime picker.
  - **Two-way models:** `view`, `date`, `selectedEvent` and `selectedRange`. Angular `[(view)]`,
    `[(selectedRange)]`; React `view` + `onViewChange`; Vue `v-model:view`, `v-model:selectedRange`; Lit writes
    the property back. Clear a range by setting `selectedRange` to `null`.
  - **Events** are lowercased like every compiled component and carry named detail types
    (`SchedulerEventCreateDetail`, `SchedulerEventUpdateDetail`, …): Angular `(eventcreate)`,
    `(eventupdate)`, `(eventdelete)`, `(eventselected)`, …; React `onEventCreate`, … receiving the payload;
    Vue `@eventcreate`, …. `selectionChange` is renamed `selectionChanged`.
  - **Attribute hooks:** event buttons carry `data-start` / `data-end` (ISO), like the cells.
  - `slotDuration` outside an integer 60..86400 seconds falls back to the default rather than hanging.
  - The scheduler types come from `@mintplayer/ui-core/scheduler` and every front re-exports them.
- **Navbar dropdown's label slot is `labelTemplate` (issue #437).** It shared its name with the `label`
  input, which made React and Vue pass the slot in place of the label. Angular: `*bsNavbarDropdownLabelTemplate`
  (`BsNavbarDropdownLabelTemplateDirective`); React `labelTemplate`; Vue `#labelTemplate`.
- **Compiled Lit elements refuse an unknown enum attribute (issue #437).** A string input typed as a union
  of literals ignores an attribute naming none of them and keeps its default (`orientation="sideways"` on
  `mp-splitter` stays `horizontal`), as the hand-written elements did.
- **Hierarchy chart is generated from one source in every front (issue #437).** It is written once in
  `@mintplayer/ui-core/charts/hierarchy` (`hierarchyChartCore`, `connectHierarchyChart`) and compiled into
  all four fronts. The server HTML is the finished chart at a 420px fallback scale, its controls inert until
  it is live.
  - **Every front:** the root is `.hierarchy-chart` (a `div` in React and Vue, the host in Angular and Lit).
    There is no shadow root; style the `.hierarchy-chart` classes and the `--mp-hierarchy-chart-*` custom
    properties. `--mp-hierarchy-chart-transition-duration` is written on the inner `.chart`.
  - **Events:** `hierarchy-zoom` / `hierarchy-node-select` / `hierarchy-node-hover` /
    `hierarchy-node-load-error` are now `zoom` / `nodeSelect` / `nodeHover` / `nodeLoadError`, plus
    `rootIdChange`: Angular `(zoom)`, `(nodeselect)`, `(nodehover)`, `(nodeloaderror)`; Lit the same
    lowercased names; React `onZoom`, `onNodeSelect`, `onNodeHover`, `onNodeLoadError`, `onRootIdChange`
    (the payload, not a `CustomEvent`); Vue `@zoom`, `@nodeselect`, … and `v-model:rootId`.
  - **Lit element:** `zoomLevel` is a method (`el.zoomLevel()`), and `root-id` no longer reflects; read
    `el.rootId`. `maxDepth`, `zoomGestures` and `zoomHintLabel` return what was set, not the resolved value.
  - **Vue:** numeric inputs are typed numbers; bind them (`:color-min="60"`, not `color-min="60"`).
  - The `HierarchyNode` / layout / event types come from `@mintplayer/ui-core/charts/hierarchy` and every
    front re-exports them.
- **Compiled Lit elements read their attributes the way the hand-written ones did (issue #437).** Removing an
  attribute restores the input's default instead of leaving `null` behind (a removed `color-start` crashed the
  hierarchy chart), a non-numeric number attribute keeps the default rather than becoming `NaN`, and a boolean
  attribute set to `"false"` is false, so `show-labels="false"` can switch a default-true input off. Lit's own
  `Boolean` reads any present attribute as true.
- **The Lit bridge follows a consumer `aria-label` set after the element connects (issue #437).** It was
  read once, on connect.
- **Carousel is generated from one source in every front (issue #437).** It is written once in
  `@mintplayer/ui-core/carousel` (`carouselCore`, `connectCarousel`) and compiled into all four fronts. The
  server HTML is the complete deck in every framework: one radio per slide holds the index, so indicators,
  prev/next (with wrap-around) and the radio-group arrow keys work with JavaScript off. The Declarative Shadow
  DOM chrome, `injectMpCarouselDsd` and `@mintplayer/web-components/carousel/ssr` are gone.
  - **Slides are items:** wrap each slide in `bs-carousel-item` (Angular), `BsCarouselItem` (React, Vue) or
    `mp-carousel-item` (Lit). The parent counts them on the server.
  - **Every front:** the root is `.carousel` (a `div` in React and Vue, the host in Angular and Lit). There is
    no shadow root; style the Bootstrap carousel classes. With JS the viewport follows the current slide's height (the tallest in vertical mode), measured by a ResizeObserver; with JS off it is as tall as the tallest slide.
  - **The `play-pause` slot is gone.** The built-in button is the only play/pause control.
  - **Events:** `slide-change` is `slideChange` and `paused-change` is `pausedChange`, which carries the
    boolean: Angular `(slidechange)` / `[(paused)]`, Lit `slidechange` / `pausedchange`, React
    `onSlideChange` / `onPausedChange` (the payload, not a `CustomEvent`), Vue `@slidechange` /
    `v-model:paused`. New `animationStart` / `animationEnd` outputs.
  - **Methods:** `previous()`, `next()`, `goto(index)`, `play()`, `pause()` and `togglePaused()`.
  - The animation, orientation and event types come from `@mintplayer/ui-core/carousel` and every front
    re-exports them. `CarouselPausedChangeEventDetail` is gone.
- **Treeview is generated from one source in every front (issue #437).** It is written once in
  `@mintplayer/ui-core/treeview` (`treeviewCore`, `connectTreeview`) and compiled into all four fronts. The rows
  are a flat list of treeitems carrying `aria-level` / `aria-setsize` / `aria-posinset` (the APG's flat tree), so
  the server HTML already shows every expanded level in every framework.
  - **The root** is `.treeview` (a `div` in React and Vue, the host in Angular and Lit); the role, the name and
    the consumer's `aria-*` / `id` land on the inner `ul.treeview-tree`. `hide-borders` is the
    `.treeview-borderless` class. There is no `li[role=none]` / `ul[role=group]` nesting any more.
  - **Node template:** the `node` slot gets `{ node, ctx }` (`ctx` is the `TreeNodeRenderContext`): Angular
    `*bsTreeviewNode="let node = node"` (`BsTreeviewNodeTemplateDirective` is `BsTreeviewNodeDirective`), React
    `node={({ node, ctx }) => …}`, Vue `#node="{ node, ctx }"`, Lit `nodeRenderer: ({ node, ctx }) => …` (it was
    `(node, ctx)`).
  - **Events:** `tree-node-select` / `-expand` / `-collapse` are `nodeSelect` / `nodeExpand` / `nodeCollapse`,
    plus `nodeLoadError` (was `tree-node-load-error`): Angular `(nodeselect)`, Lit `nodeselect`, React
    `onNodeSelect` (the payload, not a `CustomEvent`), Vue `@nodeselect`. `expandedIds` and `selectedIds` are
    two-way in every front (React: `onExpandedIdsChange` / `onSelectedIdsChange`).
  - **Lazy loading** (`loadChildren`) works in every front, and the loaded children show without the consumer
    writing them back into `items` (once `items` carries them, those win). Its announcements are the `labels`
    input. `selectionMode: 'none'` no longer clears ids set from outside; it only stops the user selecting.
  - `mp-treeview.focus()` no longer forwards to the roving row; focus `[role=treeitem][tabindex="0"]`.
  - The types come from `@mintplayer/ui-core/treeview`, re-exported by every front. `TreeNodeRenderer` is gone.
- **Tree-select is generated from one source in every front (issue #437).** It is written once in
  `@mintplayer/ui-core/tree-select` (`treeSelectCore`, `connectTreeSelect`) on top of the treeview's tree
  controller, and compiled into all four fronts, so the control and the panel render on the server.
  - **The root** is `.tree-select` (a `div` in React and Vue, the host in Angular and Lit), and the consumer's
    attributes land there. `aria-label` names the combobox. `bs-tree-select` no longer has to sit inside a
    `<bs-form>`.
  - **The panel** is a native `popover="auto"`, positioned under the control and matched to its width.
    `scroll-height` is `panel-scroll-height` (`panelScrollHeight`), carried as `--mp-tree-select-panel-max-height`.
  - **Selection state:** multiple mode marks rows `aria-selected` in an `aria-multiselectable` tree; checkbox mode
    marks them `aria-checked` (`mixed` for a partial branch). The per-row checkbox `input.ts-node-check` is a
    decorative `span.ts-node-check[data-state]`. In both multi modes, clicking a leaf row or a check glyph
    toggles the node and clicking a folder row only expands it. A cascaded parent also checks children that are
    loaded later.
  - **Templates are slots:** `item`, `suggestion`, `button`, `header`, `footer`, `noResults`, `enterSearchTerm`.
    Angular `*bsTreeSelectItem="let node = node"` and so on, React `item={({ node, query }) => …}`, Vue
    `#item="{ node, query }"`, Lit `itemRenderer` / `suggestionRenderer` / `buttonRenderer` (they were
    `itemTemplate` / `suggestionTemplate` / `buttonTemplate`) and `slot="header"` children.
  - **Events:** `valueChange` (two-way `value` in every front; React `onValueChange(value)`, not a
    `CustomEvent`; Vue `v-model:value`), `selectionChange`, `openChange`, `search` and `loadError`. Methods are
    `open()` and `close()`.
  - Angular keeps its `ControlValueAccessor` (`BsTreeSelectValueAccessor`, a host directive).
  - The types and `InMemoryTreeSelectProvider` come from `@mintplayer/ui-core/tree-select`, re-exported by every
    front.
- **The datatable is generated from one source in every front (issue #437).** It is written once in
  `@mintplayer/ui-core/datatable` (`datatableCore`, `connectDatatable`) and compiled into all four fronts, so the
  table, the pager and the filter row render on the server.
  - **The root** is `div.datatable` (the host in Angular and Lit). An `aria-label` names the `<table>`.
  - **Columns are data in every front.** `DatatableColumnDef` keeps the name, label, flags and filter config;
    `format(row, rowIndex)` gives a cell's text. `cellRenderer`, `headerRenderer` and `filterRenderer` (functions
    returning a DOM `Node`) are gone.
  - **Templates are slots:** `header {column}`, `cell {row, column, rowIndex}`, `row {row, rowIndex, ctx}` (all of
    a row's data cells) and `filter {column, ctx}`. Angular `<ng-template bsDatatableRow let-row="row">` and so on,
    React `cell={({ row, column }) => …}`, Vue `#cell="{ row, column }"`, Lit `cellRenderer` / `headerRenderer` /
    `rowRenderer` / `filterRenderer` taking the slot's arguments. A slot renders every column; return
    `cellText(row, column, rowIndex)` for the columns you leave alone.
  - **Angular:** `*bsDatatableColumn`, `*bsRowTemplate`, `*bsDatatableFilterPanel`, `DatatableSettings`,
    `[(settings)]`, `[(selection)]`, `isResponsive` and `BsDatatableFetch` are gone. Use `[columns]`,
    `[(sortColumns)]`, `[(page)]`, `[(perPage)]`, `[perPageOptions]`, `pagination`, `[(selectedIds)]` (row keys;
    `(selectionchange)` also carries the rows) and `DatatableFetch` (`(req) => Promise<{ data, totalRecords }>`).
  - **Two-way inputs** are `sortColumns`, `page`, `perPage`, `selectedIds` and `expandedIds` (an array, no longer a
    `Set`). React reports them through `on<Name>Change(value)`. Outputs hand over the payload, not a `CustomEvent`,
    and are lowercased in Angular, Vue and Lit (`rowclick`, `selectionchange`, `filterchange`).
  - **A custom filter panel is per column:** `filterMode: 'custom'` renders the `filter` slot for that column, while
    the others keep their built-in `values` or `comparison` panels. The slot's `FilterContext` is a snapshot
    (`values`, `loading`, `selection`, `term`) plus the `search`, `apply`, `compare`, `clear` and `close` commands.
  - **Filter and resize panels are native `popover="auto"`**, opened by their trigger's `popovertarget`. They are no
    longer portalled into the document-root overlay.
  - The types come from `@mintplayer/ui-core/datatable`, re-exported by every front.
- **The query builder is generated from one source in every front (issue #437).** It is written once in
  `@mintplayer/ui-core/query-builder` (`queryBuilderCore`, `connectQueryBuilder`) and compiled into all four
  fronts, so the toolbar, the tree and the preview render on the server.
  - **One element.** `mp-query-group`, `mp-query-condition` and `mp-query-subquery` are gone: the tree renders as
    nested lists (`li.qb-row` with `data-row-id`, a group's children in its own `ul.qb-rows`) inside one
    `div.query-builder` root (the host in Angular and Lit). Nesting carries the depth, so `aria-level` and
    `--qb-depth` are gone; a nested `ul.qb-rows` indents and draws the guide line. An `aria-label` names the root.
  - **`view.rows` is `view.tree`.** The core's view is a tree of `QueryBuilderNode` (`kind`, `item`, `group`,
    `condition`, `subquery`, `note`, `text`, `list`, `children`), replacing the flat `QueryBuilderRow` list.
    **Migration**: walk `children` instead of reading `rows`.
  - **Custom value editors are a slot.** Mark a field `editor: 'custom'` in the schema and the condition's value
    renders through the `editor` slot with an `EditorContext` (`field`, `operator`, `value`, `disabled`,
    `onChange`). Angular `<ng-template bsQueryBuilderEditor let-ctx="ctx">`, React `editor={({ ctx }) => …}`,
    Vue `#editor="{ ctx }"`. Switch on `ctx.field.name` for several fields.
  - **Removed:** `editorRegistry`, `EditorRegistry`, `EditorFactory`, `EditorHandle`, the Angular
    `*bsQueryBuilderEditor="'field'"` structural directive, `operatorOverrides` on the element, the Lit
    contexts, and the `part=` attributes.
  - **Two-way inputs** are `query`, `rootEntity`, `selectedFields` and `sortBy`. React reports them through
    `on<Name>Change(value)` and Vue through `v-model:<name>`. Outputs hand over the payload, not a `CustomEvent`
    with a `tree` field, and are lowercased in Angular, Vue and Lit (`savequery`, `loadquery`, `deletequery`).
  - Angular keeps its `ControlValueAccessor` (`BsQueryBuilderValueAccessor`, a host directive).
  - The model, `renderExpression`, `visitTree` and `DragController` moved to `@mintplayer/ui-core/query-builder`,
    re-exported by every front.
- **`mp-input-group` is a light element (issue #437).** Like `bs-input-group`, the host is the
  `.input-group` itself: no shadow root, no slot, and its children are the group's items. It no longer
  writes `size` onto `mp-*` children, because a control in a group reads the group's classes and the
  `--mp-group-radius-*` properties itself. `part="group"` is gone. A control that renders its own `.input-group` (the date, time and phone pickers)
  takes the outer group's `sm`/`lg` size and has its two ends paired with its neighbours.
- **Code snippet is generated from one source in every front (issue #437).** It is written once in
  `@mintplayer/ui-core/code-snippet` (`codeSnippetCore`, `connectCodeSnippet`) and compiled into all four
  fronts, so it is server-rendered everywhere. With JS off it shows the escaped source: line-numbered,
  selectable, and linkable when `lineHref` is set. Highlighting follows hydration, and the copy button is
  disabled until then.
  - **Every front:** the root is `.code-snippet` (a `div` in React and Vue, the host in Angular and Lit),
    and consumer attributes land there. The markup is light DOM, so `::part()` is gone:
    - an annotation's `kind` is the row class `annotation-<kind>` (`.coverage .annotation-uncovered`);
    - Angular needs `::ng-deep` for it, Vue `:deep()`.
  - **`theme` and `wrap`** are written on the root as `data-theme` and `data-wrap`.
  - **Strings:** `copyLabel`, `lineLabel`, `regionLabel`, `copiedLabel`, `copiedAnnouncement` and
    `keymapHint` are one `labels` input (`Partial<CodeSnippetLabels>`, defaults in `CODE_SNIPPET_LABELS`).
    The copy button's visible text is `labels.copyText`.
  - **Events:**
    - `lineActivate` carries a `CodeLineActivation` (`{ line, preventDefault() }`) instead of a cancelable DOM
      event. Angular emits it as `(lineactivate)`; React passes it to `onLineActivate`.
    - The language event is `languageDetected` with the language as its payload: Angular
      `(languagedetected)`, React `onLanguageDetected`, Lit `languagedetected`.
  - **Methods:** `scrollToLine(line)` and the new `whenHighlighted()` are on every front.
  - **Removed:** source passed as slot or children content (pass `code`).
  - **Moved:** `registerLanguage`, `canHighlight` and `CodeLineAnnotation` now come from ui-core, and every
    front re-exports them. `highlight.js` is now an optional peer of `@mintplayer/ui-core`, not of
    `@mintplayer/web-components`.
  - **Lit:** `mp-code-snippet` renders in the light DOM. Row ids are per instance (`<id>-L<n>`), since
    `L<n>` would repeat across snippets on one page.
- **Theme toggle is generated from one source in every front (issue #437).** It is written once in
  `@mintplayer/ui-core/theming` (`themeToggleCore`, `normaliseModes`, `toggleEntries`) and compiled into
  all four fronts, so it is server-rendered everywhere. With JS off it renders disabled at its final size,
  and hydration enables it without moving it.
  - **Every front:** the root is `.theme-toggle` (a `span` in React and Vue, the host in Angular and Lit), and
    consumer attributes land there. The icon is a single `<path>`; a multi-path icon is joined into one.
    Invalid `modes` entries now warn once per list, not on every assignment.
  - **`color-mode.css`** reserves the box through `.theme-toggle[data-mps=theme-toggle]` instead of
    `mp-theme-toggle:not(:defined)`.
  - **Lit:** `mp-theme-toggle` renders in the light DOM (no shadow root, no `delegatesFocus`). `modes` is a
    plain property that keeps what you assign; the normalised list is no longer read back from it.
  - **Angular, React, Vue:** the `theming` entries import from `@mintplayer/ui-core/theming` rather than
    `@mintplayer/web-components/theming`, so they no longer pull in the Lit element.



- **Tile manager rebuilt on a headless core, and responsive (issue #440).** `@mintplayer/web-components`
  **3.0.0**, `@mintplayer/ui-core` 1.1.0 (new `tile-manager` entry), `@mintplayer/ng-bootstrap` 22.27.0,
  `@mintplayer/react-bootstrap` 19.26.0, `@mintplayer/vue-bootstrap` 3.27.0. `mp-tile-manager` now runs on
  `TileManagerMachine` from `@mintplayer/ui-core/tile-manager`, and the Angular, React and Vue components render
  their own DOM instead of wrapping `<mp-tile-manager>`. The board keeps one layout per column count, so a
  rearrangement at one width leaves the others alone.

  | Was | Now |
  |---|---|
  | `MintTile.position` | removed; positions live in `layouts[columnCount]`. `defaultSize?: { colSpan, rowSpan }` is new |
  | `columnCount` / `column-count` | removed; `breakpoints`, `stackBelow`, or the generated map with `maxColumns` |
  | `tilelayoutchange`, `tilepositionchange` | `layoutchange` on commit (`{ columnCount, layout, layouts, staleCounts }`), `layoutpreview` per step |
  | `tilegestureblocked` | `gestureblocked` |
  | — | `layouts` (two-way), `breakpoints`, `stackBelow`, `maxColumns`, `messages`, `columncountchange`, `resetLayout(count)`, `withoutNarrowerLayouts()` |
  | Angular `<bs-tile [position]>` + `(layoutChange)` emitting an array | `*bsTile="let tile of tiles"` with `*bsTileHeader` / `*bsTileContent`, `[(layouts)]`, `(layoutPreview)`, `(columnCountChange)` |
  | React / Vue thin wrappers around `mp-tile-manager` | native fronts: React `layouts` + `onLayoutsChange`, `renderHeader` / `renderContent`; Vue `v-model:layouts`, `#header` / `#content` slots |
  | `captureLayout()` | kept on every front; returns `{ columnCount, layout }` of what is rendered |

  `minColumnWidth`, `minRowHeight`, `gap`, `dragMode`, `resizeMode`, `animateReflow` and `label` are unchanged.
  Exactly one tile is in the tab order; `M` / `R` enter move / resize mode, `Enter` commits, `Escape` restores.
  With JavaScript disabled, Angular SSR renders every tile, placed by inline `@container` rules.

- **Typeahead rebuilt on a headless core (issue #436).** `@mintplayer/ng-bootstrap` 22.26.0,
  `@mintplayer/web-components` 2.21.0, `@mintplayer/react-bootstrap` 19.25.0, `@mintplayer/vue-bootstrap` 3.26.0,
  new `@mintplayer/ui-core` 1.0.0 (a peer of the three framework libraries). Migrating `bs-typeahead`:

  | Was | Now |
  |---|---|
  | `[suggestions]` + `(provideSuggestions)` | `[provider]="(term, { signal }) => Promise \| Observable"`, or `inMemoryTypeaheadProvider(items)` |
  | `[(searchterm)]` | `[(value)]`, `[(ngModel)]`, `formControlName`; `selectedItem()` holds the pick |
  | `(suggestionSelected)` | `(select)` |
  | `[(isOpen)]` | `(opened)` / `(closed)` |
  | `[isLoadingText]`, `[noSuggestionsText]`, `[resultsAnnouncementSingular/Plural]` | `[loadingLabel]`, `[noResultsLabel]`, `[resultsLabel]` |
  | a request per keystroke | `[debounceMs]` (200), `[minLength]` (1) |
  | `{{ suggestion.text }}` only | `*bsTypeaheadItem="let item; let term = term"`, default = `itemText(item)` |

  A superseded request is aborted through `request.signal` (an Observable is unsubscribed) and its late answer is
  never shown. With JavaScript disabled, Angular SSR now renders a real, named combobox input.
- **Removed with no remaining consumer:** `input[bsCombobox]` (`@mintplayer/ng-bootstrap/dropdown`), the
  `[bsDropdown]` `popupRole` input (a toggle's `aria-haspopup` is always `menu`), the `[bsRovingFocus]`
  `mode="activedescendant"` and `activeDescendantId()`, and `mp-dropdown-menu`'s `mode="listbox"` with its
  `DropdownMode` type, Angular `menuMode` input and React/Vue `mode` prop. `mp-dropdown-menu` is a menu only.
- **Datatable `fetch`:** the request gains `signal: AbortSignal`, aborted when the table invalidates its pages
  (sort, page size, a new `fetch`, `reload()`). Hand it to `fetch`, or unsubscribe an `HttpClient` call on abort.
  The filter panel's search quiet time is 200 ms (was 250), shared with the typeahead and tree-select.
- **`@mintplayer/web-components/light-dom`** now re-exports the style registry from
  `@mintplayer/ui-core/scoped-styles`; no consumer change.

- **Card: no more global `.card-*` / `.text-bg-*` rules (issue #432).** `@mintplayer/web-components` 2.20.0.
  - `ensureCardStylesInjected` is removed from `@mintplayer/web-components/card`. Importing the element installs
    its stylesheet; no call is needed.
  - The card's stylesheet used to style every `.card-header`, `.card-body`, `.card-title`, … on the page. It now
    styles them only inside a card. **Plain Bootstrap card markup** (`<div class="card">`) in an Angular app that
    imports `@mintplayer/ng-bootstrap/bootstrap.scss` loses the padding and caps it picked up from that leak, because
    that file does not ship Bootstrap's card partial. Use `<bs-card>`, or import `bootstrap/scss/card` yourself.
  - **React / Vue `<BsCardGroup>`** is now laid out by Bootstrap's `.card-group` (a flex row from `sm` up, with
    equal-width cards) instead of the leaked `display: block` stack. Angular's `<bs-card-group>` keeps stacking
    unless Bootstrap's card partial is imported.

- **`bs-query-builder`: the `timezone` input is removed.** It was declared but never reached the element, so
  binding it had no effect. Remove the binding.
- **Satellite libraries (found by the coverage phase 2 audit).**
  - `@mintplayer/ng-qr-code` 22.2.0:
    - The unused `height` input is removed; a QR code is square.
    - `qrCodeVersion` 1–40 now takes effect (it was silently ignored); `null`/`0` means auto.
    - Changing only the centre-image inputs now redraws, and a cached centre image survives a redraw.
  - `@mintplayer/ng-click-outside` 22.2.0:
    - The no-op `excludeBeforeClick` input is removed.
    - Re-initialising, or changing `clickOutsideEvents`, no longer leaks listeners.
  - `@mintplayer/qr-code` 1.8.0 encodes byte data with the platform `TextEncoder`, and no longer peer-depends on
    `@mintplayer/encode-utf8`. A spec proved the output identical over every code unit and surrogate pair before
    the switch, and `qr-code`'s own spec now pins the bytes.
  - **`@mintplayer/encode-utf8` is removed from the repository** and will receive no further releases. It had no
    remaining consumer. The last published version, 1.7.0, stays on npm. Use the platform `TextEncoder`
    instead.

- **The theme mode is stored in a cookie, not localStorage (issue #420).**
  - `BsThemeService` now persists the user's choice in the `bs-theme-mode` cookie (`Path=/`, `SameSite=Lax`, one
    year, `Secure` on https), so a server can render `<html data-bs-theme>` itself.
  - **Stored choices reset to `auto`.** There is no migration from localStorage.
  - `BS_THEME_STORAGE_KEY` is removed. Use `BS_THEME_COOKIE_NAME`, now exported from
    `@mintplayer/web-components/theming` and re-exported by `@mintplayer/ng-bootstrap/theming`.
  - Replace the inline localStorage pre-boot script with the shipped
    `@mintplayer/web-components/theming/bs-theme-preboot.js` (see the theming docs page). **It ships from
    `@mintplayer/web-components` only**, not from `@mintplayer/ng-bootstrap/theming/` as issue #420 proposed; an
    assets glob pointing at `node_modules/@mintplayer/ng-bootstrap/theming` finds nothing. The script is generated
    from the same helpers as the store, so it cannot drift from them.
  - Critical CSS: see the `inlineCritical` note below. The caret/knob dark variants use
    `@container style(--mp-color-mode: dark)` (measured in Chromium 151, Firefox 153, WebKit 26.5); an engine
    without custom-property style queries keeps the light icons.
- **`BsThemeService` is a thin mirror of the framework-neutral theme store** in `@mintplayer/web-components/theming`.
  Its public API (`mode`, `effectiveMode`, `setMode`) is unchanged. On the server it reads the request cookie and a
  `<meta name="bs-theme-default-mode">`, and writes `data-bs-theme` into the rendered HTML. `setMode` with an invalid
  value (outside `^[a-z0-9-]{1,32}$`) is now a no-op with a warning.
- **Dead `[data-bs-theme=dark]` rules are removed from the web components' sheets.** They could never match from
  inside a shadow root.
  - The `mp-select` caret, the query-builder value-editor caret and the `mp-checkbox` switch knob now follow the
    theme through `@container style(--mp-color-mode: dark)`.
  - This needs the `--mp-color-mode` token: `_bootstrap.scss` includes it, and React/Vue consumers add
    `@import '@mintplayer/web-components/theming/color-mode.css'`. A custom theme declares its own
    `--mp-color-mode: dark|light`.
- **Angular consumers using dark mode should set `optimization.styles.inlineCritical: false`.** The critical-CSS
  inliner prunes every `[data-bs-theme=dark]` rule, so dark users see light until the stylesheet loads.

- **The four components that mount consumer DOM render in the light DOM.** `<mp-datatable>`,
  `<mp-treeview>`, `<mp-tree-select>` and the `<mp-query-builder>` family (builder / condition /
  group / subquery) no longer attach a shadow root; their styles are scoped at build time onto a
  `data-mps` attribute instead. This is what makes a row template, node template or cell renderer
  styleable by your own CSS and by Bootstrap's utilities at all (issue #408) — inside a shadow root
  neither could reach it. **Migration**: `::part()` and `::slotted()` no longer address these
  components — use ordinary CSS, which now reaches descendants `::part()` never could; page CSS that
  broadly styles `table` / `td` / `li` / `input` now applies inside them too; `el.shadowRoot` becomes
  `el.renderRoot` (or `el.shadowRoot ?? el`), and focus assertions read the real element from
  `document.activeElement` rather than the retargeted host. If you host one of these inside your own
  shadow root, call `adoptLightStyles(this.shadowRoot)` or it renders unstyled. Full contract and
  migration table under **Styling and encapsulation** in the README.
- **`@mintplayer/web-components`**: `datatableStyles`, `treeviewStyles` and `treeSelectStyles` are
  renamed **`datatableLightStyles`**, **`treeviewLightStyles`** and **`treeSelectLightStyles`**.
  **Migration**: rename the import; the value is the same rescoped sheet.
- **`@mintplayer/web-components/query-builder`**: the family's 32 `part=` attributes are removed,
  since a light-DOM element has no parts. **Migration**: select the elements directly.

- **`@mintplayer/ng-bootstrap/code-snippet`**: `[codeToCopy]` is renamed **`[code]`**, matching the
  property it forwards to. **Migration**: rename the binding; nothing else about it changed.
- **`@mintplayer/ng-bootstrap/code-snippet`**: `(lineActivate)` now emits the
  `CustomEvent<{ line: number }>` rather than the bare line number, because the event is
  `cancelable` and a consumer routing the activation themselves needs `preventDefault()` on it.
  **Migration**: `$event.detail.line` for the number, and call `$event.preventDefault()` if you
  handle the navigation. Vue's `@line-activate` changed the same way; React was already correct.
- **`@mintplayer/web-components/code-snippet`**: the code block now follows the page's
  `data-bs-theme` instead of being permanently dark. **Migration**: pass `theme="dark"` to keep the
  old fixed-dark appearance; `theme="auto"` (the default) follows the page, `theme="light"` pins
  light.
- **`@mintplayer/web-components/code-snippet`**: highlighting is now **asynchronous** — only
  highlight.js's core is loaded up front and the grammar is fetched on demand (53.7 KB gzip →
  ~9–15 KB). The element paints escaped plain text immediately and upgrades in place.
  `updateComplete` is overridden to await the highlight, so `await el.updateComplete` still means
  "the output is on screen"; only code that reached inside the shadow root synchronously after a
  property write needs to change.

- **Datatable selection across pages (issues #422, #407).** Design and decisions in
  `docs/prd/datatable-selection.md`.
  - **`@mintplayer/web-components/datatable`**: the `mp-datatable-selection-change` event's `selectedRows` is now
    `(T | undefined)[]`, **index-aligned with `selectedIds`**, with `undefined` where a key's row was never seen (a
    key seeded without a row). Nothing is dropped any more. **Migration**: act on `selectedIds`, render from
    `selectedRows`, and narrow before use.
  - Tree parent rows: Enter now opens the row (selects, then emits `row-click`) and Space selects. Neither expands
    any more. **Migration**: expand and collapse with ArrowRight/ArrowLeft or the expander button.
  - A double-click in the checkbox cell no longer emits `row-dblclick`, in every mode.
  - The fallback key `row-${index}` on a paginated table uses the row's **global** index, so page 2 starts at
    `row-{perPage}` rather than reusing `row-0`. A stable, id-based `rowKey` is required with `fetch`.
  - The default row-checkbox name is "Select {first-cell text}" instead of "Select row N".
  - A Shift-range over rows that have not loaded yet is refused and announced, instead of selecting placeholders.
  - **`DatatableLabels` has two new required members, `selectRowNamed(label)` and `rangeIncomplete`.** A consumer
    that builds a complete `DatatableLabels` object (rather than a `Partial`) gets a type error until it adds them.
  - **`@mintplayer/ng-bootstrap/datatable`**: the `compareWith` input is removed (it was dead code). Identity is
    `rowKey`. **Migration**: delete the binding; supply a `rowKey` if rows have no `id`.
  - `bs-datatable`: when `[settings]` carries both `page` and `perPage`, the given `page` is kept (a `perPage`
    change no longer forces page 1). When the new page size leaves that page past the last page of the known row
    count, the element clamps it to the last page and reports it, so `[(settings)]` follows. **Migration**: none
    for two-way `[(settings)]`; a host with one-way `[settings]` should handle `(pageChange)`, or reset `page`
    itself.
- **Datatable column labels and resizing (issue #426).** Design and measurements in
  `docs/prd/datatable-columns-priority-nav.md`.
  - **`DatatableLabels` has seven new required members:** `resizeColumnHint`, `resizeColumnOptions(column)`,
    `narrowerColumn(column)`, `widerColumn(column)`, `columnWidth(px)`, `fitColumn` and `resetColumn`. A
    consumer that builds a complete `DatatableLabels` object (rather than a `Partial`) gets a type error until
    it adds them.
  - **Generated strings name a column by its header text when no `label` is set**, instead of by its `name`.
    This affects the resize handle, the filter trigger and panel, and the sort and filter announcements. For
    example, a header template reading "Artist" over a column named `Name` used to be announced "Resize column
    Name" and is now announced "Resize column Artist". **Migration**: none, unless a test asserts the old
    string. Set `label` (Angular `bsDatatableColumnLabel`) for an icon-only header.
  - **The first user resize freezes the layout.** All columns are pinned at their rendered widths, and the
    table takes their total as an explicit width instead of `100%`, so the dragged edge follows the pointer.
    Narrowing a column now leaves room on the right. Resetting the last user-resized column restores the
    full-width table.

### Added

- **The component compiler nests templates (issue #437).** A D10 template may call **partials**: recursive sibling
  `.view.vue` files with no manifest, folded into each front. It may also **compose** another generated element
  (`<mp-x>`) of any group, its own included, with inputs, outputs, `v-model:x` (a `ModelBinding<T>` from
  `@mintplayer/ui-core/component`) and slot content in Vue syntax. A view reaches its core for those handlers
  through `ViewArgs.api()`. The compiler options `entryModule` (per front) and `registry` decide how a composed
  child is imported. The compiler refuses an output named like a native DOM event, a cycle between groups, and a tag
  claimed twice. See `docs/prd/component-compiler-nesting-437.md`.

- **Typeahead in every framework, from one headless core (issue #436).** `@mintplayer/ui-core/typeahead`
  (`TypeaheadMachine`, `connect()`, `inMemoryTypeaheadProvider`) drives `bs-typeahead` (Angular), `BsTypeahead`
  (React: `renderItem`, controlled `value` + `onValueChange`), `BsTypeahead.vue` (`#item` slot, `v-model`) and
  the form-associated `<mp-typeahead>` (`itemRenderer`, `name`). All four share debounce (`debounceMs`, 200),
  `minLength`, an abortable `provider`, a custom row with the current term, forms binding, and the WAI-ARIA
  combobox pattern with `aria-activedescendant`.
- **`@mintplayer/ui-core` 1.0.0**: the headless foundation (`store`, `async`, `scoped-styles`, `typeahead`) that
  issue #437 will move the rest of the catalog onto.

- **Datatable column resizing, per column and by touch (issue #426).**
  - **`DatatableColumnDef.resizable`** / Angular **`bsDatatableColumnResizable`**: removes or adds one column's
    resize handle. The column's own value wins over the table-wide `resizableColumns` in either direction, and
    leaving it unset follows the table.
  - **Angular `bsDatatableColumnLabel`**: the column's name in generated accessible strings.
  - **A resize options dialog.** It opens on a tap or click on a resize handle without dragging, or on Enter,
    and offers Narrower, Wider, Fit to content and Reset. This is the single-pointer alternative to dragging
    that WCAG 2.5.7 requires. The keymap is announced on the first handle focus.
  - **A larger resize target.** The handle is now 24 px wide (WCAG 2.5.8), and 40 px on coarse pointers, with a
    resting grip line on touch devices.
- **`bs-priority-nav`: activating an item in the More menu closes it (issue #426).**
  - A link or button closes it and returns focus to More. Escape now returns focus to More as well.
  - Nested-menu triggers (`aria-haspopup` / `aria-expanded`, including inside shadow DOM), form fields and
    disabled items keep the menu open.

- **Dark mode across all three frameworks (issue #420).**
  - `@mintplayer/web-components/theming`: the framework-neutral theme core.
    - Cookie and resolution helpers: `readThemeCookie`, `isValidThemeMode`, `resolveServerTheme`,
      `injectThemeAttribute`.
    - A browser-only store (`getBsThemeStore`, `configureBsTheme`) that follows `prefers-color-scheme` live in
      `auto` and syncs across tabs through `BroadcastChannel`.
    - `color-mode.css`.
    - The generated no-flash `bs-theme-preboot.js` (ES5, under 1 KB).
  - `<mp-theme-toggle>` / `<bs-theme-toggle>` / `BsThemeToggle` (React, Vue): a cycle button driven by a `modes`
    array of `{ mode, label, announcement, icon }`. Consumers localize by overriding the strings, and can pass 2–5
    modes. The accessible name is the next action; the current state is its description, and each change is
    announced.
  - `provideBsTheme({ cookieDomain })` (Angular). `useBsTheme()` (React, Vue).
- `@mintplayer/web-components/light-dom`: `installLightStyles` / `adoptLightStyles` /
  `scopedHtml` / `stampScope` — the light tier's public machinery. `adoptLightStyles` is the one a
  consumer needs: it mirrors the light-tier sheets into a shadow root that hosts one of these
  components.
- `@mintplayer/web-components/light-dom/ssr`: `injectMpLightStyles(html)` inserts the light tier's
  stylesheets into a server-rendered page's `<head>`, so those components are styled with
  JavaScript disabled. Compose it with the Declarative Shadow DOM injectors, as the demo's
  `server.ts` does.
- `@mintplayer/web-components/query-builder`: `queryBuilderLightStyles`, `queryConditionLightStyles`,
  `queryGroupLightStyles` and `querySubqueryLightStyles` are now public, matching the other
  light-tier components — needed to adopt them into a shadow root.
- `@mintplayer/vue-bootstrap`: `BsDatatable` gains `rowRenderer`; `BsTreeview` gains `nodeRenderer`
  and `iconResolver`. Angular and React already exposed these, so the renderer APIs were
  unreachable from Vue.

- `@mintplayer/web-components/code-snippet`: `<mp-code-snippet>` becomes the workspace's code
  **viewer** rather than only a snippet. Adds `line-numbers`, `start-line`, `wrap`, `theme`,
  `annotations` (sparse per-line markers with an opaque `kind`, up to two gutter labels and a
  screen-reader description), `active-line`, `lineHref`, `scrollToLine()`, a cancelable
  `line-activate` event, and localisable `label` / `region-label` / `line-label` / `copied-label` /
  `copied-announcement` / `keymap-hint`. Line links carry a roving tabindex, so a 2 000-line
  listing is one tab stop rather than 2 000. Annotation colours are the consumer's:
  each row is exposed as `::part(annotation-<kind>)` and the component ships no colour for any
  kind. A fragment-only `lineHref` is resolved against the current URL, so the obvious `#L7`
  cannot navigate away from an Angular route via `<base href>`. Wrapped for all three frameworks.
- `@mintplayer/ng-bootstrap/code-snippet`: the Angular wrapper now forwards host `aria-*`, `role`,
  `id` and `tabindex` onto the `mp-*` element, where they reach the accessibility tree.
- **Localizable strings and new inputs (coverage phase 2 audit):**
  - `bs-resizable` `[labels]`: physical-side labels for the resize glyphs, driven by `Directionality`, so "start"
    is no longer called "left" in RTL.
  - `bs-file-upload`: `[fileAddedAnnouncement]`, `[filesAddedAnnouncement]` and `[progressLabel]` replace
    hard-coded English.
  - `bs-timeline` `[activatable]` and `mp-timeline` `activatable`: `(itemClick)` without `selectable` is now
    keyboard-operable.
  - `mp-dropdown-menu` reads an item's value from a documented `dropdownValue` property first (typed by
    `DropdownItemElement`), then `data-value`, then `value`. All three `BsDropdownItem` wrappers use it, so object
    and string values now reach the `select` event intact. Before, `<li>.value` coerced them to 0.
  - Vue `useBsTheme()` returns an idempotent `stop()`, for use outside an effect scope. Inside a scope it is called
    automatically.
- **Behaviour change:** `mp-datetime-picker` now closes on every pick, which is what it already did in practice.
  Pick events fire once instead of three times, and the inner pickers' events no longer leak out of the host.
- **Coverage phase 2:** thousands of behavioural specs across every library, the `tools/` scripts and the API.
  See `docs/prd/test-coverage.md` §10.
- **Datatable selection across pages (issues #422, #407).**
  - The selection survives server paging, sorting, `perPage` changes, virtual-scroll windows and re-fetches: the
    element remembers the row of every selected key, and a re-fetched row replaces the remembered one.
  - `selectionMode="checkbox"`: multi-select through the checkbox column only. A row click (any modifiers) only
    emits `row-click`, a right-click does not select, the whole checkbox cell toggles (`cursor: pointer`), Enter
    opens and Space toggles. There is no Shift-range.
  - A settable `selectedRows` on `mp-datatable`: it replaces the selection, deriving the keys through `rowKey`, and
    remembers rows that are not loaded. It emits no event, and an unchanged push costs nothing.
  - `reload({ resetPage? })` re-queries `fetch` for the current state and keeps the selection.
    `applyFetchState({ fetch, sortColumns, page, perPage })` applies several of those as one request. Re-assigning
    the same `fetch`, or a structurally equal `sortColumns`, is a no-op.
  - `rowLabel: (row) => string` names each row checkbox ("Select {label}"), falling back to the first cell's text,
    then the row number. Localized through the new `selectRowNamed` label.
  - `aria-multiselectable="true"` on the grid in `multiple` and `checkbox` modes.
  - Assigning `labels` now re-renders the table, so a language switch renames everything at once.
  - Wrappers: Angular gains `[rowLabel]`, `reload()` and the `'checkbox'` mode, and `[(selection)]` keeps the
    host's row objects by key. React gains `selectedRows` (pushed only when its reference changes; memoise it) and
    `rowLabel`. Vue gains `selectedRows` (a one-way seed), `rowLabel` and `defineExpose({ el, reload,
    applyFetchState })`.

### Fixed

- **Angular SSR renders a generated component's bound two-way inputs (issue #437).** A generated Angular
  component used to seed its core from its inputs in the constructor, before Angular had bound them. On the client
  the next change detection corrected that, but the server rendered the default (`[(count)]="5"` rendered `0`) and
  the client then patched it after hydration. Seeding now happens at the first change detection, so the server
  renders the bound value.

- **`<bs-badge>` text contrasts with its background (issue #434).**
  - The badge painted `bg-{color}`, which sets only the background, so its text stayed `.badge`'s white: 1.63:1 on
    `warning`, 1.96:1 on `info` and 1.05:1 on `light`, below WCAG AA (4.5:1). It now paints `text-bg-{color}`, the
    same background with the text colour Bootstrap's `color-contrast()` picks: black on warning, info and light,
    white as before on the other theme colours. That text colour is fixed at build time, so a theme-coloured badge
    reads the same in light and dark mode.
  - `body`, `white` and `transparent` have no `text-bg-*` in Bootstrap and rendered white on white (1:1). They now
    pair the background with a text utility, as `<bs-card [color]>` colours them: `bg-body text-body`,
    `bg-white text-black` and `bg-transparent text-reset`. `body` and `transparent` follow the theme, because their
    background does.
  - `text-bg-*` sets `color` with `!important`: a consumer rule that recoloured badge text now needs `!important` too.

- **Loading `<bs-card>` / `<mp-card>` no longer blanks every `.text-bg-*` on the page (issue #432).**
  - The card injected an unscoped stylesheet that re-shipped Bootstrap's `.text-bg-*` utilities with an invalid
    `RGBA(#hex, var(--bs-bg-opacity, 1)) !important` value. It computed to transparent and, coming later in the
    cascade, overrode Bootstrap's own rule for every badge and coloured element on the page, in light and dark
    mode. The copy is gone; the page's Bootstrap utilities apply again.
  - The card's stylesheet is now installed through the shared light-style registry, with every rule anchored on
    `mp-card`, so it cannot reach anything outside a card.
  - **The body text of a filled colour card follows its colour.** `<bs-card [color]>` set the card's text colour
    but not `--mp-card-color`, which the body and title read, so they kept the page body colour: invisible on
    `dark` (1:1) and below AA on `primary` / `danger`.

- **Datatable (issue #426).**
  - **Phantom horizontal scrollbar.** Measured column widths were rounded up, so columns that fitted
    overflowed by up to 1 px each. They are now rounded down.
  - **Columns keep fitting after measurement.** The fitted widths are re-fitted when the container narrows or
    a classic vertical scrollbar appears, down to 75 %; below that the table scrolls.
  - **Column resizing on touch devices (Android).** The handle had no `touch-action`, so the browser took
    the drag as a scroll and cancelled the resize after a few pixels.
  - **The sort arrows no longer swallow clicks** 12–24 px from the right edge of a sortable header.
  - **A right- or middle-click on a resize handle** no longer starts a resize.
- **Found and fixed while raising coverage** (each pinned by a spec; full register in `docs/prd/test-coverage.md`
  §10.6):
  - **query-builder:** drag-and-drop never changed the tree, dropping into a sub-query didn't work, and value
    editors lost edits and were never style-scoped.
  - **scheduler:**
    - `selectedRange` returned the drag preview.
    - A `touchstart` listener leak, and `touchcancel` never ended an armed drag.
    - A re-attached scheduler rendered an empty grid.
  - **dock:** a floating window's intersection handle resized the docked splitter at the same position.
    `setPointerCapture` failures lost the resizing state, and a zero-size move wiped the stored ratios.
  - **tile-manager:** a zero-size cell hung the main thread in `pack()`.
  - **splitter:**
    - `minPanelSize` read NaN.
    - Removing the splitter mid-drag left it resizing forever.
    - A reconnected splitter lost its observers.
  - **Date/time/datetime pickers:** fired each pick three times.
  - **multi-range:** divided by a zero-size track.
  - **Ribbon:** the contextual band colour parsed only 6-digit hex.
  - **Carousel, swiper and signature-pad:**
    - Carousel: slides became focusable after a reconnect.
    - Swiper: one-slide wrap showed a blank cell.
    - Signature-pad: mutated the data it had already emitted.
  - **Angular wrappers:**
    - Stale cached views after a template swap (treeview, datatable).
    - `bs-select` never marked its form control touched.
    - Dropdown and context-menu overlays leaked on destroy.
    - The tab-control server render had no page content.
    - Offcanvas/modal dispose timers couldn't be cancelled.
    - `bs-scheduler` lost a date set together with `view`.
    - `bs-timeline` mis-keyed numeric and id-less items.
    - The tooltip overwrote `aria-describedby`.
    - `enum.service` dropped members of string and mixed enums.

- **Dark mode colours (issue #420).** Hard-coded light values are replaced with `--bs-*` tokens in:
  - the scheduler scrollbar and greyed slots
  - the query-builder toolbar buttons
  - the datatable and treeview hover
  - the code-snippet "Copied!" label
- **Forced colours:** the select caret, switch knob and accordion chevron stay visible in forced-colours mode.
- **Calendar:** the month header gets its 40px height, borders and background back. This was a regression from #393.
- **Packaging:** `@mintplayer/web-components` now actually ships `custom-elements.json`. It was missing from the
  2.16.0 tarball, because the asset copier skipped gitignored files.
- **Datatable selection (issues #422, #407).**
  - Selected rows that left the loaded data were silently dropped from `selectedRows`, and the Angular wrapper then
    pushed the shorter list back down, wiping the element's own keys.
  - K1: `resolveRows` keyed rows with index `-1`, so every id-less row became `row--1` and `selectedRows` was
    always empty for them.
  - K2: paginated tables used page-relative fallback keys, so `row-0` named a different row on every page.
  - K3: the Angular selection effect passed the selection-array index to `rowKey`.
  - K4: the Angular wrapper's `row-${index}` fallback key was unstable across pages. A stable `rowKey` is now
    documented as required with `[fetch]`, and the element warns once when a selectable or `fetch` table has rows
    without an `id` and no custom `rowKey`.
  - K5: `compareWith` was dead code (removed, see Breaking).
  - K6: switching `selectionMode` to `'none'` cleared the selection without an event, leaving wrapper models stale.
  - K7: a Shift-range selected `__placeholder-*` keys, and silently fell back to a plain select when its anchor had
    scrolled out of the rendered window.
  - #407: an unchanged `fetch` or `sortColumns` re-assignment restarted the load, and the Angular wrapper's two
    forwarding effects could split one settings change into two requests.
  - React: `@lit/react` re-assigns every property on every render, so with the replacing `selectedRows` setter any
    unrelated re-render reverted the user's clicks. `selectedRows` is now pushed only when its reference changes.
  - Vue: a one-way `selectedIds` (and `expandedIds`) was re-pushed on every unrelated prop change, reverting the
    user's clicks and overriding a `selectedRows` seed. Each is now pushed on mount and on its own change only.
  - Angular: a host's fresher row object for an already-selected key was never pushed (only key changes were), so
    the next event reported the element's stale copy (a stale etag). Restoring an earlier emitted selection after
    a clear was mistaken for an echo and ignored.
  - `mp-datatable`: `selectedIds` treated `['a', 'a']` as equal to `{a, b}` (a length check), and a key set while
    its row was loaded reported `undefined` once that page was gone.

### Removed

- **`ngx-highlightjs`** is gone from the workspace. The Angular demo had been loading the full
  highlight.js library through it *in addition to* the copy the web component already carried,
  plus a third copy of the a11y-dark theme as its own style bundle. `highlight.js` is now an
  explicit dependency rather than a transitive one.

### Added

- `@mintplayer/ng-bootstrap/file-manager`: new package. `<bs-file-manager>` + `<mp-file-manager>` provide a Syncfusion-style file-browser composing `mp-splitter` + `mp-treeview` (with `hide-borders`) + `mp-datatable`. v1 ships: tree + grid + breadcrumb navigation, single/multi selection (Ctrl/Shift modifiers), file operations (rename via F2, delete via Del, new folder via Ctrl+Shift+N, cut/copy/paste via Ctrl+X/C/V), search, sort, list/icons view-mode toggle, and an OS file-drop overlay (`[allowUpload]`) that emits an `(uploadRequest)` event with `File[]` + target folder. Consumer mutates `[nodes]` in response to `(operation)` events — the component never self-mutates. See issue #329.
- `@mintplayer/ng-bootstrap/web-components/treeview`: new Lit web component (`<mp-treeview>`). Data-driven `TreeNode[]` model, recursive rendering, ARIA tree pattern with roving tabindex, keyboard nav (arrow keys + Home/End/Enter/Space), `hide-borders` attribute, `iconResolver` for `iconKey` → SVG, and a `nodeRenderer` callback (Angular wrapper exposes this as the `*bsTreeviewNode` structural directive).
- `@mintplayer/ng-bootstrap/web-components/datatable`: new Lit web component (`<mp-datatable>`). Property-driven columns with `cellRenderer` callbacks, multi-column sort via shift+click, single/multi selection (range-extend on shift, additive on ctrl), row click/dblclick/contextmenu events, pointer-driven resizable columns, pagination footer, built-in scroll-position-driven virtual scroll (`virtualScroll` + `itemSize`), and a `rowRenderer` callback (Angular wrapper bridges `*bsRowTemplate` into this). ARIA `role="grid"`. Pure helpers `computeNextSort(current, columnName, shiftKey)` + `sortRows(rows, sortColumns)` exported for reuse.
- `@mintplayer/ng-bootstrap/web-components/file-manager`: new Lit web component (`<mp-file-manager>`) implementing the file-manager listed above, including a right-click context menu and `ContextMenu` / `Shift+F10` keyboard equivalents.
- `@mintplayer/ng-bootstrap/web-components/pagination`: new Lit web component (`<mp-pagination>`). Mirrors the existing `bs-pagination` API (`pageNumbers`, `selectedPageNumber`, `numberOfBoxes`, `showArrows`, `size`, `aria-label`) and is now what `bs-pagination` renders under the hood. Responsive: when `number-of-boxes` would exceed the available width, the WC clamps to whatever fits the host, so the same pagination renders correctly on both mobile and desktop without consumer-side breakpoints. Pure helper `buildPaginationItems(pages, current, budget)` exported for reuse. `bs-pagination` itself remains source-compatible.
- `@mintplayer/ng-bootstrap/datatable`: `[fetch]` now drives the WC's built-in pagination footer (powered by `<mp-pagination>`) — previously the footer was suppressed in fetch mode. The wrapper forwards `totalRecords` to the WC so page counts reflect the server total instead of the in-memory slice. Virtual scroll + `[fetch]` now preloads every page through the fetcher up front (in-memory virtualizer); the WC's scroll viewport falls back to `var(--mp-datatable-virtual-max-height, 480px)` so the table actually scrolls when the host isn't explicitly sized.

### Breaking

- **`@mintplayer/ng-bootstrap/treeview`**: `BsTreeviewItemComponent` removed; content-projected `<bs-treeview-item>` API replaced by data-driven `[items]: TreeNode[]` input. Custom per-node rendering is now provided via the new `*bsTreeviewNode` structural directive (with `$implicit: TreeNode` context). **Migration**: collect your treeview content into a nested `TreeNode` array (`{ id, label, iconKey?, children?, meta? }`) and bind `<bs-treeview [items]="treeNodes()">` with an inline `<ng-template bsTreeviewNode let-node>` rendering arbitrary content (icons, labels, badges). Two-way bindings `[(expandedIds)]` and `[(selectedIds)]` control state; `(nodeSelect)` / `(nodeExpand)` / `(nodeCollapse)` events replace per-item click handlers.
- **`@mintplayer/ng-bootstrap/datatable`**: column-projection contract changed. `*bsDatatableColumn` (header template + `bsDatatableColumnSortable`) and `*bsRowTemplate` (per-row `<td>` template) are preserved and now bridge into the new Lit web component (`<mp-datatable>`) via Angular `EmbeddedViewRef`s — the same pattern the query-builder uses to host Angular editors inside its Lit host. Programmatic `[columns]: DatatableColumnDef[]` with `cellRenderer` callbacks is also supported. **Migration**: existing template-directive consumers work unchanged; `DatatableSortBase`, `ColumnDef`, and `SyntheticColumn` are no longer exported (use the new `DatatableColumnDef<T>` type), and `computeNextSort` is exposed as a pure helper. The CDK virtual scroll implementation is replaced by a built-in scroll-position-driven virtualizer (no `@angular/cdk` peer dep); behaviour and `[virtualScroll]` / `[itemSize]` inputs are preserved.

- **`@mintplayer/ng-bootstrap/navbar`**: `BsNavbarComponent` has been modernized to align with Bootstrap 5.3's `data-bs-theme` pattern.
  - The component no longer emits the deprecated `.navbar-light` / `.navbar-dark` classes. It now writes `[data-bs-theme="light|dark"]` directly on the rendered `<nav>` element, and emits a `bg-{color}` utility class to set the background.
  - The `[color]` input has been widened from `Color | null` to `Color | string | null`. String values (e.g. `[color]="'body-tertiary'"`) emit a `bg-{value}` class and allow the page theme to cascade (no `data-bs-theme` override).
  - **Migration**: This change only affects consumers with custom CSS keyed off the deprecated `.navbar-light` / `.navbar-dark` classes (no such usage in this repo). See `docs/issue_324_navbar_modernize_PRD.md` for the full mapping table.

### Added

- `@mintplayer/ng-bootstrap/theming`: new package for managing Bootstrap color modes.
  - **`BsThemeService`**: a signal-first, SSR-safe service that owns the user's color-mode choice and writes the resolved value to `<html data-bs-theme>`.
  - **API**: `setMode('auto' | 'light' | 'dark' | string)`. Signals: `mode` (authored), `effectiveMode` (resolved).
  - **`auto` resolution**: resolves to `light` / `dark` via `matchMedia('(prefers-color-scheme: dark)')` and live-updates when the OS preference changes.
  - **Persistence**: persists to `localStorage` under `BS_THEME_STORAGE_KEY` (`'bs-theme-mode'`).
  - **Custom variants**: the string-typed mode admits user-defined themes — ship your own `[data-bs-theme="sepia"] { … }` block and call `setMode('sepia')`.
  - **SSR-safe**: no `localStorage` / `matchMedia` / DOM access on the server.
  - **No-flash reload**: pair with a tiny inline pre-boot `<script>` in `<head>` to apply the persisted mode before any CSS evaluates, preventing a light-mode flash on reload.
  - See `/additional-samples/theming` in the demo for the full recipe (build-time SCSS overrides, runtime `--bs-*` mutation, mode switching, per-component variable reference, custom variants, SSR integration).
- `@mintplayer/ng-bootstrap/scheduler`: keyboard grid navigation across day/week/timeline views. Cells expose `role="gridcell"` with roving tabindex and a deterministic id. Arrow keys walk cells (week: up/down = time, left/right = day; timeline: left/right = time, up/down = resource), Shift+Arrow extends a linear time-range selection that crosses day boundaries on week view, Home/End jump to the column extremes, Ctrl+Home/End to the view extremes, PageUp/PageDown advance one period. Enter on a cell or selection emits `event-create` with the same payload mouse drag-create produces. Every event is in the Tab order; Enter on a focused event enters move-mode (`aria-pressed="true"`), where Arrow keys nudge time/resource, Shift+Arrow resizes the end edge (Alt+Shift the start edge), week-view Shift+ArrowLeft/Right resizes across day boundaries, Enter commits, Escape reverts. The focused cell and the move-mode preview auto-scroll into the viewport. Live-region announcements narrate each transition. See `docs/prd/scheduler-keyboard-grid-nav.md`.
- `@mintplayer/ng-bootstrap/navbar`: `BsNavbarTriggerDirective` (`[bsNavbarTrigger]`) for dropdown trigger anchors. Replaces `routerLink` + `routerLinkActive` on triggers — drives the active CSS class via `Router.events` without RouterLink's programmatic-navigate behaviour. Use `routerLink` on the items INSIDE the dropdown for actual navigation; use `bsNavbarTrigger` on the trigger anchor that opens the dropdown.
- `@mintplayer/ng-bootstrap/navigation-lock`: `provideNavigationLockRouter(routes, ...features)` — single-call router setup that wraps your routes in the required `canMatch: [bsNavigationLockGuard]` and applies `canceledNavigationResolution: 'computed'`. Use in place of `provideRouter(...)` to avoid having to remember both pieces.
- `@mintplayer/ng-bootstrap/tile-manager`: new package. `<bs-tile-manager>` + `<bs-tile>` + `<bs-tile-header>` for dashboard-style grids of self-similar tiles users can drag, resize, and rearrange. Tiles push neighbours out of the way with vertical-compact gravity in real time; the layout serializes to a stable typed `TileLayoutSnapshot` you can persist and restore by re-binding `[(position)]` per tile. Header-only drag by default; touch arms via 600 ms long-press (mirrors `BsDock`); `prefers-reduced-motion: reduce` bypasses the FLIP animator. Architecture mirrors `BsDock`: a Lit web component (`<mp-tile-manager>`) owns gesture mechanics, the packer, FLIP animations, keyboard mode, and shadow-DOM rendering; the Angular wrappers marshal inputs and re-emit custom events as Angular outputs. See `docs/prd/tile-manager.md`.
- `@mintplayer/ng-bootstrap/checkbox`: new package. `<bs-checkbox>` exposes a narrowed `type` union (`'checkbox' | 'switch' | 'toggle_button'`) and a `[bsCheckboxGroup]` directive. Single-mode binds a `boolean`; multi-mode binds `string[]` via `[bsCheckboxGroup]` (the group carries the shared `[name]` with `[]` suffix auto-applied). Group resolution is "explicit `[group]` input wins over DI-injected ancestor", so non-adjacent layouts (e.g. one checkbox per table row) work via `#g="bsCheckboxGroup"` + `[group]="g"`. Implements `ControlValueAccessor` end-to-end for `[(ngModel)]` and `[formControl]`. ARIA host→input mirroring preserved. See `docs/prd/toggle-button-split.md`.
- `@mintplayer/ng-bootstrap/radio`: new package. `<bs-radio>` exposes a narrowed `type` union (`'radio' | 'toggle_button'`) and a `[bsRadioGroup]` directive. Radios participate in form binding only through the group: `[name]` lives only on `[bsRadioGroup]`, and `BsRadioValueAccessor` is hosted there too — `[formControl]` / `[(ngModel)]` bind on the group element and the form value is a single `string`. Same explicit-vs-ancestor `[group]` resolution as `<bs-checkbox>` for non-adjacent layouts. See `docs/prd/toggle-button-split.md`.

### Breaking

- **`<bs-toggle-button>` split into `<bs-checkbox>` and `<bs-radio>`** (see `docs/prd/toggle-button-split.md`). The single god-component that fronted five `type` values is replaced by two per-family components with narrowed type unions.

  Removed from `@mintplayer/ng-bootstrap/toggle-button`:
  - `BsToggleButtonValueAccessor`
  - `BsToggleButtonGroupDirective`
  - `BsCheckStyle` (type union)

  `BsToggleButtonComponent` survives at the same import path but is now a styling-wrapper-only component with no inputs and no behaviour. The wrapper carries the Bootstrap `form-check` SCSS via `:host ::ng-deep` and is consumed internally by `<bs-checkbox>` / `<bs-radio>` templates — consumers should not import it directly.

  Migration table:

  | Before | After |
  | --- | --- |
  | `<bs-toggle-button>` (default checkbox) | `<bs-checkbox>` |
  | `<bs-toggle-button type="checkbox">` | `<bs-checkbox type="checkbox">` |
  | `<bs-toggle-button type="switch">` | `<bs-checkbox type="switch">` |
  | `<bs-toggle-button type="toggle_button">` | `<bs-checkbox type="toggle_button">` |
  | `<bs-toggle-button type="radio">` | `<bs-radio>` inside `<div bsRadioGroup name="x">` |
  | `<bs-toggle-button type="radio_toggle_button">` | `<bs-radio type="toggle_button">` inside `<div bsRadioGroup name="x">` |
  | `[bsToggleButtonGroup]` (checkbox group) | `[bsCheckboxGroup]` (also gains a shared `[name]` input) |
  | `[bsToggleButtonGroup]` (radio group) | `[bsRadioGroup]` (carries the shared `[name]` input; per-radio `[name]` removed) |
  | `formControlName="x"` on every `<bs-toggle-button type="radio">` | `formControlName="x"` on the `[bsRadioGroup]` element (form value: single `string`) |
  | `formControlName="x"` on every grouped `<bs-toggle-button type="checkbox">` | `formControlName="x"` on the `[bsCheckboxGroup]` element (form value: `string[]`) |
  | `import { BsCheckStyle } from '@mintplayer/ng-bootstrap/toggle-button'` | `BsCheckboxType` from `/checkbox` or `BsRadioType` from `/radio` |

  Mode-aware `[name]` resolution:
  - Radio always-grouped: name on `[bsRadioGroup]` only.
  - Checkbox standalone (single-mode): name per-instance on `<bs-checkbox>`; binds `boolean`.
  - Checkbox grouped (multi-mode): name on `[bsCheckboxGroup]`, `[]` suffix auto-applied; per-instance `[name]` is ignored. Binds `string[]`.

  Demo routes: `/forms/toggle-button` is removed. Two new routes replace it: `/forms/checkbox` and `/forms/radio`, each demonstrating its type variants and group behaviour. No redirect.

- **Scheduler keyboard model rewrite** (see `docs/prd/scheduler-keyboard-grid-nav.md`).
  - `event-click` custom event renamed to `event-selected`. Fires on mouse click and on keyboard Tab landing on an event ("click" no longer described the trigger). `event-dblclick` is unchanged. Migrate listeners; no shim provided.
  - `BsSchedulerComponent`: Angular output `(eventClick)` → `(eventSelected)`; type `SchedulerEventClickEvent` → `SchedulerEventSelectedEvent`. Type `EventClickDetail` (scheduler-core) → `EventSelectedDetail`.
  - Move-mode entry key: `M` on a focused event is removed. Press `Enter` on the focused event instead.
  - Bare letter shortcuts `T` / `Y` / `M` / `W` / `D` are removed. Use `Alt+T` (today) / `Alt+Y` (year) / `Alt+M` (month) / `Alt+W` (week) / `Alt+D` (day). Frees single letters for future input surfaces inside the scheduler.
  - Bare `ArrowLeft` / `ArrowRight` no longer navigate periods (they now walk cells inside the grid). Use `PageUp` / `PageDown` for previous/next period. Header prev/next buttons still work.
  - Events lose their roving tabindex — every event is now `tabindex="0"` so Tab walks through them in document order.

- **Navigation-lock redesign** (#169, see `docs/prd/navigation-lock-redesign.md`).
  The opt-in directive + per-route guard pair is replaced by a global
  `CanActivateChild` guard backed by a registry service. Migration:

  1. Drop `canDeactivate: [BsNavigationLockGuard]` from any route definition.
  2. Drop `implements BsHasNavigationLock` and any
     `viewChild.required<BsNavigationLockDirective>('navigationLock')` from
     your page component.
  3. Drop the `#navigationLock="bsNavigationLock"` template ref unless you
     use it for your own logic.
  4. Move `[bsNavigationLock]` from an empty `<ng-container>` onto a
     meaningful element (the `<form>`).
  5. Replace your `provideRouter(routes, ...features)` call with
     `provideNavigationLockRouter(routes, ...features)`. The helper wraps
     your routes in the required `canMatch: [bsNavigationLockGuard]` and
     applies `withRouterConfig({ canceledNavigationResolution: 'computed' })`
     (needed for popstate-cancel to restore the history stack).

     If your router setup is too custom for the helper, wire it manually:
     wrap your top-level routes in
     `{ path: '', canMatch: [bsNavigationLockGuard], children: [...] }`
     (use **`canMatch`**, not `canActivateChild` — `canActivateChild` fires
     once per descendant activation, so deep destinations would prompt N
     times) and add
     `withRouterConfig({ canceledNavigationResolution: 'computed' })` to
     your `provideRouter(...)` call.

  API delta:
  - REMOVED: `BsNavigationLockGuard` (class), `BsHasNavigationLock`
    (interface).
  - ADDED: `bsNavigationLockGuard` (functional `CanMatchFn`),
    `BsNavigationLockService`, `BsNavigationLockHandle`,
    `BS_NAVIGATION_LOCK_CONFIRM`, `provideNavigationLock`,
    `provideNavigationLockRouter`.
  - CHANGED: `BsNavigationLockDirective.requestCanExit()` returns
    `boolean | Promise<boolean> | Observable<boolean>` (was
    `Promise<boolean>`); the `canExit` function-shape input now accepts an
    optional `reason: string` argument.

  Note: `canMatch` returns false to indicate non-match; if your app has a
  wildcard `**` route the navigation may fall through there instead of
  staying put. If that's a concern, also apply `bsNavigationLockGuard` to
  the wildcard route.

### Fixed

- `@mintplayer/ng-bootstrap/dock` (#326): `renderIntersectionHandles` no longer pairs splitter dividers from different dock layers, so coincidental on-screen alignment between a docked splitter and a floating pane's splitter (or between two floating panes) no longer produces a phantom intersection grip between unrelated splitters.
- `@mintplayer/ng-bootstrap/datatable`: `<bs-datatable>` rows now span the full host width even when the sum of pinned column widths is narrower than the host. A trailing `.bs-datatable-spacer` cell (`aria-hidden`) is appended to every header and body row and absorbs the leftover under `table-layout: fixed`, so pinned widths stay frozen instead of being redistributed across data columns. The CSS pairs `width: max-content; min-width: 100%` on the table (the inverse order — `width: 100%; min-width: max-content` — triggers a layout loop with CDK's virtual-scroll content wrapper). The bs-table wrapper also gets an unconditional `overflow-x: auto` in resizable mode, so a table whose pinned widths exceed the host scrolls horizontally inside its own region instead of expanding the page body. The footer `<td colspan>` was bumped by 1 to span the spacer.

## [21.18.0] — 2026-04-27

### Breaking

- `BsSearchboxComponent.suggestionTemplate`, `.enterSearchtermTemplate`, and
  `.noResultsTemplate` are now `WritableSignal<TemplateRef<…> | undefined>`.
  Code that wrote `component.suggestionTemplate = ref` (or either of the
  others) must call `.set(ref)`. The `BsSuggestionTemplateDirective`,
  `BsEnterSearchTermTemplateDirective`, and `BsNoResultsTemplateDirective`
  do this transparently — only direct assignments to the fields are
  affected.
- `BsCarouselComponent.imageCounter` is now a `WritableSignal<number>`.
  `BsCarouselImageDirective` reads it via `imageCounter()` and updates
  via `.update(c => c + 1)`, preserving the original post-increment
  semantics (each image still gets a unique sequential `id`). External
  code that read or wrote the field directly must adopt the same pattern.
- `BsCarouselComponent.animationsDisabled` is now a `WritableSignal<boolean>`.
  Read access changes from `cmp.animationsDisabled` to
  `cmp.animationsDisabled()`. The host binding `'[@.disabled]'` was
  updated to `'animationsDisabled()'` accordingly. No external writers
  exist in the repo.

## [21.17.0] — 2026-04-27

### Breaking

- `BsSelect2Component.itemTemplate` and `BsSelect2Component.suggestionTemplate`
  are now `WritableSignal<TemplateRef<T> | undefined>`. Code that wrote
  `component.itemTemplate = ref` or `component.suggestionTemplate = ref` must
  call `.set(ref)`. The `BsItemTemplateDirective` and
  `BsSuggestionTemplateDirective` do this transparently — only direct
  assignments to the fields are affected.

### Fixed

- `BsSuggestionTemplateDirective`'s spec mock declared `itemTemplate`
  (a copy-paste from the item-template spec) instead of
  `suggestionTemplate`. Plain assignment masked the bug at runtime; the
  signal migration surfaced it. Now declares `suggestionTemplate`.

## [21.16.0] — 2026-04-27

### Breaking

- `BsFileUploadComponent.fileTemplate` is now a
  `WritableSignal<TemplateRef<FileUpload> | undefined>`. Code that wrote
  `component.fileTemplate = ref` must now call
  `component.fileTemplate.set(ref)`. The `BsFileUploadTemplateDirective` does
  this transparently — only direct assignments to the field are affected.

## [21.15.0] — 2026-04-27

### Breaking

- `BsNavbarItemComponent.hasDropdown` is now a `Signal<boolean>` derived from
  `dropdowns()` (a `computed`, not a `WritableSignal`). Read access changes
  from `cmp.hasDropdown` to `cmp.hasDropdown()`. Code that wrote to
  `hasDropdown` should drop the write — the value is now derived
  automatically. The previous manual update in
  `DropdownToggleDirective.ngAfterContentInit` has been removed.
- `BsSignaturePadComponent.isDrawing` is now a `WritableSignal<boolean>`. Read
  access changes from `cmp.isDrawing` to `cmp.isDrawing()`. No external
  writers exist in the repo.

### Fixed

- `BsNavbarDropdownComponent` now disposes its `OverlayRef` in `ngOnDestroy`.
  Previously the overlay (and any attached DOM portal) leaked when the
  component was destroyed.
- `BsSignaturePadComponent.onPointerEnd` no longer keeps `isDrawing` stuck at
  `true` when `context` is unavailable. The flag was set unconditionally in
  `onPointerStart` but only reset when `context` was non-null, leaving the
  pad in an inconsistent "still drawing" state under SSR/getContext failure.

### Internal

- Added `readonly` to fields that are initialized once and never reassigned
  across the carousel, datepicker, file-upload, spinner, timepicker, select2,
  signature-pad, and typeahead components. No public API change.
- Converted the private boolean flags `isAttached` and `isDestroyed`
  (`BsNavbarDropdownComponent`) and `isPointerDown` (`BsColorWheelComponent`)
  to signals. These fields are `private`, so no external API change.

## [21.14.0] — 2026-04-26

### Removed

- **Breaking:** `provideAsyncHostBindings()` and `BsBindEventPlugin` (the
  `async-host-binding` lib entry). The plugin relied on `NgZone.onStable`,
  which no longer reflects app stability under
  `provideZonelessChangeDetection()`. Use signal-based host bindings instead
  (`host: { '[prop]': 'mySignal()' }`) and wrap RxJS observables with
  `toSignal()` from `@angular/core/rxjs-interop`. The demo page
  `/advanced/async-host-binding` shows both patterns.

### Other

- Library now operates fully zoneless. zone.js is no longer pulled in
  transitively or required at runtime.
- Migrated remaining template-bound plain class fields to Angular signals
  (`BsDatatableComponent.rowTemplate`, `BsVirtualDatatableComponent.rowTemplate`,
  `BsTimepickerComponent.presetTimestamps`).
- Migrated the last `@Input()` decorators (`BsDatatableColumnDirective`) to
  the signal-based `input()` API.
- Bumped `ng-mocks` peer to `^14.15.2`.
