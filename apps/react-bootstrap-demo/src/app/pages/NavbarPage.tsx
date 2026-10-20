import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
import { BsNavbar, BsNavbarDropdown, BsNavbarItem, BsNavbarNav } from '@mintplayer/react-bootstrap/navbar';

const NAVBAR_SOURCE = `<BsNavbar breakpoint="lg" color="body-tertiary" aria-label="Demo navigation"
  brand={<a href="/">MintPlayer</a>}>
  <BsNavbarNav>
    <BsNavbarItem active><a href="/home">Home</a></BsNavbarItem>
    <BsNavbarItem><a href="/features">Features</a></BsNavbarItem>
    <BsNavbarItem disabled><a href="/pricing">Pricing</a></BsNavbarItem>

    <BsNavbarDropdown label="Products">
      <BsNavbarItem><a href="/products/web">Web components</a></BsNavbarItem>
      <BsNavbarItem><a href="/products/angular">Angular bootstrap</a></BsNavbarItem>
      <BsNavbarItem><a href="/products/react">React bootstrap</a></BsNavbarItem>
    </BsNavbarDropdown>
  </BsNavbarNav>

  <BsNavbarNav align="end">
    <BsNavbarItem><a href="/login">Sign in</a></BsNavbarItem>
  </BsNavbarNav>
</BsNavbar>`;

export function NavbarPage() {
  return (
    <div className="demo-page">
      <h1>Navbar</h1>
      <p className="text-body-secondary">
        <code>BsNavbar</code> renders Bootstrap's navbar markup from the headless{' '}
        <code>@mintplayer/ui-core/navbar</code> core, server-side included. The responsive
        collapse is a checkbox and every dropdown a native <code>&lt;details&gt;</code>, so the
        bar works with JavaScript off. Pass the brand as the <code>brand</code> prop, group
        entries in a <code>BsNavbarNav</code> (<code>align="end"</code> pushes a group to the far
        edge), and use <code>BsNavbarItem</code> for every entry — a nav-link in a group, a menu
        item inside a <code>BsNavbarDropdown</code>.
      </p>

      <section data-demo="navbar">
        <h2>Navbar</h2>
        <BsNavbar breakpoint="lg" color="body-tertiary" aria-label="Demo navigation" brand={<a href="/">MintPlayer</a>}>
          <BsNavbarNav>
            <BsNavbarItem active>
              <a href="/home">Home</a>
            </BsNavbarItem>
            <BsNavbarItem>
              <a href="/features">Features</a>
            </BsNavbarItem>
            <BsNavbarItem disabled>
              <a href="/pricing">Pricing</a>
            </BsNavbarItem>

            <BsNavbarDropdown label="Products">
              <BsNavbarItem>
                <a href="/products/web">Web components</a>
              </BsNavbarItem>
              <BsNavbarItem>
                <a href="/products/angular">Angular bootstrap</a>
              </BsNavbarItem>
              <BsNavbarItem>
                <a href="/products/react">React bootstrap</a>
              </BsNavbarItem>
            </BsNavbarDropdown>
          </BsNavbarNav>

          <BsNavbarNav align="end">
            <BsNavbarItem>
              <a href="/login">Sign in</a>
            </BsNavbarItem>
          </BsNavbarNav>
        </BsNavbar>
        <BsCodeSnippet code={NAVBAR_SOURCE} language="tsx" />
      </section>
    </div>
  );
}
