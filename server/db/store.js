const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const dbFile = path.join(dataDir, 'db.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

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
    console.error('Error reading db.json:', err.message);
  }

  return {
    patients: [],
    queue: [],
    visits: [],
  };
}

let db = loadDb();

function saveDb() {
  try {
    fs.writeFileSync(
      dbFile,
      JSON.stringify(db, null, 2),
      'utf8'
    );
  } catch (err) {
    console.error('Error saving db.json:', err.message);
  }
}

// --------------------------------------------------
// SUPABASE
// --------------------------------------------------

let supabase = null;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY;

if (supabaseUrl && supabaseKey) {
  try {
    const { createClient } = require('@supabase/supabase-js');

    supabase = createClient(
      supabaseUrl,
      supabaseKey
    );

    console.log('Supabase client initialized.');
  } catch (err) {
    console.error(
      'Failed to initialize Supabase:',
      err.message
    );
  }
}

// --------------------------------------------------
// PATIENT MAPPING
// --------------------------------------------------

function patientToSupabase(patient) {
  return {
    id: patient.id,
    name: patient.name,
    age: patient.age,
    gender: patient.gender || '',
    blood: patient.blood || '',
    phone: patient.phone || '',
    emergency: patient.emergency || '',
    address: patient.address || '',
    allergies: patient.allergies || '',
    medications: patient.medications || '',
    history: patient.history || '',

    labsummary: patient.labSummary || '',
    labupdatedat: patient.labUpdatedAt || null,

    fingerprinttemplateid:
      Number(patient.fingerprintTemplateId),

    registeredat:
      patient.registeredAt || new Date().toISOString(),

    registeredby:
      patient.registeredBy || 'Front Desk',
  };
}

function patientFromSupabase(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    age: row.age,
    gender: row.gender || '',
    blood: row.blood || '',
    phone: row.phone || '',
    emergency: row.emergency || '',
    address: row.address || '',
    allergies: row.allergies || '',
    medications: row.medications || '',
    history: row.history || '',

    labSummary:
      row.labsummary ??
      row.labSummary ??
      '',

    labUpdatedAt:
      row.labupdatedat ??
      row.labUpdatedAt ??
      '',

    fingerprintTemplateId:
      row.fingerprinttemplateid ??
      row.fingerprintTemplateId ??
      null,

    registeredAt:
      row.registeredat ??
      row.registeredAt ??
      '',

    registeredBy:
      row.registeredby ??
      row.registeredBy ??
      'Front Desk',
  };
}

// --------------------------------------------------
// QUEUE MAPPING
// --------------------------------------------------

function queueToSupabase(entry) {
  return {
    id: entry.id,
    patientid: entry.patientId,
    patientname: entry.patientName,
    status: entry.status,
    priority: entry.priority,
    token: Number(entry.token),
    checkedinat: entry.checkedInAt,
  };
}

function queueFromSupabase(row) {
  if (!row) return null;

  return {
    id: row.id,

    patientId:
      row.patientid ??
      row.patientId,

    patientName:
      row.patientname ??
      row.patientName,

    status: row.status,
    priority: row.priority,
    token: row.token,

    checkedInAt:
      row.checkedinat ??
      row.checkedInAt,
  };
}

// --------------------------------------------------
// VISIT MAPPING
// --------------------------------------------------

function visitToSupabase(visit) {
  return {
    id: visit.id,

    patientid: visit.patientId,

    patientname: visit.patientName,

    date: visit.date,

    datelabel: visit.dateLabel,

    doctor: visit.doctor || '',

    vitals: visit.vitals || '',

    conditions: visit.conditions || '',

    medications: visit.medications || '',

    notes: visit.notes || '',
  };
}

function visitFromSupabase(row) {
  if (!row) return null;

  return {
    id: row.id,

    patientId:
      row.patientid ??
      row.patientId,

    patientName:
      row.patientname ??
      row.patientName,

    date: row.date,

    dateLabel:
      row.datelabel ??
      row.dateLabel,

    doctor: row.doctor || '',
    vitals: row.vitals || '',
    conditions: row.conditions || '',
    medications: row.medications || '',
    notes: row.notes || '',
  };
}

// --------------------------------------------------
// STORE
// --------------------------------------------------

