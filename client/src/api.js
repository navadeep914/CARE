const BASE = process.env.REACT_APP_API_BASE || '';

async function request(method, path, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}

export const api = {
  health: () => request('GET', '/api/health'),
  login: (body) => request('POST', '/api/auth/login', body),
  getPatients: () => request('GET', '/api/patients'),
  getPatient: (id) => request('GET', `/api/patients/${encodeURIComponent(id)}`),
  createPatient: (body) => request('POST', '/api/patients', body),
  updatePatient: (id, body) => request('PATCH', `/api/patients/${encodeURIComponent(id)}`, body),
  enroll: (body) => request('POST', '/api/biometric/enroll', body),
  identify: (body) => request('POST', '/api/biometric/identify', body),
  getQueue: () => request('GET', '/api/queue'),
  addQueue: (body) => request('POST', '/api/queue', body),
  updateQueue: (id, body) => request('PATCH', `/api/queue/${id}`, body),
  getVisits: () => request('GET', '/api/visits'),
  addVisit: (body) => request('POST', '/api/visits', body),
};

export default api;
