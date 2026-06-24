require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes   = require('./routes/auth');
const newsRoutes   = require('./routes/news');
const membersRoutes = require('./routes/members');
const heroRoutes   = require('./routes/hero');
const branchRoutes = require('./routes/branches');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-secret-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8, httpOnly: true }
}));

// Static frontend + uploaded images
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/api/auth',    authRoutes);
app.use('/api/news',    newsRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/hero',    heroRoutes);
app.use('/api/branches', branchRoutes);

// SPA fallback — /admin/* → admin panel, everything else → index.html
// This fixes page refresh always going to home
app.get('/admin', (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'index.html')));
app.get('/admin/', (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'index.html')));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return res.status(404).end();
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || 'Алдаа гарлаа' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`   Admin panel:  http://localhost:${PORT}/admin/`);
});
