import React, { useState } from 'react';
import { Icon } from '../icons';
import ScanCard from '../ScanCard';
import { api } from '../api';
import { findPatient } from '../helpers';

const emptyDraft = () => ({
  name: '', age: '', gender: '', blood: '', phone: '', emergency: '',
  address: '', allergies: '', medications: '', history: '',
});

function FieldInput({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
function FieldTextarea({ label, value, onChange, placeholder }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <textarea value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
function FieldSelect({ label, value, onChange, options }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export default function RegisterPatient({ patients, onRegistered, navigate, toast, providerName }) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(emptyDraft());
  const [phase, setPhase] = useState('idle');
  const [showValidation, setShowValidation] = useState(false);
  const [lastId, setLastId] = useState(null);

  function set(field) { return (val) => setDraft((d) => ({ ...d, [field]: val })); }

  function continueToScan() {
    if (!draft.name.trim() || !String(draft.age).trim()) {
      setShowValidation(true);
      return;
    }
    setShowValidation(false);
    setPhase('idle');
    setStep(2);
  }

  function capture() {
    setPhase('scanning');
    setTimeout(async () => {
      try {
        const templateId = Number(Date.now() % 900000 + 100000);
        const patient = await api.createPatient({
          ...draft,
          fingerprintTemplateId: templateId,
          registeredBy: providerName,
        });
        setLastId(patient.id);
        setPhase('success');
        setStep(3);
        onRegistered();
      } catch (err) {
        toast((err && err.error) || 'Could not register patient');
        setPhase('idle');
      }
    }, 1500);
  }

  const lastPatient = lastId ? findPatient(patients, lastId) : null;

  return (
    <>
      <div className="eyebrow">PATIENT ONBOARDING</div>
      <div className="page-head">
        <div>
          <h1>Register Patient</h1>
          <div className="sub">Capture the patient's details once, then link them permanently to a thumb impression.</div>
        </div>
      </div>

      {step === 1 && (
        <div className="card">
          <div className="table-card-title" style={{ marginBottom: 16 }}><Icon name="idcard" />Patient details</div>
          <div className="grid2">
            <FieldInput label="Full name" value={draft.name} onChange={set('name')} placeholder="e.g. Ramesh Kumar" />
            <FieldInput label="Age" type="number" value={draft.age} onChange={set('age')} placeholder="e.g. 34" />
            <FieldSelect label="Gender" value={draft.gender} onChange={set('gender')} options={['Male', 'Female', 'Other']} />
            <FieldSelect label="Blood group" value={draft.blood} onChange={set('blood')} options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} />
            <FieldInput label="Phone number" type="tel" value={draft.phone} onChange={set('phone')} placeholder="10-digit mobile number" />
            <FieldInput label="Emergency contact" value={draft.emergency} onChange={set('emergency')} placeholder="Name & phone number" />
          </div>
          <FieldInput label="Address" value={draft.address} onChange={set('address')} placeholder="Optional" />
          <div className="grid2">
            <FieldTextarea label="Known allergies" value={draft.allergies} onChange={set('allergies')} placeholder="e.g. Penicillin, Dust — or 'None'" />
            <FieldTextarea label="Current medications" value={draft.medications} onChange={set('medications')} placeholder="e.g. Metformin 500mg — or 'None'" />
          </div>
          <FieldTextarea label="Medical history" value={draft.history} onChange={set('history')} placeholder="Past conditions, surgeries, ongoing treatment — or 'None'" />
          {showValidation && <div className="validation-msg" style={{ display: 'block' }}>Please enter at least the patient's name and age before continuing.</div>}
          <button className="btn btn-primary" style={{ marginTop: 6 }} onClick={continueToScan}>Continue to fingerprint capture →</button>
        </div>
      )}

      {step === 2 && (
        <ScanCard
          eyebrow="BIOMETRIC SCAN"
          title="Fingerprint Capture"
          subtitle="A fingerprint is required before patient data can be stored. Place the patient's thumb on the reader and hold still to generate the secure template."
          phase={phase}
          onCapture={capture}
          captureLabel="Initialize Capture"
          patients={[]}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && lastPatient && (
        <div className="card">
          <div className="table-card-title" style={{ marginBottom: 14 }}><Icon name="check" />Patient registered successfully</div>
          <div className="id-summary">
            <div className="lb">Unique Patient ID</div>
            <div className="code">{lastPatient.id}</div>
            <div className="nm">{lastPatient.name}</div>
            <div className="mt">{[lastPatient.age ? `${lastPatient.age} yrs` : '', lastPatient.gender, lastPatient.blood].filter(Boolean).join(' · ')}</div>
          </div>
          <div className="field-hint" style={{ marginTop: 12 }}>
            This Patient ID is now permanently linked to their thumb impression. To retrieve the record later, the patient must provide the biometric scan or their unique Patient ID.
          </div>
          <div className="head-actions" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={() => { setDraft(emptyDraft()); setStep(1); setPhase('idle'); }}>
              <Icon name="userPlus" />Register another patient
            </button>
            <button className="btn btn-outline" onClick={() => navigate('scan', lastPatient.id)}>
              <Icon name="fingerprint" />Try scanning this patient →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
