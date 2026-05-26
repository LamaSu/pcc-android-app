import { Link } from 'react-router-dom';

/**
 * Generic placeholder for routes that exist as foundations but haven't
 * been ported yet. Renders the route name, a "coming soon" message, a
 * link to file an issue, and a link back to /capabilities (the only
 * fully-implemented Phase 2.0 screen).
 */
interface PlaceholderRouteProps {
  title: string;
  phase?: string;
  description?: string;
  parentRoutes?: Array<{ to: string; label: string }>;
}

function PlaceholderRoute({
  title,
  phase = 'Phase 2.1+',
  description,
  parentRoutes,
}: PlaceholderRouteProps) {
  return (
    <main className="page">
      <header className="page-header">
        <h1>{title}</h1>
        <p>Scaffold only — implementation deferred to {phase}.</p>
      </header>

      <section className="card">
        <h2>Coming in {phase}</h2>
        {description ? <p>{description}</p> : <p>This screen ports a slice of the PCC dashboard. The route exists so deep links are stable today; the UI lands in a follow-up wave.</p>}
        <Link to="/capabilities" className="cta">
          Open the working screen
        </Link>
      </section>

      {parentRoutes && parentRoutes.length > 0 && (
        <section className="card glass">
          <h2>Related routes (also placeholders)</h2>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--fg-muted)' }}>
            {parentRoutes.map((r) => (
              <li key={r.to}>
                <Link to={r.to} style={{ color: 'var(--primary-300)' }}>
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

export default PlaceholderRoute;
