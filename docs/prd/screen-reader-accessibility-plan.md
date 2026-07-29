# Plan — screen-reader accessibility across the four libraries

Status: **Phases A, B and C's implementation landed (B in 10 milestones, C in C1–C8 — see the
as-built blocks); Phase 0 gates all cleared (0.1b + 0.3b deferred as noted); C's acceptance
walkthrough plus D–G outstanding** — 2026-07-29. Scope grew mid-C: the signature-pad remediation
became a full WC migration (decision **D6**, PRD §11). Companion PRD:
`docs/prd/screen-reader-accessibility.md` (findings, design rationale, decisions D1–D6 in §11, and
the live-state principle in §11a).

A spike phase then seven implementation phases, 0 → A → G, all on the single branch
`feat/screen-reader-accessibility`. Each phase is one coherent commit set. **A, B and C close the
majority of user-visible impact**; D–F are deep but narrower; G closes it out. Branch base is
`master`. Per `CLAUDE.md`, verify intermediate work by reading code and type-checking — the build +
unit + e2e sweep runs **once**, in G.

**Phase 0 is a gate, not a formality.** Spike 0.1 (can `<details>`/`<summary>` reproduce the
Bootstrap accordion exactly, with no UX change?) can send D1 back; 0.2 gates **all** of Phase B and
0.3 gates F; 0.4 verifies the `inert` and Tab-order claims Phase A already shipped against. Nothing
in D should be written before 0.1 and 0.4 pass, and nothing in B before 0.2 does.
**All four gates are now cleared** — see "Results" in Phase 0 for the four places the spikes changed
this plan, and for the two deferred halves (0.1b pixel parity, 0.3b the Angular CVA bridge).

For all four, the reason a spike exists rather than a test is the same: they cover platform behaviour
**CI structurally cannot reach** — trusted input, `inert`'s focusability effect, cross-root ARIA
element references, and visual parity. See PRD §7, "What CI structurally cannot reach".

## Decisions (all resolved — see PRD §11)

- **D1** — the accordion uses `<details name>` + `<summary>` in **both** tiers, always. Animation
  dropped. Enlarges Phase D but *removes* net code. **Gated on spike 0.1** — visual and UX parity
  with the current Bootstrap accordion is a precondition, not an assumption. Known trade:
  accordion headers leave heading navigation; Phase D carries an SR check on it. Known open risk:
  `<summary>` cannot be `disabled`, which 0.1 must resolve.
- **D2** — the datatable's role follows **interactivity**, not flat-vs-tree: no role when
  non-interactive, `grid` when rows are selectable, `treegrid` under `[tree]`, with the keyboard
  model implemented wherever the role is present. Placement stays on the inner `<table>`.
- **D3** — `mp-otp-input.label` → `inputLabel`, breaking, in Phase B.
- **D4** — the scheduler accepts both `M` and `Enter`; `M` is canonical.
- **D5** — form association is **in scope for this PR**; Phase F is last but not droppable.
- **D6** (added 2026-07-29, mid-C) — the signature-pad's C8 remedy shipped as a **3-fronted WC
  migration** (`mp-signature-pad` + ng/react/vue wrappers) rather than an Angular-only fix, so the
  typed alternative reaches every framework. See the C8 part 3 as-built block and PRD §11 D6.

**Every phase inherits PRD §11a**: an ARIA attribute must be correct at every moment, not at first
render. Prefer a native element that owns its own state; derive state in `render()` from reactive
state rather than writing it from an event handler; where a value cannot be kept correct, omit it.
Specs assert **transitions**.

---

## Phase 0 — spikes (GATES, before any implementation) — ✓ **ALL FOUR GATES CLEARED**

Four cheap spikes. Three de-risk a decision the plan already commits to; 0.4 verifies a claim Phase A
has **already shipped code against**, which is the more uncomfortable kind. Each is throwaway
(`libs/mintplayer-web-components/_spike-*/` per the `_spike-lit-context` precedent, or a temporary
demo route) and is **deleted before merge** — except the assertions worth keeping, which move into
real specs.

### Results — 2026-07-28

| Spike | Verdict | Tests | Effect on the plan |
|---|---|---|---|
| **0.1a** behaviour of `<details>`/`<summary>` | ✓ **PASS** | 51/51 × 3 engines | D1 proceeds. Three new implementation constraints (below) |
| **0.1b** pixel parity vs Bootstrap CSS | ⏳ **outstanding** | — | Needs a demo route; blocks only D's *styling*, not its structure |
| **0.2** host naming via `ElementInternals` | ✓ **PASS** | 9/9 | **Phase B unblocked, architecture unchanged.** One PRD justification corrected |
| **0.3a** `formDisabledCallback` platform semantics | ✓ **PASS** | 21/21 × 3 engines | Phase F proceeds, with a **mandatory** design change (below) |
| **0.3b** Angular CVA `setDisabledState` bridge | ⏳ **outstanding** | — | Needs Angular; do at the head of F |
| **0.4** `inert` through slots + Tab/RTL | ✓ **PASS** | 33/33 × 3 engines | **Phase A's shipped `inertRegions` confirmed correct.** D's carousel fix proceeds |

Spike code lives in `libs/mintplayer-web-components/_spike-{host-aria,inert-roving,details-accordion,form-disabled}/`,
each with its own throwaway `playwright.config.ts` and **no `webServer`** — every assertion is pure
platform behaviour, so `page.setContent()` + `addScriptTag()` is sufficient and costs no demo build.
0.4 bundles the **real** `inert-regions.ts` and `roving-focus.ts` with esbuild rather than
re-implementing them, so it tests shipped source; a hand-written copy would check our arithmetic
against a second copy of our arithmetic.

**Methodology finding that governs every future ARIA e2e test in this repo.** Playwright's
`toHaveAccessibleName()` / `ariaSnapshot()` are computed by Playwright's *own* injected accname
implementation, which cannot read another element's `ElementInternals` — it reports **no role** for an
internals-only host. It is therefore structurally incapable of verifying host naming, and using it
would have produced a confident false negative. `page.accessibility.snapshot()`, which used to be
backed by each engine's real AX tree, was **removed in Playwright 1.60**. So a real accessibility-tree
read is **Chromium-only, via CDP `Accessibility.queryAXTree`**; Firefox and WebKit expose no
scriptable AX surface at all (no `computedRole`/`computedLabel`, no `window.internals`, no
`accessibilityController`). Consequence: **Phase G's ARIA assertions must be Chromium-projected**, and
Firefox/WebKit naming coverage can only come from the manual NVDA/VoiceOver pass. Do not "fix" a
Chromium-only a11y spec by widening its project list — it will silently start measuring Playwright
instead of the browser.

### 0.1 — `<details>`/`<summary>` visual + UX parity (gates Phase D's accordion rewrite)

**The question:** can `mp-accordion` be rebuilt on `<details>`/`<summary>` and look and behave
*exactly* like the current Bootstrap accordion, with no user-experience change? D1 is only
affordable if the answer is yes.

**Build it as a temporary route in `apps/ng-bootstrap-demo`** rendering the current `bs-accordion`
and a `<details>`-based variant **side by side** with identical content — the repo's stated way to
verify a WC is through the demo apps, and CSS parity is not something a unit test can judge. Add a
Playwright screenshot comparison across **Chromium, Firefox and WebKit** (all three are already in
the e2e matrix), at default and at a narrow breakpoint, in light and dark
(`data-bs-theme="dark"`), collapsed and expanded.

**Visual questions, in the order they are likely to bite:**

| # | Question | Why it is a risk |
|---|---|---|
| 1 | Does the disclosure marker fully disappear in all three engines? | Needs `list-style: none` **and** `::marker { content: '' }` **and** `::-webkit-details-marker { display: none }`; Firefox and Safari have historically each needed a different one of the three |
| 2 | Does `display: flex` on `<summary>` reproduce `.accordion-button`'s layout? | `<summary>` defaults to `display: list-item`; Bootstrap's button is `display: flex; align-items: center; width: 100%; text-align: left` with its own padding |
| 3 | Does `.accordion-button::after` (the chevron SVG) still render and rotate? | The rotation selector moves from `.accordion-button:not(.collapsed)` to `[open] > summary`; confirm `::after` composes with `::marker` removal |
| 4 | Is the focus ring identical? | `.accordion-button:focus` uses `--bs-accordion-btn-focus-box-shadow`, which `accordion.styles.scss:40` re-declares on `:host` for the shadow boundary — confirm it still applies to `<summary>:focus-visible` |
| 5 | `cursor`, `user-select`, and double-click behaviour | `<summary>` is `cursor: default` in some engines and **double-click selects its text**, where a `<button>` does not. This is the most likely source of a felt UX difference |
| 6 | Does the active/`is-active` background and border treatment survive? | The state selector changes from a class to `[open]`; check the collapsed/expanded border-radius seams between adjacent items |

**Behavioural questions — two are potential blockers, not polish:**

- **Disabled tabs.** `mp-accordion` supports `?disabled` on the header, and **`<summary>` cannot be
  disabled.** The workaround is `pointer-events: none` + `aria-disabled="true"` + swallowing the
  key handler — and, because the `toggle` event is **not cancellable**, any path that still opens a
  disabled tab can only be corrected by closing it again, which flashes. The spike must establish
  whether a disabled tab can be made genuinely inert without a visible flash. **If it cannot, that
  is grounds to revisit D1** for the JS tier.
- **`toggle` is not cancellable and fires *after* the state change.** Confirm that
  `mp-accordion-tab-toggle` can still be emitted with the same detail shape and timing, that
  `#closeNested` works when the *UA* closes a sibling via `name` exclusivity (does it fire `toggle`
  on the one it closed? assume yes, verify), and that a consumer cannot observe an intermediate
  state during exclusive switching.
- Enter and Space activate `<summary>` natively; Arrow/Home/End between headers still needs the
  existing handler, and the spike should confirm the native activation does not double-fire
  alongside it.
- **Does `<details name>` exclusivity scope to the shadow root?** The entire single-open behaviour
  rests on it. The spec says grouping is per node tree, the same rule as radios — and
  `mp-accordion` already satisfies it — but "same as radios" is reasoning by analogy, and analogy
  is what needed checking once already on this decision. Assert it directly: two accordions in two
  shadow roots must not close each other's tabs, and two in the *same* root must.
