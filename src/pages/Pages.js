import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_BASE } from '../api';
import theme from '../theme';
import { AddVaultModal, EditVaultModal } from '../components/UI';

function formatFileSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(file) {
  if (!file) {
    return false;
  }
  if (typeof file.mimeType === 'string' && file.mimeType.startsWith('image/')) {
    return true;
  }
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name || '');
}

function formatRevisionDate(value) {
  if (!value) {
    return 'Unknown time';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function MemoryHistoryPanel({ memoryId, onGetHistory, onRestore }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [restoringId, setRestoringId] = useState(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await onGetHistory(memoryId);
      setHistory(rows || []);
    } catch (err) {
      setError(err?.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [memoryId, onGetHistory]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return (
    <div className="hc-card" style={{ marginTop: 10 }}>
      <div className="hc-card-title" style={{ marginBottom: 8 }}>Version History</div>
      {loading ? <div className="hc-card-sub">Loading history...</div> : null}
      {error ? <div className="hc-card-sub">{error}</div> : null}
      {!loading && !error && !history.length ? <div className="hc-card-sub">No prior versions yet.</div> : null}
      {!loading && !error && history.map((revision) => (
        <div
          key={revision.id}
          style={{
            borderTop: `1px solid ${theme.fog}`,
            paddingTop: 10,
            marginTop: 10,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 13, color: theme.ink }}>
              <strong>{revision.title}</strong> by {revision.editedBy}
            </div>
            <div style={{ fontSize: 12, color: theme.fogDark }}>
              {revision.eventType} • {formatRevisionDate(revision.createdAt)}
            </div>
          </div>
          <button
            className="hc-btn hc-btn-ghost hc-btn-sm"
            onClick={async () => {
              if (!window.confirm('Restore this revision? Current content will be saved as a new revision.')) {
                return;
              }
              setRestoringId(revision.id);
              try {
                await onRestore(memoryId, revision.id);
              } finally {
                setRestoringId(null);
              }
            }}
            disabled={restoringId === revision.id}
          >
            {restoringId === revision.id ? 'Restoring...' : 'Restore'}
          </button>
        </div>
      ))}
    </div>
  );
}

function MemoryEditor({ memory, vaults, onCancel, onSave }) {
  const [title, setTitle] = useState(memory.title);
  const [text, setText] = useState(memory.text);
  const [tags, setTags] = useState(memory.tags.join(', '));
  const [vaultId, setVaultId] = useState(memory.vaultId || '');
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  const appendSelectedFiles = (selected) => {
    if (!selected?.length) {
      return;
    }
    setFiles((prev) => [...prev, ...selected]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(memory.id, {
        title,
        text,
        tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        vaultId: vaultId || null,
        files,
      });
      onCancel();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="hc-card" style={{ marginTop: 10 }}>
      <div className="hc-form-group">
        <label className="hc-label">Title</label>
        <input className="hc-input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="hc-form-group">
        <label className="hc-label">Description</label>
        <textarea className="hc-input hc-textarea" value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <div className="hc-form-group">
        <label className="hc-label">Vault</label>
        <select className="hc-input" value={vaultId} onChange={(e) => setVaultId(e.target.value)}>
          <option value="">General</option>
          {vaults.map((vault) => (
            <option key={vault.id} value={vault.id}>{vault.name}</option>
          ))}
        </select>
      </div>
      <div className="hc-form-group">
        <label className="hc-label">Tags</label>
        <input className="hc-input" value={tags} onChange={(e) => setTags(e.target.value)} />
      </div>
      <div className="hc-form-group">
        <label className="hc-label">Scan or Take Photo</label>
        <input
          className="hc-input"
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={(e) => appendSelectedFiles(Array.from(e.target.files || []))}
        />
      </div>
      <div className="hc-form-group">
        <label className="hc-label">Upload More Files</label>
        <input
          className="hc-input"
          type="file"
          accept="image/*,video/*,audio/*,.mp3,.wav,.m4a,.flac,.aac,.ogg,.pdf,.doc,.docx,.txt"
          multiple
          onChange={(e) => appendSelectedFiles(Array.from(e.target.files || []))}
        />
      </div>
      <div className="hc-modal-actions">
        <button className="hc-btn hc-btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="hc-btn hc-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
      </div>
    </div>
  );
}

export function MemoriesPage({
  memories,
  vaults,
  search,
  onUpdateMemory,
  onDeleteMemory,
  onDeleteMemoryFile,
  onGetMemoryHistory,
  onRestoreMemoryRevision,
  canManage = true,
}) {
  const [filter, setFilter] = useState('All');
  const [editingId, setEditingId] = useState(null);
  const [historyId, setHistoryId] = useState(null);
  const filters = ['All', ...vaults.map((v) => v.name)];

  const visibleMemories = useMemo(() => {
    return memories.filter((memory) => {
      if (filter === 'All') {
        return true;
      }
      return memory.vaultName === filter;
    });
  }, [memories, filter]);

  return (
    <div>
      <div className="hc-page-title">Family Memories</div>
      <div className="hc-page-sub">A living archive of shared moments, documents, and stories.</div>
      {search ? <div className="hc-card-sub">Search active: "{search}"</div> : null}
      <div className="hc-chips">
        {filters.map((name) => (
          <div key={name} className={`hc-chip${filter === name ? ' active' : ''}`} onClick={() => setFilter(name)}>{name}</div>
        ))}
      </div>
      {visibleMemories.map((m) => (
        <div className="hc-timeline-item" key={m.id}>
          <div className="hc-timeline-dot" style={{ background: m.color }}>{m.emoji}</div>
          <div className="hc-timeline-body">
            <div className="hc-timeline-meta">
              <span className="hc-timeline-author">{m.author}</span>
              <span className="hc-timeline-time">• {m.time}</span>
              <span className="hc-timeline-time">• {m.vaultName}</span>
            </div>
            <div className="hc-timeline-text"><strong>{m.title}</strong> - {m.text}</div>
            <div className="hc-timeline-tags">
              {m.tags.map((tag) => <span key={tag} className="hc-tag hc-tag-amber">#{tag}</span>)}
            </div>
            {m.files?.length ? (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {m.files.map((file) => (
                  <div key={file.id} style={{ border: `1px solid ${theme.fog}`, borderRadius: 6, padding: '4px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isImageFile(file) ? (
                      <a href={`${API_BASE}${file.url}`} target="_blank" rel="noreferrer" title={file.name}>
                        <img
                          src={`${API_BASE}${file.url}`}
                          alt={file.name}
                          style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 4, border: `1px solid ${theme.fog}` }}
                        />
                      </a>
                    ) : null}
                    <a href={`${API_BASE}${file.url}`} target="_blank" rel="noreferrer">{file.name}</a>
                    <span style={{ color: theme.fogDark }}>{formatFileSize(file.size)}</span>
                    {canManage ? <button className="hc-btn-icon" onClick={() => onDeleteMemoryFile(m.id, file.id)} title="Delete file">x</button> : null}
                  </div>
                ))}
              </div>
            ) : null}

            {canManage && editingId === m.id ? (
              <MemoryEditor
                memory={m}
                vaults={vaults}
                onCancel={() => setEditingId(null)}
                onSave={onUpdateMemory}
              />
            ) : null}
            {historyId === m.id ? (
              <MemoryHistoryPanel
                memoryId={m.id}
                onGetHistory={onGetMemoryHistory}
                onRestore={onRestoreMemoryRevision}
              />
            ) : null}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {canManage ? <button className="hc-btn-icon" onClick={() => setEditingId(m.id)} title="Edit memory">E</button> : null}
            <button className="hc-btn-icon" onClick={() => setHistoryId((prev) => (prev === m.id ? null : m.id))} title="Version history">H</button>
            {canManage ? (
              <button
                className="hc-btn-icon"
                onClick={() => {
                  if (window.confirm('Delete this memory permanently?')) {
                    onDeleteMemory(m.id);
                  }
                }}
                title="Delete memory"
              >
                D
              </button>
            ) : null}
          </div>
        </div>
      ))}
      {!visibleMemories.length ? <div className="hc-card">No memories match this filter.</div> : null}
    </div>
  );
}

export function VaultsPage({ vaults, onCreateVault, onEditVault, onDeleteVault, onViewVault, canManage = true }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVault, setEditingVault] = useState(null);
  const [deletingVaultId, setDeletingVaultId] = useState(null);

  const handleDelete = async (vaultId) => {
    if (window.confirm('Delete this vault? Memories in the vault will not be deleted.')) {
      setDeletingVaultId(vaultId);
      try {
        await onDeleteVault(vaultId);
      } finally {
        setDeletingVaultId(null);
      }
    }
  };

  return (
    <div>
      <div className="hc-page-title">Memory Vaults</div>
      <div className="hc-page-sub">Encrypted, access-controlled collections of family data.</div>
      <div className="hc-grid-3">
        {vaults.map((v) => (
          <div className="hc-vault-card" key={v.id} style={{ position: 'relative' }}>
            <div 
              className="hc-vault-cover" 
              style={{ background: v.cover, cursor: 'pointer' }}
              onClick={() => onViewVault(v.id)}
              title="Click to view vault contents"
            >
              <span style={{ fontSize: 40 }}>{v.emoji}</span>
              {v.locked && (
                <span style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(26,18,9,0.3)', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: 'white', fontFamily: 'JetBrains Mono,monospace' }}>
                  RESTRICTED
                </span>
              )}
            </div>
            <div className="hc-vault-body">
              <div className="hc-vault-name">{v.name}</div>
              <div className="hc-vault-desc">{v.description}</div>
              <div className="hc-vault-meta">
                <span>{v.items} items</span>
                <span>{v.sizeLabel}</span>
                <span className="hc-vault-lock">
                  {v.locked ? <span className="hc-encrypt-badge">Restricted</span> : <span className="hc-encrypt-badge">Family</span>}
                </span>
              </div>
            </div>
            {canManage ? (
              <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
                <button 
                  className="hc-btn-icon" 
                  onClick={() => setEditingVault(v)}
                  title="Edit vault"
                >E</button>
                <button 
                  className="hc-btn-icon" 
                  onClick={() => handleDelete(v.id)}
                  disabled={deletingVaultId === v.id}
                  title="Delete vault"
                >{deletingVaultId === v.id ? '...' : 'D'}</button>
              </div>
            ) : null}
          </div>
        ))}
        {canManage ? <div 
          className="hc-vault-card" 
          style={{ border: `2px dashed ${theme.fog}`, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180, cursor: 'pointer' }}
          onClick={() => setShowCreateModal(true)}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>+</div>
            <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 14, color: theme.fogDark }}>New Vault</div>
          </div>
        </div> : null}
      </div>

      {canManage && showCreateModal && (
        <AddVaultModal
          onClose={() => setShowCreateModal(false)}
          onSave={async (payload) => {
            await onCreateVault(payload);
            setShowCreateModal(false);
          }}
        />
      )}

      {canManage && editingVault && (
        <EditVaultModal
          vault={editingVault}
          onClose={() => setEditingVault(null)}
          onSave={async (payload) => {
            await onEditVault(editingVault.id, payload);
            setEditingVault(null);
          }}
        />
      )}
    </div>
  );
}

export function VaultContentsPage({
  vaultId,
  vaultName,
  memories,
  search,
  onUpdateMemory,
  onDeleteMemory,
  onDeleteMemoryFile,
  onGetMemoryHistory,
  onRestoreMemoryRevision,
  canManage = true,
}) {
  const [editingId, setEditingId] = useState(null);
  const [historyId, setHistoryId] = useState(null);

  return (
    <div>
      <div className="hc-page-title">{vaultName}</div>
      <div className="hc-page-sub">Memories stored in this vault.</div>
      {search ? <div className="hc-card-sub">Search active: "{search}"</div> : null}
      {memories.length === 0 ? (
        <div className="hc-card">No memories in this vault yet.</div>
      ) : (
        memories.map((m) => (
          <div className="hc-timeline-item" key={m.id}>
            <div className="hc-timeline-dot" style={{ background: m.color }}>{m.emoji}</div>
            <div className="hc-timeline-body">
              <div className="hc-timeline-meta">
                <span className="hc-timeline-author">{m.author}</span>
                <span className="hc-timeline-time">• {m.time}</span>
              </div>
              <div className="hc-timeline-text"><strong>{m.title}</strong> - {m.text}</div>
              <div className="hc-timeline-tags">
                {m.tags.map((tag) => <span key={tag} className="hc-tag hc-tag-amber">#{tag}</span>)}
              </div>
              {m.files?.length ? (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {m.files.map((file) => (
                    <div key={file.id} style={{ border: `1px solid ${theme.fog}`, borderRadius: 6, padding: '4px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isImageFile(file) ? (
                        <a href={`${API_BASE}${file.url}`} target="_blank" rel="noreferrer" title={file.name}>
                          <img
                            src={`${API_BASE}${file.url}`}
                            alt={file.name}
                            style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 4, border: `1px solid ${theme.fog}` }}
                          />
                        </a>
                      ) : null}
                      <a href={`${API_BASE}${file.url}`} target="_blank" rel="noreferrer">{file.name}</a>
                      <span style={{ color: theme.fogDark }}>{formatFileSize(file.size)}</span>
                      {canManage ? <button className="hc-btn-icon" onClick={() => onDeleteMemoryFile(m.id, file.id)} title="Delete file">x</button> : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {canManage && editingId === m.id ? (
                <MemoryEditor
                  memory={m}
                  vaults={[]}
                  onCancel={() => setEditingId(null)}
                  onSave={onUpdateMemory}
                />
              ) : null}
              {historyId === m.id ? (
                <MemoryHistoryPanel
                  memoryId={m.id}
                  onGetHistory={onGetMemoryHistory}
                  onRestore={onRestoreMemoryRevision}
                />
              ) : null}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              {canManage ? <button className="hc-btn-icon" onClick={() => setEditingId(m.id)} title="Edit memory">E</button> : null}
              <button className="hc-btn-icon" onClick={() => setHistoryId((prev) => (prev === m.id ? null : m.id))} title="Version history">H</button>
              {canManage ? (
                <button
                  className="hc-btn-icon"
                  onClick={() => {
                    if (window.confirm('Delete this memory permanently?')) {
                      onDeleteMemory(m.id);
                    }
                  }}
                  title="Delete memory"
                >
                  D
                </button>
              ) : null}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function MembersPage({ members, onViewProfile }) {
  return (
    <div>
      <div className="hc-page-title">Family Members</div>
      <div className="hc-page-sub">Everyone who shares and stewards your family commons.</div>
      <div className="hc-grid-3">
        {members.map((m) => (
          <div className="hc-member-card" key={m.id}>
            <div className="hc-member-avatar-lg" style={{ background: `linear-gradient(135deg, ${m.color}, ${m.color}cc)` }}>
              {m.initials}
            </div>
            {m.online && (
              <div className="hc-member-online">
                <div className="hc-online-dot" />Online now
              </div>
            )}
            <div className="hc-member-name">{m.name}</div>
            <div className="hc-member-role">{m.role}</div>
            <div className="hc-member-stats">
              <div style={{ textAlign: 'center' }}>
                <div className="hc-member-stat-val">{m.memories}</div>
                <div className="hc-member-stat-label">Memories</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="hc-member-stat-val">{m.vaults}</div>
                <div className="hc-member-stat-label">Vaults</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="hc-btn hc-btn-ghost hc-btn-sm" style={{ width: '100%' }} onClick={() => onViewProfile(m.id)}>
                View Profile
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MemberProfilePage({ member, onBack }) {
  if (!member) {
    return (
      <div className="hc-card">
        <div className="hc-card-title">Member not found</div>
        <button className="hc-btn hc-btn-ghost hc-btn-sm" style={{ marginTop: 12 }} onClick={onBack}>
          Back to members
        </button>
      </div>
    );
  }

  return (
    <div>
      <button className="hc-btn hc-btn-ghost hc-btn-sm" onClick={onBack} style={{ marginBottom: 14 }}>
        Back to members
      </button>
      <div className="hc-card">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div className="hc-member-avatar-lg" style={{ background: `linear-gradient(135deg, ${member.color}, ${member.color}cc)`, margin: 0 }}>
            {member.initials}
          </div>
          <div>
            <div className="hc-page-title" style={{ marginBottom: 4 }}>{member.name}</div>
            <div className="hc-member-role" style={{ marginBottom: 8 }}>{member.role}</div>
            {member.online ? (
              <div className="hc-member-online" style={{ marginBottom: 0 }}>
                <div className="hc-online-dot" />Online now
              </div>
            ) : (
              <div className="hc-member-role" style={{ marginBottom: 0 }}>Offline</div>
            )}
          </div>
        </div>
      </div>
      <div className="hc-grid-3" style={{ marginTop: 16 }}>
        <div className="hc-card">
          <div className="hc-card-sub">Memories Shared</div>
          <div className="hc-member-stat-val">{member.memories}</div>
        </div>
        <div className="hc-card">
          <div className="hc-card-sub">Vaults Access</div>
          <div className="hc-member-stat-val">{member.vaults}</div>
        </div>
        <div className="hc-card">
          <div className="hc-card-sub">Joined</div>
          <div className="hc-member-stat-val" style={{ fontSize: 20 }}>{member.joined || 'N/A'}</div>
        </div>
      </div>
    </div>
  );
}

export function FamilyTreePage({ nodes, edges }) {
  const W = 680;
  const H = 380;
  const nmap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <div>
      <div className="hc-page-title">Family Tree</div>
      <div className="hc-page-sub">A living genealogical map of your family.</div>
      <div className="hc-tree-container">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="hc-tree-svg">
          {edges.map(([a, b]) => {
            const na = nmap[a];
            const nb = nmap[b];
            if (!na || !nb) {
              return null;
            }
            return <line key={`${a}-${b}`} x1={na.x} y1={na.y + 20} x2={nb.x} y2={nb.y - 20} stroke={theme.fog} strokeWidth={1.5} />;
          })}
          {nodes.map((n) => (
            <g key={n.id} className="hc-tree-node" transform={`translate(${n.x},${n.y})`}>
              <circle r={22} fill={n.color} />
              <text textAnchor="middle" dy={40} style={{ fontSize: 12, fontFamily: 'Lora,serif', fill: theme.ink, fontWeight: 500 }}>{n.label}</text>
              <text textAnchor="middle" dy={54} style={{ fontSize: 9, fontFamily: 'JetBrains Mono,monospace', fill: theme.fogDark }}>{n.sub}</text>
              <text textAnchor="middle" dy={6} style={{ fontSize: 12, fill: 'white', fontFamily: 'Playfair Display,serif', fontWeight: 700 }}>
                {n.label.split(' ')[0][0]}{n.label.split(' ')[1]?.[0] || ''}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export function TimelinePage({ timelineData, loading, error, onLoadTimeline, onAddActivityForDate }) {
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');

  const monthNames = {
    '01': 'January',
    '02': 'February',
    '03': 'March',
    '04': 'April',
    '05': 'May',
    '06': 'June',
    '07': 'July',
    '08': 'August',
    '09': 'September',
    '10': 'October',
    '11': 'November',
    '12': 'December',
  };

  useEffect(() => {
    onLoadTimeline({ year, month }).catch(() => {});
  }, [year, month, onLoadTimeline]);

  const grouped = useMemo(() => {
    const map = {};
    (timelineData?.entries || []).forEach((entry) => {
      const date = new Date(entry.createdAt);
      const key = Number.isNaN(date.getTime()) ? 'Unknown Date' : date.toDateString();
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(entry);
    });
    return Object.entries(map);
  }, [timelineData]);

  const selectedYear = Number(year || new Date().getFullYear());
  const selectedMonth = Number(month || String(new Date().getMonth() + 1).padStart(2, '0'));

  const calendar = useMemo(() => {
    const first = new Date(selectedYear, selectedMonth - 1, 1);
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const startDow = first.getDay();
    const cells = [];
    for (let i = 0; i < startDow; i += 1) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      cells.push(d);
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    const countByDay = {};
    (timelineData?.entries || []).forEach((entry) => {
      const dt = new Date(entry.createdAt);
      if (Number.isNaN(dt.getTime())) {
        return;
      }
      const y = dt.getFullYear();
      const m = dt.getMonth() + 1;
      const d = dt.getDate();
      if (y === selectedYear && m === selectedMonth) {
        countByDay[d] = (countByDay[d] || 0) + 1;
      }
    });
    return { cells, countByDay };
  }, [timelineData, selectedYear, selectedMonth]);

  return (
    <div>
      <div className="hc-page-title">Family Timeline</div>
      <div className="hc-page-sub">Browse your family memories chronologically and rediscover anniversaries.</div>

      <div className="hc-card" style={{ marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <select className="hc-input" style={{ maxWidth: 180 }} value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">All years</option>
          {(timelineData?.years || []).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select className="hc-input" style={{ maxWidth: 180 }} value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="">All months</option>
          {(timelineData?.months || []).map((m) => (
            <option key={m} value={m}>{monthNames[m] || m}</option>
          ))}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(timelineData?.years || []).slice(0, 10).map((y) => (
            <button
              key={`jump-${y}`}
              className="hc-btn hc-btn-ghost hc-btn-sm"
              onClick={() => setYear(y)}
              style={{ fontWeight: y === year ? 700 : 500 }}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="hc-card" style={{ marginBottom: 16 }}>
        <div className="hc-card-title">
          {monthNames[String(selectedMonth).padStart(2, '0')]} {selectedYear}
        </div>
        <div className="hc-card-sub">Calendar view with memory activity</div>
        <div
          style={{
            marginTop: 10,
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: 6,
          }}
        >
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} style={{ fontSize: 11, color: theme.fogDark, textAlign: 'center', fontFamily: 'JetBrains Mono,monospace' }}>{d}</div>
          ))}
          {calendar.cells.map((day, idx) => {
            const count = day ? (calendar.countByDay[day] || 0) : 0;
            const dateValue = day
              ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              : '';
            return (
              <button
                key={`cell-${idx}`}
                type="button"
                onClick={() => day && onAddActivityForDate?.(dateValue)}
                disabled={!day}
                style={{
                  minHeight: 44,
                  border: `1px solid ${theme.fog}`,
                  borderRadius: 8,
                  padding: 6,
                  background: day && count ? theme.parchment : 'white',
                  opacity: day ? 1 : 0.35,
                  textAlign: 'left',
                  cursor: day ? 'pointer' : 'default',
                }}
              >
                <div style={{ fontSize: 12, color: theme.ink }}>{day || ''}</div>
                {count ? (
                  <div style={{ marginTop: 4, fontSize: 10, color: theme.moss, fontFamily: 'JetBrains Mono,monospace' }}>
                    {count} memory{count > 1 ? 'ies' : ''}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {!!timelineData?.onThisDay?.length && (
        <div className="hc-card" style={{ marginBottom: 16 }}>
          <div className="hc-card-title">On This Day</div>
          <div className="hc-card-sub">Matching month/day from past years</div>
          {timelineData.onThisDay.map((m) => (
            <div className="hc-activity-item" key={`otd-${m.id}`}>
              <div className="hc-activity-icon" style={{ background: m.color }}>{m.emoji}</div>
              <div>
                <div className="hc-activity-text"><strong>{m.title}</strong> - {m.author}</div>
                <div className="hc-activity-time">{new Date(m.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? <div className="hc-card">Loading timeline...</div> : null}
      {error ? <div className="hc-card">{error}</div> : null}
      {!loading && !grouped.length ? <div className="hc-card">No memories in this timeline range.</div> : null}

      {!loading && grouped.map(([dateLabel, items]) => (
        <div className="hc-card" key={dateLabel} style={{ marginBottom: 12 }}>
          <div className="hc-card-title">{dateLabel}</div>
          {items.map((m) => (
            <div key={`tl-${m.id}`} style={{ borderTop: `1px solid ${theme.fog}`, paddingTop: 10, marginTop: 10 }}>
              <div className="hc-timeline-meta">
                <span className="hc-timeline-author">{m.author}</span>
                <span className="hc-timeline-time">• {m.vaultName}</span>
                <span className="hc-timeline-time">• {new Date(m.createdAt).toLocaleTimeString()}</span>
              </div>
              <div className="hc-timeline-text"><strong>{m.title}</strong> - {m.text}</div>
              <div className="hc-timeline-tags">
                {(m.tags || []).map((tag) => <span key={`${m.id}-${tag}`} className="hc-tag hc-tag-amber">#{tag}</span>)}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function InsightsPage({ data, loading, error, onRefresh }) {
  const totals = data?.totals || {};
  const topContributors = data?.topContributors || [];
  const vaultDistribution = data?.vaultDistribution || [];
  const tagTrends = data?.tagTrends || [];
  const monthlyActivity = data?.monthlyActivity || [];
  const dayOfWeekActivity = data?.dayOfWeekActivity || [];

  const maxMonthCount = Math.max(1, ...monthlyActivity.map((item) => item.count || 0));
  const maxDayCount = Math.max(1, ...dayOfWeekActivity.map((item) => item.count || 0));

  return (
    <div>
      <div className="hc-section-head">
        <div>
          <div className="hc-page-title">Data Insights</div>
          <div className="hc-page-sub">Track contribution trends, activity patterns, and vault growth.</div>
        </div>
        <button className="hc-btn hc-btn-ghost hc-btn-sm" onClick={() => onRefresh?.()}>Refresh</button>
      </div>

      <div className="hc-grid-2">
        <div className="hc-card">
          <div className="hc-card-sub">TOTAL MEMORIES</div>
          <div className="hc-member-stat-val">{totals.memories || 0}</div>
        </div>
        <div className="hc-card">
          <div className="hc-card-sub">ACTIVE CONTRIBUTORS</div>
          <div className="hc-member-stat-val">{totals.contributors || 0}</div>
        </div>
      </div>

      <div className="hc-grid-2">
        <div className="hc-card">
          <div className="hc-card-sub">VAULTS USED</div>
          <div className="hc-member-stat-val">{totals.vaultsUsed || 0}</div>
        </div>
        <div className="hc-card">
          <div className="hc-card-sub">DISTINCT TAGS</div>
          <div className="hc-member-stat-val">{totals.tagsUsed || 0}</div>
        </div>
      </div>

      <div className="hc-grid-2">
        <div className="hc-card">
          <div className="hc-card-title">Top Contributors</div>
          <div className="hc-card-sub">MOST MEMORIES ADDED</div>
          {!topContributors.length ? <div className="hc-card-sub">No contributor data yet.</div> : null}
          {topContributors.map((row) => (
            <div key={row.name} className="hc-notif-chip">
              <div className="hc-notif-dot" />
              <div className="hc-notif-text">{row.name}</div>
              <div className="hc-notif-time">{row.count} memories</div>
            </div>
          ))}
        </div>

        <div className="hc-card">
          <div className="hc-card-title">Vault Distribution</div>
          <div className="hc-card-sub">MEMORIES BY VAULT</div>
          {!vaultDistribution.length ? <div className="hc-card-sub">No vault distribution yet.</div> : null}
          {vaultDistribution.map((row) => (
            <div key={row.name} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: theme.slate }}>
                <span>{row.name}</span>
                <span>{row.count} ({row.percent}%)</span>
              </div>
              <div className="hc-storage-bar">
                <div className="hc-storage-fill" style={{ width: `${row.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="hc-grid-2">
        <div className="hc-card">
          <div className="hc-card-title">Monthly Activity</div>
          <div className="hc-card-sub">LAST 8 MONTHS</div>
          {!monthlyActivity.length ? <div className="hc-card-sub">No monthly activity yet.</div> : null}
          {monthlyActivity.map((row) => (
            <div key={row.month} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: theme.slate }}>
                <span>{row.month}</span>
                <span>{row.count}</span>
              </div>
              <div className="hc-storage-bar">
                <div className="hc-storage-fill" style={{ width: `${Math.round((row.count / maxMonthCount) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="hc-card">
          <div className="hc-card-title">Day-of-Week Activity</div>
          <div className="hc-card-sub">MEMORY CREATION PATTERNS</div>
          {!dayOfWeekActivity.length ? <div className="hc-card-sub">No weekday pattern yet.</div> : null}
          {dayOfWeekActivity.map((row) => (
            <div key={row.day} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: theme.slate }}>
                <span>{row.day}</span>
                <span>{row.count}</span>
              </div>
              <div className="hc-storage-bar">
                <div className="hc-storage-fill" style={{ width: `${Math.round((row.count / maxDayCount) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="hc-card">
        <div className="hc-card-title">Trending Tags</div>
        <div className="hc-card-sub">MOST USED TAGS</div>
        {!tagTrends.length ? <div className="hc-card-sub">No tags found yet.</div> : null}
        <div className="hc-timeline-tags">
          {tagTrends.map((row) => (
            <span key={row.tag} className="hc-tag hc-tag-moss">#{row.tag} ({row.count})</span>
          ))}
        </div>
      </div>

      {loading ? <div className="hc-card" style={{ marginTop: 14 }}>Loading insights...</div> : null}
      {error ? <div className="hc-card" style={{ marginTop: 14 }}>{error}</div> : null}
    </div>
  );
}

export function SettingsPage({ sections, onToggle, canManage = true }) {
  return (
    <div>
      <div className="hc-page-title">Settings</div>
      <div className="hc-page-sub">Manage your family commons, encryption, and sync preferences.</div>
      {sections.map((section) => (
        <div className="hc-card" key={section.title} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 20 }}>{section.icon}</span>
            <div className="hc-card-title">{section.title}</div>
          </div>
          {section.items.map((item) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderTop: `1px solid ${theme.fog}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: theme.ink, marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: theme.fogDark }}>{item.desc}</div>
              </div>
              <button
                type="button"
                onClick={() => canManage && onToggle(item.id, !item.enabled)}
                disabled={!canManage}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  padding: 2,
                  cursor: canManage ? 'pointer' : 'not-allowed',
                  opacity: canManage ? 1 : 0.65,
                  border: 'none',
                  background: item.enabled ? theme.moss : theme.fog,
                  transition: 'background 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: item.enabled ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
