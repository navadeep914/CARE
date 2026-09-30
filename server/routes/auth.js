const express = require('express');
const router = express.Router();

const AUTH_USERS = {
  DOCTOR: {
    username: 'doctor',
    password: 'CareDeskDoctor123',
    role: 'DOCTOR',
    displayName: 'Dr. Ada James',
  },
  RECEPTIONIST: {
    username: 'receptionist',
    password: 'CareDeskReception123',
    role: 'RECEPTIONIST',
    displayName: 'Maya Patel',
  },
};

router.post('/login', (req, res) => {
  const { username = '', password = '', role = '' } = req.body || {};
  const cleanUsername = String(username).trim();
  const cleanRole = String(role).trim().toUpperCase();

  if (!cleanUsername || !password || !cleanRole) {
    return res.status(400).json({ error: 'username, password, and role are required' });
  }

  const match = AUTH_USERS[cleanRole];
  if (!match) {
    return res.status(401).json({ error: 'Unknown user role' });
  }

  if (cleanUsername !== match.username || String(password) !== match.password) {
    return res.status(401).json({ error: 'Invalid credentials for the selected role' });
  }

  return res.json({
    ok: true,
    user: {
      username: match.username,
      displayName: match.displayName,
      role: match.role,
    },
  });
});

router.get('/me', (req, res) => {
  res.json({ ok: true, user: null });
});

module.exports = router;
