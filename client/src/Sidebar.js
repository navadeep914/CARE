import React from 'react';
import { Icon, LogoMark } from './icons';

export const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { key: 'register', label: 'Register Patient', icon: 'userPlus' },
  { key: 'scan', label: 'Scan Patient', icon: 'fingerprint' },
  { key: 'queue', label: 'Patient Queue', icon: 'users' },
  { key: 'patients', label: 'All Patients', icon: 'idcard' },
  { key: 'consultations', label: 'Consultations', icon: 'clipboard' },
  { key: 'reports', label: 'Reports', icon: 'file' },
  { key: 'settings', label: 'Settings', icon: 'gear' },
];

export default function Sidebar({ role, view, allowedViews = NAV.map((n) => n.key), onNavigate, providerName, onLogout }) {
  const visibleNav = NAV.filter((n) => allowedViews.includes(n.key));

  return (
    <aside id="sidebar">
      <div className="side-logo">
        <div className="mark"><LogoMark size={17} /></div>
        <div className="word">CareDesk</div>
      </div>
      <nav className="side-nav">
        {visibleNav.map((n) => (
          <button
            key={n.key}
            className={view === n.key ? 'active' : ''}
            onClick={() => onNavigate(n.key)}
          >
            <Icon name={n.icon} />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
      <div className="side-foot">
        <div className="box">
          <div className="pname">{providerName}</div>
          <div className="side-role">{role === 'DOCTOR' ? 'Doctor' : 'Receptionist'}</div>
          <button className="logout" onClick={onLogout}>↩ Logout</button>
        </div>
      </div>
    </aside>
  );
}
