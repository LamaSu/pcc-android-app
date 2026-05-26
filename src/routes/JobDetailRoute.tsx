import { useParams } from 'react-router-dom';
import PlaceholderRoute from './PlaceholderRoute';

function JobDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return (
    <PlaceholderRoute
      title={`Job ${id ?? ''}`}
      description="Job timeline, evidence bundles, escrow status, and a drift-alert feed. Phase 2.1 ports JobDetailDTO + the SSE listener already implemented in apps/mobile."
    />
  );
}

export default JobDetailRoute;
