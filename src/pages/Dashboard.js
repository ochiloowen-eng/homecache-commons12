import { ProgressRing, StorageBar } from '../components/UI';
import theme from '../theme';

export default function Dashboard({ data, onViewAllActivity }) {
  const hero = data?.hero || {};
  const recentMemories = data?.recentMemories || [];
  const notifications = data?.notifications || [];
  const storage = data?.storage || [];

  return (
    <div>
      <div className="hc-dash-hero">
        <div className="hc-dash-hero-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span className="hc-encrypt-badge">End-to-End Encrypted</span>
            <span className="hc-encrypt-badge" style={{ background: 'rgba(200,121,42,0.15)', color: theme.amberLight, border: 'none' }}>
              Distributed Sync Active
            </span>
          </div>
          <h1>Welcome back.<br />Your family's memory is protected.</h1>
          <p>Homecache Commons is keeping your family data synchronized, encrypted, and distributed across active nodes.</p>
          <div className="hc-dash-hero-stats">
            {[[hero.memories || 0, 'memories'], [hero.stored || '0 GB', 'stored'], [hero.members || 0, 'members'], [hero.syncNodes || 0, 'sync nodes']].map(([v, l]) => (
              <div className="hc-hero-stat" key={l}>
                <div className="hc-hero-stat-val">{v}</div>
                <div className="hc-hero-stat-label">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="hc-grid-2" style={{ marginBottom: 20 }}>
        <div className="hc-card">
          <div className="hc-section-head">
            <div className="hc-card-title">Recent Activity</div>
            <button className="hc-btn hc-btn-ghost hc-btn-sm" onClick={onViewAllActivity}>View all</button>
          </div>
          <div className="hc-card-sub">LIVE FAMILY FEED</div>
          {recentMemories.map((m) => (
            <div className="hc-activity-item" key={m.id}>
              <div className="hc-activity-icon" style={{ background: m.color, fontSize: 16 }}>{m.emoji}</div>
              <div>
                <div className="hc-activity-text"><strong>{m.author}</strong> - {m.text.slice(0, 65)}...</div>
                <div className="hc-activity-time">{m.time}</div>
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="hc-card" style={{ marginBottom: 16 }}>
            <div className="hc-card-title">Storage Overview</div>
            <div className="hc-card-sub">DISTRIBUTED NODE USAGE</div>
            {storage.map((entry) => (
              <div key={entry.name} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: theme.slate, fontFamily: 'Lora,serif' }}>{entry.name}</span>
                  <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono,monospace', color: theme.fogDark }}>{entry.percent}%</span>
                </div>
                <StorageBar pct={entry.percent} />
              </div>
            ))}
          </div>
          <div className="hc-card" style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center' }}>
              <ProgressRing pct={72} />
              <div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 700, color: theme.ink }}>47 / 65 GB</div>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: theme.fogDark }}>TOTAL DISTRIBUTED STORAGE</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hc-card">
        <div className="hc-section-head">
          <div className="hc-card-title">Notifications</div>
          <span className="hc-encrypt-badge">{notifications.length} NEW</span>
        </div>
        <div className="hc-card-sub">RECENT FAMILY EVENTS</div>
        {notifications.map((n) => (
          <div className="hc-notif-chip" key={n.id}>
            <div className="hc-notif-dot" />
            <div className="hc-notif-text">{n.text}</div>
            <div className="hc-notif-time">{n.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
