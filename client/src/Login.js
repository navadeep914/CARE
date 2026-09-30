import React, { useState } from 'react';
import { Icon, LogoMark } from './icons';

const ROLE_OPTIONS = [
  { value: 'DOCTOR', label: 'Doctor', description: 'Clinical dashboard and patient consultation workflows' },
  { value: 'RECEPTIONIST', label: 'Receptionist', description: 'Patient registration, queue operations, and front-desk intake' },
];

export default function Login({ signedOut, onDismissBanner, onLogin }) {
  const [selectedRole, setSelectedRole] = useState('DOCTOR');
  const [username, setUsername] = useState('doctor');
  const [password, setPassword] = useState('CareDeskDoctor123');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    const u = username.trim();
    const p = password.trim();
    if (!u || !p) {
      setError('Please enter both a username and password.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      await onLogin({ role: selectedRole, username: u, password: p });
    } catch (err) {
      setError(err?.error || 'Login failed. Please check your role and credentials.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div id="login-screen" className="active">
      <div className="login-wrap">
        {signedOut && (
          <div className="signed-out-banner">
            <span>You have been signed out.</span>
            <button onClick={onDismissBanner} aria-label="Dismiss">×</button>
          </div>
        )}
        <div className="login-card">
          <div className="login-logo">
            <LogoMark size={28} />
          </div>
          <h1>CareDesk</h1>
          <div className="login-sub">Smart healthcare patient management</div>

          <div className="role-grid">
            {ROLE_OPTIONS.map((role) => (
              <button
                key={role.value}
                type="button"
                className={selectedRole === role.value ? 'role-option active' : 'role-option'}
                onClick={() => {
                  setSelectedRole(role.value);
                  setUsername(role.value === 'DOCTOR' ? 'doctor' : 'receptionist');
                  setPassword(role.value === 'DOCTOR' ? 'CareDeskDoctor123' : 'CareDeskReception123');
                  setError('');
                }}
              >
                <span className="role-label">{role.label}</span>
                <span className="role-description">{role.description}</span>
              </button>
            ))}
          </div>

          <div className="role-badge">{selectedRole === 'DOCTOR' ? 'Doctor Login' : 'Receptionist Login'}</div>

          <div className="login-field">
            <label>👤 USERNAME</label>
            <input
              type="text"
              placeholder={selectedRole === 'DOCTOR' ? 'doctor' : 'receptionist'}
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            />
          </div>
          <div className="login-field">
            <label>🔒 PASSWORD</label>
            <input
              type="password"
              placeholder="••••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            />
          </div>
          {error && <div className="login-error" style={{ display: 'block' }}>{error}</div>}
          <button className="btn-signin" onClick={submit} disabled={isSubmitting}>{isSubmitting ? 'Signing in...' : 'Sign in'}</button>

          <div className="authorized-note">
            <Icon name="shield" />
            <div>
              <b>Authorized Personnel Only</b>
              <span>Role-based access keeps patient workflows secure across doctor and receptionist teams.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
