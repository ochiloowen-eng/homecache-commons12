import { useCallback, useEffect, useMemo, useState } from 'react';
import GlobalStyles from './components/GlobalStyles';
import Sidebar, { PAGES } from './components/Sidebar';
import { AddMemoryModal } from './components/UI';
import { AuthScreen, HouseholdAdmin } from './components/AuthHousehold';
import Dashboard from './pages/Dashboard';
import { MemoriesPage, VaultsPage, VaultContentsPage, MembersPage, MemberProfilePage, FamilyTreePage, TimelinePage, InsightsPage, SettingsPage } from './pages/Pages';
import { API_BASE, api, getAuthToken, setAuthToken } from './api';

function toFriendlyError(err) {
  const message = err?.message || '';
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'Cannot reach API server. Start backend with: npm run server';
  }
  return message || 'Failed to load data from API.';
}

function App() {
  const [page, setPage] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newMemoryDate, setNewMemoryDate] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offlineMode, setOfflineMode] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [householdMembers, setHouseholdMembers] = useState([]);
  const [householdInvites, setHouseholdInvites] = useState([]);

  const [dashboardData, setDashboardData] = useState({ hero: {}, recentMemories: [], storage: [], notifications: [] });
  const [memories, setMemories] = useState([]);
  const [offlineMemoriesSource, setOfflineMemoriesSource] = useState([]);
  const [vaults, setVaults] = useState([]);
  const [members, setMembers] = useState([]);
  const [tree, setTree] = useState({ nodes: [], edges: [] });
  const [settings, setSettings] = useState([]);
  const [timelineData, setTimelineData] = useState({ entries: [], onThisDay: [], years: [], months: [] });
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState('');
  const [insightsData, setInsightsData] = useState({ totals: {}, topContributors: [], vaultDistribution: [], tagTrends: [], monthlyActivity: [], dayOfWeekActivity: [] });
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState('');

  // Vault viewing
  const [viewingVaultId, setViewingVaultId] = useState(null);
  const [vaultMemories, setVaultMemories] = useState([]);
  const [viewingMemberId, setViewingMemberId] = useState(null);

  const currentPage = PAGES.find((p) => p.id === page);
  const canAddMemory = ['owner', 'parent', 'member'].includes(authUser?.role);
  const canManageContent = ['owner', 'parent', 'member'].includes(authUser?.role);
  const displayHouseholdName = useMemo(() => {
    const raw = String(authUser?.householdName || '').trim();
    if (!raw) {
      return authUser?.displayName ? `${authUser.displayName}'s Family` : 'Your Household';
    }
    const normalized = raw.toLowerCase();
    const isLegacyDefault =
      normalized === 'default family' ||
      normalized === 'harrison family' ||
      normalized === 'harison family';
    if (authUser?.role === 'owner' && isLegacyDefault && authUser?.displayName) {
      return `${authUser.displayName}'s Family`;
    }
    return raw;
  }, [authUser]);

  const memoryCount = memories.length;

  const reloadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboard, memoryList, vaultList, memberList, treeData, settingList, insights] = await Promise.all([
        api.getDashboard(),
        api.getMemories(),
        api.getVaults(),
        api.getMembers(),
        api.getTree(),
        api.getSettings(),
        api.getInsights(),
      ]);

      setDashboardData(dashboard);
      setMemories(memoryList);
      setVaults(vaultList);
      setMembers(memberList);
      setTree(treeData);
      setSettings(settingList);
      setInsightsData(insights);
      setOfflineMode(false);
    } catch (err) {
      setOfflineMode(false);
      setError(toFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const bootstrapAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        setAuthLoading(false);
        return;
      }
      try {
        const response = await api.me();
        setAuthUser(response.user);
        await reloadAll();
      } catch (_err) {
        setAuthUser(null);
        setAuthToken('');
      } finally {
        setAuthLoading(false);
      }
    };
    bootstrapAuth();
  }, [reloadAll]);

  const reloadHouseholdData = useCallback(async () => {
    if (!authUser) {
      return;
    }
    const [membersList, inviteList] = await Promise.all([
      api.getHouseholdMembers(),
      api.getHouseholdInvites().catch(() => []),
    ]);
    setHouseholdMembers(membersList);
    setHouseholdInvites(inviteList);
  }, [authUser]);

  useEffect(() => {
    reloadHouseholdData().catch(() => {});
  }, [reloadHouseholdData]);

  useEffect(() => {
    if (!authUser || offlineMode) {
      return undefined;
    }

    const token = getAuthToken();
    if (!token) {
      return undefined;
    }

    const streamUrl = `${API_BASE}/api/notifications/stream?token=${encodeURIComponent(token)}`;
    const events = new EventSource(streamUrl);
    const onNotification = (event) => {
      try {
        const incoming = JSON.parse(event.data);
        setDashboardData((prev) => {
          const existing = prev?.notifications || [];
          const next = [incoming, ...existing.filter((item) => item.id !== incoming.id)].slice(0, 6);
          return { ...prev, notifications: next };
        });
      } catch (_error) {
        // Ignore malformed event payloads to keep stream alive.
      }
    };

    events.addEventListener('notification', onNotification);

    return () => {
      events.removeEventListener('notification', onNotification);
      events.close();
    };
  }, [authUser, offlineMode]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (offlineMode) {
        const q = search.trim().toLowerCase();
        if (!q) {
          setMemories(offlineMemoriesSource);
          return;
        }
        setMemories(
          offlineMemoriesSource.filter((item) => {
            const body = `${item.title} ${item.text} ${item.author} ${item.tags?.join(' ')} ${item.vaultName}`.toLowerCase();
            return body.includes(q);
          })
        );
        return;
      }
      try {
        const memoryList = await api.getMemories(search ? { q: search } : {});
        setMemories(memoryList);
      } catch (err) {
        setError(toFriendlyError(err));
        // keep previous list if search request fails
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, offlineMode, offlineMemoriesSource]);

  const saveMemory = useCallback(async (payload) => {
    if (offlineMode) {
      const nowId = (Math.max(0, ...memories.map((m) => Number(m.id) || 0)) || 0) + 1;
      const vaultName = vaults.find((v) => Number(v.id) === Number(payload.vaultId))?.name || 'General';
      const nextMemory = {
        id: nowId,
        author: payload.author || authUser?.displayName || 'Unknown',
        title: payload.title,
        text: payload.text,
        tags: payload.tags || [],
        emoji: 'M',
        color: '#fef3e6',
        time: 'Today',
        createdAt: payload.createdAt || new Date().toISOString(),
        vaultId: payload.vaultId || null,
        vaultName,
        files: [],
      };
      const nextList = [nextMemory, ...memories];
      setMemories(nextList);
      setOfflineMemoriesSource(nextList);
      setDashboardData((prev) => ({
        ...prev,
        hero: { ...prev.hero, memories: nextList.length },
        recentMemories: nextList.slice(0, 4),
      }));
      return;
    }
    const created = await api.addMemory(payload);
    if (payload.files?.length) {
      await api.uploadMemoryFiles(created.id, payload.files);
    }
    await reloadAll();
  }, [reloadAll, offlineMode, memories, vaults, authUser]);

  const updateMemory = useCallback(async (id, payload) => {
    if (offlineMode) {
      const updateOne = (memory) => (Number(memory.id) === Number(id)
        ? {
            ...memory,
            title: payload.title ?? memory.title,
            text: payload.text ?? memory.text,
            tags: payload.tags ?? memory.tags,
            vaultId: payload.vaultId ?? memory.vaultId,
            vaultName: vaults.find((v) => Number(v.id) === Number(payload.vaultId))?.name || memory.vaultName,
          }
        : memory);
      const nextList = memories.map(updateOne);
      setMemories(nextList);
      setOfflineMemoriesSource((prev) => prev.map(updateOne));
      setDashboardData((prev) => ({ ...prev, recentMemories: nextList.slice(0, 4) }));
      return;
    }
    await api.updateMemory(id, payload);
    if (payload.files?.length) {
      await api.uploadMemoryFiles(id, payload.files);
    }
    await reloadAll();
  }, [reloadAll, offlineMode, memories, vaults]);

  const deleteMemory = useCallback(async (id) => {
    if (offlineMode) {
      const nextList = memories.filter((memory) => Number(memory.id) !== Number(id));
      setMemories(nextList);
      setOfflineMemoriesSource((prev) => prev.filter((memory) => Number(memory.id) !== Number(id)));
      setDashboardData((prev) => ({
        ...prev,
        hero: { ...prev.hero, memories: nextList.length },
        recentMemories: nextList.slice(0, 4),
      }));
      return;
    }
    await api.deleteMemory(id);
    await reloadAll();
  }, [reloadAll, offlineMode, memories]);

  const deleteMemoryFile = useCallback(async (memoryId, fileId) => {
    if (offlineMode) {
      const prune = (memory) => (Number(memory.id) === Number(memoryId)
        ? { ...memory, files: (memory.files || []).filter((file) => Number(file.id) !== Number(fileId)) }
        : memory);
      const nextList = memories.map(prune);
      setMemories(nextList);
      setOfflineMemoriesSource((prev) => prev.map(prune));
      return;
    }
    await api.deleteMemoryFile(memoryId, fileId);
    await reloadAll();
  }, [reloadAll, offlineMode, memories]);

  const getMemoryHistory = useCallback(async (id) => {
    if (offlineMode) {
      return [];
    }
    return api.getMemoryHistory(id);
  }, [offlineMode]);

  const restoreMemoryRevision = useCallback(async (id, revisionId) => {
    if (offlineMode) {
      return;
    }
    await api.restoreMemoryRevision(id, revisionId);
    await reloadAll();
  }, [offlineMode, reloadAll]);

  const toggleSetting = useCallback(async (id, enabled) => {
    if (offlineMode) {
      setSettings((prev) => prev.map((section) => ({
        ...section,
        items: section.items.map((item) => (item.id === id ? { ...item, enabled } : item)),
      })));
      return;
    }
    await api.updateSetting(id, enabled);
    const updated = await api.getSettings();
    setSettings(updated);
  }, [offlineMode]);

  const createVault = useCallback(async (payload) => {
    if (offlineMode) {
      const nowId = (Math.max(0, ...vaults.map((v) => Number(v.id) || 0)) || 0) + 1;
      const nextVault = {
        id: nowId,
        name: payload.name,
        emoji: payload.emoji,
        description: payload.description,
        items: 0,
        sizeLabel: '0 B',
        cover: payload.cover,
        accessLevel: payload.accessLevel,
        locked: payload.locked ? 1 : 0,
        usagePercent: 0,
      };
      setVaults([...vaults, nextVault]);
      return;
    }
    await api.addVault(payload);
    await reloadAll();
  }, [reloadAll, offlineMode, vaults]);

  const updateVault = useCallback(async (id, payload) => {
    if (offlineMode) {
      setVaults(vaults.map((v) =>
        Number(v.id) === Number(id)
          ? {
              ...v,
              name: payload.name ?? v.name,
              emoji: payload.emoji ?? v.emoji,
              description: payload.description ?? v.description,
              accessLevel: payload.accessLevel ?? v.accessLevel,
              locked: payload.locked !== undefined ? (payload.locked ? 1 : 0) : v.locked,
            }
          : v
      ));
      return;
    }
    await api.updateVault(id, payload);
    await reloadAll();
  }, [reloadAll, offlineMode, vaults]);

  const deleteVault = useCallback(async (id) => {
    if (offlineMode) {
      setVaults(vaults.filter((v) => Number(v.id) !== Number(id)));
      return;
    }
    await api.deleteVault(id);
    await reloadAll();
  }, [reloadAll, offlineMode, vaults]);

  const viewVault = useCallback(async (vaultId) => {
    const targetVault = vaults.find((v) => Number(v.id) === Number(vaultId));
    if (targetVault?.locked) {
      const entered = window.prompt(`"${targetVault.name}" is restricted. Enter access code to continue:`);
      if (entered !== 'HOMECACHE-LEGAL') {
        setError('Access denied for restricted vault.');
        return;
      }
      setError('');
    }

    setViewingVaultId(vaultId);
    setPage('vault-contents');
    if (!offlineMode) {
      try {
        const contents = await api.getVaultMemories(vaultId);
        setVaultMemories(contents);
      } catch (err) {
        setError(toFriendlyError(err));
      }
    }
  }, [offlineMode, vaults]);

  const viewMemberProfile = useCallback((memberId) => {
    setViewingMemberId(memberId);
    setPage('member-profile');
  }, []);

  const loadTimeline = useCallback(async (params = {}) => {
    setTimelineLoading(true);
    setTimelineError('');
    try {
      if (offlineMode) {
        const year = String(params.year || '').trim();
        const month = String(params.month || '').trim();
        const filtered = memories.filter((item) => {
          if (!item.createdAt) {
            return true;
          }
          const dt = new Date(item.createdAt);
          if (Number.isNaN(dt.getTime())) {
            return true;
          }
          const y = String(dt.getFullYear());
          const m = String(dt.getMonth() + 1).padStart(2, '0');
          return (!year || y === year) && (!month || m === month);
        });
        setTimelineData({
          year,
          month,
          years: [...new Set(memories.map((item) => item.createdAt ? String(new Date(item.createdAt).getFullYear()) : ''))].filter(Boolean).sort((a, b) => Number(b) - Number(a)),
          months: [...new Set(memories.map((item) => item.createdAt ? String(new Date(item.createdAt).getMonth() + 1).padStart(2, '0') : ''))].filter(Boolean).sort(),
          todayKey: new Date().toISOString().slice(5, 10),
          entries: filtered,
          onThisDay: [],
        });
      } else {
        const data = await api.getTimeline(params);
        setTimelineData(data);
      }
    } catch (err) {
      setTimelineError(toFriendlyError(err));
    } finally {
      setTimelineLoading(false);
    }
  }, [offlineMode, memories]);

  const handleLogin = useCallback(async (payload) => {
    setAuthError('');
    const response = await api.login(payload);
    setAuthToken(response.token);
    setAuthUser(response.user);
    await reloadAll();
    await reloadHouseholdData();
  }, [reloadAll, reloadHouseholdData]);

  const handleRegister = useCallback(async (payload) => {
    setAuthError('');
    const response = await api.register(payload);
    setAuthToken(response.token);
    setAuthUser(response.user);
    await reloadAll();
    await reloadHouseholdData();
  }, [reloadAll, reloadHouseholdData]);

  const handleRequestRecovery = useCallback(async (payload) => {
    setAuthError('');
    return api.requestRecovery(payload);
  }, []);

  const loadInsights = useCallback(async () => {
    if (offlineMode) {
      return;
    }
    setInsightsLoading(true);
    setInsightsError('');
    try {
      const data = await api.getInsights();
      setInsightsData(data);
    } catch (err) {
      setInsightsError(toFriendlyError(err));
    } finally {
      setInsightsLoading(false);
    }
  }, [offlineMode]);

  const handleResetRecovery = useCallback(async (payload) => {
    setAuthError('');
    return api.resetRecovery(payload);
  }, []);

  const handleCreateInvite = useCallback(async (payload) => {
    try {
      setError('');
      await api.createHouseholdInvite(payload);
      await reloadHouseholdData();
    } catch (err) {
      setError(toFriendlyError(err));
    }
  }, [reloadHouseholdData]);

  const handleCreateHouseholdMember = useCallback(async (payload) => {
    try {
      setError('');
      await api.createHouseholdMember(payload);
      const [householdList, membersList, dashboard] = await Promise.all([
        api.getHouseholdMembers(),
        api.getMembers(),
        api.getDashboard(),
      ]);
      setHouseholdMembers(householdList);
      setMembers(membersList);
      setDashboardData(dashboard);
    } catch (err) {
      setError(toFriendlyError(err));
      throw err;
    }
  }, []);

  const handleUpdateHouseholdMember = useCallback(async (accountId, payload) => {
    try {
      setError('');
      await api.updateHouseholdMember(accountId, payload);
      await reloadHouseholdData();
    } catch (err) {
      setError(toFriendlyError(err));
    }
  }, [reloadHouseholdData]);

  const handleRemoveHouseholdMember = useCallback(async (accountId) => {
    try {
      setError('');
      await api.removeHouseholdMember(accountId);
      await reloadHouseholdData();
    } catch (err) {
      setError(toFriendlyError(err));
    }
  }, [reloadHouseholdData]);

  const handleResetHousehold = useCallback(async () => {
    try {
      setError('');
      await api.resetHouseholdData();
      await Promise.all([reloadAll(), reloadHouseholdData()]);
    } catch (err) {
      setError(toFriendlyError(err));
    }
  }, [reloadAll, reloadHouseholdData]);

  const handleLogout = useCallback(async () => {
    try {
      await api.logout();
    } catch (_err) {
      // ignore
    }
    setAuthUser(null);
    setAuthToken('');
    setHouseholdMembers([]);
    setHouseholdInvites([]);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [page]);

  const pages = useMemo(
    () => ({
      dashboard: <Dashboard data={dashboardData} onViewAllActivity={() => setPage('memories')} />,
      memories: (
        <MemoriesPage
          memories={memories}
          vaults={vaults}
          search={search}
          onUpdateMemory={updateMemory}
          onDeleteMemory={deleteMemory}
          onDeleteMemoryFile={deleteMemoryFile}
          onGetMemoryHistory={getMemoryHistory}
          onRestoreMemoryRevision={restoreMemoryRevision}
          canManage={canManageContent}
        />
      ),
      timeline: (
        <TimelinePage
          timelineData={timelineData}
          loading={timelineLoading}
          error={timelineError}
          onLoadTimeline={loadTimeline}
          onAddActivityForDate={(date) => {
            setNewMemoryDate(date);
            setShowModal(true);
          }}
        />
      ),
      insights: (
        <InsightsPage
          data={insightsData}
          loading={insightsLoading}
          error={insightsError}
          onRefresh={loadInsights}
        />
      ),
      vaults: (
        <VaultsPage 
          vaults={vaults}
          onCreateVault={createVault}
          onEditVault={updateVault}
          onDeleteVault={deleteVault}
          onViewVault={viewVault}
          canManage={canManageContent}
        />
      ),
      'vault-contents': viewingVaultId ? (
        <VaultContentsPage
          vaultId={viewingVaultId}
          vaultName={vaults.find((v) => v.id === viewingVaultId)?.name || 'Vault'}
          memories={vaultMemories}
          search={search}
          onUpdateMemory={updateMemory}
          onDeleteMemory={deleteMemory}
          onDeleteMemoryFile={deleteMemoryFile}
          onGetMemoryHistory={getMemoryHistory}
          onRestoreMemoryRevision={restoreMemoryRevision}
          canManage={canManageContent}
        />
      ) : null,
      tree: <FamilyTreePage nodes={tree.nodes} edges={tree.edges} />,
      members: <MembersPage members={members} onViewProfile={viewMemberProfile} />,
      'member-profile': (
        <MemberProfilePage
          member={members.find((m) => Number(m.id) === Number(viewingMemberId))}
          onBack={() => setPage('members')}
        />
      ),
      settings: <SettingsPage sections={settings} onToggle={toggleSetting} canManage={canManageContent} />,
    }),
    [dashboardData, memories, timelineData, timelineLoading, timelineError, loadTimeline, insightsData, insightsLoading, insightsError, loadInsights, vaults, tree, members, settings, search, updateMemory, deleteMemory, deleteMemoryFile, getMemoryHistory, restoreMemoryRevision, toggleSetting, createVault, updateVault, deleteVault, viewVault, viewMemberProfile, viewingVaultId, vaultMemories, viewingMemberId, canManageContent]
  );

  if (authLoading) {
    return (
      <>
        <GlobalStyles />
        <div className="hc-card" style={{ margin: 20 }}>Loading account...</div>
      </>
    );
  }

  if (!authUser) {
    return (
      <>
        <GlobalStyles />
        <AuthScreen
          loading={authLoading}
          error={authError}
          onLogin={async (payload) => {
            try {
              setAuthLoading(true);
              await handleLogin(payload);
            } catch (err) {
              setAuthError(toFriendlyError(err));
            } finally {
              setAuthLoading(false);
            }
          }}
          onRegister={async (payload) => {
            try {
              setAuthLoading(true);
              await handleRegister(payload);
            } catch (err) {
              setAuthError(toFriendlyError(err));
            } finally {
              setAuthLoading(false);
            }
          }}
          onRequestRecovery={async (payload) => {
            try {
              setAuthError('');
              setAuthLoading(true);
              return await handleRequestRecovery(payload);
            } catch (err) {
              setAuthError(toFriendlyError(err));
              return null;
            } finally {
              setAuthLoading(false);
            }
          }}
          onResetRecovery={async (payload) => {
            try {
              setAuthError('');
              setAuthLoading(true);
              return await handleResetRecovery(payload);
            } catch (err) {
              setAuthError(toFriendlyError(err));
              return null;
            } finally {
              setAuthLoading(false);
            }
          }}
        />
      </>
    );
  }

  return (
    <>
      <GlobalStyles />
      <div className="hc-app">
        <Sidebar
          page={page}
          setPage={setPage}
          memoryCount={memoryCount}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          householdName={displayHouseholdName}
          accountName={authUser?.displayName || ''}
          role={authUser?.role || ''}
        />

        <main className="hc-main">
          <div className="hc-topbar">
            <button className="hc-btn-icon hc-mobile-menu-btn" title="Open menu" onClick={() => setMobileMenuOpen(true)}>
              M
            </button>
            <div className="hc-breadcrumb">
              <span>Commons</span>
              <span>{'>'}</span>
              {page === 'vault-contents' ? (
                <>
                  <span className="hc-breadcrumb-current" style={{ cursor: 'pointer' }} onClick={() => setPage('vaults')}>
                    Vaults
                  </span>
                  <span>{'>'}</span>
                  <span className="hc-breadcrumb-current">{vaults.find((v) => v.id === viewingVaultId)?.name || 'Vault'}</span>
                </>
              ) : page === 'member-profile' ? (
                <>
                  <span className="hc-breadcrumb-current" style={{ cursor: 'pointer' }} onClick={() => setPage('members')}>
                    Members
                  </span>
                  <span>{'>'}</span>
                  <span className="hc-breadcrumb-current">{members.find((m) => Number(m.id) === Number(viewingMemberId))?.name || 'Profile'}</span>
                </>
              ) : (
                <span className="hc-breadcrumb-current">{currentPage?.label}</span>
              )}
            </div>
            <div className="hc-search-wrap">
              <span className="hc-search-icon">?</span>
              <input
                className="hc-search"
                placeholder="Search memories, vaults, members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="hc-topbar-actions">
              <button className="hc-btn-icon" title="Notifications">N</button>
              <button className="hc-btn-icon" title="Sync status">S</button>
              <button className="hc-btn hc-btn-ghost hc-btn-sm" onClick={handleLogout}>Logout</button>
              {page !== 'vault-contents' && canAddMemory && (
                <button className="hc-btn hc-btn-primary" onClick={() => {
                  setNewMemoryDate('');
                  setShowModal(true);
                }}>
                  + Add Memory
                </button>
              )}
            </div>
          </div>

          <div className="hc-content">
            {page === 'members' && (
              <>
                {pages['members']}
                {['owner', 'parent'].includes(authUser?.role) ? (
                  <HouseholdAdmin
                    user={authUser}
                    householdName={displayHouseholdName}
                    members={householdMembers}
                    invites={householdInvites}
                    onRefresh={reloadHouseholdData}
                    onCreateMember={handleCreateHouseholdMember}
                    onCreateInvite={handleCreateInvite}
                    onUpdateMember={handleUpdateHouseholdMember}
                    onRemoveMember={handleRemoveHouseholdMember}
                    onResetHousehold={handleResetHousehold}
                  />
                ) : null}
              </>
            )}
            {loading && <div className="hc-card">Loading live data...</div>}
            {!loading && offlineMode && (
              <div className="hc-card" style={{ marginBottom: 16 }}>
                API is offline. Running in local demo mode.
              </div>
            )}
            {!loading && error && <div className="hc-card">{error}</div>}
            {!loading && page !== 'members' && pages[page]}
          </div>
        </main>
      </div>

      {showModal && canAddMemory && (
        <AddMemoryModal
          vaults={vaults}
          members={householdMembers}
          currentUserName={authUser?.displayName || ''}
          initialDate={newMemoryDate}
          onClose={() => {
            setShowModal(false);
            setNewMemoryDate('');
          }}
          onSave={async (payload) => {
            await saveMemory(payload);
            setShowModal(false);
            setNewMemoryDate('');
          }}
        />
      )}
    </>
  );
}

export default App;
