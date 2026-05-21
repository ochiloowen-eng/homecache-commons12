import { useEffect, useState } from 'react';
import theme from '../theme';

export function AuthScreen({ onLogin, onRegister, onRequestRecovery, onResetRecovery, loading, error }) {
  const [mode, setMode] = useState('login');
  const [displayName, setDisplayName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [info, setInfo] = useState('');
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('inviteCode');
    if (code) {
      setInviteCode(code);
      setMode('register');
      setInfo('Invite code detected. Complete registration to join the household.');
    }
  }, []);

  const submit = async () => {
    try {
      setInfo('');
      if (mode === 'login') {
        await onLogin({ identifier, password });
        return;
      }
      if (mode === 'register') {
        await onRegister({ displayName, identifier, password, householdName, inviteCode });
        return;
      }
      if (mode === 'recover') {
        const response = await onRequestRecovery({ identifier });
        if (response?.recoveryToken) {
          setInfo(`Recovery token: ${response.recoveryToken}`);
        } else {
          setInfo('Recovery request submitted.');
        }
        return;
      }
      await onResetRecovery({ token: recoveryToken, newPassword: recoveryPassword });
      setInfo('Password reset successful. You can now log in.');
      setMode('login');
    } catch (_error) {
      // parent surface handles the message
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: theme.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="hc-card" style={{ width: '100%', maxWidth: 460 }}>
        <div className="hc-page-title" style={{ fontSize: 28 }}>Homecache Accounts</div>
        <div className="hc-page-sub">Email/phone login, household roles, invites, and recovery.</div>
        <div className="hc-chips" style={{ marginBottom: 12 }}>
          {['login', 'register', 'recover', 'reset'].map((m) => (
            <div key={m} className={`hc-chip${mode === m ? ' active' : ''}`} onClick={() => setMode(m)}>{m}</div>
          ))}
        </div>

        {(mode === 'register') && (
          <div className="hc-form-group">
            <label className="hc-label">Name</label>
            <input className="hc-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
        )}

        {(mode === 'login' || mode === 'register' || mode === 'recover') && (
          <div className="hc-form-group">
            <label className="hc-label">Email or Phone</label>
            <input className="hc-input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          </div>
        )}

        {(mode === 'login' || mode === 'register') && (
          <div className="hc-form-group">
            <label className="hc-label">Password</label>
            <input type="password" className="hc-input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        )}

        {mode === 'register' && (
          <>
            <div className="hc-form-group">
              <label className="hc-label">Invite Code (optional)</label>
              <input className="hc-input" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
            </div>
            <div className="hc-form-group">
              <label className="hc-label">Household Name (if no invite)</label>
              <input className="hc-input" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} />
            </div>
          </>
        )}

        {mode === 'reset' && (
          <>
            <div className="hc-form-group">
              <label className="hc-label">Recovery Token</label>
              <input className="hc-input" value={recoveryToken} onChange={(e) => setRecoveryToken(e.target.value)} />
            </div>
            <div className="hc-form-group">
              <label className="hc-label">New Password</label>
              <input type="password" className="hc-input" value={recoveryPassword} onChange={(e) => setRecoveryPassword(e.target.value)} />
            </div>
          </>
        )}

        {error ? <div className="hc-card-sub" style={{ color: theme.rust }}>{error}</div> : null}
        {info ? <div className="hc-card-sub" style={{ color: theme.moss }}>{info}</div> : null}

        <div className="hc-modal-actions">
          <button className="hc-btn hc-btn-primary" onClick={submit} disabled={loading}>{loading ? 'Please wait...' : 'Continue'}</button>
        </div>
      </div>
    </div>
  );
}

export function HouseholdAdmin({ user, householdName, members, invites, onRefresh, onCreateMember, onCreateInvite, onUpdateMember, onRemoveMember, onResetHousehold }) {
  const [displayName, setDisplayName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [memberSaving, setMemberSaving] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [role, setRole] = useState('member');
  const [invitedContact, setInvitedContact] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);

  const canManage = user?.role === 'owner' || user?.role === 'parent';
  const copyInviteLink = async (code) => {
    const url = `${window.location.origin}/?inviteCode=${encodeURIComponent(code)}`;
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return;
    }
    window.prompt('Copy invite link:', url);
  };

  return (
    <div className="hc-card" style={{ marginBottom: 16 }}>
      <div className="hc-section-head">
        <div className="hc-card-title">Household Accounts</div>
        <button className="hc-btn hc-btn-ghost hc-btn-sm" onClick={onRefresh}>Refresh</button>
      </div>
      <div className="hc-card-sub">{householdName || user?.householdName} · role: {user?.role}</div>

      {user?.role === 'owner' ? (
        <div style={{ marginTop: 10, marginBottom: 10 }}>
          <button
            className="hc-btn hc-btn-ghost hc-btn-sm"
            style={{ color: theme.rust, borderColor: theme.rust }}
            onClick={async () => {
              const answer = window.prompt('Type RESET to clear this household data.');
              if (answer === 'RESET') {
                try {
                  await onResetHousehold();
                } catch (_err) {
                  // parent handles error display
                }
              }
            }}
          >
            Reset Household Data
          </button>
        </div>
      ) : null}

      {canManage ? (
        <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
          <div className="hc-card-sub" style={{ marginTop: 2 }}>Add Member Account</div>
          <div className="hc-form-group" style={{ marginBottom: 0 }}>
            <label className="hc-label">Full Name</label>
            <input className="hc-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="hc-form-group" style={{ marginBottom: 0 }}>
            <label className="hc-label">Email or Phone</label>
            <input className="hc-input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          </div>
          <div className="hc-form-group" style={{ marginBottom: 0 }}>
            <label className="hc-label">Temporary Password</label>
            <input type="password" className="hc-input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="hc-form-group" style={{ marginBottom: 0 }}>
            <label className="hc-label">Member Role</label>
            <select className="hc-input" value={memberRole} onChange={(e) => setMemberRole(e.target.value)}>
              <option value="parent">Parent</option>
              <option value="member">Member</option>
              <option value="guest">Guest</option>
            </select>
          </div>
          <button
            className="hc-btn hc-btn-primary"
            disabled={memberSaving}
            onClick={async () => {
              const cleanName = String(displayName || '').trim();
              const cleanIdentifier = String(identifier || '').trim();
              if (!cleanName || !cleanIdentifier) {
                setMemberError('Full name and email/phone are required.');
                return;
              }
              if (String(password || '').length < 6) {
                setMemberError('Temporary password must be at least 6 characters.');
                return;
              }
              try {
                setMemberSaving(true);
                setMemberError('');
                await onCreateMember({ displayName, identifier, password, role: memberRole });
                setDisplayName('');
                setIdentifier('');
                setPassword('');
                setMemberRole('member');
              } catch (err) {
                setMemberError(err?.message || 'Failed to add member.');
              } finally {
                setMemberSaving(false);
              }
            }}
          >
            {memberSaving ? 'Adding...' : 'Add Member'}
          </button>
          {memberError ? <div className="hc-card-sub" style={{ color: theme.rust }}>{memberError}</div> : null}

          <div className="hc-card-sub" style={{ marginTop: 8 }}>Or Create Invite Link</div>
          <div className="hc-form-group" style={{ marginBottom: 0 }}>
            <label className="hc-label">Invite Role</label>
            <select className="hc-input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="parent">Parent</option>
              <option value="member">Member</option>
              <option value="guest">Guest</option>
            </select>
          </div>
          <div className="hc-form-group" style={{ marginBottom: 0 }}>
            <label className="hc-label">Invite Contact (optional)</label>
            <input className="hc-input" value={invitedContact} onChange={(e) => setInvitedContact(e.target.value)} />
          </div>
          <div className="hc-form-group" style={{ marginBottom: 0 }}>
            <label className="hc-label">Expires In Days</label>
            <input type="number" min="1" max="30" className="hc-input" value={expiresInDays} onChange={(e) => setExpiresInDays(Number(e.target.value || 7))} />
          </div>
          <button
            className="hc-btn hc-btn-primary"
            onClick={async () => {
              try {
                await onCreateInvite({ role, invitedContact, expiresInDays });
              } catch (_err) {
                // parent handles error display
              }
            }}
          >
            Create Invite Link
          </button>
        </div>
      ) : null}

      <div className="hc-card-sub" style={{ marginTop: 8 }}>Members</div>
      {members.map((m) => (
        <div key={m.id} className="hc-notif-chip" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="hc-notif-dot" />
            <div className="hc-notif-text">{m.displayName} ({m.identifier})</div>
            <div className="hc-notif-time">{m.role} · {m.status}</div>
          </div>
          {user?.role === 'owner' && m.role !== 'owner' ? (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <select
                className="hc-input"
                style={{ width: 120, height: 30, padding: '4px 8px' }}
                defaultValue={m.role}
                onChange={async (e) => {
                  try {
                    await onUpdateMember(m.id, { role: e.target.value });
                  } catch (_err) {
                    // parent handles error display
                  }
                }}
              >
                <option value="parent">parent</option>
                <option value="member">member</option>
                <option value="guest">guest</option>
              </select>
              <button
                className="hc-btn hc-btn-ghost hc-btn-sm"
                onClick={async () => {
                  try {
                    await onUpdateMember(m.id, { status: m.status === 'active' ? 'inactive' : 'active' });
                  } catch (_err) {
                    // parent handles error display
                  }
                }}
              >
                {m.status === 'active' ? 'Deactivate' : 'Reactivate'}
              </button>
              <button
                className="hc-btn hc-btn-ghost hc-btn-sm"
                style={{ color: theme.rust }}
                onClick={async () => {
                  if (window.confirm(`Remove ${m.displayName} from household?`)) {
                    try {
                      await onRemoveMember(m.id);
                    } catch (_err) {
                      // parent handles error display
                    }
                  }
                }}
              >
                Remove
              </button>
            </div>
          ) : null}
        </div>
      ))}

      <div className="hc-card-sub" style={{ marginTop: 8 }}>Invites</div>
      {invites.map((invite) => (
        <div key={invite.id} className="hc-notif-chip" style={{ background: 'rgba(74,103,65,0.08)', borderColor: 'rgba(74,103,65,0.2)', display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="hc-notif-dot" style={{ background: theme.moss }} />
            <div className="hc-notif-text">{invite.code} ({invite.role})</div>
            <div className="hc-notif-time">{invite.status}</div>
          </div>
          <button
            className="hc-btn hc-btn-ghost hc-btn-sm"
            onClick={async () => {
              try {
                await copyInviteLink(invite.code);
              } catch (_err) {
                // ignore clipboard issues
              }
            }}
          >
            Copy Invite Link
          </button>
        </div>
      ))}
    </div>
  );
}
