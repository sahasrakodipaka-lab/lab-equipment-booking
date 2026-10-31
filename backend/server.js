require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const equipmentRoutes = require('./routes/equipment');
const bookingRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '20kb' }));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, limit: 150, standardHeaders: 'draft-7', legacyHeaders: false }));
app.get('/api/health', (_req, res) => res.json({ ok: true, message: 'Lab Equipment Booking API is running.' }));
app.use('/api/equipment', equipmentRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API endpoint not found.' });
  return res.status(404).sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});
app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError && 'body' in err) return res.status(400).json({ error: 'Invalid JSON request body.' });
  console.error('Unhandled server error:', err.message);
  return res.status(500).json({ error: 'An unexpected server error occurred.' });
});
app.listen(PORT, () => console.log(`Lab Equipment Booking is running at http://localhost:${PORT}`));
