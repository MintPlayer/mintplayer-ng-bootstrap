import { useState } from 'react';
import { BsTabControl, BsTabPage } from '@mintplayer/react-bootstrap/tab-control';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';

const SOURCE = `<BsTabControl onTabActivate={e => setActive(e.detail.tabId)}>
  <span slot="home-header">Home</span>
  <BsTabPage tab-id="home"><div className="p-3">Home content</div></BsTabPage>
  <span slot="profile-header">Profile</span>
  <BsTabPage tab-id="profile"><div className="p-3">Profile content</div></BsTabPage>
</BsTabControl>`;

export function TabControlPage() {
  const [active, setActive] = useState('home');

  return (
    <div className="demo-page">
      <h1>Tab control</h1>
      <p className="text-body-secondary">
        Native named-slot tab projection. The control owns the active-tab
        state via the <code>active-tab</code> attribute; consumers listen
        for <code>tab-activate</code> events.
      </p>

      <section>
        <h2>Two tabs</h2>
        <BsTabControl onTabActivate={(e: CustomEvent<{ tabId: string }>) => setActive(e.detail.tabId)}>
          <span slot="home-header">Home</span>
          <BsTabPage {...{ 'tab-id': 'home' } as React.ComponentProps<typeof BsTabPage>}>
            <div className="p-3">Home content lives here.</div>
          </BsTabPage>
          <span slot="profile-header">Profile</span>
          <BsTabPage {...{ 'tab-id': 'profile' } as React.ComponentProps<typeof BsTabPage>}>
            <div className="p-3">Profile content lives here.</div>
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
