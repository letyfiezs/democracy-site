const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

function removeFile(imagePath) {
  if (!imagePath) return;
  const p = path.join(__dirname, '..', '..', 'public', imagePath.replace(/^\//, ''));
  fs.unlink(p, () => {});
}

// ── PUBLIC: list all branches (with members count) ──────────────────────────
router.get('/', (req, res) => {
  const { type } = req.query;
  let rows;
  if (type) {
    rows = db.prepare('SELECT * FROM branches WHERE type = ? ORDER BY sort_order ASC, id ASC').all(type);
  } else {
    rows = db.prepare('SELECT * FROM branches ORDER BY type ASC, sort_order ASC, id ASC').all();
  }
  res.json(rows);
});

// ── PUBLIC: single branch with its members ──────────────────────────────────
router.get('/:id', (req, res) => {
  const branch = db.prepare('SELECT * FROM branches WHERE id = ?').get(req.params.id);
  if (!branch) return res.status(404).json({ error: 'Олдсонгүй' });
  const members = db.prepare('SELECT * FROM branch_members WHERE branch_id = ? ORDER BY sort_order ASC, id ASC').all(req.params.id);
  res.json({ ...branch, members });
});

// ── ADMIN: create branch ────────────────────────────────────────────────────
router.post('/', requireAuth, upload.single('image'), (req, res) => {
  const { type, name, description, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: 'Нэр шаардлагатай' });
  const image = req.file ? '/uploads/' + req.file.filename : null;
  const info = db.prepare('INSERT INTO branches (type,name,description,image,sort_order) VALUES (?,?,?,?,?)')
    .run(type || 'bag', name, description || '', image, Number(sort_order) || 0);
  res.status(201).json(db.prepare('SELECT * FROM branches WHERE id = ?').get(info.lastInsertRowid));
});

// ── ADMIN: update branch ────────────────────────────────────────────────────
router.put('/:id', requireAuth, upload.single('image'), (req, res) => {
  const existing = db.prepare('SELECT * FROM branches WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Олдсонгүй' });
  const { type, name, description, sort_order, removeImage } = req.body;
  let image = existing.image;
  if (req.file) {
    if (existing.image) removeFile(existing.image);
    image = '/uploads/' + req.file.filename;
  } else if (removeImage === 'true') {
    if (existing.image) removeFile(existing.image);
    image = null;
  }
  db.prepare('UPDATE branches SET type=?,name=?,description=?,image=?,sort_order=? WHERE id=?')
    .run(type || existing.type, name || existing.name, description ?? existing.description,
      image, sort_order !== undefined ? Number(sort_order) : existing.sort_order, req.params.id);
  res.json(db.prepare('SELECT * FROM branches WHERE id = ?').get(req.params.id));
});

// ── ADMIN: delete branch ────────────────────────────────────────────────────
router.delete('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM branches WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Олдсонгүй' });
  if (existing.image) removeFile(existing.image);
  // delete members photos too
  const members = db.prepare('SELECT * FROM branch_members WHERE branch_id = ?').all(req.params.id);
  members.forEach(m => { if (m.photo) removeFile(m.photo); });
  db.prepare('DELETE FROM branch_members WHERE branch_id = ?').run(req.params.id);
  db.prepare('DELETE FROM branches WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ── ADMIN: create branch member ─────────────────────────────────────────────
router.post('/:id/members', requireAuth, upload.single('photo'), (req, res) => {
  const branch = db.prepare('SELECT id FROM branches WHERE id = ?').get(req.params.id);
  if (!branch) return res.status(404).json({ error: 'Салбар олдсонгүй' });
  const { name, role, description, date, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: 'Нэр шаардлагатай' });
  const photo = req.file ? '/uploads/' + req.file.filename : null;
  const info = db.prepare('INSERT INTO branch_members (branch_id,name,role,description,photo,date,sort_order) VALUES (?,?,?,?,?,?,?)')
    .run(req.params.id, name, role || '', description || '', photo, date || '', Number(sort_order) || 0);
  res.status(201).json(db.prepare('SELECT * FROM branch_members WHERE id = ?').get(info.lastInsertRowid));
});

// ── ADMIN: update branch member ─────────────────────────────────────────────
router.put('/:id/members/:mid', requireAuth, upload.single('photo'), (req, res) => {
  const existing = db.prepare('SELECT * FROM branch_members WHERE id = ? AND branch_id = ?').get(req.params.mid, req.params.id);
  if (!existing) return res.status(404).json({ error: 'Олдсонгүй' });
  const { name, role, description, date, sort_order, removePhoto } = req.body;
  let photo = existing.photo;
  if (req.file) {
    if (existing.photo) removeFile(existing.photo);
    photo = '/uploads/' + req.file.filename;
  } else if (removePhoto === 'true') {
    if (existing.photo) removeFile(existing.photo);
    photo = null;
  }
  db.prepare('UPDATE branch_members SET name=?,role=?,description=?,photo=?,date=?,sort_order=? WHERE id=?')
    .run(name || existing.name, role ?? existing.role, description ?? existing.description,
      photo, date ?? existing.date, sort_order !== undefined ? Number(sort_order) : existing.sort_order, req.params.mid);
  res.json(db.prepare('SELECT * FROM branch_members WHERE id = ?').get(req.params.mid));
});

// ── ADMIN: delete branch member ─────────────────────────────────────────────
router.delete('/:id/members/:mid', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM branch_members WHERE id = ? AND branch_id = ?').get(req.params.mid, req.params.id);
  if (!existing) return res.status(404).json({ error: 'Олдсонгүй' });
  if (existing.photo) removeFile(existing.photo);
  db.prepare('DELETE FROM branch_members WHERE id = ?').run(req.params.mid);
  res.json({ ok: true });
});

module.exports = router;
