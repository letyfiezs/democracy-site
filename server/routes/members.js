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

// PUBLIC: list, optional ?group=lead|nbd|uih|nitx
router.get('/', (req, res) => {
  const { group } = req.query;
  let rows;
  if (group) {
    rows = db.prepare('SELECT * FROM members WHERE group_key = ? ORDER BY sort_order ASC, id ASC').all(group);
  } else {
    rows = db.prepare('SELECT * FROM members ORDER BY group_key ASC, sort_order ASC, id ASC').all();
  }
  res.json(rows);
});

// ADMIN: create
router.post('/', requireAuth, upload.single('photo'), (req, res) => {
  const { group_key, name, role, description, sort_order } = req.body;
  if (!group_key || !name) return res.status(400).json({ error: 'Бүлэг болон нэр шаардлагатай' });
  const photo = req.file ? '/uploads/' + req.file.filename : null;
  const info = db.prepare(`INSERT INTO members (group_key,name,role,description,photo,sort_order) VALUES (?,?,?,?,?,?)`)
    .run(group_key, name, role || '', description || '', photo, Number(sort_order) || 0);
  const row = db.prepare('SELECT * FROM members WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

// ADMIN: update
router.put('/:id', requireAuth, upload.single('photo'), (req, res) => {
  const existing = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Олдсонгүй' });

  const { group_key, name, role, description, sort_order, removePhoto } = req.body;
  let photo = existing.photo;
  if (req.file) {
    if (existing.photo) removeFile(existing.photo);
    photo = '/uploads/' + req.file.filename;
  } else if (removePhoto === 'true') {
    if (existing.photo) removeFile(existing.photo);
    photo = null;
  }

  db.prepare(`UPDATE members SET group_key=?, name=?, role=?, description=?, photo=?, sort_order=? WHERE id=?`)
    .run(
      group_key || existing.group_key, name || existing.name, role ?? existing.role,
      description ?? existing.description,
      photo, sort_order !== undefined ? Number(sort_order) : existing.sort_order,
      req.params.id
    );
  const row = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  res.json(row);
});

// ADMIN: delete
router.delete('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Олдсонгүй' });
  if (existing.photo) removeFile(existing.photo);
  db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
