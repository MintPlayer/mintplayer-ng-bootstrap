import { Link, useLocation } from 'react-router-dom';

export function ComingSoonPage() {
  const { pathname } = useLocation();
  return (
    <div className="demo-page">
      <h1>Coming soon</h1>
      <p className="text-body-secondary">
        The page at <code>{pathname}</code> is part of the in-progress
        cross-framework split — see PR #351 for the working state, or pick a
        component below as it lands on master.
      </p>
      <p>
        <Link to="/">Back to home</Link>
      </p>
    </div>
  );
}
