const express = require('express');
const router = express.Router();
const store = require('../db/store');
const { serializePatient } = require('../utils/serialize');

// GET /api/patients
router.get('/', async (req, res) => {
  try {
    const patients = await store.getPatients();
    res.json(patients.map(serializePatient));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patients/:id
router.get('/:id', async (req, res) => {
  try {
    const p = await store.getPatientById(req.params.id);
    if (!p) return res.status(404).json({ error: 'No patient with that ID' });
    res.json(serializePatient(p));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/patients
router.post('/', async (req, res) => {
  const { name, age } = req.body || {};
  if (!name || !age) return res.status(400).json({ error: 'name and age are required' });

  const templateId = req.body.fingerprintTemplateId ?? req.body.biometricTemplateId ?? req.body.template_id;
  if (templateId === undefined || templateId === null || String(templateId).trim() === '') {
    return res.status(400).json({ error: 'Fingerprint template is required before patient data can be stored.' });
  }

  const numericTemplateId = Number(templateId);
  if (!Number.isFinite(numericTemplateId) || numericTemplateId <= 0) {
    return res.status(400).json({ error: 'Fingerprint template must be a valid positive number.' });
  }

  req.body.fingerprintTemplateId = numericTemplateId;

  try {
    const patient = await store.createPatient(req.body);
    res.status(201).json(serializePatient(patient));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/patients/:id
router.patch('/:id', async (req, res) => {
  const update = {};
  const allowed = ['name', 'age', 'gender', 'blood', 'phone', 'emergency', 'address', 'allergies', 'medications', 'history'];
  allowed.forEach((f) => {
    if (req.body[f] !== undefined) update[f] = req.body[f];
  });
  if (req.body.labSummary !== undefined) {
    update.labSummary = req.body.labSummary;
    update.labUpdatedAt = new Date().toISOString();
  }

  try {
    const p = await store.updatePatient(req.params.id, update);
    if (!p) return res.status(404).json({ error: 'No patient with that ID' });
    res.json(serializePatient(p));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
