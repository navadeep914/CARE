import React from 'react';
import { Icon } from '../icons';
import { todayStr, QueueStatusBadge } from '../helpers';

export default function Dashboard({ role, patients, queue, visits, providerName, navigate, openWorkspace }) {
  const totalPatients = patients.length;
  const waiting = queue.filter((q) => q.status === 'waiting').length;
  const emergency = queue.filter((q) => q.priority === 'urgent' && q.status !== 'done').length;
  const processedToday = visits.filter((v) => v.dateLabel === todayStr()).length;
  const isDoctor = role === 'DOCTOR';

  const rows = [...queue].sort((a, b) => (a.token || 0) - (b.token || 0));

  return (
    <>
      <div className="eyebrow">{isDoctor ? 'CLINICAL OPERATIONS' : 'FRONT DESK OPERATIONS'}</div>
      <div className="page-head">
        <div>
          <h1>{isDoctor ? `Good morning, ${providerName}` : `Welcome, ${providerName}`}</h1>
          <div className="sub">
            {isDoctor ? 'Monitor today\'s clinical patient workflow and consultation updates.' : 'Manage patient intake, queue readiness, and front-desk patient coordination.'}
          </div>
        </div>
        <div className="head-actions">
          <button className="btn btn-outline" onClick={() => navigate('queue')}><Icon name="users" />View Queue</button>
          <button className="btn btn-primary" onClick={() => navigate('scan')}><Icon name="fingerprint" />{isDoctor ? 'Scan Patient' : 'Biometric Identification'}</button>
          {!isDoctor && (
            <button className="btn btn-primary" onClick={() => navigate('register')}><Icon name="userPlus" />Register Patient</button>
          )}
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card c-neutral">
          <div className="label"><Icon name="users" />{isDoctor ? 'Today\'s Patients' : 'Registered Patients'}</div>
          <div className="num">{totalPatients}</div>
          <div className="cap">Available in the shared database</div>
        </div>
        <div className="stat-card c-teal">
          <div className="label"><Icon name="clock" />Waiting Queue</div>
          <div className="num">{waiting}</div>
          <div className="cap">Awaiting consultation</div>
        </div>
        <div className="stat-card c-danger">
          <div className="label"><Icon name="alert" />Priority Cases</div>
          <div className="num">{emergency}</div>
          <div className="cap">High-attention patients</div>
        </div>
        <div className="stat-card c-dark">
          <div className="label"><Icon name="check" />Consultations</div>
          <div className="num">{processedToday}</div>
          <div className="cap">Completed today</div>
        </div>
      </div>

      <div className="card">
        <div className="table-card-head">
          <div className="table-card-title"><Icon name="pulse" />{isDoctor ? 'Today\'s Queue' : 'Current Queue Status'}</div>
          <span className="chip-total">{rows.length} Patients Total</span>
        </div>
        {!rows.length ? (
          <div className="empty-state">
            <Icon name="clipboard" />
            <div>{isDoctor ? 'No patients are currently in care. The queue will populate as patients are identified and checked in.' : 'No patients have been added to the queue yet. Register and identify patients to start intake.'}</div>
            {!isDoctor && <button className="btn btn-primary" onClick={() => navigate('register')}><Icon name="userPlus" />Register Patient</button>}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Token</th><th>Patient</th><th>Patient ID</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {rows.map((q) => (
                  <tr key={q.id} className={q.priority === 'urgent' ? 'priority-row priority-emergency' : 'priority-row'}>
                    <td><span className="token-circle">{q.token || '–'}</span></td>
                    <td className="name-cell"><Icon name="person" />{q.patientName}</td>
                    <td className="id-cell">{q.patientId}</td>
                    <td><QueueStatusBadge entry={q} /></td>
                    <td><button className="btn btn-outline btn-sm" onClick={() => openWorkspace(q.patientId)}><Icon name="folder" />View Profile</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
