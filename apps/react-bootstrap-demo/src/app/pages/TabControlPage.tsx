import { useState } from 'react';
import { BsTabControl, BsTabPage } from '@mintplayer/react-bootstrap/tab-control';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `<BsTabControl activeTab={active} onTabActivate={setActive}>
  <BsTabPage tabId="home" header="Home"><div className="p-3">Home content</div></BsTabPage>
  <BsTabPage tabId="profile" header="Profile"><div className="p-3">Profile content</div></BsTabPage>
  <BsTabPage tabId="settings" header="Settings" disabled>…</BsTabPage>
</BsTabControl>`;

export function TabControlPage() {
  const [active, setActive] = useState('home');

  return (
    <div className="demo-page">
      <h1>Tab control</h1>
      <p className="text-body-secondary">
        One native radio per tab is the selection, so the tabs switch with
        JavaScript off. Keyboard: <kbd>←</kbd>/<kbd>→</kbd> move between tabs,
        <kbd>Home</kbd>/<kbd>End</kbd> jump to the ends, and disabled tabs are skipped.
      </p>

      <section>
        <h2>Three tabs</h2>
        <BsTabControl activeTab={active} onTabActivate={setActive}>
          <BsTabPage tabId="home" header="Home">
            <div className="p-3">Home content lives here.</div>
          </BsTabPage>
          <BsTabPage tabId="profile" header="Profile">
            <div className="p-3">Profile content lives here.</div>
          </BsTabPage>
          <BsTabPage tabId="settings" header="Settings" disabled>
            <div className="p-3">Settings are disabled.</div>
          </BsTabPage>
        </BsTabControl>
        <p className="text-body-secondary mt-2">Active: <code>{active}</code></p>
      </section>

      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
