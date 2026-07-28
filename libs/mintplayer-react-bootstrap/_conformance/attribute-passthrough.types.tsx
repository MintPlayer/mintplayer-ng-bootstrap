import * as React from 'react';

import { BsAccordion, BsAccordionItem } from '@mintplayer/react-bootstrap/accordion';
import { BsCarousel } from '@mintplayer/react-bootstrap/carousel';
import { BsDropdownMenu } from '@mintplayer/react-bootstrap/dropdown-menu';
import { BsNavbar, BsNavbarBrand, BsNavbarDropdown, BsNavbarItem } from '@mintplayer/react-bootstrap/navbar';
import { BsShell } from '@mintplayer/react-bootstrap/shell';
import { BsTimeline } from '@mintplayer/react-bootstrap/timeline';

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
  <BsAccordion role="none" id="a" tabIndex={-1} />,
  <BsAccordion>
    <BsAccordionItem header="H" role="none" id="ai" tabIndex={-1} />
  </BsAccordion>,
  <BsCarousel role="none" id="c" tabIndex={-1} />,
  <BsDropdownMenu role="none" id="dm" tabIndex={-1} />,
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
  <BsTimeline role="none" id="t" tabIndex={-1} />,
];

/**
 * The counter-example, kept so the reason for the rule above stays visible: this
 * compiles even against a props type that declares none of it, because the name is
 * hyphenated. Never build a passthrough probe out of these.
 */
export const vacuousProbe = <BsCarousel aria-label="proves nothing" aria-invented="also fine" />;
