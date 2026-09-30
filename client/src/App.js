import React, { useState, useEffect, useCallback, useRef } from 'react';
import Login from './Login';
import Sidebar from './Sidebar';
import Dashboard from './pages/Dashboard';
import RegisterPatient from './pages/RegisterPatient';
import ScanPatient from './pages/ScanPatient';
import PatientQueue from './pages/PatientQueue';
import AllPatients from './pages/AllPatients';
import Consultations from './pages/Consultations';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Workspace from './pages/Workspace';
import { api } from './api';

const SESSION_KEY = 'caredesk-session';
const DEFAULT_VIEW_BY_ROLE = {
  DOCTOR: 'dashboard',
  RECEPTIONIST: 'dashboard',
};
const ALLOWED_VIEWS_BY_ROLE = {
  DOCTOR: ['dashboard', 'scan', 'queue', 'patients', 'consultations', 'reports', 'settings', 'workspace'],
  RECEPTIONIST: ['dashboard', 'register', 'scan', 'queue', 'patients', 'settings', 'workspace'],
};

function readStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

export default function App() {
  const storedSession = readStoredSession();
  const [loggedIn, setLoggedIn] = useState(Boolean(storedSession));
  const [justSignedOut, setJustSignedOut] = useState(false);
  const [userRole, setUserRole] = useState(storedSession?.role || 'DOCTOR');
  const [providerName, setProviderName] = useState(storedSession?.displayName || 'Dr. Ada James');
  const [providerUsername, setProviderUsername] = useState(storedSession?.username || 'doctor');

  const [view, setView] = useState(DEFAULT_VIEW_BY_ROLE[storedSession?.role || 'DOCTOR']);
  const [currentPatientId, setCurrentPatientId] = useState(null);
  const [scanSimId, setScanSimId] = useState('');

  const [patients, setPatients] = useState([]);
  const [queue, setQueue] = useState([]);
  const [visits, setVisits] = useState([]);
  const [serverConnected, setServerConnected] = useState(false);

  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef(null);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2200);
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      const [p, q, v] = await Promise.all([api.getPatients(), api.getQueue(), api.getVisits()]);
      setPatients(p);
      setQueue(q);
      setVisits(v);
      setServerConnected(true);
    } catch (err) {
      setServerConnected(false);
      toast('Could not reach the CareDesk server');
    }
  }, [toast]);

  useEffect(() => {
    if (!loggedIn) return;
    refreshAll();
    const id = setInterval(refreshAll, 6000);
    return () => clearInterval(id);
  }, [loggedIn, refreshAll]);

  useEffect(() => {
    if (!loggedIn) return;
    const params = new URLSearchParams(window.location.search);
    const requestedView = params.get('view');
    const allowed = ALLOWED_VIEWS_BY_ROLE[userRole] || ALLOWED_VIEWS_BY_ROLE.DOCTOR;
    if (requestedView && !allowed.includes(requestedView)) {
      const safeView = DEFAULT_VIEW_BY_ROLE[userRole] || 'dashboard';
      setView(safeView);
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('view', safeView);
      window.history.replaceState({}, '', nextUrl);
      toast('This section is not available for your role.');
      return;
    }
    if (requestedView && requestedView !== view) {
      setView(requestedView);
    }
  }, [loggedIn, userRole, view, toast]);

  function updateRoute(nextView) {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('view', nextView);
    window.history.replaceState({}, '', nextUrl);
  }

  function navigate(nextView, simId) {
    const allowed = ALLOWED_VIEWS_BY_ROLE[userRole] || ALLOWED_VIEWS_BY_ROLE.DOCTOR;
    if (!allowed.includes(nextView)) {
      toast('This section is restricted to your role.');
      return;
    }
    setView(nextView);
    setCurrentPatientId(null);
    if (nextView === 'scan') setScanSimId(simId || '');
    updateRoute(nextView);
  }

  function openWorkspace(patientId) {
    const allowed = ALLOWED_VIEWS_BY_ROLE[userRole] || ALLOWED_VIEWS_BY_ROLE.DOCTOR;
    if (!allowed.includes('workspace')) {
      toast('Workspace access is restricted for this role.');
      return;
    }
    setCurrentPatientId(patientId);
    setView('workspace');
    updateRoute('workspace');
  }

  async function handleLogin({ role, username, password }) {
    try {
      const result = await api.login({ role, username, password });
      const nextUser = result.user;
      const safeRole = nextUser.role || role;
      const session = { username: nextUser.username, displayName: nextUser.displayName, role: safeRole };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setProviderUsername(nextUser.username);
      setProviderName(nextUser.displayName);
      setUserRole(safeRole);
      setLoggedIn(true);
      setJustSignedOut(false);
      const defaultView = DEFAULT_VIEW_BY_ROLE[safeRole] || 'dashboard';
      setView(defaultView);
      updateRoute(defaultView);
    } catch (err) {
      throw err;
    }
  }

  function handleLogout() {
    localStorage.removeItem(SESSION_KEY);
    setLoggedIn(false);
    setUserRole('DOCTOR');
    setProviderName('Dr. Ada James');
    setProviderUsername('doctor');
    setCurrentPatientId(null);
    setView('dashboard');
    setJustSignedOut(true);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete('view');
    window.history.replaceState({}, '', nextUrl);
  }

  if (!loggedIn) {
    return (
      <Login
        signedOut={justSignedOut}
        onDismissBanner={() => setJustSignedOut(false)}
        onLogin={handleLogin}
      />
    );
  }

  let page = null;
  if (view === 'dashboard') {
    page = <Dashboard role={userRole} patients={patients} queue={queue} visits={visits} providerName={providerName} navigate={navigate} openWorkspace={openWorkspace} />;
  } else if (view === 'register') {
    page = <RegisterPatient patients={patients} onRegistered={refreshAll} navigate={navigate} toast={toast} providerName={providerName} />;
  } else if (view === 'scan') {
    page = <ScanPatient patients={patients} initialSimId={scanSimId} openWorkspace={openWorkspace} />;
  } else if (view === 'queue') {
    page = <PatientQueue queue={queue} openWorkspace={openWorkspace} />;
  } else if (view === 'patients') {
    page = <AllPatients patients={patients} queue={queue} navigate={navigate} openWorkspace={openWorkspace} />;
  } else if (view === 'consultations') {
    page = <Consultations visits={visits} openWorkspace={openWorkspace} />;
  } else if (view === 'reports') {
    page = <Reports patients={patients} openWorkspace={openWorkspace} />;
  } else if (view === 'settings') {
    page = <Settings providerName={providerName} providerUsername={providerUsername} serverConnected={serverConnected} />;
  } else if (view === 'workspace') {
    page = (
      <Workspace
        role={userRole}
        patientId={currentPatientId}
        patients={patients}
        queue={queue}
        visits={visits}
        providerName={providerName}
        toast={toast}
        refreshAll={refreshAll}
        navigate={navigate}
      />
    );
  }

  const allowedViews = ALLOWED_VIEWS_BY_ROLE[userRole] || ALLOWED_VIEWS_BY_ROLE.DOCTOR;

  return (
    <div id="app-shell" className="active">
      <Sidebar role={userRole} view={view} allowedViews={allowedViews} onNavigate={navigate} providerName={providerName} onLogout={handleLogout} />
      <div id="content">
        {page}
        <footer className="appfoot">CareDesk · Single-source patient data · Role-aware access</footer>
      </div>
      <div className={`toast ${toastMsg ? 'show' : ''}`}>{toastMsg}</div>
    </div>
  );
}
