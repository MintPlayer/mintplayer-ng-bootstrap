import { Link, useLocation } from 'react-router-dom';

export function ComingSoonPage() {
  const { pathname } = useLocation();
  return (
    <div className="demo-page">
      <h1>Coming soon</h1>
      <p className="text-body-secondary">
        The page at <code>{pathname}</code> is part of the in-progress
        cross-framework migration — this component is still being extracted
        from <code>@mintplayer/ng-bootstrap</code> into the framework-agnostic
        <code> @mintplayer/web-components</code> library. Pick another
        component from the sidebar, or check back as each one lands.
      </p>
      <p>
        <Link to="/">Back to home</Link>
      </p>
    </div>
  );
}
