import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SNIPPET_BASIC = `import { BsShell } from '@mintplayer/react-bootstrap/shell';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <BsShell breakpoint="md" size="14rem" className="app-shell">
      {/* The shell renders the hamburger at the top bar's left;
          this slot fills the rest (brand, nav, …). */}
      <div slot="topbar">Brand · nav</div>

      {/* Anything with slot="sidebar" becomes the collapsible sidebar. */}
      <nav slot="sidebar">…links…</nav>

      {/* Every other child is the main content area. */}
      <main>{children}</main>
    </BsShell>
  );
}`;

const SNIPPET_HEIGHT = `/* The shell becomes its own scroll region (top bar + sidebar stay put,
   only the content scrolls) ONLY when the host has a bounded height —
   otherwise it grows to fit its content. Give it the viewport height;
   className/style on <BsShell> fall through to the underlying element. */
.app-shell {
  height: 100dvh;
}`;

const SNIPPET_STATE = `import { useState } from 'react';
import { BsShell } from '@mintplayer/react-bootstrap/shell';

function Layout() {
  // 'auto' is responsive; 'show'/'hide' force the sidebar open/closed.
  const [state, setState] = useState<'auto' | 'show' | 'hide'>('auto');

  return (
    <BsShell
      breakpoint="md"
      state={state}
      onStatechange={(e) => setState(e.detail.open ? 'show' : 'hide')}
    >
      <nav slot="sidebar">…</nav>
      <main>…</main>
    </BsShell>
  );
}`;

const SNIPPET_EXTERNAL = `// Hide the built-in hamburger and drive the toggle from your own control.
<BsShell externalToggle breakpoint="md">
  <nav slot="sidebar">…</nav>
  <main>…</main>
</BsShell>`;

export function ShellPage() {
  return (
    <div className="demo-page">
      <h1>Shell</h1>
      <p className="text-body-secondary">
        <code>BsShell</code> is a responsive app-shell layout with a collapsible
        sidebar. Place the sidebar as a child with <code>slot="sidebar"</code>;
        every other child is the main content area. It is server-rendered as
        Declarative Shadow DOM, so the sidebar and its hamburger toggle work with
        JavaScript disabled. The chrome around this very page is a live{' '}
        <code>BsShell</code>.
      </p>

      <section>
        <h2>Basic usage</h2>
        <p>
          A full-width top bar (built-in hamburger + <code>topbar</code> slot)
          sits above the sidebar/content row. <code>breakpoint</code> sets the
          viewport width at/above which the sidebar is expanded; <code>size</code>{' '}
          is the expanded width.
        </p>
        <BsCodeSnippet code={SNIPPET_BASIC} language="tsx" />
      </section>

      <section>
        <h2>Full-height layout</h2>
        <p>
          The content is the scroll region only when the host has a bounded
          height. Give <code>BsShell</code> a viewport height — anything you pass
          via <code>className</code> or <code>style</code> falls through to the
          element.
        </p>
        <BsCodeSnippet code={SNIPPET_HEIGHT} language="css" />
      </section>

      <section>
        <h2>Controlled state</h2>
        <p>
          Leave <code>state</code> as <code>"auto"</code> for responsive
          behaviour, or drive it yourself and react to{' '}
          <code>onStatechange</code> (its <code>detail.open</code> is the
          resolved visual state).
        </p>
        <BsCodeSnippet code={SNIPPET_STATE} language="tsx" />
      </section>

      <section>
        <h2>External toggle</h2>
        <p>
          Set <code>externalToggle</code> to hide the built-in hamburger and
          toggle the shell from your own button.
        </p>
        <BsCodeSnippet code={SNIPPET_EXTERNAL} language="tsx" />
      </section>

      <section>
        <h2>API</h2>
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Prop</th>
              <th>Type</th>
              <th>Default</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>state</code></td>
              <td><code>'auto' | 'show' | 'hide'</code></td>
              <td><code>'auto'</code></td>
              <td>Sidebar visibility; <code>auto</code> is responsive.</td>
            </tr>
            <tr>
              <td><code>breakpoint</code></td>
              <td><code>'xs'…'xxl'</code></td>
              <td><code>'md'</code></td>
              <td>Viewport width at/above which <code>auto</code> expands the sidebar.</td>
            </tr>
            <tr>
              <td><code>size</code></td>
              <td>CSS length</td>
              <td><code>15rem</code></td>
              <td>Expanded sidebar width (also settable via <code>--mp-shell-size</code>).</td>
            </tr>
            <tr>
              <td><code>externalToggle</code></td>
              <td><code>boolean</code></td>
              <td><code>false</code></td>
              <td>Hide the built-in hamburger; drive the toggle from your own control.</td>
            </tr>
            <tr>
              <td><code>onStatechange</code></td>
              <td><code>(e: CustomEvent&lt;{'{'} open: boolean {'}'}&gt;) =&gt; void</code></td>
              <td>—</td>
              <td>Fires when the toggle flips.</td>
            </tr>
          </tbody>
        </table>
        <p className="text-body-secondary">
          Slots: <code>topbar</code>, <code>sidebar</code>, and the default
          (unnamed) slot for main content.
        </p>
      </section>
    </div>
  );
}
