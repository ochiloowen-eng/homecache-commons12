import { useMemo, useState } from 'react';
import theme from '../theme';

export function ProgressRing({ pct, size = 54, stroke = 5 }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="hc-ring">
      <circle className="hc-ring-bg" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
      <circle className="hc-ring-fill" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} />
    </svg>
  );
}

export function StorageBar({ pct }) {
  return (
    <div>
      <div className="hc-storage-bar">
        <div className="hc-storage-fill" style={{ width: `${pct}%` }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: theme.fogDark }}>
        <span>{pct}% used</span>
        <span>{Math.round((100 - pct) * 0.5)} GB free</span>
      </div>
    </div>
  );
}

export function AddMemoryModal({ vaults, members = [], currentUserName = '', onClose, onSave, initialDate = '' }) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [tags, setTags] = useState('');
  const [vaultId, setVaultId] = useState(vaults[0]?.id || '');
  const [author, setAuthor] = useState(currentUserName || members[0]?.displayName || '');
  const [date, setDate] = useState(initialDate);
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const appendSelectedFiles = (selected) => {
    if (!selected?.length) {
      return;
    }
    setFiles((prev) => [...prev, ...selected]);
  };

  const canSave = useMemo(() => title.trim() && text.trim() && !saving, [title, text, saving]);

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave({
        author: author || undefined,
        title: title.trim(),
        text: text.trim(),
        tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        vaultId: vaultId || null,
        createdAt: date ? `${date}T12:00:00.000Z` : undefined,
        files,
      });
    } catch (err) {
      setError(err.message || 'Failed to save memory.');
      setSaving(false);
    }
  };

  return (
    <div className="hc-modal-backdrop" onClick={onClose}>
      <div className="hc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hc-modal-title">Add a Memory</div>
        <div className="hc-modal-sub">Preserve something important for your family commons.</div>
        <div className="hc-form-group">
          <label className="hc-label">Memory Title</label>
          <input className="hc-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Summer Reunion 2024..." />
        </div>
        <div className="hc-form-group">
          <label className="hc-label">Description</label>
          <textarea className="hc-input hc-textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="Describe this memory..." />
        </div>
        <div className="hc-form-group">
          <label className="hc-label">Author</label>
          <select className="hc-input" value={author} onChange={(e) => setAuthor(e.target.value)}>
            {currentUserName ? <option value={currentUserName}>{currentUserName}</option> : null}
            {members
              .filter((m) => m?.displayName && m.displayName !== currentUserName)
              .map((m) => (
                <option key={m.id} value={m.displayName}>{m.displayName}</option>
              ))}
          </select>
        </div>
        <div className="hc-form-group">
          <label className="hc-label">Date</label>
          <input className="hc-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="hc-form-group">
          <label className="hc-label">Vault</label>
          <select className="hc-input" value={vaultId} onChange={(e) => setVaultId(e.target.value)}>
            {vaults.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div className="hc-form-group">
          <label className="hc-label">Tags (comma-separated)</label>
          <input className="hc-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="family, photos, 2024..." />
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
          <div className="hc-card-sub" style={{ marginTop: 6 }}>Use your phone camera to scan documents or capture photos.</div>
        </div>
        <div className="hc-form-group">
          <label className="hc-label">Attach Files</label>
          <input
            className="hc-input"
            type="file"
            accept="image/*,video/*,audio/*,.mp3,.wav,.m4a,.flac,.aac,.ogg,.pdf,.doc,.docx,.txt"
            multiple
            onChange={(e) => appendSelectedFiles(Array.from(e.target.files || []))}
          />
          {files.length ? <div className="hc-card-sub" style={{ marginTop: 6 }}>{files.length} file(s) selected</div> : null}
        </div>
        {error ? <div className="hc-card-sub" style={{ color: theme.rust }}>{error}</div> : null}
        <div className="hc-modal-actions">
          <button className="hc-btn hc-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="hc-btn hc-btn-primary" onClick={handleSave} disabled={!canSave}>
            {saving ? 'Saving...' : 'Save Memory'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AddVaultModal({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📦');
  const [description, setDescription] = useState('');
  const [accessLevel, setAccessLevel] = useState('family');
  const [locked, setLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canSave = useMemo(() => name.trim() && emoji.trim() && !saving, [name, emoji, saving]);

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave({
        name: name.trim(),
        emoji: emoji.trim(),
        description: description.trim(),
        accessLevel,
        locked,
        cover: `linear-gradient(135deg,${['#e5d3d3', '#ddd3e5', '#d3e5d9', '#ebe6d3'][Math.floor(Math.random() * 4)]},${['#c4968e', '#b09ac4', '#9abba2', '#c9b98a'][Math.floor(Math.random() * 4)]})`,
      });
    } catch (err) {
      setError(err.message || 'Failed to create vault.');
      setSaving(false);
    }
  };

  return (
    <div className="hc-modal-backdrop" onClick={onClose}>
      <div className="hc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hc-modal-title">Create New Vault</div>
        <div className="hc-modal-sub">Start a new collection for your family memories.</div>
        <div className="hc-form-group">
          <label className="hc-label">Vault Name</label>
          <input className="hc-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer Photos..." />
        </div>
        <div className="hc-form-group">
          <label className="hc-label">Emoji</label>
          <input className="hc-input" value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="📸" maxLength={2} />
        </div>
        <div className="hc-form-group">
          <label className="hc-label">Description</label>
          <textarea className="hc-input hc-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this vault for?" />
        </div>
        <div className="hc-form-group">
          <label className="hc-label">Access Level</label>
          <select className="hc-input" value={accessLevel} onChange={(e) => setAccessLevel(e.target.value)}>
            <option value="family">Family (visible to all)</option>
            <option value="restricted">Restricted (limited access)</option>
          </select>
        </div>
        <div className="hc-form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" id="locked" checked={locked} onChange={(e) => setLocked(e.target.checked)} />
          <label htmlFor="locked" className="hc-label" style={{ margin: 0, cursor: 'pointer' }}>Lock vault (restricted users only)</label>
        </div>
        {error ? <div className="hc-card-sub" style={{ color: theme.rust }}>{error}</div> : null}
        <div className="hc-modal-actions">
          <button className="hc-btn hc-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="hc-btn hc-btn-primary" onClick={handleSave} disabled={!canSave}>
            {saving ? 'Creating...' : 'Create Vault'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EditVaultModal({ vault, onClose, onSave }) {
  const [name, setName] = useState(vault?.name || '');
  const [emoji, setEmoji] = useState(vault?.emoji || '📦');
  const [description, setDescription] = useState(vault?.description || '');
  const [accessLevel, setAccessLevel] = useState(vault?.accessLevel || 'family');
  const [locked, setLocked] = useState(vault?.locked || false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canSave = useMemo(() => name.trim() && emoji.trim() && !saving, [name, emoji, saving]);

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave({
        name: name.trim(),
        emoji: emoji.trim(),
        description: description.trim(),
        accessLevel,
        locked,
      });
    } catch (err) {
      setError(err.message || 'Failed to update vault.');
      setSaving(false);
    }
  };

  return (
    <div className="hc-modal-backdrop" onClick={onClose}>
      <div className="hc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hc-modal-title">Edit Vault</div>
        <div className="hc-modal-sub">Update vault settings and information.</div>
        <div className="hc-form-group">
          <label className="hc-label">Vault Name</label>
          <input className="hc-input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="hc-form-group">
          <label className="hc-label">Emoji</label>
          <input className="hc-input" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2} />
        </div>
        <div className="hc-form-group">
          <label className="hc-label">Description</label>
          <textarea className="hc-input hc-textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="hc-form-group">
          <label className="hc-label">Access Level</label>
          <select className="hc-input" value={accessLevel} onChange={(e) => setAccessLevel(e.target.value)}>
            <option value="family">Family (visible to all)</option>
            <option value="restricted">Restricted (limited access)</option>
          </select>
        </div>
        <div className="hc-form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" id="locked" checked={locked} onChange={(e) => setLocked(e.target.checked)} />
          <label htmlFor="locked" className="hc-label" style={{ margin: 0, cursor: 'pointer' }}>Lock vault (restricted users only)</label>
        </div>
        {error ? <div className="hc-card-sub" style={{ color: theme.rust }}>{error}</div> : null}
        <div className="hc-modal-actions">
          <button className="hc-btn hc-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="hc-btn hc-btn-primary" onClick={handleSave} disabled={!canSave}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function LogoIcon({ className }) {
  const { amberLight, rust, ink } = theme;
  return (
    <svg className={className} viewBox="0 0 36 36" fill="none">
      <rect x="4" y="16" width="28" height="18" rx="3" fill={amberLight} opacity="0.9" />
      <path d="M2 18 L18 4 L34 18" stroke={amberLight} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <rect x="13" y="22" width="10" height="12" rx="2" fill={ink} opacity="0.6" />
      <circle cx="27" cy="10" r="4" fill={rust} opacity="0.8" />
    </svg>
  );
}
