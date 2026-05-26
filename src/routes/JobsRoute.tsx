import PlaceholderRoute from './PlaceholderRoute';

function JobsRoute() {
  return (
    <PlaceholderRoute
      title="Jobs"
      description="Lists jobs scoped to your operator session, filtered by kernel + status. Phase 2.1 will surface status badges, SSE-backed live progress, and a tappable card -> JobDetail flow."
    />
  );
}

export default JobsRoute;
