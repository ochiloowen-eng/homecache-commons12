import theme from '../theme';

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Lora:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Lora', Georgia, serif;
      background: ${theme.cream};
      color: ${theme.ink};
      min-height: 100vh;
      overflow-x: hidden;
    }

    :root {
      --ink: ${theme.ink};
      --parchment: ${theme.parchment};
      --cream: ${theme.cream};
      --amber: ${theme.amber};
      --amber-light: ${theme.amberLight};
      --rust: ${theme.rust};
      --moss: ${theme.moss};
      --fog: ${theme.fog};
      --fog-dark: ${theme.fogDark};
      --shadow: ${theme.shadow};
    }

    .hc-app {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    /* ── Sidebar ── */
    .hc-sidebar {
      width: 260px;
      flex-shrink: 0;
      background: ${theme.ink};
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }
    .hc-sidebar::before {
      content: '';
      position: absolute;
      inset: 0;
      background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
      pointer-events: none;
    }
    .hc-sidebar-backdrop { display: none; }

    .hc-logo { padding: 28px 24px 20px; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .hc-logo-title { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; color: ${theme.amberLight}; letter-spacing: 0.02em; line-height: 1.1; }
    .hc-logo-sub { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: rgba(255,255,255,0.35); letter-spacing: 0.15em; text-transform: uppercase; margin-top: 3px; }
    .hc-logo-icon { width: 36px; height: 36px; margin-bottom: 10px; opacity: 0.9; }

    .hc-family-switcher { margin: 16px 16px 0; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px 14px; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: background 0.2s; }
    .hc-family-switcher:hover { background: rgba(255,255,255,0.08); }
    .hc-family-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, ${theme.amber}, ${theme.rust}); display: flex; align-items: center; justify-content: center; font-family: 'Playfair Display', serif; font-size: 14px; font-weight: 700; color: white; flex-shrink: 0; }
    .hc-family-name { font-family: 'Lora', serif; font-size: 13px; color: rgba(255,255,255,0.85); font-weight: 500; flex: 1; }
    .hc-family-role { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: ${theme.amberLight}; text-transform: uppercase; letter-spacing: 0.1em; }

    .hc-nav { padding: 20px 0; flex: 1; overflow-y: auto; }
    .hc-nav-section { margin-bottom: 24px; }
    .hc-nav-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(255,255,255,0.3); padding: 0 24px; margin-bottom: 6px; }
    .hc-nav-item { display: flex; align-items: center; gap: 12px; padding: 9px 24px; cursor: pointer; transition: all 0.15s; position: relative; font-size: 14px; color: rgba(255,255,255,0.55); font-family: 'Lora', serif; }
    .hc-nav-item:hover { color: rgba(255,255,255,0.85); background: rgba(255,255,255,0.04); }
    .hc-nav-item.active { color: ${theme.amberLight}; background: rgba(200,121,42,0.12); }
    .hc-nav-item.active::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: ${theme.amber}; border-radius: 0 2px 2px 0; }
    .hc-nav-icon { font-size: 16px; width: 20px; text-align: center; flex-shrink: 0; }
    .hc-nav-badge { margin-left: auto; background: ${theme.rust}; color: white; font-family: 'JetBrains Mono', monospace; font-size: 10px; padding: 1px 6px; border-radius: 10px; min-width: 20px; text-align: center; }

    .hc-sidebar-footer { padding: 16px; border-top: 1px solid rgba(255,255,255,0.08); }
    .hc-user-pill { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 8px; cursor: pointer; transition: background 0.2s; }
    .hc-user-pill:hover { background: rgba(255,255,255,0.06); }
    .hc-user-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, ${theme.moss}, ${theme.mossLight}); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: white; font-family: 'Playfair Display', serif; flex-shrink: 0; }
    .hc-user-info { flex: 1; }
    .hc-user-name { font-size: 13px; color: rgba(255,255,255,0.8); font-family: 'Lora', serif; }
    .hc-user-status { font-size: 10px; color: rgba(255,255,255,0.35); font-family: 'JetBrains Mono', monospace; }

    /* ── Main Area ── */
    .hc-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: ${theme.cream}; }

    .hc-topbar { height: 60px; background: ${theme.parchment}; border-bottom: 1px solid ${theme.fog}; display: flex; align-items: center; gap: 16px; padding: 0 28px; flex-shrink: 0; }
    .hc-breadcrumb { display: flex; align-items: center; gap: 8px; font-family: 'Lora', serif; font-size: 14px; color: ${theme.fogDark}; }
    .hc-breadcrumb-current { color: ${theme.ink}; font-weight: 500; }
    .hc-topbar-actions { margin-left: auto; display: flex; align-items: center; gap: 10px; }

    .hc-btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; border-radius: 6px; font-family: 'Lora', serif; font-size: 13px; cursor: pointer; border: none; transition: all 0.15s; font-weight: 500; }
    .hc-btn-primary { background: ${theme.amber}; color: white; }
    .hc-btn-primary:hover { background: ${theme.amberLight}; }
    .hc-btn-ghost { background: transparent; color: ${theme.ink}; border: 1px solid ${theme.fog}; }
    .hc-btn-ghost:hover { background: ${theme.fog}; }
    .hc-btn-sm { padding: 5px 12px; font-size: 12px; }
    .hc-btn-icon { width: 34px; height: 34px; padding: 0; display: flex; align-items: center; justify-content: center; background: transparent; border: 1px solid ${theme.fog}; border-radius: 6px; font-size: 16px; cursor: pointer; color: ${theme.ink}; transition: all 0.15s; }
    .hc-btn-icon:hover { background: ${theme.fog}; }
    .hc-mobile-menu-btn { display: none; }

    .hc-content { flex: 1; overflow-y: auto; padding: 28px; }

    /* ── Dashboard Hero ── */
    .hc-dash-hero { background: linear-gradient(135deg, ${theme.ink} 0%, ${theme.slate} 100%); border-radius: 16px; padding: 32px; color: white; position: relative; overflow: hidden; margin-bottom: 28px; }
    .hc-dash-hero::before { content: ''; position: absolute; top: -40px; right: -40px; width: 200px; height: 200px; background: radial-gradient(circle, rgba(200,121,42,0.3) 0%, transparent 70%); border-radius: 50%; }
    .hc-dash-hero::after { content: ''; position: absolute; bottom: -60px; left: 30%; width: 300px; height: 200px; background: radial-gradient(circle, rgba(74,103,65,0.2) 0%, transparent 70%); border-radius: 50%; }
    .hc-dash-hero-content { position: relative; z-index: 1; }
    .hc-dash-hero h1 { font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 700; line-height: 1.2; margin-bottom: 8px; }
    .hc-dash-hero p { color: rgba(255,255,255,0.65); font-size: 14px; max-width: 420px; }
    .hc-dash-hero-stats { display: flex; gap: 28px; margin-top: 24px; }
    .hc-hero-stat-val { font-family: 'Playfair Display', serif; font-size: 26px; font-weight: 700; color: ${theme.amberLight}; }
    .hc-hero-stat-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.1em; }

    .hc-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .hc-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 20px; }

    .hc-card { background: white; border: 1px solid ${theme.fog}; border-radius: 12px; padding: 20px; transition: box-shadow 0.2s; }
    .hc-card:hover { box-shadow: 0 4px 20px var(--shadow); }
    .hc-card-title { font-family: 'Playfair Display', serif; font-size: 15px; font-weight: 600; color: ${theme.ink}; margin-bottom: 4px; }
    .hc-card-sub { font-size: 12px; color: ${theme.fogDark}; font-family: 'JetBrains Mono', monospace; margin-bottom: 16px; }

    /* ── Timeline ── */
    .hc-timeline-item { display: flex; gap: 16px; padding: 12px; border-bottom: 1px solid ${theme.fog}; cursor: pointer; transition: all 0.15s; border-radius: 8px; margin-bottom: 4px; }
    .hc-timeline-item:hover { background: ${theme.parchment}; }
    .hc-timeline-dot { width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 18px; }
    .hc-timeline-body { flex: 1; }
    .hc-timeline-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .hc-timeline-author { font-weight: 500; font-size: 13px; color: ${theme.ink}; }
    .hc-timeline-time { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: ${theme.fogDark}; }
    .hc-timeline-text { font-size: 13px; color: ${theme.slate}; line-height: 1.5; }
    .hc-timeline-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
    .hc-tag { font-family: 'JetBrains Mono', monospace; font-size: 10px; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.05em; }
    .hc-tag-amber { background: rgba(200,121,42,0.12); color: ${theme.amber}; }
    .hc-tag-moss { background: rgba(74,103,65,0.12); color: ${theme.moss}; }
    .hc-tag-slate { background: rgba(61,79,92,0.1); color: ${theme.slate}; }

    /* ── Members ── */
    .hc-member-card { background: white; border: 1px solid ${theme.fog}; border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.2s; }
    .hc-member-card:hover { box-shadow: 0 6px 24px var(--shadow); transform: translateY(-2px); }
    .hc-member-avatar-lg { width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 700; color: white; }
    .hc-member-name { font-family: 'Playfair Display', serif; font-size: 15px; font-weight: 600; color: ${theme.ink}; margin-bottom: 3px; }
    .hc-member-role { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: ${theme.fogDark}; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; }
    .hc-member-stats { display: flex; justify-content: center; gap: 16px; }
    .hc-member-stat-val { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 600; color: ${theme.amber}; }
    .hc-member-stat-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: ${theme.fogDark}; text-transform: uppercase; }
    .hc-member-online { display: inline-flex; align-items: center; gap: 5px; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: ${theme.mossLight}; margin-bottom: 8px; }
    .hc-online-dot { width: 7px; height: 7px; background: ${theme.mossLight}; border-radius: 50%; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.8); } }

    /* ── Vaults ── */
    .hc-vault-card { background: white; border: 1px solid ${theme.fog}; border-radius: 12px; overflow: hidden; cursor: pointer; transition: all 0.2s; }
    .hc-vault-card:hover { box-shadow: 0 6px 28px var(--shadow); transform: translateY(-2px); }
    .hc-vault-cover { height: 100px; position: relative; display: flex; align-items: center; justify-content: center; font-size: 36px; }
    .hc-vault-body { padding: 16px; }
    .hc-vault-name { font-family: 'Playfair Display', serif; font-size: 15px; font-weight: 600; color: ${theme.ink}; margin-bottom: 4px; }
    .hc-vault-desc { font-size: 12px; color: ${theme.fogDark}; margin-bottom: 12px; line-height: 1.4; }
    .hc-vault-meta { display: flex; align-items: center; gap: 10px; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: ${theme.fogDark}; }
    .hc-vault-lock { margin-left: auto; font-size: 12px; }

    /* ── Activity ── */
    .hc-activity-item { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid ${theme.fog}; }
    .hc-activity-icon { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
    .hc-activity-text { font-size: 12px; color: ${theme.slate}; line-height: 1.5; }
    .hc-activity-time { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: ${theme.fogDark}; margin-top: 2px; }

    /* ── Storage Bar ── */
    .hc-storage-bar { height: 8px; border-radius: 4px; background: ${theme.fog}; overflow: hidden; margin-bottom: 6px; }
    .hc-storage-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, ${theme.amber}, ${theme.amberLight}); transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }

    /* ── Page Headers ── */
    .hc-page-title { font-family: 'Playfair Display', serif; font-size: 26px; font-weight: 700; color: ${theme.ink}; margin-bottom: 4px; }
    .hc-page-sub { font-size: 13px; color: ${theme.fogDark}; margin-bottom: 24px; }

    /* ── Tree ── */
    .hc-tree-svg { display: block; }
    .hc-tree-node { cursor: pointer; transition: opacity 0.2s; }
    .hc-tree-node:hover { opacity: 0.8; }
    .hc-tree-container { background: white; border: 1px solid ${theme.fog}; border-radius: 12px; padding: 28px; overflow-x: auto; }

    /* ── Badges ── */
    .hc-encrypt-badge { display: inline-flex; align-items: center; gap: 5px; background: rgba(74,103,65,0.1); color: ${theme.moss}; border-radius: 4px; padding: 3px 8px; font-family: 'JetBrains Mono', monospace; font-size: 10px; }

    /* ── Notifications ── */
    .hc-notif-chip { background: rgba(200,121,42,0.1); border: 1px solid rgba(200,121,42,0.2); border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; gap: 10px; margin-bottom: 10px; cursor: pointer; transition: background 0.15s; }
    .hc-notif-chip:hover { background: rgba(200,121,42,0.15); }
    .hc-notif-dot { width: 8px; height: 8px; border-radius: 50%; background: ${theme.amber}; flex-shrink: 0; }
    .hc-notif-text { font-size: 13px; color: ${theme.ink}; flex: 1; }
    .hc-notif-time { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: ${theme.fogDark}; }

    /* ── Chips ── */
    .hc-chips { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
    .hc-chip { font-family: 'JetBrains Mono', monospace; font-size: 11px; padding: 5px 12px; border-radius: 20px; cursor: pointer; transition: all 0.15s; border: 1px solid ${theme.fog}; color: ${theme.fogDark}; background: white; letter-spacing: 0.04em; }
    .hc-chip:hover { border-color: ${theme.amber}; color: ${theme.amber}; }
    .hc-chip.active { background: ${theme.amber}; color: white; border-color: ${theme.amber}; }

    /* ── Search ── */
    .hc-search-wrap { position: relative; flex: 1; max-width: 320px; }
    .hc-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: ${theme.fogDark}; font-size: 14px; pointer-events: none; }
    .hc-search { width: 100%; padding: 7px 12px 7px 32px; border: 1px solid ${theme.fog}; border-radius: 8px; font-family: 'Lora', serif; font-size: 13px; color: ${theme.ink}; background: white; outline: none; transition: border-color 0.2s; }
    .hc-search:focus { border-color: ${theme.amber}; }

    .hc-divider { height: 1px; background: ${theme.fog}; margin: 20px 0; }
    .hc-section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .hc-section-title { font-family: 'Playfair Display', serif; font-size: 16px; font-weight: 600; color: ${theme.ink}; }

    /* ── Modal ── */
    .hc-modal-backdrop { position: fixed; inset: 0; background: rgba(26,18,9,0.5); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; }
    .hc-modal { background: white; border-radius: 16px; padding: 28px; width: 480px; max-width: 90vw; max-height: 80vh; overflow-y: auto; box-shadow: 0 24px 80px rgba(26,18,9,0.25); }
    .hc-modal-title { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; color: ${theme.ink}; margin-bottom: 4px; }
    .hc-modal-sub { font-size: 13px; color: ${theme.fogDark}; margin-bottom: 20px; }
    .hc-form-group { margin-bottom: 16px; }
    .hc-label { display: block; font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: ${theme.fogDark}; margin-bottom: 6px; }
    .hc-input { width: 100%; padding: 10px 12px; border: 1px solid ${theme.fog}; border-radius: 8px; font-family: 'Lora', serif; font-size: 13px; color: ${theme.ink}; background: ${theme.cream}; outline: none; transition: border-color 0.2s; }
    .hc-input:focus { border-color: ${theme.amber}; }
    .hc-textarea { min-height: 100px; resize: vertical; }
    .hc-modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }

    /* ── Progress Ring ── */
    .hc-ring { transform: rotate(-90deg); }
    .hc-ring-bg { fill: none; stroke: ${theme.fog}; }
    .hc-ring-fill { fill: none; stroke: ${theme.amber}; stroke-linecap: round; transition: stroke-dashoffset 0.8s; }

    /* ── Scrollbar ── */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${theme.fog}; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: ${theme.fogDark}; }

    @media (max-width: 1024px) {
      .hc-content { padding: 20px; }
      .hc-grid-3 { grid-template-columns: 1fr 1fr; }
    }

    @media (max-width: 820px) {
      .hc-sidebar {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        z-index: 50;
        transform: translateX(-100%);
        transition: transform 0.2s ease;
        box-shadow: 0 20px 40px rgba(0,0,0,0.25);
      }
      .hc-sidebar.open { transform: translateX(0); }
      .hc-sidebar-backdrop {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.35);
        z-index: 40;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
      }
      .hc-sidebar-backdrop.open {
        opacity: 1;
        pointer-events: auto;
      }
      .hc-topbar {
        height: auto;
        min-height: 60px;
        padding: 10px 14px;
        gap: 10px;
        flex-wrap: wrap;
      }
      .hc-mobile-menu-btn { display: inline-flex; }
      .hc-breadcrumb { font-size: 13px; }
      .hc-search-wrap { order: 3; max-width: none; width: 100%; flex-basis: 100%; }
      .hc-topbar-actions { margin-left: 0; margin-left: auto; }
      .hc-content { padding: 14px; }
      .hc-grid-2, .hc-grid-3 { grid-template-columns: 1fr; gap: 14px; }
      .hc-dash-hero { padding: 20px; margin-bottom: 16px; border-radius: 12px; }
      .hc-dash-hero h1 { font-size: 22px; }
      .hc-dash-hero p { font-size: 13px; }
      .hc-dash-hero-stats { gap: 14px; flex-wrap: wrap; margin-top: 18px; }
      .hc-card { padding: 14px; }
      .hc-page-title { font-size: 22px; }
      .hc-timeline-item { flex-wrap: wrap; }
      .hc-timeline-item > div:last-child { margin-left: 44px !important; }
      .hc-modal { width: 100%; max-width: calc(100vw - 20px); padding: 20px; border-radius: 12px; }
    }
  `}</style>
);

export default GlobalStyles;
