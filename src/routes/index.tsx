import { Route, Routes } from 'react-router-dom';
import Layout from './Layout';
import SplashRoute from './SplashRoute';
import CapabilitiesRoute from './CapabilitiesRoute';
import CapabilityDetailRoute from './CapabilityDetailRoute';
import JobsRoute from './JobsRoute';
import JobDetailRoute from './JobDetailRoute';
import EvidenceRoute from './EvidenceRoute';
import KernelsRoute from './KernelsRoute';
import SettingsRoute from './SettingsRoute';

/**
 * Phase 2.0 route map.
 *
 * /                      splash + OTA status
 * /capabilities          (POC) browse the live capability network
 * /capabilities/:id      placeholder for the per-capability deep view
 * /jobs                  placeholder for the operator's job list
 * /jobs/:id              placeholder for job detail (timeline / evidence / escrow)
 * /evidence              placeholder for evidence browser
 * /kernels               placeholder for kernel monitor
 * /settings              api-key input + future operator preferences
 *
 * Phase 2.1+ ports each placeholder to a real screen from
 * apps/dashboard/src/pages/. Tracking list in README.md.
 */
function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<SplashRoute />} />
        <Route path="capabilities" element={<CapabilitiesRoute />} />
        <Route path="capabilities/:id" element={<CapabilityDetailRoute />} />
        <Route path="jobs" element={<JobsRoute />} />
        <Route path="jobs/:id" element={<JobDetailRoute />} />
        <Route path="evidence" element={<EvidenceRoute />} />
        <Route path="kernels" element={<KernelsRoute />} />
        <Route path="settings" element={<SettingsRoute />} />
        <Route path="*" element={<SplashRoute />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
