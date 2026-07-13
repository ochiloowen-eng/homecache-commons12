import { useEffect, useState } from 'react';
import theme from '../theme';

const ROLE_LABELS = {
  owner: 'Owner',
  parent: 'Admin',
  member: 'Contributor',
  guest: 'Viewer',
};

const ROLE_DESCRIPTIONS = {
  parent: 'Can help manage household content and invitations.',
  member: 'Can add and edit family memories, vaults, and tree details.',
  guest: 'Can browse the household with limited editing access.',
};

function roleLabel(role) {
  return ROLE_LABELS[role] || role || 'Member';
}

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
      setMode('join');
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
      if (mode === 'join') {
        if (!String(inviteCode || '').trim()) {
          setInfo('Enter an invite code or open the invite link from the household owner.');
          return;
        }
        await onRegister({ displayName, identifier, password, inviteCode });
        return;
      }
      if (mode === 'register') {
        await onRegister({ displayName, identifier, password, householdName, inviteCode: '' });
        return;
      }
      if (mode === 'recover') {
        const response = await onRequestRecovery({ identifier });
        setInfo(response?.message || 'Recovery request submitted.');
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
        <div className="hc-page-title" style={{ fontSize: 28 }}>Sign in to continue</div>
        <div className="hc-page-sub">Log in, join a household, or start a new family archive.</div>
        <div className="hc-card-sub" style={{ marginBottom: 12, color: theme.fogDark }}>
          Account recovery is delivered by email when configured, or shown only in development.
        </div>
        <div className="hc-chips" style={{ marginBottom: 12 }}>
          <div className={`hc-chip${mode === 'login' ? ' active' : ''}`} onClick={() => setMode('login')}>sign in</div>
          <div className={`hc-chip${mode === 'join' ? ' active' : ''}`} onClick={() => setMode('join')}>join household</div>
          <div className={`hc-chip${mode === 'register' ? ' active' : ''}`} onClick={() => setMode('register')}>create household</div>
          <div className={`hc-chip${mode === 'recover' ? ' active' : ''}`} onClick={() => setMode('recover')}>recover</div>
          <div className={`hc-chip${mode === 'reset' ? ' active' : ''}`} onClick={() => setMode('reset')}>reset</div>
        </div>

        {mode === 'join' ? (
          <div className="hc-card" style={{ marginBottom: 14, background: theme.parchment }}>
            <div className="hc-card-title">Joining as a member?</div>
            <div className="hc-card-sub" style={{ marginBottom: 0 }}>
              Use the invite code or invite link from the household owner. Your account will join their household instead of creating a new one.
            </div>
          </div>
        ) : null}

        {(mode === 'register' || mode === 'join') && (
          <div className="hc-form-group">
            <label className="hc-label" htmlFor="auth-display-name">Name</label>
            <input id="auth-display-name" className="hc-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
        )}

        {(mode === 'login' || mode === 'register' || mode === 'join' || mode === 'recover') && (
          <div className="hc-form-group">
            <label className="hc-label" htmlFor="auth-identifier">Email or Phone</label>
            <input id="auth-identifier" className="hc-input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          </div>
        )}

        {(mode === 'login' || mode === 'register' || mode === 'join') && (
          <div className="hc-form-group">
            <label className="hc-label" htmlFor="auth-password">Password</label>
            <input id="auth-password" type="password" className="hc-input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        )}

        {mode === 'join' && (
          <div className="hc-form-group">
            <label className="hc-label" htmlFor="auth-invite-code">Invite Code</label>
            <input id="auth-invite-code" className="hc-input" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="e.g. HC-ABC123..." />
          </div>
        )}

        {mode === 'register' && (
          <div className="hc-form-group">
            <label className="hc-label" htmlFor="auth-household-name">Household Name</label>
            <input id="auth-household-name" className="hc-input" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} placeholder="e.g. The Wanjiku Family" />
          </div>
        )}

        {mode === 'reset' && (
          <>
            <div className="hc-form-group">
              <label className="hc-label" htmlFor="auth-recovery-token">Recovery Token</label>
              <input id="auth-recovery-token" className="hc-input" value={recoveryToken} onChange={(e) => setRecoveryToken(e.target.value)} />
            </div>
            <div className="hc-form-group">
              <label className="hc-label" htmlFor="auth-recovery-password">New Password</label>
              <input id="auth-recovery-password" type="password" className="hc-input" value={recoveryPassword} onChange={(e) => setRecoveryPassword(e.target.value)} />
            </div>
          </>
        )}

        {error ? <div className="hc-card-sub" style={{ color: theme.rust }}>{error}</div> : null}
        {info ? <div className="hc-card-sub" style={{ color: theme.moss }}>{info}</div> : null}

        <div className="hc-modal-actions">
          <button className="hc-btn hc-btn-primary" onClick={submit} disabled={loading}>
            {loading ? 'Please wait...' : mode === 'join' ? 'Join Household' : mode === 'register' ? 'Create Household' : 'Continue'}
          </button>
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
  const [copiedCode, setCopiedCode] = useState('');

  const canManage = user?.role === 'owner' || user?.role === 'parent';
  const copyInviteLink = async (code) => {
    const url = `${window.location.origin}/?inviteCode=${encodeURIComponent(code)}`;
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      setCopiedCode(code);
      return;
    }
    window.prompt('Copy invite link:', url);
    setCopiedCode(code);
  };

  return (
    <div className="hc-card" style={{ marginBottom: 16 }}>
      <div className="hc-section-head">
        <div className="hc-card-title">Household Accounts</div>
        <button className="hc-btn hc-btn-ghost hc-btn-sm" onClick={onRefresh}>Refresh</button>
      </div>
      <div className="hc-card-sub">{householdName || user?.householdName} - your role: {roleLabel(user?.role)}</div>

      <div className="hc-card" style={{ marginBottom: 14, background: theme.parchment }}>
        <div className="hc-card-title">Member Access</div>
        <div className="hc-card-sub" style={{ marginBottom: 0 }}>
          Members can either sign in with an account you create below, or use an invite link and choose "join household" on the welcome screen.
        </div>
      </div>

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
            <label className="hc-label" htmlFor="member-display-name">Full Name</label>
            <input id="member-display-name" className="hc-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="hc-form-group" style={{ marginBottom: 0 }}>
            <label className="hc-label" htmlFor="member-identifier">Email or Phone</label>
            <input id="member-identifier" className="hc-input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          </div>
          <div className="hc-form-group" style={{ marginBottom: 0 }}>
            <label className="hc-label" htmlFor="member-password">Temporary Password</label>
            <input id="member-password" type="password" className="hc-input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="hc-form-group" style={{ marginBottom: 0 }}>
            <label className="hc-label" htmlFor="member-role">Member Role</label>
            <select id="member-role" className="hc-input" value={memberRole} onChange={(e) => setMemberRole(e.target.value)}>
              <option value="parent">{roleLabel('parent')} - {ROLE_DESCRIPTIONS.parent}</option>
              <option value="member">{roleLabel('member')} - {ROLE_DESCRIPTIONS.member}</option>
              <option value="guest">{roleLabel('guest')} - {ROLE_DESCRIPTIONS.guest}</option>
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
            <label className="hc-label" htmlFor="invite-role">Invite Role</label>
            <select id="invite-role" className="hc-input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="parent">{roleLabel('parent')} - {ROLE_DESCRIPTIONS.parent}</option>
              <option value="member">{roleLabel('member')} - {ROLE_DESCRIPTIONS.member}</option>
              <option value="guest">{roleLabel('guest')} - {ROLE_DESCRIPTIONS.guest}</option>
            </select>
          </div>
          <div className="hc-form-group" style={{ marginBottom: 0 }}>
            <label className="hc-label" htmlFor="invite-contact">Invite Contact (optional)</label>
            <input id="invite-contact" className="hc-input" value={invitedContact} onChange={(e) => setInvitedContact(e.target.value)} />
          </div>
          <div className="hc-form-group" style={{ marginBottom: 0 }}>
            <label className="hc-label" htmlFor="invite-expires-days">Expires In Days</label>
            <input id="invite-expires-days" type="number" min="1" max="30" className="hc-input" value={expiresInDays} onChange={(e) => setExpiresInDays(Number(e.target.value || 7))} />
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
            <div className="hc-notif-time">{roleLabel(m.role)} - {m.status}</div>
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
                <option value="parent">{roleLabel('parent')}</option>
                <option value="member">{roleLabel('member')}</option>
                <option value="guest">{roleLabel('guest')}</option>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div className="hc-notif-dot" style={{ background: theme.moss }} />
            <div className="hc-notif-text">{invite.code} ({roleLabel(invite.role)})</div>
            <div className="hc-notif-time">{invite.status}</div>
            <div className="hc-notif-time">{`${window.location.origin}/?inviteCode=${invite.code}`}</div>
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
            {copiedCode === invite.code ? 'Copied' : 'Copy Invite Link'}
          </button>
        </div>
      ))}
    </div>
  );
}
