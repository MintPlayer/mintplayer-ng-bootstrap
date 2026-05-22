import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div className="demo-page">
      <h1>React demo for @mintplayer/web-components</h1>
      <p className="text-body-secondary">
        Live showcase of the Lit web components exposed via{' '}
        <code>@mintplayer/react-bootstrap</code>. The same WCs render identically
        in the Angular and Vue demos — switch via the brand-mark links at the
        top right.
      </p>
      <section>
        <h2>Featured pages</h2>
        <ul>
          <li><Link to="/enterprise/scheduler">Scheduler</Link> — calendar/grid layout for events</li>
          <li><Link to="/enterprise/dock">Dock manager</Link> — draggable, dockable panes</li>
          <li><Link to="/enterprise/ribbon">Ribbon</Link> — MS Office-style command bar</li>
          <li><Link to="/datepicker">Datepicker</Link> — date input with v-model-equivalent controlled binding</li>
          <li><Link to="/card">Card</Link> — composable card primitives</li>
          <li><Link to="/code-snippet">Code snippet</Link> — syntax-highlighted source with copy-to-clipboard</li>
        </ul>
      </section>
    </div>
  );
}
