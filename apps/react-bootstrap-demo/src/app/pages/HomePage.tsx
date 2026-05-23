export function HomePage() {
  return (
    <div className="demo-page">
      <h1>React demo for @mintplayer/web-components</h1>
      <p className="text-body-secondary">
        Live showcase of the Lit web components exposed via{' '}
        <code>@mintplayer/react-bootstrap</code>. Component pages are coming
        online incrementally as each WC is extracted out of the Angular
        package into the framework-agnostic <code>@mintplayer/web-components</code>{' '}
        lib. Pick a component from the sidebar to see its current status.
      </p>
      <p>
        The same WCs render identically in the Angular and Vue demos — switch
        via the brand-mark links at the top right.
      </p>
    </div>
  );
}
