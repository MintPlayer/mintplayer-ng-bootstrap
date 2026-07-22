import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpNavbarBrand } from '@mintplayer/web-components/navbar';

export interface BsNavbarBrandProps {
  /** Always `"brand"` to project into the navbar's brand slot. */
  slot?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * React wrapper for `<mp-navbar-brand>` — the navbar brand/logo. Place it with
 * `slot="brand"` and slot a link (`<a href>` / router `<Link>`) or text as its
 * child; it is styled as a Bootstrap `.navbar-brand`. Renders the custom element
 * directly so it projects cleanly. Side-effect-registers the WC on import.
 *
 *     <BsNavbarBrand slot="brand"><a href="/">MyApp</a></BsNavbarBrand>
 */
export const BsNavbarBrand = createComponent({
  react: React,
  tagName: 'mp-navbar-brand',
  elementClass: MpNavbarBrand,
}) as unknown as React.ForwardRefExoticComponent<
  BsNavbarBrandProps & React.RefAttributes<MpNavbarBrand>
>;