- **Does the UA fire `toggle` on the sibling it auto-closes?** Assumed yes, never verified, and
  every piece of state sync depends on the answer — the `is-active` light-DOM markers,
  `#closeNested`, and the `mp-accordion-tab-toggle` contract all need a signal when exclusivity
  closes a tab the user did not touch. If the answer is no, the element needs a different mechanism
  to notice, and that is a design change rather than a detail.

**Two things the spike should confirm as *wins*, since they offset the risks:** closed content is
removed from the accessibility tree and the tab order with no CSS (closing §4.5's accordion
Critical), and the DSD chrome can express initial state as a plain `[open]` attribute — which the
current radio machine **cannot**, because the generator has no active tab at generation time
(§4.6). Verify the injector can stamp `[open]` on the right tab.

**Gate:** pixel parity in all three engines (or a documented, accepted difference), a disabled tab
that is inert without a flash, and the toggle-event contract preserved. **Pass →** Phase D proceeds
as written. **Fail on styling →** document the delta and get sign-off. **Fail on disabled or on the
event contract →** fall back to the original D1 scope (`<details>` for the no-JS tier only,
`<button aria-expanded>` + `role="heading"` retained when hydrated), which also recovers the
heading-navigation loss.

#### RESULT 0.1a — ✓ PASS, 51/51 in Chromium + Firefox + WebKit

`_spike-details-accordion/`. **D1 stands.** Every one of the six visual questions and both potential
blockers resolved in favour of `<details>`. But the first run failed **15 tests identically in all
three engines**, and the causes are constraints the accordion rewrite must obey — they were
assumptions in the plan, not oversights in the fixture:

1. **`toggle` does not bubble** (`bubbles: false`). The obvious delegated listener on the shadow root
   never fires. Non-bubbling events *do* propagate in the **capture** phase, so delegate with
   `capture: true` — that keeps one listener for the whole accordion instead of one per `<details>`
   plus add/remove bookkeeping as tabs come and go.
2. **`toggle` is asynchronous** — the UA *queues* a details-toggle task rather than dispatching
   inline. `details.open` is authoritative immediately; the event is not. This failed in Chromium and
   WebKit while **passing in Firefox**, which is exactly the shape of bug that ships if only one
   engine is tested.
3. **Same-task toggles are coalesced.** A flip-flop (`open = true; open = false`) delivered exactly
   **one** event, carrying the *final* state. So the element must **never count `toggle` events** to
   track state. Combined with (2), the rule is: treat `toggle` purely as a notification and re-read
   `open` from every tab. That is order-, async- and coalescing-safe, and it satisfies PRD §11a
   (state correct at every moment) which an event-delta approach cannot.

   Worth recording because it will recur in D's own specs: three spike tests that read the event log
   synchronously after a click **passed on one run and failed on the next**. Asynchrony makes
   "act then read" a race in both directions — a presence assertion can miss the event, and an
   *absence* assertion can pass merely because the queued task has not run yet. Every accordion
   assertion about `toggle` must poll for presence and use a settle window for absence.
4. **A disabled `<summary>` needs a keydown guard.** `pointer-events: none` + `tabindex="-1"` +
   `aria-disabled` blocks the pointer and Tab, but **programmatic focus followed by Enter still
   opened the tab** — and since `toggle` is not cancellable there is no way to undo it without the
   visible flash the plan named as grounds to revisit D1. `preventDefault()` on **keydown** (which
   *is* cancellable) suppresses activation outright. With that one addition the disabled tab is fully
   inert with **no flash**, so the gate is met rather than failed.

