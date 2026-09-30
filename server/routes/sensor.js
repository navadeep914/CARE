const express = require('express');
const router = express.Router();
const store = require('../db/store');
const { serializePatient } = require('../utils/serialize');

// POST /api/enroll
// Called by the ESP32 once the R307/AS608 sensor has stored a new
// fingerprint template for a patient already registered in CareDesk.
// Body: { "patient_id": "P1001", "template_id": 7 }
router.post('/enroll', async (req, res) => {
  const { patient_id, template_id } = req.body || {};
  if (!patient_id || template_id === undefined) {
    return res.status(400).json({ error: 'patient_id and template_id are required' });
  }
  const id = String(patient_id).toUpperCase();
  const tId = Number(template_id);

  try {
    const clash = await store.findPatientByTemplate(tId);
    if (clash && String(clash.id).toUpperCase() !== id) {
      return res.status(400).json({ error: `That template_id is already linked to patient ${clash.id}` });
    }

    const p = await store.updatePatient(id, { fingerprintTemplateId: tId });
    if (!p) return res.status(404).json({ error: 'No patient with that ID' });
    res.json({ status: 'ok', patient: serializePatient(p) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/identify
// Called by the ESP32 when the sensor matches a scanned thumb against
// its stored templates — or by the dashboard's own Manual ID Lookup /
// demo scan control, using patient_id directly.
// Body: { "template_id": 7 }  OR  { "patient_id": "P1001" }
router.post('/identify', async (req, res) => {
  const { template_id, biometric_id, unique_id, patient_id } = req.body || {};
  let p = null;

  try {
    if (template_id !== undefined || biometric_id !== undefined) {
      const resolvedTemplateId = template_id !== undefined ? template_id : biometric_id;
      p = await store.findPatientByTemplate(Number(resolvedTemplateId));
    } else if (unique_id) {
      p = await store.getPatientById(String(unique_id).toUpperCase());
    } else if (patient_id) {
      p = await store.getPatientById(String(patient_id).toUpperCase());
    } else {
      return res.status(400).json({ error: 'biometric template, biometric_id, unique_id, or patient_id is required' });
    }

    if (!p) return res.status(404).json({ error: 'No matching patient record' });
    res.json(serializePatient(p));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
