import { NavLink, Outlet } from 'react-router-dom';

/**
 * Root layout — renders the active route inside <Outlet />, then a
 * fixed bottom tab bar with four primary tabs (Capabilities, Jobs,
 * Evidence, Settings). Phase 2.0 mobile-first nav; in Phase 2.1+ we
 * can swap individual tabs for richer navigators per route group.
 *
 * The settings / kernels routes are reachable from inside the relevant
 * tabs (e.g., Jobs -> Kernel link), and Settings tab also exposes a
 * direct link to /kernels. Phase 2.1+ may surface a fifth tab or a
 * top-right menu.
 */
const TABS = [
  { to: '/capabilities', label: 'Browse', icon: 'apps' },
  { to: '/jobs', label: 'Jobs', icon: 'tasks' },
  { to: '/evidence', label: 'Evidence', icon: 'shield' },
  { to: '/settings', label: 'Settings', icon: 'cog' },
] as const;

// Plaintext icon glyphs — keeps the bundle small and avoids any
// icon-font dependency. Phase 2.1+ may swap to @phosphor-icons/react.
const ICON_GLYPHS: Record<string, string> = {
  apps: '▦', // ▦
  tasks: '❖', // ❖
  shield: '⚫', // ⚫ (placeholder; real shield glyph adds weight)
  cog: '⚙', // ⚙
};

function TabBar() {
  return (
    <nav className="tab-bar" role="navigation" aria-label="Primary">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => `tab-link${isActive ? ' active' : ''}`}
        >
          <span className="tab-icon" aria-hidden>
            {ICON_GLYPHS[tab.icon] ?? '■'}
          </span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function Layout() {
  return (
    <div className="app">
      <Outlet />
      <TabBar />
    </div>
  );
}

export default Layout;