const store = {

  getMode() {
    return supabase
      ? 'supabase'
      : 'file-store';
  },

  // ==================================================
  // PATIENTS
  // ==================================================

  async getPatients() {

    if (supabase) {

      const {
        data,
        error
      } = await supabase
        .from('patients')
        .select('*');

      if (error) {
        console.error(
          'Supabase getPatients error:',
          error.message
        );

        throw new Error(
          `Supabase patient fetch failed: ${error.message}`
        );
      }

      return (data || [])
        .map(patientFromSupabase)
        .sort(
          (a, b) =>
            new Date(b.registeredAt || 0) -
            new Date(a.registeredAt || 0)
        );
    }

    return [...db.patients].sort(
      (a, b) =>
        new Date(b.registeredAt || 0) -
        new Date(a.registeredAt || 0)
    );
  },

  async getPatientById(id) {

    const cleanId =
      String(id || '').toUpperCase();

    if (supabase) {

      const {
        data,
        error
      } = await supabase
        .from('patients')
        .select('*')
        .eq('id', cleanId)
        .maybeSingle();

      if (error) {
        console.error(
          'Supabase getPatientById error:',
          error.message
        );

        throw new Error(
          `Supabase patient lookup failed: ${error.message}`
        );
      }

      return patientFromSupabase(data);
    }

    return (
      db.patients.find(
        p =>
          String(p.id || '').toUpperCase() ===
          cleanId
      ) || null
    );
  },

  async findPatientByTemplate(templateId) {

    const tId = Number(templateId);

    if (supabase) {

      const {
        data,
        error
      } = await supabase
        .from('patients')
        .select('*')
        .eq('fingerprinttemplateid', tId)
        .maybeSingle();

      if (error) {

        console.error(
          'Supabase fingerprint lookup error:',
          error.message
        );

        throw new Error(
          `Fingerprint lookup failed: ${error.message}`
        );
      }

      return patientFromSupabase(data);
    }

    return (
      db.patients.find(
        p =>
          Number(p.fingerprintTemplateId) === tId
      ) || null
    );
  },

  async nextPatientId() {

    let max = 1000;

    if (supabase) {

      const {
        data,
        error
      } = await supabase
        .from('patients')
        .select('id');

      if (!error && data) {

        data.forEach(p => {

          const digits =
            String(p.id || '')
              .replace(/[^0-9]/g, '');

          if (
            digits &&
            Number(digits) > max
          ) {
            max = Number(digits);
          }
        });
      }
    } else {

      db.patients.forEach(p => {

        const digits =
          String(p.id || '')
            .replace(/[^0-9]/g, '');

        if (
          digits &&
          Number(digits) > max
        ) {
          max = Number(digits);
        }
      });
    }

    return 'P' + (max + 1);
  },

  async createPatient(payload) {

    const templateId =
      payload.fingerprintTemplateId ??
      payload.biometricTemplateId ??
      payload.template_id;

    if (
      templateId === undefined ||
      templateId === null ||
      String(templateId).trim() === ''
    ) {
      throw new Error(
        'Fingerprint template is required before patient data can be stored.'
      );
    }

    const fingerprintTemplateId =
      Number(templateId);

    if (
      !Number.isFinite(
        fingerprintTemplateId
      ) ||
      fingerprintTemplateId <= 0
    ) {
      throw new Error(
        'Fingerprint template must be a valid positive number.'
      );
    }

    const existing =
      await this.findPatientByTemplate(
        fingerprintTemplateId
      );

    if (existing) {
      throw new Error(
        `That fingerprint is already linked to patient ${existing.id}`
      );
    }

    const id =
      payload.id ||
      await this.nextPatientId();

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

      labUpdatedAt:
        payload.labUpdatedAt || '',

      fingerprintTemplateId,

      registeredAt:
        payload.registeredAt ||
        new Date().toISOString(),

      registeredBy:
        payload.registeredBy ||
        'Front Desk',
    };

    // ------------------------------
    // SUPABASE PRIMARY STORAGE
    // ------------------------------

    if (supabase) {

      const {
        data,
        error
      } = await supabase
        .from('patients')
        .insert(
          patientToSupabase(newPatient)
        )
        .select()
        .single();

      if (error) {

        console.error(
          'SUPABASE PATIENT INSERT ERROR:',
          error
        );

        throw new Error(
          `Supabase patient insert failed: ${error.message}`
        );
      }

      const saved =
        patientFromSupabase(data);

      // Keep local cache
      db.patients.push(saved);
      saveDb();

      return saved;
    }

    // ------------------------------
    // LOCAL STORAGE FALLBACK
    // ------------------------------

    db.patients.push(newPatient);
    saveDb();

    return newPatient;
  },

  async updatePatient(id, updates) {

    const cleanId =
      String(id || '').toUpperCase();

    // ------------------------------
    // SUPABASE
    // ------------------------------

    if (supabase) {

      const mapped = {};

      if (updates.name !== undefined)
        mapped.name = updates.name;

      if (updates.age !== undefined)
        mapped.age = updates.age;

      if (updates.gender !== undefined)
        mapped.gender = updates.gender;

      if (updates.blood !== undefined)
        mapped.blood = updates.blood;

      if (updates.phone !== undefined)
        mapped.phone = updates.phone;

      if (updates.emergency !== undefined)
        mapped.emergency = updates.emergency;

      if (updates.address !== undefined)
        mapped.address = updates.address;

      if (updates.allergies !== undefined)
        mapped.allergies = updates.allergies;

      if (updates.medications !== undefined)
        mapped.medications = updates.medications;

      if (updates.history !== undefined)
        mapped.history = updates.history;

      if (updates.labSummary !== undefined)
        mapped.labsummary = updates.labSummary;

      if (updates.labUpdatedAt !== undefined)
        mapped.labupdatedat = updates.labUpdatedAt;

      if (
        updates.fingerprintTemplateId !==
        undefined
      ) {
        mapped.fingerprinttemplateid =
          Number(
            updates.fingerprintTemplateId
          );
      }

      const {
        data,
        error
      } = await supabase
        .from('patients')
        .update(mapped)
        .eq('id', cleanId)
        .select()
        .single();

      if (error) {

        console.error(
          'SUPABASE PATIENT UPDATE ERROR:',
          error
        );

        throw new Error(
          `Supabase patient update failed: ${error.message}`
        );
      }

      const updated =
        patientFromSupabase(data);

      // Update local cache
      const idx =
        db.patients.findIndex(
          p =>
            String(p.id).toUpperCase() ===
            cleanId
        );

      if (idx !== -1) {
        db.patients[idx] = updated;
      } else {
        db.patients.push(updated);
      }

      saveDb();

      return updated;
    }

    // ------------------------------
    // LOCAL STORAGE
    // ------------------------------

    const idx =
      db.patients.findIndex(
        p =>
          String(p.id || '').toUpperCase() ===
          cleanId
      );

    if (idx === -1)
      return null;

    db.patients[idx] = {
      ...db.patients[idx],
      ...updates,
    };

    saveDb();

    return db.patients[idx];
  },

  // ==================================================
  // QUEUE
  // ==================================================

  async getQueue() {

    if (supabase) {

      const {
        data,
        error
      } = await supabase
        .from('queue')
        .select('*')
        .order('token', {
          ascending: true
        });

      if (error) {

        console.error(
          'Supabase getQueue error:',
          error.message
        );

        throw new Error(
          `Supabase queue fetch failed: ${error.message}`
        );
      }

      return (data || [])
        .map(queueFromSupabase);
    }

    return [...db.queue].sort(
      (a, b) =>
        (a.token || 0) -
        (b.token || 0)
    );
  },

  async addQueueEntry(payload) {

    let maxToken = 0;

    if (supabase) {

      const {
        data
      } = await supabase
        .from('queue')
        .select('token');

      (data || []).forEach(q => {

        if (
          q.token &&
          Number(q.token) > maxToken
        ) {
          maxToken = Number(q.token);
        }
      });

    } else {

      db.queue.forEach(q => {

        if (
          q.token &&
          Number(q.token) > maxToken
        ) {
          maxToken = Number(q.token);
        }
      });
    }

    const entry = {

      id:
        'Q' + Date.now(),

      patientId:
        payload.patientId,

      patientName:
        payload.patientName,

      status:
        'waiting',

      priority:
        payload.priority || 'normal',

      token:
        maxToken + 1,

      checkedInAt:
        new Date().toISOString(),
    };

    if (supabase) {

      const {
        data,
        error
      } = await supabase
        .from('queue')
        .insert(
          queueToSupabase(entry)
        )
        .select()
        .single();

      if (error) {

        console.error(
          'SUPABASE QUEUE INSERT ERROR:',
          error
        );

        throw new Error(
          `Supabase queue insert failed: ${error.message}`
        );
      }

      const saved =
        queueFromSupabase(data);

      db.queue.push(saved);
      saveDb();

      return saved;
    }

    db.queue.push(entry);
    saveDb();

    return entry;
  },

  async updateQueueEntry(id, updates) {

    if (supabase) {

      const mapped = {};

      if (updates.status !== undefined)
        mapped.status = updates.status;

      if (updates.priority !== undefined)
        mapped.priority = updates.priority;

      if (updates.token !== undefined)
        mapped.token = Number(updates.token);

      const {
        data,
        error
      } = await supabase
        .from('queue')
        .update(mapped)
        .eq('id', id)
        .select()
        .single();

      if (error) {

        console.error(
          'SUPABASE QUEUE UPDATE ERROR:',
          error
        );

        throw new Error(
          `Supabase queue update failed: ${error.message}`
        );
      }

      const updated =
        queueFromSupabase(data);

      const idx =
        db.queue.findIndex(
          q => String(q.id) === String(id)
        );

      if (idx !== -1) {
        db.queue[idx] = updated;
      } else {
        db.queue.push(updated);
      }

      saveDb();

      return updated;
    }

    const idx =
      db.queue.findIndex(
        q => String(q.id) === String(id)
      );

    if (idx === -1)
      return null;

    db.queue[idx] = {
      ...db.queue[idx],
      ...updates,
    };

    saveDb();

    return db.queue[idx];
  },

  async closeActiveQueueEntry(patientId) {

    const cleanId =
      String(patientId || '')
        .toUpperCase();

    const queue =
      await this.getQueue();

    const active =
      [...queue]
        .reverse()
        .find(
          q =>
            String(
              q.patientId || ''
            ).toUpperCase() === cleanId &&
            q.status !== 'done'
        );

    if (active) {

      return this.updateQueueEntry(
        active.id,
        { status: 'done' }
      );
    }

    return null;
  },

  // ==================================================
  // VISITS
  // ==================================================

  async getVisits(patientId) {

    if (supabase) {

      let query =
        supabase
          .from('visits')
          .select('*')
          .order('date', {
            ascending: false
          });

      if (patientId) {

        query =
          query.eq(
            'patientid',
            String(patientId).toUpperCase()
          );
      }

      const {
        data,
        error
      } = await query;

      if (error) {

        console.error(
          'Supabase getVisits error:',
          error.message
        );

        throw new Error(
          `Supabase visits fetch failed: ${error.message}`
        );
      }

      return (data || [])
        .map(visitFromSupabase);
    }

    let list =
      [...db.visits];

    if (patientId) {

      const cleanId =
        String(patientId)
          .toUpperCase();

      list =
        list.filter(
          v =>
            String(
              v.patientId || ''
            ).toUpperCase() === cleanId
        );
    }

    return list.sort(
      (a, b) =>
        new Date(b.date || 0) -
        new Date(a.date || 0)
    );
  },

  async createVisit(payload) {

    const visit = {

      id:
        'V' + Date.now(),

      patientId:
        payload.patientId,

      patientName:
        payload.patientName,

      date:
        payload.date ||
        new Date().toISOString(),

      dateLabel:
        payload.dateLabel ||
        new Date().toDateString(),

      doctor:
        payload.doctor || '',

      vitals:
        payload.vitals || '',

      conditions:
        payload.conditions || '',

      medications:
        payload.medications || '',

      notes:
        payload.notes || '',
    };

    if (supabase) {

      const {
        data,
        error
      } = await supabase
        .from('visits')
        .insert(
          visitToSupabase(visit)
        )
        .select()
        .single();

      if (error) {

        console.error(
          'SUPABASE VISIT INSERT ERROR:',
          error
        );

        throw new Error(
          `Supabase visit insert failed: ${error.message}`
        );
      }

      const saved =
        visitFromSupabase(data);

      db.visits.push(saved);
      saveDb();

      await this.closeActiveQueueEntry(
        visit.patientId
      );

      return saved;
    }

    db.visits.push(visit);
    saveDb();

    await this.closeActiveQueueEntry(
      visit.patientId
    );

    return visit;
  },
};

module.exports = store;
