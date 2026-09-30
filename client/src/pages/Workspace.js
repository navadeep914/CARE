import React, { useState, useEffect } from 'react';
import { Icon } from '../icons';
import { api } from '../api';
import { findPatient, activeQueueFor, QueueStatusBadge } from '../helpers';

function OvItem({ label, value }) {
  return (
    <div className="ov-item">
      <div className="ov-l">{label}</div>
      <div className="ov-v">{value || '—'}</div>
    </div>
  );
}

function ConsultField({ icon, label, value, onChange, placeholder, hint }) {
  return (
    <div className="consult-field">
      <label><Icon name={icon} />{label.toUpperCase()}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      <div className="field-hint">{hint}</div>
    </div>
  );
}

export default function Workspace({ role, patientId, patients, queue, visits, providerName, toast, refreshAll, navigate }) {
  const patient = findPatient(patients, patientId);
  const [priority, setPriority] = useState('normal');
  const [labInput, setLabInput] = useState(patient ? patient.labSummary || '' : '');
  const [draft, setDraft] = useState({ vitals: '', conditions: '', medications: '', notes: '' });
  const isDoctor = role === 'DOCTOR';

  useEffect(() => {
    setLabInput(patient ? patient.labSummary || '' : '');
    setDraft({ vitals: '', conditions: '', medications: '', notes: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  if (!patient) {
    return (
      <>
        <div className="eyebrow">CONSULTATION WORKSPACE</div>
        <div className="card">
          <div>Patient not found.</div>
          <button className="btn btn-outline" style={{ marginTop: 12 }} onClick={() => navigate('patients')}>← Back to Patient Registry</button>
        </div>
      </>
    );
  }

  const activeQ = activeQueueFor(queue, patient.id);

  async function addToQueue() {
    try {
      await api.addQueue({ patientId: patient.id, priority });
      toast('Added to queue');
      await refreshAll();
    } catch (err) {
      toast((err && err.error) || 'Could not add to queue');
    }
  }

  async function saveConsult() {
    try {
      await api.addVisit({ patientId: patient.id, doctor: providerName, ...draft });
      toast('Consultation saved');
      setDraft({ vitals: '', conditions: '', medications: '', notes: '' });
      await refreshAll();
    } catch (err) {
      toast((err && err.error) || 'Could not save consultation');
    }
  }

  async function saveLab() {
    try {
      await api.updatePatient(patient.id, { labSummary: labInput });
      toast('Lab summary saved');
      await refreshAll();
    } catch (err) {
      toast((err && err.error) || 'Could not save');
    }
  }

  const patientVisits = visits.filter((v) => v.patientId === patient.id).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <>
      <div className="eyebrow">CONSULTATION WORKSPACE</div>
      <div className="page-head">
        <div>
          <h1>{patient.name}</h1>
          <div className="sub">
            Record ID: <b style={{ color: 'var(--text)' }}>{patient.id}</b> · Blood Group: <b style={{ color: 'var(--text)' }}>{patient.blood || '—'}</b>
          </div>
        </div>
        <div className="head-actions">
          {activeQ ? (
            <QueueStatusBadge entry={activeQ} />
          ) : (
            <>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ padding: '9px 10px' }} disabled={!isDoctor}>
                <option value="normal">Routine</option>
                <option value="urgent">Urgent</option>
              </select>
              <button className="btn btn-primary" onClick={addToQueue} disabled={!isDoctor}><Icon name="users" />Add to Queue</button>
            </>
          )}
        </div>
      </div>

      {!isDoctor && (
        <div className="card" style={{ borderColor: 'var(--primary)', background: 'var(--primary-tint)' }}>
          <div className="field-hint" style={{ marginTop: 0, color: 'var(--primary-dark)', fontWeight: 700 }}>
            Receptionist view: consultation notes and medical updates are restricted to authorized doctors.
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-card-title" style={{ marginBottom: 12 }}><Icon name="idcard" />Patient overview</div>
        <div className="overview-grid">
          <OvItem label="Age / Gender" value={[patient.age ? `${patient.age} yrs` : '', patient.gender].filter(Boolean).join(' · ')} />
          <OvItem label="Phone" value={patient.phone} />
          <OvItem label="Emergency contact" value={patient.emergency} />
          <OvItem label="Address" value={patient.address} />
          <OvItem label="Registered" value={patient.registeredAt ? new Date(patient.registeredAt).toLocaleDateString() : ''} />
          <OvItem label="Registered by" value={patient.registeredBy} />
        </div>
        <div className="ov-block overview-grid">
          <OvItem label="Known allergies" value={patient.allergies || 'None recorded'} />
          <OvItem label="Current medications" value={patient.medications || 'None recorded'} />
          <OvItem label="Medical history" value={patient.history || 'None recorded'} />
        </div>
        <div className="ov-block">
          <label className="field-label">Lab summary / findings</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input type="text" style={{ flex: 1, minWidth: 220 }} value={labInput} onChange={(e) => setLabInput(e.target.value)} placeholder="e.g. CBC normal; ECG normal" disabled={!isDoctor} />
            <button className="btn btn-outline btn-sm" onClick={saveLab} disabled={!isDoctor}>Save</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-card-title" style={{ marginBottom: 16 }}><Icon name="clipboard" />{isDoctor ? 'EHR Consultation Entry' : 'Clinical Notes (Doctor Access Only)'}</div>
        <div className="consult-grid">
          <ConsultField icon="vitals" label="Vital signs" value={draft.vitals} onChange={(v) => setDraft((d) => ({ ...d, vitals: v }))} placeholder="BP 118/76; HR 74; SpO2 99%" hint="Record standard clinical observations." />
          <ConsultField icon="tag" label="Current conditions" value={draft.conditions} onChange={(v) => setDraft((d) => ({ ...d, conditions: v }))} placeholder="e.g. Asthma" hint="State ongoing diseases or clinical issues." />
          <ConsultField icon="pill" label="Prescribed medications" value={draft.medications} onChange={(v) => setDraft((d) => ({ ...d, medications: v }))} placeholder="e.g. Budesonide inhaler" hint="Specify treatment prescriptions." />
          <ConsultField icon="chat" label="Doctor notes" value={draft.notes} onChange={(v) => setDraft((d) => ({ ...d, notes: v }))} placeholder="e.g. Avoid known triggers." hint="General notes (optional)." />
        </div>
        <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={saveConsult} disabled={!isDoctor}><Icon name="check" />Save Consultation Entry</button>
      </div>

      <div className="card">
        <div className="table-card-title" style={{ marginBottom: 12 }}>Visit history</div>
        {!patientVisits.length ? (
          <div className="empty-state" style={{ padding: '20px 10px' }}>No previous visits recorded.</div>
        ) : (
          patientVisits.map((v) => (
            <div className="visit-item" key={v.id}>
              <div className="vd">{new Date(v.date).toLocaleString()}{v.doctor ? ` · ${v.doctor}` : ''}</div>
              {v.vitals && <div className="vrow"><b>Vitals:</b> {v.vitals}</div>}
              {v.conditions && <div className="vrow"><b>Conditions:</b> {v.conditions}</div>}
              {v.medications && <div className="vrow"><b>Medications:</b> {v.medications}</div>}
              {v.notes && <div className="vrow"><b>Notes:</b> {v.notes}</div>}
            </div>
          ))
        )}
      </div>

      <button className="btn btn-ghost btn-sm" style={{ marginTop: 16 }} onClick={() => navigate('patients')}>← Back to Patient Registry</button>
    </>
  );
}
