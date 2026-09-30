require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const store = require('./db/store');

const patientsRouter = require('./routes/patients');
const queueRouter = require('./routes/queue');
const visitsRouter = require('./routes/visits');
const sensorRouter = require('./routes/sensor'); // exposes /api/enroll and /api/identify
const authRouter = require('./routes/auth');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/queue', queueRouter);
app.use('/api/visits', visitsRouter);
app.use('/api/biometric', sensorRouter);
app.use('/api', sensorRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: store.getMode(), time: new Date().toISOString() });
});

// In production, serve the React app that `npm run build` produces.
// In development, run the client separately with `npm start` (port 3000)
// — its package.json "proxy" field forwards /api/* calls to this server.
const clientBuildPath = path.join(__dirname, '..', 'client', 'build');
app.use(express.static(clientBuildPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
    if (err) next();
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`CareDesk API listening on http://localhost:${PORT} [Storage: ${store.getMode()}]`);
});
