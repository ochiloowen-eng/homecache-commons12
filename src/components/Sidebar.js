import { LogoIcon } from './UI';

const PAGES = [
  { id: 'dashboard', label: 'Dashboard', icon: 'D', section: 'main' },
  { id: 'memories', label: 'Memories', icon: 'M', section: 'main' },
  { id: 'timeline', label: 'Timeline', icon: 'T', section: 'main' },
  { id: 'insights', label: 'Insights', icon: 'I', section: 'main' },
  { id: 'vaults', label: 'Vaults', icon: 'V', section: 'main' },
  { id: 'tree', label: 'Family Tree', icon: 'F', section: 'main' },
  { id: 'members', label: 'Members', icon: 'U', section: 'family' },
  { id: 'settings', label: 'Settings', icon: 'S', section: 'system' },
];

const SECTION_LABELS = { main: 'Library', family: 'Family', system: 'System' };

export default function Sidebar({ page, setPage, memoryCount = 0, mobileOpen = false, onCloseMobile, householdName = 'Your Household', accountName = '', role = '' }) {
  const grouped = {};
  const visiblePages = PAGES.filter((p) => !(role === 'guest' && p.id === 'settings'));
  visiblePages.forEach((p) => {
    (grouped[p.section] = grouped[p.section] || []).push(p);
  });
  const avatarLabel = (accountName || householdName || 'H')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 1)
    .map((part) => part[0]?.toUpperCase() || 'H')
    .join('') || 'H';

  return (
    <>
      <div className={`hc-sidebar-backdrop${mobileOpen ? ' open' : ''}`} onClick={onCloseMobile} />
      <aside className={`hc-sidebar${mobileOpen ? ' open' : ''}`}>
        <div className="hc-logo">
          <LogoIcon className="hc-logo-icon" />
          <div className="hc-logo-title">Homecache</div>
          <div className="hc-logo-sub">Commons - Family Memory</div>
        </div>

        <div className="hc-family-switcher">
          <div className="hc-family-avatar">{avatarLabel}</div>
          <div>
            <div className="hc-family-name">{householdName}</div>
            <div className="hc-family-role">Your Commons</div>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>?</span>
        </div>

        <nav className="hc-nav">
          {Object.entries(grouped).map(([sec, sectionPages]) => (
            <div className="hc-nav-section" key={sec}>
              <div className="hc-nav-label">{SECTION_LABELS[sec]}</div>
              {sectionPages.map((p) => (
                <div
                  key={p.id}
                  className={`hc-nav-item${page === p.id ? ' active' : ''}`}
                  onClick={() => {
                    setPage(p.id);
                    onCloseMobile?.();
                  }}
                >
                  <span className="hc-nav-icon">{p.icon}</span>
                  <span>{p.label}</span>
                  {p.id === 'memories' ? <span className="hc-nav-badge">{memoryCount}</span> : null}
                </div>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

export { PAGES };
