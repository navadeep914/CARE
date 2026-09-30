const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const dbFile = path.join(dataDir, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initial structure
const defaultData = {
  patients: [],
  queue: [],
  visits: [],
};

function loadDb() {
  try {
    if (fs.existsSync(dbFile)) {
      const content = fs.readFileSync(dbFile, 'utf8');
      const parsed = JSON.parse(content);
      return {
        patients: Array.isArray(parsed.patients) ? parsed.patients : [],
        queue: Array.isArray(parsed.queue) ? parsed.queue : [],
        visits: Array.isArray(parsed.visits) ? parsed.visits : [],
      };
    }
  } catch (err) {
    console.error('Error reading db.json, initializing default store:', err.message);
  }
  return { ...defaultData };
}

let db = loadDb();

function saveDb() {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving db.json:', err.message);
  }
}

// Optional Supabase client if credentials exist
let supabase = null;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (supabaseUrl && supabaseKey) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized.');
  } catch (err) {
    console.warn('Failed to initialize Supabase client, using local file store:', err.message);
  }
}

// Store API
const store = {
  getMode() {
    return supabase ? 'supabase' : 'file-store';
  },

  // PATIENTS
  async getPatients() {
    if (supabase) {
      const { data, error } = await supabase.from('patients').select('*').order('registeredAt', { ascending: false });
      if (!error && data) return data;
    }
    return [...db.patients].sort((a, b) => new Date(b.registeredAt || 0) - new Date(a.registeredAt || 0));
  },

  async getPatientById(id) {
    const cleanId = String(id || '').toUpperCase();
    if (supabase) {
      const { data, error } = await supabase.from('patients').select('*').eq('id', cleanId).single();
      if (!error && data) return data;
    }
    return db.patients.find((p) => String(p.id || '').toUpperCase() === cleanId) || null;
  },

  async findPatientByTemplate(templateId) {
    const tId = Number(templateId);
    if (supabase) {
      const { data, error } = await supabase.from('patients').select('*').eq('fingerprintTemplateId', tId).single();
      if (!error && data) return data;
    }
    return db.patients.find((p) => Number(p.fingerprintTemplateId) === tId) || null;
  },

  async nextPatientId() {
    let max = 1000;
    db.patients.forEach((p) => {
      const digits = String(p.id || '').replace(/[^0-9]/g, '');
      if (digits && Number(digits) > max) max = Number(digits);
    });
    return 'P' + (max + 1);
  },

  async createPatient(payload) {
    const templateId = payload.fingerprintTemplateId ?? payload.biometricTemplateId ?? payload.template_id;
    if (templateId === undefined || templateId === null || String(templateId).trim() === '') {
      throw new Error('Fingerprint template is required before patient data can be stored.');
    }

    const fingerprintTemplateId = Number(templateId);
    if (!Number.isFinite(fingerprintTemplateId) || fingerprintTemplateId <= 0) {
      throw new Error('Fingerprint template must be a valid positive number.');
    }

    const existing = await this.findPatientByTemplate(fingerprintTemplateId);
    if (existing) {
      throw new Error(`That fingerprint is already linked to patient ${existing.id}`);
    }

    const id = payload.id || (await this.nextPatientId());
    const newPatient = {
      id,
      name: payload.name,
      age: payload.age,
      gender: payload.gender || '',
      blood: payload.blood || '',
      phone: payload.phone || '',
      emergency: payload.emergency || '',
      address: payload.address || '',
      allergies: payload.allergies || '',
      medications: payload.medications || '',
      history: payload.history || '',
      labSummary: payload.labSummary || '',
      labUpdatedAt: payload.labUpdatedAt || '',
      fingerprintTemplateId,
      registeredAt: payload.registeredAt || new Date().toISOString(),
      registeredBy: payload.registeredBy || 'Front Desk',
    };

    db.patients.push(newPatient);
    saveDb();

    if (supabase) {
      supabase.from('patients').insert(newPatient).catch((err) => console.warn('Supabase sync error:', err.message));
    }

    return newPatient;
  },

  async updatePatient(id, updates) {
    const cleanId = String(id || '').toUpperCase();
    const idx = db.patients.findIndex((p) => String(p.id || '').toUpperCase() === cleanId);
    if (idx === -1) return null;

    db.patients[idx] = {
      ...db.patients[idx],
      ...updates,
    };
    saveDb();

    if (supabase) {
      supabase.from('patients').update(updates).eq('id', cleanId).catch((err) => console.warn('Supabase sync error:', err.message));
    }

    return db.patients[idx];
  },

  // QUEUE
  async getQueue() {
    if (supabase) {
      const { data, error } = await supabase.from('queue').select('*').order('token', { ascending: true });
      if (!error && data) return data;
    }
    return [...db.queue].sort((a, b) => (a.token || 0) - (b.token || 0));
  },

  async addQueueEntry(payload) {
    let maxToken = 0;
    db.queue.forEach((q) => {
      if (q.token && Number(q.token) > maxToken) maxToken = Number(q.token);
    });
    const token = maxToken + 1;
    const entry = {
      id: 'Q' + Date.now(),
      patientId: payload.patientId,
      patientName: payload.patientName,
      status: 'waiting',
      priority: payload.priority || 'normal',
      token,
      checkedInAt: new Date().toISOString(),
    };

    db.queue.push(entry);
    saveDb();

    if (supabase) {
      supabase.from('queue').insert(entry).catch((err) => console.warn('Supabase sync error:', err.message));
    }

    return entry;
  },

  async updateQueueEntry(id, updates) {
    const idx = db.queue.findIndex((q) => String(q.id) === String(id));
    if (idx === -1) return null;

    db.queue[idx] = {
      ...db.queue[idx],
      ...updates,
    };
    saveDb();

    if (supabase) {
      supabase.from('queue').update(updates).eq('id', id).catch((err) => console.warn('Supabase sync error:', err.message));
    }

    return db.queue[idx];
  },

  async closeActiveQueueEntry(patientId) {
    const cleanId = String(patientId || '').toUpperCase();
    const active = [...db.queue]
      .reverse()
      .find((q) => String(q.patientId || '').toUpperCase() === cleanId && q.status !== 'done');
    if (active) {
      return this.updateQueueEntry(active.id, { status: 'done' });
    }
    return null;
  },

  // VISITS
  async getVisits(patientId) {
    if (supabase) {
      let query = supabase.from('visits').select('*').order('date', { ascending: false });
      if (patientId) query = query.eq('patientId', String(patientId).toUpperCase());
      const { data, error } = await query;
      if (!error && data) return data;
    }

    let list = [...db.visits];
    if (patientId) {
      const cleanId = String(patientId).toUpperCase();
      list = list.filter((v) => String(v.patientId || '').toUpperCase() === cleanId);
    }
    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  },

  async createVisit(payload) {
    const visit = {
      id: 'V' + Date.now(),
      patientId: payload.patientId,
      patientName: payload.patientName,
      date: payload.date || new Date().toISOString(),
      dateLabel: payload.dateLabel || new Date().toDateString(),
      doctor: payload.doctor || '',
      vitals: payload.vitals || '',
      conditions: payload.conditions || '',
      medications: payload.medications || '',
      notes: payload.notes || '',
    };

    db.visits.push(visit);
    saveDb();

    // Auto-close active queue entry
    await this.closeActiveQueueEntry(payload.patientId);

    if (supabase) {
      supabase.from('visits').insert(visit).catch((err) => console.warn('Supabase sync error:', err.message));
    }

    return visit;
  },
};

module.exports = store;
