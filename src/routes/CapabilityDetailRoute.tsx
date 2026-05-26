import { useParams } from 'react-router-dom';
import PlaceholderRoute from './PlaceholderRoute';

function CapabilityDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return (
    <PlaceholderRoute
      title={`Capability ${id ? id.slice(0, 12) : ''}`}
      description="Full capability detail: pricing schedule, availability window, materials, tolerances, ALCOA+ tier history, reputation, embeddable button. Phase 2.1 ports the dashboard's CapabilityDetailPage."
      parentRoutes={[{ to: '/capabilities', label: 'Back to capability browser' }]}
    />
  );
}

export default CapabilityDetailRoute;