Confirmed as expected: `<details name>` exclusivity **is** scoped per shadow root (same root →
mutually exclusive, two roots with the same name → fully independent), so single-open needs no
JS bookkeeping. The UA **does** fire `toggle` on the sibling it auto-closes, so `#closeNested` and
the `is-active` markers have the signal they need. Both offsetting wins hold: closed content is out
of the tab order **and** the accessibility tree with zero CSS (closing PRD §4.5's Critical), and
`[open]` expresses initial state for the DSD chrome (closing §4.6's generator gap). Marker removal
with all three mechanisms yields a **0px** text offset in all three engines, `display: flex` applies
to `<summary>`, and `::after` composes with `::marker` removal.

**Still outstanding — 0.1b, pixel parity.** These assertions deliberately avoid Bootstrap CSS, so
they establish that the *structure* works, not that it looks identical. 0.1b remains as written
(demo route, screenshots, light/dark, narrow breakpoint) and gates only D's styling. Note the ng
e2e matrix is **chromium + firefox only** — WebKit is configured in the react and vue projects, so
run 0.1b's third engine there or add webkit to the ng config for the run.

### 0.2 — host naming via `ElementInternals` (gates **all** of Phase B)

Two independent assumptions, both load-bearing, both currently unverified anywhere. Phase A's
`HostAriaController` is written against them, and **jsdom cannot test either** — it implements
`attachInternals()` and the ARIA state properties but not `ariaLabelledByElements`, so CI will never
exercise this. One Playwright file, Chromium + Firefox + WebKit, using accessibility snapshots.

**0.2a — does `internals.role` make a host nameable at all?** This is the keystone of Phase B and
has the widest blast radius of anything unproven in the plan: ~18 components are slated to get a
role on the host precisely so a consumer's `aria-label` lands somewhere legal. Assert that
`<mp-thing aria-label="Country">`, whose role exists *only* via `internals.role` and which carries
no `role` attribute, computes "Country" as its accessible name. Assert the control case too: the
same host with **no** role exposes no name, because naming is prohibited on `role="generic"` — which
is the defect being fixed. **Fail →** Phase B's whole architecture changes: the role has to be
expressed as a `role` *attribute* on the host, or naming stays inside the shadow root and every
component needs an explicit label property with no cross-root path at all.

**0.2b — do cross-root element references resolve inner→outer?** A WC with an `<input>` in its
shadow root, a `<label id>` in the document, and `internals.ariaLabelledByElements = [thatLabel]`.
`ariaLabelledByElements` is Baseline April 2025 and inner→outer is the permitted direction — but the
two authoritative sources disagreed during the audit (a stale WICG explainer still says "behind a
flag in Firefox"). Also assert the negative that motivates the design: the same relationship
expressed as an `aria-labelledby` **string** on the shadow input resolves to nothing. **Fail →**
tier 2 falls back to label properties only, and `aria-errormessage` needs a different design.

#### RESULT 0.2 — ✓ PASS, 9/9. **Phase B is unblocked and its architecture is unchanged.**

`_spike-host-aria/`. Measured against Chromium's real AX tree via CDP.

- **0.2a ✓** A host whose role exists *only* via `internals.role`, carrying no `role` attribute,
  computes AX role `group` with name `"Country"` from the consumer's `aria-label`. Holds for a widget
  role too (`listbox`, with `multiselectable`/`orientation`/`required` properties present). The ~18
  components slated to get a host role keep their planned shape.
- **0.2b ✓** `input.ariaLabelledByElements = [documentLabel]`, assigned from inside a shadow root to a
  label in the document, computes name `"Country"` with `labelledby → relatedNodes: [outer-label]`.
  Inner→outer is permitted, as designed. `internals.ariaLabelledByElements` likewise names the host.
- **0.2b negative ✓** The same relationship as an `aria-labelledby` **string** computes name `""`,
  and Chromium marks the source `"invalid": true` — an unusually emphatic confirmation of the premise
  that IDREFs cannot cross the boundary.
- **Plumbing ✓ all three engines.** `attachInternals`, `internals.role`, and
  `ariaLabelledByElements`/`ariaDescribedByElements` on both `Element` and `ElementInternals` exist and
  retain live element references in Chromium, Firefox and WebKit. So
  `supportsAriaElementReferences()`'s fallback branch is **dead code in every current engine** — keep
  it as insurance, but do not expect a test to cover it, and do not treat it as a tested path.

**Correction to the PRD, now applied in §5.3.** The expected control result was "no role ⇒ naming
prohibited ⇒ name discarded". Chromium does **not** enforce the prohibition: a role-less host computes
role `generic` **and** name `"Country"`. The defect is therefore *not* that the name is thrown away —
it is that the host stays `generic`, which AT does not navigate to or announce as a named object, so
the name has nowhere to surface. Argue Phase B from "no role for the name to attach to". The spike's
control assertion was rewritten to check **role**, not name, so it stays true in engines that *do*
implement the prohibition. (Playwright's accname implementation does drop it — evidence about ARIA
1.2, not about a shipping engine.)

### 0.4 — `inert` propagation through slots (gates Phase D's carousel fix)

Created by Phase A rather than discovered in the audit: `inertRegions` writes `inert` +
`aria-hidden` together, but **jsdom does not implement `inert`'s focusability effect at all**, so
`inert-regions.spec.ts` can only assert that the attribute lands. The load-bearing claim is
untested — that `inert` propagates down the **flat** tree, so marking a shadow-DOM wrapper cell also
removes the consumer's *slotted* content from the tab order and the accessibility tree. That is the
entire reason `inert` was chosen over a `tabindex="-1"` sweep, and Phase D's carousel fix depends on
it because slides are slotted light DOM.

One page, three engines: a WC with a slotted `<button>` inside an `inert` shadow wrapper. Tab from
before it and assert focus skips to after it, and assert the button is absent from the accessibility
snapshot. **Fail →** `inertRegions` needs to walk `assignedElements()` and write `tabindex="-1"`
per node, with all the bookkeeping that implies on rebuild.

**Fold two `RovingFocus` assertions into the same page**, since it is already exercising real Tab
behaviour and the marginal cost is near zero:

- **The one-tab-stop invariant.** `roving-focus.spec.ts` has 16 tests and none of them can prove the
  thing roving tabindex exists to deliver. The reason is not a jsdom gap — it is that **sequential
  focus navigation is not a DOM API**. There is no `document.tabForward()`; Tab is user-agent
  behaviour triggered by *trusted* input, which is why jsdom's README lists only Navigation and
  Layout as out of scope and never mentions focus order. A synthetic
  `KeyboardEvent({key:'Tab'})` moves focus in **no** environment, real browsers included, because
  untrusted events do not run default actions. So this is inherently an e2e concern that only
  WebDriver/CDP-level input can reach (`page.keyboard.press('Tab')`) — not something a future jsdom
  release or a better fake DOM could close. Assert the behaviour: Tab into the widget lands on
  exactly one item, arrows move within it, one more Tab leaves it entirely.

  The mechanism, so this is not re-litigated: every `Event` carries an `isTrusted` flag that is true
  only for events the user agent created from real input, and the UA performs focus navigation from
  its own input pipeline — it never sees a constructed event as input. Note the asymmetry:
  `preventDefault()` on a *real* Tab keydown does suppress the focus move, so the move is
  **cancellable** by script but not **causable** by it. Only WebDriver/CDP-level injection
  (`page.keyboard.press('Tab')`, which Playwright implements via `Input.dispatchKeyEvent`) produces a
  trusted event. `jsdom/jsdom#2102` asks exactly this and was closed the day it was filed.

  Worth recording so it is not proposed later: adding a userland Tab simulator such as
  `@testing-library/user-event`'s `userEvent.tab()` would **not** substitute. It computes tab order
  from `tabIndex` using its own implementation of the same rules our code applies, so the test would
  check our arithmetic against a second copy of our arithmetic and pass while the browser disagreed.
  Circular by construction.
- **RTL arrow inversion.** `RovingFocus` reads `getComputedStyle(el).direction`, which jsdom does not
  meaningfully resolve from an ancestor `dir="rtl"`, so that branch is effectively unexecuted today.

#### RESULT 0.4 — ✓ PASS, 33/33 in Chromium + Firefox + WebKit, first run

`_spike-inert-roving/`, bundling the real `inert-regions.ts` and `roving-focus.ts` via esbuild.
**The uncomfortable spike came out clean: `inertRegions` as already shipped in Phase A is correct.**

- **`inert` propagates through slots**, in both the tab order and the accessibility tree, in all three
  engines. Inerting a node in the *shadow root* removed the consumer's **slotted light-DOM** button
  from Tab and from the AX snapshot. So the `assignedElements()` walk plus per-node `tabindex="-1"`
  bookkeeping in the fail-path is **not needed** — the reason `inert` was chosen over a tabindex sweep
  holds. Releasing the set restores both.
- **Focus rescue verified.** Focusing the slotted button and then inerting its ancestor does not strand
  focus on `<body>` — the deliberate move-out in `hide()` works in a real engine, which the jsdom spec
  could not show.
- **The one-tab-stop invariant holds** under real trusted Tab (`Input.dispatchKeyEvent`): Tab into the
  widget lands on exactly one item, arrows move within it, one more Tab leaves entirely, Shift+Tab
  re-enters at the **moved** tab stop rather than resetting to the first item, and clamping at the end
  does not escape the widget. `roving-focus.spec.ts`'s 25 unit tests could never assert this.
- **RTL inversion executes and is correct**: under `dir="rtl"` ArrowLeft moves forward and ArrowRight
  moves back, skipping the disabled item, while an LTR widget on the same page is unaffected.

These assertions **graduate rather than being deleted**: the roving-focus ones move to
`tools/e2e-shared/roving-focus-suites.ts` (per-consumer, as `RovingFocus` is adopted in C and E), and
the inert-through-slots ones to the carousel's e2e suite in D.

### 0.3 — `formDisabledCallback` vs `ControlValueAccessor` (gates Phase F)

The known two-writers-on-`disabled` hazard, which the repo has already been bitten by
(`otp-input.component.ts:124-131`). Take `mp-checkbox`, add `formAssociated` + the mixin sketch,
wrap it in a `<fieldset disabled>` inside a reactive form that also calls `setDisabledState`, and
confirm the single `#disabled` source of truth resolves both without a loop or a stale attribute.
Small, but it is the one part of Phase F that is design rather than boilerplate.

#### RESULT 0.3a — ✓ PASS, 21/21 × 3 engines, but with a **mandatory design change** for Phase F

`_spike-form-disabled/`. All 21 assertions pass; the *recorded observations* are the payload, and one
of them overturns the "single `#disabled` source of truth" sketch as written.

1. **The UA writes no `disabled` attribute when a `<fieldset disabled>` disables the element.** The
   control is genuinely disabled while `hasAttribute('disabled') === false`. So **the attribute is not
   a usable source of truth** — a consumer or wrapper reading it sees `false` on a disabled control.
2. **`formDisabledCallback` also fires for the element's own `disabled` attribute**, not only for
   form-owner state. One user action therefore invokes **three** writers:
   `attributeChangedCallback`, the property setter, and `formDisabledCallback`.
3. **Their order is engine-dependent.** WebKit fires `formDisabledCallback` **before**
   `attributeChangedCallback`; Chromium and Firefox fire it **after**. Any design that depends on
   which runs first is broken on one engine or the other. The idempotent-setter shape survives only
   because it is order-independent — keep that property deliberately, and assert it.
4. **A property write silently defeats `<fieldset disabled>`.** Setting `disabled = false` on a
   control inside a still-disabled fieldset **enables it**, and the UA never re-asserts. This is the
   real find: **the mixin must track form-owner disabled state separately from author state and expose
   the OR of the two**, rather than funnelling both into one field. A single field cannot represent
   "the author wants it enabled but the fieldset forbids it", and Angular's `setDisabledState` is
   exactly a property writer, so a reactive form inside a disabled fieldset would re-enable its own
   controls.

No recursion occurs when the callback writes state during the callback (guard verified), and repeated
fieldset toggling leaves no stale attribute or `aria-disabled`.

**Still outstanding — 0.3b**, the Angular half: `setDisabledState` against a `<fieldset disabled>` in a
real reactive form. Do it at the head of Phase F, and design against finding 4 from the start.

**Sequencing:** **0.2 must complete before Phase B starts** — 0.2a can invalidate B's architecture,
not merely narrow it, and Phase A already shipped code written against it. **0.1 must complete
before Phase D**, and **0.4 before D's carousel work**. 0.3 is independent and can run any time
before F.

Note what these three have in common: each covers a platform behaviour that **CI structurally
cannot** reach, because jsdom implements neither `ariaLabelledByElements` nor `inert`'s focusability
effect, and cannot judge visual parity. They are not a formality before "real" work — they are the
only verification these particular claims will ever get, which is why each carries an explicit
fail-path above.

**Sequencing status (2026-07-28):** 0.2 ✓ → **B may start**. 0.4 ✓ → D's carousel work unblocked.
0.1a ✓ → D's accordion *structure* unblocked; 0.1b still gates its *styling*. 0.3a ✓ → F's design is
settled, subject to 0.3b at F's head.

**Was Phase 0 worth it?** It changed the plan in four places that would otherwise have been found in
review or in production: the `generic`-naming justification is wrong as written (0.2), the accordion
cannot delegate or count `toggle` events and needs a keydown guard to disable a tab (0.1a), a single
`#disabled` field cannot express author-vs-form-owner state (0.3a), and Playwright's built-in
accessible-name matchers silently measure Playwright rather than the browser (methodology). Only 0.4
confirmed its claim outright — and that was the one already shipped.

---

## Phase A — WC a11y primitives ✓ LANDED

Nothing else in the plan works properly without these. `HostAriaController` is first: the Angular
wrapper fix in B has nowhere to deliver attributes without it.

**As built** — seven commits, `2c13e5b0`…`27893419`, one per file below, plus `9580ca28` (fixes) and
`dd9b4006` (shared arithmetic).

**The suites were run early for this phase only, and it was the right call.** A3/A4 changed
`OverlayController`, which has 9 web-component consumers and 5 Angular ones, so deferring
verification to G would have built five phases on top of an unexercised primitive. A targeted
two-file run (seconds, not the 2.5-minute sweep) surfaced **12 failures across 3 distinct causes**;
**149 tests now pass**, including all 35 pre-existing overlay tests. The batching rule still holds
for everything else.

What it caught, worth recording because two are lessons rather than typos:

1. **`OverlayController` returned focus to `<body>` — a defect I introduced.** With nothing focused,
   `activeElement` *is* `document.body`, which is an `HTMLElement`, so it was captured as the return
   target and beat the configured trigger: the exact "stranded on `<body>`" failure the capture was
   added to fix. Caught by a **pre-existing** test asserting focus returns to the chosen anchor — the
   test was right and the new code was wrong.
2. **`FocusTrap` swallowed Tab across the whole page after its region was detached.** A component
   torn down without `deactivate()` kept a document-level listener, found no tabbables in the
   detached region, and consumed every Tab via the "nothing to cycle" branch. Now bails when the
   region is not connected — the fix belongs in the source, not the spec.
3. **`RovingFocus.onKeydown` ignored every key when called after dispatch.** `composedPath()` is only
   populated *during* dispatch and returns `[]` afterwards. Falls back to `event.target`.

Four things learned that change later phases:

- **jsdom implements `attachInternals()` and the `ElementInternals` ARIA state properties, but not
  `ariaLabelledByElements`.** So role and state are unit-testable and cross-root reference
  resolution is not. That is spike 0.2, now load-bearing rather than precautionary:
  `HostAriaController.syncReferences()` has a path CI cannot exercise, and `host-aria.spec.ts`
  documents that gap rather than pretending to cover it.
- **Tab order cannot be unit-tested at all**, and not because of jsdom — see the mechanism under
  spike 0.4. Consequence: the one-tab-stop invariant is a Playwright concern by nature.
- **`RovingFocus` deliberately omits an `aria-activedescendant` mode.** Inside a shadow root that
  attribute cannot resolve, which is precisely why `mp-time-list` is inert. Any Phase C or E work
  that reaches for activedescendant must use roving tabindex instead — including the combobox, where
  the popup and the input therefore have to end up in the same tree.
- **The pure navigation arithmetic is now shared** (`nextEnabledIndex` / `firstEnabledIndex` /
  `lastEnabledIndex`), and comparing the two implementations found a real bug: the new controller was
  intercepting Alt/Ctrl/Meta chords, so Alt+Arrow, Ctrl+Home and Cmd+Arrow would have been swallowed.
  The Angular directive guards these, and that guard was itself a May-2026 fix
  (`aria-review-fixes.md`, `f2e04db2`) — so this would have reintroduced a defect already fixed once.
  Phase E deletes the Angular duplicates.

| File | Content |
|---|---|
| `libs/mintplayer-web-components/a11y/src/host-aria.ts` | `HostAriaController` — `attachInternals()`; role + reflected state on the host; resolves host `aria-labelledby`/`-describedby` IDREFs **in the host's own tree** into `internals.ariaLabelledByElements` / `ariaDescribedByElements` |
| `.../a11y/src/focus-trap.ts` | `FocusTrapController` — ported from `BsOverlayFocusDirective`; must walk `composedPath`/`assignedElements()` (a `querySelectorAll` in one root misses slotted content) |
| `.../a11y/src/dismiss-stack.ts` | module-singleton document-scoped LIFO; `OverlayController` delegates, `BsOverlayStackService` becomes a thin Angular facade over it |
| `.../a11y/src/roving-focus.ts` | `RovingFocusController` — `{ orientation, wrap, itemsProvider }`, items from shadow **or** `assignedElements()` |
| `.../a11y/src/focus-restore.ts` + `.spec.ts` | `FocusRestore` + `FocusRestoreController` + `deepActiveElement`. **No `lit` import.** Six spec cases, the first being "focus outside the root → capture records nothing and restore does not move focus" |
| `.../a11y/src/inert-regions.ts` + `.spec.ts` | `inertRegions()` — writes `inert` + `aria-hidden` together; callers declare the current hidden set, never deltas; reference-counted `suspend()`/`resume()` for transitions; moves focus out before hiding |
| `.../a11y/src/index.ts` | export all of the above |
| `libs/mintplayer-web-components/_styles/` | `--mp-focus-ring` token + `mp-focus-ring` mixin |
| `.../overlay/src/overlay-controller.ts` | `initialFocus?: HTMLElement \| 'first' \| 'self' \| 'none'` (default `'none'`) and `modal?: boolean`; **capture the return target in `open()`** from the composed active element; demote `trigger` to an explicit override; dev-mode warn when the restore target is missing or unfocusable |
| `tools/e2e-shared/` + WC spec helpers | `expectIdrefResolves(el, attr)` — resolves each token against `el.getRootNode()`, the **holder's** root |

`aria-modal` and background `inert` stay **out** of `OverlayController` (it cannot know whether its
host is a dialog or a menu). Gate Tab containment on `isFrameTop()` so an inner overlay's trap does
not fight its parent's.

**Acceptance**: six primitives exported and unit-tested; `OverlayController`'s capture-at-open
proven to restore focus correctly for a nested overlay pair; `expectIdrefResolves` fails on exactly
the six known-dead IDREF sites.

---

## Phase B — naming and wrapper transparency

Highest accessibility gained per hour in the whole plan. Unblocks the validity mirror in E.

**WC label properties** (`inputLabel` / `input-label`, per D3): add to `mp-select` **first** (the
only control with no fallback naming path at all), then `mp-radio`, `mp-toggle-button`,
`mp-checkbox`, `mp-multi-range`, `mp-datepicker`, `mp-timepicker`, `mp-tree-select` (plus
`search-label`), `mp-datatable` (plus a `caption`), `mp-timeline`, `mp-dropdown-menu`,
`mp-code-snippet`, `mp-ribbon` (`regionLabel`, guarding the unconditional `setAttribute` clobber),
`bs-typeahead`, `bs-progress-bar` (default `'Progress'`), `bs-close`, `bs-rating`,
`bs-breadcrumb`. Rename `mp-otp-input.label` → `inputLabel` across the WC and all three wrappers.

**Tier-2 cross-root naming mixin** — the `HostAriaController` translation path adopted by every WC
form control. Delete `mp-checkbox`'s IDREF forwarding (`:245-246`, `:271-272`); replace
`mp-dropdown-menu`'s `label-id` with a string `label`, keeping `label-id` as a deprecated alias
that reads the referenced element's `textContent`.

#### ✓ LANDED (B2) — `91453272`: both tiers, on `mp-select` and `mp-checkbox`

**A gap in Phase A's primitive surfaced immediately.** `HostAriaController` could only assign
references to the **host's** `ElementInternals`, but tier 2 needs them on the inner role-bearing node
— which is the direction spike 0.2b actually verified. Added a `referenceTarget` option; which node
is correct is not cosmetic:

- Host carries the role via `internals.role` (`mp-datatable`, `mp-timeline`) → omit it.
- Role belongs to a native control in the shadow root (`mp-select`'s `<select>`, `mp-checkbox`'s
  `<input>`) → return that element. **Naming the host instead yields either nothing (the host is
  `generic`) or a double announcement, one per role.**

`supportsAriaElementReferences()` now checks `Element.prototype` **and**
`ElementInternals.prototype`, since references land on one or the other depending on that choice.

**`mp-checkbox`'s dead IDREF forwarding is gone.** It copied `aria-labelledby`/`aria-describedby` id
*strings* onto its shadow `<input>`, where they resolve against the shadow root and find nothing —
visible in devtools, conveying nothing, which is worse than an omission because it reads as correct
in review. Its **7 pre-existing tests pass untouched**, which is itself evidence the removed code was
inert. Two spec cases now fail if anyone restores it.

**References are re-synced on every commit, not once.** They point at a specific node, and these
components re-render — switching `mp-checkbox.type` between `toggle_button` and the others replaces
the `<input>` outright, so a once-assigned name would sit on a discarded element. Any component
adopting tier 2 must do the same.

**Precedence, applied consistently:** host `aria-label` > `inputLabel`. The host attribute is the more
idiomatic thing for a consumer to write and `BsForwardAriaDirective` now copies it down from the
Angular wrapper; `inputLabel` is the fallback for consumers who cannot express a name as a host
attribute, and the documented fallback where element references are unavailable.

**A coverage boundary to state rather than paper over:** the *positive* cross-root assertion cannot be
unit-tested — jsdom implements neither `ariaLabelledByElements` nor an accessibility tree. Both new
spec files assert the **degraded** contract (no throw, no fabricated name, no IDREF copied inward) and
say in their header that spike 0.2 is the only verification of the positive path. Do not add a
"passing" cross-root unit test later; it would be asserting jsdom's silence.

`mp-checkbox` also shows why a label property is needed at all even when visible text is slotted: that
text lands in a `<span class="form-check-label">` which is **not** associated with the input by
`for`/`id` across the boundary, so it never becomes the accessible name. Asserted.

#### ✓ LANDED (B5) — `f60c97cc`: radio, toggle-button, dropdown-menu, otp rename

`mp-radio` and `mp-toggle-button` get the exact checkbox pattern (they had **no** aria handling at
all). `mint-otp-input.label` → `inputLabel` per D3, keeping its `'One-time code'` default and gaining
the standard host-`aria-label`-wins precedence. `mp-dropdown-menu`'s `label-id` is **deleted, not
aliased** — it wrote `aria-labelledby` on the shadow `<ul>` pointing at a document id, the dead-IDREF
pattern itself, inert since the day it shipped; the plan's deprecated-alias idea was the
`textContent` hack §5.3 forbids and fell to the no-loose-ends ruling. Its wrappers lose `labelId` in
all three frameworks. Framing per §5.2b: for the three toggles, `input-label` is an *override* —
slotted text already names them.

#### ✓ LANDED (B6) — `05fee5c8`: picker/composite naming + the shared WC guard

datepicker/timepicker (the **readonly display input** was the unnamed node; category-2 defaults),
tree-select (`input-label` + `search-label`; placeholder fallback preserved exactly), timeline
(had no naming path at all), datatable (`caption` = the native *visible* table name, `input-label`
the invisible one that wins in accname). `_conformance/naming.spec.ts` asserts the whole contract
across all 11 implementing components (46 cases) so the next component cannot drift. Lit
static-properties elements observe host attributes via phantom property entries — non-obvious,
recorded in the code.

#### ✓ LANDED (B7–B8) — `c5d27372`, `743e254c`: Vue guard + ribbon/code-snippet

The Vue guard asserts the **invariant** rather than mounting 47 wrappers: every
`inheritAttrs: false` SFC must contain `v-bind="$attrs"` (statically, with a glob-count canary), plus
four representatives mounted at runtime. Vue gets its first test target. `mp-ribbon`'s unconditional
`aria-label` clobber is fixed via `regionLabel` with **value-based** ownership — the same rehydration
trap as the directive's presentation marker, solved the same way. `mp-code-snippet`'s copy button
takes `copy-label` with a `${language}` placeholder (formatter-not-prefix, first consumer).

#### ✓ LANDED (B9–B10) — `afdf7d4c`, `7dc90262`: the Angular tail + the strings sweep. **PHASE B COMPLETE.**

B9 scoping decision worth keeping: the 12 Angular-only `ariaLabel` inputs are **kept** — every one
forwards to an inner role-bearing node with a category-2 default, i.e. they are the Angular-only
equivalent of `input-label` and no directive competes with them. What changed: close/rating/
breadcrumb/typeahead/progress-bar gained inputs (rating's per-star label is a **formatter**),
`bs-card-img`'s absent `alt` now means *decorative* (`alt=""`) in all three frameworks rather than
unlabelled, and `bs-floating-label` both widens its projection (select/textarea were silently
dropped) and actually associates the label via `for`/`id` — the pattern looks labelled with zero
association. Knock-on: typeahead's aria spec now reads role/id from `mp-dropdown-menu`, where the
forwarding directive moves them.

B10 routes every hardcoded ARIA string through a bundle: 8 new query-builder message keys (fixing
the audit's title-defeat — a localized `title` was silently overridden by a hardcoded English
`aria-label`), 2 new + 1 unused file-manager keys wired, tree-select's chip remove became a
formatter (`Remove <label>` — a bare "Remove" among ten chips identifies nothing), and datatable
gained a `DatatableLabels` bundle covering its seven strings.

**Phase B acceptance met**: names reach the role-bearing node from all three frameworks; host
`aria-labelledby` resolves to live element references; no bare English `aria-label` literal remains
in a component that parameterises its visible text.

**Angular** — new `BsForwardAriaDirective` in `@mintplayer/ng-bootstrap/a11y`, applied to the inner
`mp-*` element of all 22 nested-host wrappers, plus `role="presentation"` on the `bs-*` host and
`tabindex` stripped from it. Retire the three ad-hoc idioms (`carousel`/`navbar` bespoke inputs,
`bs-select`'s `Renderer2` call). Forward `inputLabel` on `bs-datetime-picker` (currently the one
label input the wrapper omits).

#### ✓ LANDED (B1) — `51d3ca72`: 19 of 19 wrappers transparent

The conformance matrix went from **0/19 to 19/19** in one change; its 19 `it.fails` are now real
assertions, and it grew a second case per wrapper (moved attributes must *leave* the host).
39/39 green, plus 9 for the directive itself.

**Copy versus move turned out to be the load-bearing design choice.** `aria-*` is copied and kept
live through a `MutationObserver` — it carries state that must be correct at every moment (§11a).
`role`/`id`/`tabindex` are **moved**, because leaving them is actively wrong: two elements with one
`id` breaks every IDREF pointing at it, and a duplicated `tabindex` *is* the dead-tab-stop defect.
Known limit, documented on the directive: adding a moved attribute later is tracked (an addition is
an observable mutation), **removing one after the move is not**, since it is no longer on the host to
observe. Acceptable because those three are structural while the genuinely dynamic ones are `aria-*`.

Three things worth carrying forward:

- **`inject(ElementRef, { skipSelf: true })` resolves to the component host** from a directive on a
  template root — no DOM walking. The directive's first spec case pins that assumption down on
  purpose, so a future Angular change cannot silently make forwarding read the wrong element.
- **The directive's own `role="presentation"` marker nearly became a consumer role.** Writing it
  fires the observer, and a naive second pass moved the marker onto the target, destroying the role
  the consumer asked for. Caught by its own spec, not by review.
- **`it.fails` hides render errors, because it passes when a test throws for *any* reason.** Two
  entries were not forwarding failures at all: `bs-tree-select` throws in its constructor unless
  nested in a `<bs-form>`, and `bs-navbar-dropdown`'s `contentChild.required` label must be an
  `<ng-template>` (the directive injects `TemplateRef`). **Neither wrapper's forwarding had ever been
  exercised.** The harness now declares preconditions explicitly (`wrap`, `needs`). Use `it.fails`
  for known-red assertions only where a render error is impossible, or pair it with a smoke case.
- **SSR made the directive move its own marker inward, and only a browser could show it**
  (fixed in `4187e0b4`). The server pass serialises `role="presentation"` onto the `bs-*` host; the
  client hydrates with a **fresh directive instance** whose "did I write the marker?" flag is `false`,
  so it read the marker as a consumer role and moved it onto the custom element. All five demo
  carousels came out `role="presentation"` instead of `role="region"` — silently unnameable, with the
  attribute visibly present. **An instance flag cannot survive rehydration**; the fix is a value check
  on the attribute, which makes the pass idempotent — the property that was missing. Generalise this:
  any wrapper-side code that *writes* DOM state must be idempotent over its own serialised output, and
  **jsdom can never catch it, because there is no server pass to leave state behind.**

**Verification rule this establishes for the rest of the programme.** Unit tests prove the forwarding
contract; only the running demo proves the chain. A consumer's name crosses three boundaries —
`bs-*` host → `mp-*` element → the role-bearing node in the shadow root — and the middle hop is the one
CI reaches. After each phase that touches naming, check one page in the browser and read the actual
attributes on all three nodes. Confirmed working end-to-end after B3: carousels expose
`role="region"` with their own label, and the navbar's label reaches its shadow `<nav>` landmark.

Also replaced the spec's `setTimeout(0)` settle with `customElements.whenDefined` — the precise
condition rather than a guess. The carousel → swiper-core dynamic-import chain was still in flight at
teardown, producing two `EnvironmentTeardownError`s in the full-suite run while passing when the file
ran alone; that is the signature of a weak settle, not a defect.

Retired two of the three ad-hoc idioms: `bs-checkbox`'s and `bs-radio`'s hand-rolled `aria-*`
observers are deleted (they forwarded no `role`/`id`/`tabindex` and would have become a second writer
on the same attributes), along with their now-dead `ElementRef`/`PLATFORM_ID`/`DestroyRef` injections
and `AfterViewInit` implementations. **Still to retire in B: `bs-carousel`/`bs-navbar`'s bespoke
`[ariaLabel]` inputs and `bs-select`'s `Renderer2` call.**

**Useful for the rest of this phase:** run these specs with
`cd libs/mintplayer-ng-bootstrap && npx vitest run --pool=threads <filter>` (seconds) rather than
`nx test mintplayer-ng-bootstrap`, which ignores `--testPathPattern` — it is a *vitest* target, so the
jest-style flag silently runs the whole 174-second suite.

**React** — 10 files: extend `React.HTMLAttributes<I>` on the public **and** private inner props
types (fixing only the public one leaves attributes rejected one level down — see
`BsNavbar.tsx:34`), and add `...rest` to `BsAccordionItem` and `BsTimeline`, which drop attributes
at runtime. Includes `BsNavbarBrand`/`BsNavbarDropdown`, whose defect hides behind
`as unknown as` casts.

**Vue** — one ordering fix: `v-bind="$attrs"` **after** the explicit `:aria-label` in the navbar
SFCs.

**Where the conformance specs live — not in the entry point they guard.** The Angular passthrough
spec is at `libs/mintplayer-ng-bootstrap/_conformance/`, deliberately **not** `a11y/src/`. It imports
19 sibling secondary entry points, `a11y` is itself published, and the wrappers already import *from*
`a11y` (`dropdown`, `modal`, `offcanvas`, `file-upload` today; **all 19** once
`BsForwardAriaDirective` lands there). Inside `a11y` it would point the primitives entry point at its
own consumers — a cycle between published entry points, masked only by `tsconfig.lib.json` excluding
`*.spec.ts` from the build. Latent today, a build failure the moment a helper moves from a spec into
`src/`. A `_conformance/` folder has no `ng-package.js`, so it is not an entry point and cannot be
published; same arrangement as the existing `_spike-lit-context/`. Apply the same rule to the React
and Vue passthrough specs.

It stays a **vitest** spec rather than moving to e2e: attribute forwarding is a plain DOM fact a real
browser adds nothing to, unlike the three checks that genuinely need one (Tab order, `inert`
focusability, cross-root ARIA references — Phase 0). A 19-wrapper conformance matrix in Playwright
would need a bespoke demo page and couple the guard to demo content for no extra signal.

**As built:** the guard landed first (`97f8e734`) and immediately corrected the audit. **0 of 19
wrappers forward the full set**, not "22 of 24 discard ARIA with 2 exceptions": `bs-checkbox` and
`bs-radio` mirror `aria-*` via a `MutationObserver` (which the audit missed) but forward no
`role`/`id`/`tabindex`, and **`bs-carousel`/`bs-navbar` do not forward `aria-label` at all** — they
accept a bespoke `[ariaLabel]` *input*, so a consumer writing the natural attribute gets `null`. Had
the directive been written against the audit's numbers it would have been built believing two
wrappers already worked.

**The wrapper passthrough spec lands HERE, first, before the 22 wrappers are touched** — moved out
of Phase G, where it was listed. It is this phase's regression net, and a net written after the work
it guards is not a net: the whole point is to fail on the 22 Angular wrappers *before* the fix, then
go green as they land, so "forwarded" is proven rather than assumed. Same for the React
`tsc --noEmit` type-test — write it, watch it fail on the 10 known-defective wrappers, then fix them.
Spec details are in Phase G's table; only the ordering changes. Phase G keeps the axe gate, the
per-component ARIA specs and the docs.

**Localization** — route `query-builder`'s and `file-manager`'s hardcoded `aria-label`s through the
message bundles they already ship (zero design work); add label properties for the other 18
components' 44 hardcoded strings. Any interpolated announcement takes a **formatter function**, not
a prefix/suffix. Fix the one `aria-label`-defeats-localized-`title` instance
(`mp-query-group.element.ts:232-233`).

**Also here** — `bs-floating-label`: widen the projection selectors *and* wire the projected
`<label>` into the tier-2 mechanism (widening alone ships an unnamed control that looks correct);
`bs-card-img` `alt` defaults to `''` in all three wrappers.

**Acceptance**: for every component in the list, a consumer can set an accessible name from all
three frameworks and it reaches the role-bearing node; `aria-labelledby` on a wrapper host resolves
to a live element reference; no `aria-label` remains a bare English literal in a component that
parameterises its visible text.

---

## Phase C — keyboard operability and focus continuity

The largest Critical class. Several fixes already exist elsewhere in the same file.

### As-built so far (C1–C5, commits `61372f7c`…`908f108a`)

- **C1** `mp-time-list` rewritten on `RovingFocus` — the dangling host `aria-activedescendant`
  (IDREF into its own shadow root, announced nothing) replaced by real focus; host tabindex removed
  (was a second silent stop); Enter/Space became native button activation; `host.focus()` lands on
  the active option. `mp-dropdown-menu` Enter/Space synthesized ONLY where the UA is not native
  (bare `<li>` always; `<a href>` for Space); found + fixed `#valueOf` reading `HTMLLIElement`'s
  native ordinal `value` (default 0) so a bare li's `data-value` was unreachable.
- **C2** datatable: sortable headers are real `<button>`s; resize handle focusable with
  ArrowLeft/Right (same 40px floor as pointer); rows rove when selectable, ArrowUp/Down move focus,
  Enter/Space select with pointer-modifier parity. Found + fixed: **shift-range selection never
  worked** — `_focusedRowKey` was set before the range check compared against it; ranges now anchor
  on `_selectionAnchorKey`, moved only by non-shift selections.
- **C3** file-manager: Enter opens the single selection in both views (was dblclick-only); upload
  button un-gated from `pointer: coarse` (drag-drop was the only mouse/keyboard upload path);
  context menu focuses in, arrows via `RovingFocus`, focus RETURNS (deepActiveElement capture,
  `<body>` excluded — `FocusRestore` deliberately not used: it is the rebuild-continuity primitive,
  not a popup capture/return).
- **C4** scheduler month chips get the week/day treatment (role=button, tabindex, aria-label;
  focusing selects via handleFocusIn); "+N more" and year month-headers activated by a
  scheduler-level Enter/Space handler replaying the click delegation. Timeline gains opt-in
  `activatable` (roving + Enter/Space → item-click; container honestly becomes group-of-buttons —
  a listitem may not be interactive). Opt-in because listener introspection is impossible.
- **C5** tree-select search input: role=combobox, aria-haspopup=tree, LIVE aria-expanded,
  ArrowDown opens then hands focus to the embedded treeview, Escape closes unconditionally.

- **C6** (`5eaba1ea`) the nine-component small-keyboard sweep: bs-rating unset-value tab stop
  (first star holds the stop); mp-multi-range thumbs aria-disabled instead of native disabled
  (perceivable while disabled); mp-treeview composedPath guard (nested template inputs typable);
  query-builder drag handle accepts the Alt+Arrow it advertises; [bsDropdownToggle] ArrowDown
  opens-and-enters via focusFirst; [bsDropdownMenu] Escape unconditional (closeOnClickOutside gates
  pointer dismissal only); [bsTooltip] focusin/focusout + 150ms hoverable delay + addEventListener
  (property writes clobbered consumer handlers); [bsPopover] non-focusable triggers become
  role=button tabbable, panel gets bsOverlayFocus; bs-offcanvas aria-modal conditional on
  hasBackdrop + Escape closes; [bsContextMenu] Shift+F10/ContextMenu opens at the focused element,
  focus in + Escape + focus return. dropdown.aria.spec reads mp-dropdown-menu now.

- **C7 part 1** (`1440b486`): mp-pagination pages keyed by page number (a reflow cannot relabel
  the focused button); mp-tree-select chip removal re-homes focus (next chip's remove button, else
  the search input); bs-alert dismiss rescues focus to the next tabbable after the alert — all
  three only act when focus was actually inside (the scoped-capture rule).

- **C7 part 2** (`60d31731`): FocusRestore adopted in mint-dock-manager (renderLayout teardown;
  keyed data-key/data-tab-id/id) and mp-splitter (dividers keyed by position); query-builder's
  remove path re-homes focus on the PARENT group via the existing _pendingRefocusId machinery.
  **Deliberate deviation:** the scheduler's two hand-rolled restore blocks stay — correct,
  documented, keyed by domain identity, and their sync+rAF dual covers a case the primitive's
  single retry does not. The primitive prevents new hand-rolls; it does not erase good ones.

- **C8 part 1** (`f614c5a7` + `4fe24c5b`): `InitialFocusTarget` accepts a lazy callback (resolved
  at activation; null degrades to `'first'`). mp-calendar gains a `focus()` override onto its
  roving `tabindex="0"` cell (mp-time-list's C1 idiom); datepicker, timepicker and BOTH
  datetime-picker overlays wire `initialFocus` callbacks that prefer a slotted consumer
  calendar/time-list over the shadow default — opening any picker popup moves the user into the
  grid/listbox per APG Date Picker Dialog. Dialog inventory verified: tree-select's panel is
  deliberately excluded (combobox keeps focus in the input, C5) and the file-manager context menu
  was done in C3. The timepicker popup is aria-haspopup="listbox", not dialog — consistent, left.
- **C8 part 2** (`bf148ee2`): dock cancels pane move mode (with announcement) when focus leaves
  the composed dock subtree via a focusout listener; intra-dock moves keep it armed and the commit
  still applies to the pane captured at arm time.
- **C8 part 3**: signature-pad became the workspace's newest 3-fronted WC (maintainer-directed
  mid-C8). `mp-signature-pad` owns freehand drawing plus the typed-signature alternative — text
  stored on `Signature.text`, rendered onto the canvas in a script font — with Undo/Clear as real
  buttons in the tab order and `focus()` delegating to the typed input. Freehand drawing has no
  keyboard equivalent; the typed input IS the accessible alternative (documented on all three demo
  pages). Coordinate mapping goes through bitmap-size / rendered-rect, so a CSS-sized canvas
  (`width: 100%`) draws correctly. Naming follows the contract (input-label → canvas, host
  aria-label wins, default 'Signature pad') and the WC joined `_conformance/naming.spec.ts` (12th
  component); `bs-signature-pad` is now a thin wrapper (bsForwardAria, `[(signature)]` bridged by
  effect/no-loop-by-reference, joined the Angular passthrough matrix as its 20th wrapper — the
  `void MpSignaturePadElement` side-effect import is load-bearing, a type-only usage elides
  registration); React wrapper is `createComponent` (exempt from the React runtime guard by
  construction); Vue SFC is `defineModel<Signature>` + `v-bind="$attrs"` (auto-covered by the
  static invariant). No SSR chrome — same visible-only-after-hydration tier as dock/scheduler.
  `hide-typed-input` (WC attr + `hideTypedInput` wrapper input) opts OUT of the typed alternative
  for deliberate draw-only flows — opt-out, not opt-in, because the typed input is the canvas's
  only possible keyboard path; same polarity as bs-color-picker's default-true
  `showAccessibilityToggle`. Responsive trap found by live measurement at a 218px viewport: an inline-block WC host's
  shrink-to-fit floor is its content's intrinsic min width (here the controls row's text input),
  and percentage caps on inner shadow nodes cannot lower it — the HOST needs `max-width: 100%`,
  and so does any wrapper host around it (`bs-signature-pad`), because intrinsic sizing ignores
  the inner percentage cap at every level.

**Remaining in C (the ONLY C work left):** C's acceptance — the keyboard-only Playwright
walkthrough per affected component (no interaction leaves activeElement on <body>; every demo
keymap claim true).

Old item list for reference: C7 FocusRestore adoption (dock, scheduler
views via BaseView, splitter, tree-select chips, query-builder _pendingRefocusId, bs-alert,
pagination repeat keying); C8 initialFocus on the six dialogs + dock move-mode scoping +
signature-pad typed alternative.

**Pointer-only → keyboard-operable**: datatable header sort (wrap the label in a real `<button>`)
and column resize (port `13e1e03d~1:…/datatable.component.ts:634-662` nearly verbatim — same
`_columnWidths` model) and single-mode row selection; dock's 8 floating resizers (copy the
intersection handle at `:808-829`) and floating pane move/re-dock; **file-manager Enter-to-activate
in all views** and the ungating of the upload button from `pointer: coarse`; file-manager context
menu focus-in / arrow keys / focus-return; scheduler month-view events and the "+N more" button and
year drill-down; timeline `activatable`; `mp-dropdown-menu` Enter/Space on `menuitem`;
`mp-time-list` roving tabindex + `.focus()` replacing the dead `aria-activedescendant`;
tree-select combobox keyboard model (port `BsComboboxDirective`'s contract into the shadow root);
`[bsDropdown]` menu-mode ArrowDown-opens-and-enters plus unconditional Escape; popover trigger
focusability + `[bsOverlayFocus]`; context-menu `tabindex`/Shift+F10/Escape/focus-in;
tooltip `focusin`/`focusout` + hoverable delay; offcanvas `closeOnEscape` + conditional
`aria-modal`; multi-range `aria-disabled` instead of native `disabled`; `bs-rating`'s unset-value
tab stop; treeview's `composedPath()[0] !== row` guard so consumer node templates keep their keys;
query-builder's Alt+Arrow guard accepting the drag handle that advertises it.

**Focus continuity** — adopt `FocusRestore` in `mint-dock-manager` (intersection handles by
`data-key`; panes by the normalised `${tabId}-header-button`), all five scheduler views (via
`BaseView`, collapsing the four hand-rolled rAF blocks), `mp-splitter`, `mp-tree-select` (chips);
plus `mp-query-builder`'s remove paths setting `_pendingRefocusId` (the machinery already exists),
`bs-alert` on dismiss, and `mp-pagination` keying `repeat()` by page so reflow does not silently
relabel the focused button.

**Escape/dialog** — wire `initialFocus` on the six `role="dialog"` popups (pickers focus the
selected date cell per APG); scope the dock's move mode to the originating tab and clear it on
`focusout`.

**Signature-pad** ships a typed-signature alternative plus Clear/Undo in the tab order; document
honestly that freehand drawing has no keyboard equivalent. *(As built, this grew into the full WC
migration — decision D6; see the C8 part 3 as-built block above.)*

**Acceptance**: a keyboard-only Playwright walkthrough per affected component proves every control
a mouse user can see is focusable and activatable; no interaction leaves `document.activeElement`
on `<body>`; every demo keymap panel claim is true (the false ones are §4.10).

---

## Phase D — hidden content, the no-JS tiers, and SSR chrome

Independent of B and C. Carries decision D1.

**Hidden-but-reachable** — apply the `mp-navbar` `visibility` rule (§5.6) to `.accordion-clip` and
to the carousel's no-JS per-index CSS; mirror the shell's state matrix a second time to set
`visibility` (its open state is a custom-property value, which CSS cannot select on). Adopt
`inertRegions` for the carousel's JS tier including the two teleport clone cells, and add a static
`inert` to `bs-priority-nav`'s measurement clone (`visibility: hidden` also works there —
measurement needs geometry, not visibility; `display: none` would zero the measurements).

**The accordion rewrite (D1)** — `mp-accordion` moves to `<details name>` + `<summary>` in both
tiers. This is the largest single item in the plan and it **removes** more than it adds:

| Delete | Replace with |
|---|---|
| `#renderJsItem` + `#renderNoJsItem` (two templates) | one template |
| the clipped `<input type=radio\|checkbox>` machine and every `:checked` selector | `<details ?name=${!multi ? 'acc' : nothing}>` |
| the `data-js` branch in this component | — (state is UA-owned in both tiers) |
| `grid-template-rows` animation + `.accordion-clip` + its reduced-motion guard | — (animation waived under D1) |
| the §4.5 `visibility` fix for collapsed panels | — (`<details>` removes closed content from both trees natively) |
| `role="heading"` + `aria-level` on the header | **nothing** — the known D1 trade; see the SR check below |

Preserve, and re-point at `[open]` instead of `:checked`: the destructive DSD handoff reading
pre-upgrade state onto the light-DOM `is-active` markers; `#setActive` / `closeAll` / the nested
recursive close, now driven from the `toggle` event rather than clicks; the
`mp-accordion-tab-toggle` event contract and detail shape; `aria-controls`↔`aria-labelledby`
round-trips in the chrome; `multi` semantics, which reduce to the presence or absence of `name`.
Bootstrap styling: `display: flex` + `list-style: none` + `::marker { content: '' }` +
`::-webkit-details-marker { display: none }` on `<summary>`; `.accordion-button`'s `::after`
chevron is unaffected. Regenerate the `[multi] × [count]` chrome — index-named slots still need
count variants. **Rewrite `mp-accordion.spec.ts` first, then the element**, and add an
NVDA + VoiceOver check specifically on whether losing heading navigation is acceptable in practice;
if not, the reversal is `role="heading"` + `<button aria-expanded>` in the hydrated branch only.
Angular/React/Vue wrappers and the three demo pages follow.

**Tier 1 machines** — the accordion is no longer one of these. `bs-tab-control` and
`bs-priority-nav` SSR branches: swap `d-none` for the 1px-clip class, move
`role`/`aria-selected`/`aria-controls`/`aria-haspopup` onto the input, strip `role`/`tabindex` from
the `<label>`, paint the focus ring via a sibling selector. `mp-navbar`: emit the checkbox
**without** `role="button"`/`aria-expanded` in the static chrome (native `checked` is a correct
self-updating channel) and upgrade in `connectedCallback`. `mp-shell`: `id` on the `<aside>` +
`aria-controls` on the input (both in the same shadow root — the one place a shadow-internal IDREF
is trivially available and unused), `aria-expanded` under `data-js` driven by `#cssOpen()` **not**
the inverted raw `checked`, plus the missing `:focus-visible` ring and a `prefers-reduced-motion`
guard.

**Also**: `mp-shell` gains landmark roles for topbar/content and **a skip link** — there is none
anywhere in the repo, so WCAG 2.4.1 (Level A) is unmet for every app built on `bs-shell`.

**SSR chrome** — give `inject-mp-dropdown-dsd.ts` a spec **first**, then a traversal that stamps
`role="menuitem"`/`option` (read from the host's `mode`) on depth-0 items; carousel injector stamps
`slot="s{i}"` (reusing `countSlides`) and the generator gates `aria-current` behind `isBrowser`;
accordion injector stamps `heading-level` and treats `<mp-accordion-tab>` by tag name so vanilla
markup matches wrapper output. Deliver `role="listitem"` for navbar items **statically from the
wrappers**, not from `connectedCallback`, or it will be absent from the DSD.

**Acceptance**: with JS disabled, in all three demo apps — no collapsed region's content is
readable or focusable; every no-JS control is keyboard-operable; no role ships without its required
owned children; no ARIA attribute states something false. Asserted in the existing
`javaScriptEnabled: false` suites.

---

## Phase E — state, structure, live regions, validity

Depends on A (roving focus) and B (tier-2 mixin, for `aria-errormessage`).

### `mp-navbar-dropdown`'s `aria-expanded` — confirmed defect, exact mechanism

Raised as a question mid-Phase-B ("does the migration also add `aria-haspopup` and update the
dropdown-open state?") and worth writing down precisely, because the attributes *are already there*
and still do not work — which is the hardest kind of finding to spot in review.

`aria-haspopup="menu"` is correct and static, so it needs nothing. `aria-expanded` is the problem
(`mp-navbar-dropdown.ts:215` and `:47-54`):

- `render()` emits a **literal** `aria-expanded="false"`, not a binding.
- `attributeChangedCallback` then patches it imperatively:
  `this.renderRoot?.querySelector('.dropdown-toggle')?.setAttribute('aria-expanded', …)`.

Two writers, and the imperative one loses the race that matters. When `data-open` is already present
before the first render — SSR/DSD markup for an initially-open dropdown, or an attribute set before
upgrade — the callback fires while `renderRoot` is still undefined, the optional chain swallows the
write, and the subsequent first render stamps `false`. No further callback fires, because the
attribute did not change again. **The dropdown then announces "collapsed" for its entire life while
visibly open.** The no-JS tier is worse: nothing updates the attribute at all, so a CSS-driven open
panel is always announced collapsed.

Fix, and it is the §11a rule rather than a patch: **derive it in `render()` from `#anyOpen` and delete
the imperative write.** One writer, correct at every moment, correct on the first paint, and correct
under SSR because the same expression runs there. Where a native disclosure can own the state instead
(`<details>`/`<summary>`, per D1 and the `mp-dropdown` design), prefer that — the UA then exposes the
expanded state itself and there is no attribute to keep in sync at all.

Audit the same shape elsewhere before assuming this is the only instance: `mp-datepicker.element.ts:175`
and `mp-datetime-picker.element.ts:425,437` bind `aria-expanded` from an **expression**, which is
correct; the navbar dropdown is the one that hardcodes it. Grep for a literal
`aria-expanded="false"` in a template as the signature.

**Roles and structure** — datatable `role="grid"` per D2; file-manager icon grid → `listbox`/
`option` with roving focus; priority-nav drops `role="menu"`/`menuitem` for plain disclosure +
list; scheduler adds `role="presentation"` to the un-roled wrappers breaking the grid chain and a
`applyGridRoles()` helper in `base-view.ts` giving week/day/month/year the containers,
`columnheader`s and `rowheader`s their cells already assume (closing
`wc-aria-accessibility.md` step 5.7); `bs-tab-page` drops its four duplicate ARIA host bindings on
the client path; ribbon tab↔tabpanel — render the panel wrapper inside `mp-ribbon`'s shadow root so
both ends of the relationship are minted in one `render()` (the `mp-tab-control` pattern), rather
than the cheaper `aria-label`-string mitigation; `mp-ribbon-gallery` moves `role="option"` onto the
item host; navbar `role="listitem"`; dock drops `role="application"` for
`role="region"` + a label.

**State tokens** — `aria-current="page"` on navbar items and dropdown triggers (plus the Angular
`RouterLinkActive` bridge for leaf items); `aria-current="date"` on the scheduler's `.today` in all
four views; **replace the scheduler's `aria-current="true"`-for-selection with `aria-selected`**;
`aria-multiselectable` on multi-select `mp-treeview`; `aria-expanded` on the accordion's no-JS
input; `aria-pressed` always written, not only when true; `aria-level` on query-builder groups;
`aria-valuenow`/`min`/`max` on `bsResizeGlyph` and the dock intersection handle; `aria-valuetext`
on the splitter; `aria-colcount`/`aria-colindex` on the datatable **as the prerequisite it is** for
any future column hiding/reordering.

**Live regions** — adopt `LiveAnnouncerController` in `mp-datatable` (sort, page, selection count,
loading→loaded with row count, `aria-busy` while fetching), `mp-file-manager` (upload
start/complete/**fail** at `assertive`, delete, paste, new folder, rename, search count),
`mp-tree-select` (result count, chip add/remove with the item name, clear, `aria-busy`),
`mp-treeview` (lazy load start/finish/**error**, the error as `aria-describedby` text not a
`title`), `mp-scheduler`'s `setLoading`. Angular: route `bs-toast` through
`BsLiveAnnouncerService` (its container has no `aria-live` and the first toast attaches region and
text in one task), make `bs-alert`'s `role` opt-in and default it off, announce `[bsCopy]`
completion in the directive, fix `bs-placeholder` (skeleton `aria-hidden`, drop the
subtree-wide `aria-live`), give `mp-code-snippet`'s copy toast `role="status"`, and remove
`aria-live`+`aria-label` from `mp-file-manager`'s static drop overlay. **Never** add `aria-live` to
an existing conditional block — the region must be rendered unconditionally and only its text may
change.

**Validity** — the four missing `onTouched` calls **first** (`checkbox`, `checkbox-group`,
`radio-group`, `range`), then `invalid`/`required` attributes on the WC form controls mapped to
`aria-invalid`/`aria-required` (copy `mp-otp-input:385`), then the Angular wrappers mirroring
`NgControl.invalid && touched`, then `aria-errormessage` pointing at an in-shadow node.

**Retire the duplicated roving-focus arithmetic.** `BsRovingFocusDirective` predates the WC
`RovingFocus` controller and had independently identical `step` / `firstEnabledIndex` /
`lastEnabledIndex` logic — already drifted on the wrap-vs-clamp default. Phase A extracted the pure
index math (`nextEnabledIndex`, `firstEnabledIndex`, `lastEnabledIndex` in
`@mintplayer/web-components/a11y`) and moved the WC controller onto it; **point the Angular
directive at the same functions here**, deleting its private copies. Its 190-line spec is the
regression net, so it should stay green untouched.

Deliberately **not** collapsing the two into one class, for two concrete reasons rather than taste:
the Angular directive writes `tabindex` through a host binding on each item directive while the
controller writes `el.tabIndex` imperatively, so delegating wholesale would put **two writers on one
attribute** — the hazard already documented at `otp-input.component.ts:124-131`; and the directive's
`activedescendant` mode is *correct* for its light-DOM consumers (`bs-typeahead`,
`bs-dropdown`'s combobox), where IDREFs resolve fine. The WC controller omits that mode because it
cannot work across a shadow boundary, which is a constraint of shadow DOM, not a judgment that
activedescendant is wrong. Angular keeps its content-query discovery, its signals, and that mode.

**`<mp-radio-group>`** — after `mp-radio` exposes its inner input's `tabindex` (`delegatesFocus`
means host `tabindex="-1"` does not remove the inner input from the tab order). Roving tabindex
with the tab stop on the **first enabled radio when nothing is checked**, arrow move-and-select
with wrap and RTL inversion (copy `mint-multi-range:277`), Home/End, `aria-posinset`/`-setsize`.
`[bsRadioGroup]` becomes the CVA adapter. `[bsCheckboxGroup]` gets `role="group"` + a label input
and **nothing more**.

**Also** — tile-manager: preview-based move mode so Escape genuinely reverts, `aria-pressed` +
reactive move-mode state, `aria-describedby` moved from the region **onto the tiles**; dock: the
full drop-target enumeration for keyboard moves and announcements guarded on actual success;
`prefers-reduced-motion` for `spinner` (stop re-declaring the `animation` shorthand after the
Bootstrap import — that is what discards Bootstrap's reduce override), `placeholder`,
`progress-bar`, `shell`, `tree-select`, `query-builder`; `bs-alert-close` re-implemented over
`bs-close`; `bs-badge` `unit`/`decorative`; `bs-card-title` `level`; `bs-list-group-item`
`active`/`disabled`; `bs-progress-bar` `valueText`; `mp-calendar`'s corner `<th>` un-hidden and its
month-nav buttons lifted out of the grid; `bs-marquee` pause control + a role that supports
naming; carousel play/pause moved first in DOM order, pause-on-hover/focus, and prev/next per
§4.1's precedent; `mp-select` `<optgroup>` support; `bs-scrollspy`'s duplicate `title`;
`mp-toast`'s scroll-blocking overlay and its non-firing dismiss button.

**Acceptance**: every state a component maintains is exposed on the element carrying the role and
updates in the same render; every async transition announces; the token used is justified against
the container role; no `role` remains without its pattern's keyboard model.

---

## Phase F — form association (per D5)

`FormAssociatedMixin` in `libs/mintplayer-web-components/a11y/`, sharing the `attachInternals()`
call with `HostAriaController` — the two must not fight over it. `setFormValue` (with a separate
restorable state where they differ), `setValidity` anchored to a **focusable in-shadow element**
(`delegatesFocus` is already set on every choice control, so this is straightforward),
`formResetCallback`, `formDisabledCallback`, `formStateRestoreCallback`, and the proxy getters.

**One internal `#disabled` source of truth** with `formDisabledCallback` and the CVA both funnelling
into it, neither writing the DOM attribute — the repo has already been bitten by this exact shape
(`otp-input.component.ts:124-131`). Adopt in `mp-checkbox` first, then spread. `<mp-radio-group>` is
the form-associated element for radios, not the individual radios.

This repairs the already-dead `name` API and makes these controls contribute to React 19 form
Actions and to plain-`<form>` submission. Nothing WCAG-blocking waits on it.

---

## Phase G — guards, CI, documentation

Specs land **with** each phase; this phase adds what is cross-cutting and closes out.

| Item | Detail |
|---|---|
| `*.aria.spec.ts` per element-bearing WC | 20 of 30 have none; 9 have no spec file at all. Assert role, name and **each state transition**. Use `expectIdrefResolves` for every IDREF |
| ~~Wrapper passthrough spec ×3~~ | **Moved to Phase B** — it guards B's work and must precede it. Spec shape: `import.meta.glob` enumeration so new wrappers are covered with zero edits; opt-out and required-children registries as literal arrays *in the spec*; the load-bearing assertion is that the element receiving the probe `id` has a tag matching `MP-`/`MINT-`. Add `test` targets + `vite.config.mts` to the React and Vue libs (vitest + jsdom, `--pool=threads`); no new dependencies |
| ~~React type-test target~~ | **Moved to Phase B.** `tsc --noEmit` over a committed probe, one line per exported wrapper, probing **`role`/`id`/`tabIndex` — never `aria-*`**, because TypeScript exempts hyphenated JSX attribute names from excess-property checking and an `aria-*` probe passes vacuously on every broken wrapper. Put that sentence in a comment at the top of the probe |
| `e2e-a11y` axe target ×3 apps | Table-driven over a route list; `withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice'])`; fail on `critical` + `serious`; two states per route (load + one interaction); **plus a `javaScriptEnabled: false` pass**. Separate CI step so `nx affected` cannot silence it. Per-route allow-list with issue links, never a lowered threshold |
| Keyboard-only walkthrough | One Playwright spec per interactive component: every visible control focusable and activatable. This is the gate that would have caught all seven migration regressions. **It must also assert the inverse — that a composite widget is exactly ONE tab stop.** "Every control is reachable" is necessary and not sufficient: a widget where *every* item is tabbable satisfies it and is still broken, which is literally the `mp-time-list` 97-tab-stops and file-manager 201-tab-stops findings. Nothing in the repo asserts this invariant today |
| `tools/e2e-shared/roving-focus-suites.ts` | Parameterised suite matching the existing `accordion-suites.ts` / `carousel-suites.ts` shape, run from all three demo apps against every component that adopts `RovingFocus`: enter → exactly one Tab lands inside → arrows move within → one Tab exits; Home/End; disabled items skipped; Alt/Ctrl/Meta chords **not** intercepted. Written per-consumer as the primitive is adopted in C and E, not against a synthetic fixture — a harness page would test assumptions rather than real usage, and the repo's convention is to verify through the wrappers and demo apps |
| `CLAUDE.md` `## Accessibility` | Eleven rules + the two no-JS tier rules + a six-item pre-PR checklist, inserted after `## Framework wrappers`. Text drafted in the audit; keep it ruthlessly concise |
| Demo keymap parity | Port the `<details>Keyboard shortcuts</details>` panels to the React and Vue dock / scheduler / tile-manager / timeline / splitter pages (only Calendar and Ribbon have one today); add the missing ng timeline panel; **correct the false claims** in the tile-manager and file-manager panels |
| Stale-doc fixes | `swiper-aria.md`, `aria-accessibility-audit.md` §13.2 (reduced-motion directive, carousel structural directive), `navbar-noscript.md` — fix the prose; do **not** re-implement deleted APIs. Delete or re-document the zero-consumer `BsReducedMotionDirective` |
| Spike cleanup | Delete `_spike-*` directories and the temporary accordion comparison route; record each spike's verdict in the PRD (especially 0.1, which may have narrowed D1) |
| PRD status | Flip both documents to as-built; record D1–D5 as resolved with outcomes; update the memory of record |

Then the single sweep: `nx build` for all four libs, `nx test mintplayer-web-components`,
`nx test mintplayer-ng-bootstrap`, the new React/Vue test targets, the React type-test, and the
full e2e + `e2e-a11y` matrix across all three demo apps.

---

## Acceptance criteria (programme level)

- [ ] All three Phase-0 spikes concluded, each with a written verdict in the PRD; spike artifacts
      and the temporary demo route deleted, and any assertion worth keeping moved into a real spec.
- [ ] All 42 Critical findings closed; all ~110 Major closed or explicitly deferred with a reason.
- [ ] **Every exposed state is live** (PRD §11a): for each state attribute touched, a spec asserts
      it after a *transition*, not only at first render — including programmatic changes, not just
      user-driven ones. No attribute is written from an event handler as a side effect.
- [ ] **Criteria are observable, never attribute presence.** For each closed finding: what a screen
      reader says, and where focus lands. "Present but inert" is this library's characteristic
      failure and it passes attribute-level assertions by construction.
- [ ] A consumer can set an accessible name, description and `id` on **every** component from
      **all three** frameworks, and it reaches the role-bearing node.
- [ ] No component has a pointer-only path to any of its functions.
- [ ] No interaction anywhere leaves focus on `<body>`.
- [ ] With JS disabled, no component's static markup states anything false, and every no-JS control
      is keyboard-operable.
- [ ] Every element-bearing WC has an ARIA spec asserting states, not just initial render.
- [ ] The `e2e-a11y` gate is green (with a documented allow-list) and cannot be skipped by
      `nx affected`.
- [ ] `CLAUDE.md` carries the rules; every demo keymap panel claim is true.
- [ ] NVDA (Windows/Chrome) and VoiceOver (macOS/Safari) spot checks on the ten highest-traffic
      components confirm the observable criteria — axe would have caught none of the data-display
      Criticals, so it is a floor, not the gate.

## Build and test commands

```bash
npx nx build mintplayer-web-components        # runs codegen-wc + cem
npx nx build mintplayer-ng-bootstrap
npx nx build mintplayer-react-bootstrap
npx nx build mintplayer-vue-bootstrap
npx nx test mintplayer-web-components         # vitest + jsdom, --pool=threads on Windows
npx nx test mintplayer-ng-bootstrap
npx nx test mintplayer-react-bootstrap        # NEW target (Phase G)
npx nx test mintplayer-vue-bootstrap          # NEW target (Phase G)
npx nx run mintplayer-react-bootstrap:typecheck-a11y   # NEW (Phase G)
npx nx run mintplayer-web-components:codegen-wc                 # after any .scss/.html edit
npx nx run mintplayer-web-components:codegen-ssr-chrome         # after any shadow markup edit
npx nx run-many --target=e2e-a11y                               # NEW (Phase G)
```

`NX_ISOLATE_PLUGINS=false NX_DAEMON=false` if the Nx plugin worker flakes.

**Phase 0's spikes** are plain Playwright, outside Nx, and need no dev server — run any of the four
directly (drop `--project` to sweep all three engines):

```bash
npx playwright test --config libs/mintplayer-web-components/_spike-host-aria/playwright.config.ts
npx playwright test --config libs/mintplayer-web-components/_spike-inert-roving/playwright.config.ts
npx playwright test --config libs/mintplayer-web-components/_spike-details-accordion/playwright.config.ts
npx playwright test --config libs/mintplayer-web-components/_spike-form-disabled/playwright.config.ts
```

Their specs are named `*.spike-test.ts`, **not** `*.spec.ts`, and each config sets `testMatch`
accordingly. That is deliberate: the `mintplayer-web-components` vitest target matches any `.spec.ts`
or `.test.ts` under the lib and runs it in **jsdom**, so a conventionally-named spike spec would be
swept into `nx test` and fail on its `@playwright/test` import. Two traps worth not rediscovering: the
`_spike-*` dirs must contain no `src/index.ts`, or `vite.config.mts` auto-discovers them as published
sub-entrypoints; and `/test-results` in `.gitignore` is **root-anchored**, so Playwright output
written under `libs/mintplayer-web-components/` is not ignored — delete it rather than committing it.

## Key references

PRD §5 for every design decision and §11 for D1–D5. Reference implementations to copy rather than
redesign: `mp-navbar` (Tier-1 machine + the geometric-hiding `visibility` rule, with the comment
explaining the directional delay), `mp-accordion` (`data-js` two-tier branch), `mp-treeview`
(shadow composite), `mp-splitter` (APG Window Splitter, incl. `updateDividerAriaValues`),
`mp-calendar` (date grid + `aria-current="date"`), `mp-pagination` (host-`aria-label` mirroring),
`mp-datetime-picker` (six parameterised labels + `announceValue`), `mp-code-snippet:253` and
`mp-calendar:358` (persistent live regions), `mp-scheduler`'s move mode (preview-then-commit — the
model tile-manager should have copied), `inject-mp-carousel-dsd.ts:48-57` (`stampHostA11y`),
`mint-dock-manager.element.ts:808-829` (the focusable resize handle its own floating resizers
should copy), `BsComboboxDirective`, `BsOverlayFocusDirective`, `BsOverlayStackService`,
`breadcrumb.aria.spec.ts:43-53` (asserting the *value* of a state token, not just its presence).

Deleted templates that are working specifications: `13e1e03d~1:…/datatable.component.ts:634-662`
(keyboard column resize against the same model the WC uses), `13e1e03d~1:…/datatable.component.html`
(header sort keyboard), `207d85f7~1:…/carousel.component.html:60-107` (real button controls),
`17328c57~1:…/navbar-item.component.html:1` (real `<li>`), `e5bc071e~1:…/searchbox.component.ts:47`
(the `ariaLabel` input — and **only** that; the rest of those controls was poor).
