import React, { useState, useEffect } from 'react';
import { Icon } from '../icons';
import ScanCard from '../ScanCard';
import { findPatient } from '../helpers';

export default function ScanPatient({ patients, initialSimId, openWorkspace }) {
  const [phase, setPhase] = useState('idle');
  const [simId, setSimId] = useState(initialSimId || '');
  const [resultId, setResultId] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [manualError, setManualError] = useState(false);

  useEffect(() => {
    if (initialSimId) setSimId(initialSimId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSimId]);

  function initializeScan() {
    if (!patients.length) return;
    setPhase('scanning');
    setTimeout(() => {
      if (simId && findPatient(patients, simId)) {
        setPhase('success');
        setResultId(simId);
      } else {
        setPhase('fail');
        setResultId(null);
      }
    }, 1400);
  }

  function manualLookup() {
    const code = manualCode.trim().toUpperCase();
    const p = findPatient(patients, code);
    if (p) {
      setManualError(false);
      openWorkspace(p.id);
    } else {
      setManualError(true);
    }
  }

  let resultNode = null;
  if (phase === 'success' && resultId) {
    const p = findPatient(patients, resultId);
    if (p) {
      resultNode = (
        <div className="result-panel ok">
          <div className="rt">Patient Successfully Identified</div>
          <div className="rs">Biometric signature validated and matched.</div>
          <div className="result-body">
            <div className="result-avatar"><Icon name="personCheck" /></div>
            <div className="result-fields">
              <div><span className="rl">Full name</span><span className="rv">{p.name}</span></div>
              <div><span className="rl">Record ID</span><span className="rv">{p.id}</span></div>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => openWorkspace(p.id)}><Icon name="folder" />Open EHR Profile</button>
        </div>
      );
    }
  } else if (phase === 'fail') {
    resultNode = (
      <div className="result-panel fail">
        <div className="rt">No Patient Match</div>
        <div className="rs">Try again, or use Manual ID Lookup below if the sensor keeps failing.</div>
      </div>
    );
  }

  return (
    <>
      <ScanCard
        eyebrow="BIOMETRIC SCAN"
        title="Patient Identification"
        subtitle="To retrieve patient data, the patient must provide either their biometric scan or their unique Patient ID."
        phase={phase}
        onCapture={initializeScan}
        captureLabel="Initialize Scan"
        requirePatients
        patients={patients}
        showDemoSelect
        scanSimId={simId}
        onSimChange={setSimId}
        resultNode={resultNode}
      />

      <div className="card lookup-card">
        <div className="lookup-head"><Icon name="search" />Manual ID Lookup</div>
        <p>If the fingerprint scanner fails, look up the patient record using their unique Patient ID or biometric reference.</p>
        <div className="lookup-row">
          <div className="field">
            <label className="field-label">UNIQUE PATIENT ID / BIOMETRIC REFERENCE</label>
            <input type="text" value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="e.g. P1001" />
          </div>
          <button className="btn btn-outline" style={{ marginBottom: 14 }} onClick={manualLookup}><Icon name="search" />Retrieve Record</button>
        </div>
        {manualError && <div className="validation-msg" style={{ display: 'block' }}>No patient found with that ID.</div>}
      </div>
    </>
  );
}
