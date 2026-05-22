import { BsTabControl, BsTabPage } from '@mintplayer/react-bootstrap/tab-control';
import { BsCodeSnippet } from '@mintplayer/react-bootstrap/code-snippet';
const SOURCE = "<BsTabControl>\n  <BsTabPage>\n    <span slot=\"header\">Tab 1</span>\n    <p>Content of tab 1.</p>\n  </BsTabPage>\n  <BsTabPage>\n    <span slot=\"header\">Tab 2</span>\n    <p>Content of tab 2.</p>\n  </BsTabPage>\n</BsTabControl>";

export function TabControlPage() {
  return (
    <div className="demo-page">
      <h1>Tab control</h1>
      <section>
        <h2>Default</h2>
        <BsTabControl style={{ minHeight: '200px' }}>
          <BsTabPage>
            <span slot="header">Tab 1</span>
            <p>Content of tab 1.</p>
          </BsTabPage>
          <BsTabPage>
            <span slot="header">Tab 2</span>
            <p>Content of tab 2.</p>
          </BsTabPage>
        </BsTabControl>
      </section>
      <section>
        <h2>Source</h2>
        <BsCodeSnippet code={SOURCE} language="tsx" />
      </section>
    </div>
  );
}
