import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import {
  BsNavbar,
  BsNavbarBrand,
  BsNavbarItem,
  BsNavbarDropdown,
} from '@mintplayer/react-bootstrap/navbar';
import { BsDropdownMenu, BsDropdownItem } from '@mintplayer/react-bootstrap/dropdown-menu';

const NAVBAR_SOURCE = `<BsNavbar breakpoint="lg" color="body-tertiary" aria-label="Demo navigation">
  <BsNavbarBrand slot="brand">
    <a href="/">MintPlayer</a>
  </BsNavbarBrand>

  <BsNavbarItem active>
    <a href="/home">Home</a>
  </BsNavbarItem>
  <BsNavbarItem>
    <a href="/features">Features</a>
  </BsNavbarItem>
  <BsNavbarItem disabled>
    <a href="/pricing">Pricing</a>
  </BsNavbarItem>

  <BsNavbarDropdown>
    <span slot="label">Products</span>
    <BsDropdownMenu>
      <BsDropdownItem><a href="/products/web">Web components</a></BsDropdownItem>
      <BsDropdownItem><a href="/products/angular">Angular bootstrap</a></BsDropdownItem>
      <BsDropdownItem><a href="/products/react">React bootstrap</a></BsDropdownItem>
    </BsDropdownMenu>
  </BsNavbarDropdown>

  <BsNavbarItem slot="end">
    <a href="/login">Sign in</a>
  </BsNavbarItem>
</BsNavbar>`;

export function NavbarPage() {
  return (
    <div className="demo-page">
      <h1>Navbar</h1>
      <p className="text-body-secondary">
        A responsive Bootstrap <code>.navbar</code>. The bar chrome (hamburger
        toggle + collapsible region) lives in the WC's shadow root and collapses
        below the <code>breakpoint</code> via a pure-CSS state machine, so it
        works server-rendered with JavaScript disabled. Place the brand in{' '}
        <code>&lt;BsNavbarBrand slot="brand"&gt;</code>, left items as default{' '}
        <code>&lt;BsNavbarItem&gt;</code> children, and right-aligned items with{' '}
        <code>slot="end"</code>. A <code>&lt;BsNavbarDropdown&gt;</code> opens a{' '}
        <code>&lt;BsDropdownMenu&gt;</code> panel.
      </p>

      <section data-demo="navbar">
        <h2>Navbar</h2>
        <BsNavbar breakpoint="lg" color="body-tertiary" aria-label="Demo navigation">
          <BsNavbarBrand slot="brand">
            <a href="/">MintPlayer</a>
          </BsNavbarBrand>

          <BsNavbarItem active>
            <a href="/home">Home</a>
          </BsNavbarItem>
          <BsNavbarItem>
            <a href="/features">Features</a>
          </BsNavbarItem>
          <BsNavbarItem disabled>
            <a href="/pricing">Pricing</a>
          </BsNavbarItem>

          <BsNavbarDropdown>
            <span slot="label">Products</span>
            <BsDropdownMenu>
              <BsDropdownItem>
                <a href="/products/web">Web components</a>
              </BsDropdownItem>
              <BsDropdownItem>
                <a href="/products/angular">Angular bootstrap</a>
              </BsDropdownItem>
              <BsDropdownItem>
                <a href="/products/react">React bootstrap</a>
              </BsDropdownItem>
            </BsDropdownMenu>
          </BsNavbarDropdown>

          <BsNavbarItem slot="end">
            <a href="/login">Sign in</a>
          </BsNavbarItem>
        </BsNavbar>
        <BsCodeSnippet code={NAVBAR_SOURCE} language="tsx" />
      </section>
    </div>
  );
}
