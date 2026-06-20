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

// PUBLIC: list all slides ordered
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM hero_slides ORDER BY sort_order ASC, id ASC').all();
  res.json(rows);
});

// ADMIN: create
router.post('/', requireAuth, upload.single('image'), (req, res) => {
  const { tag, title, description, gradient, btn1_text, btn1_target, btn2_text, btn2_target, sort_order } = req.body;
  if (!title) return res.status(400).json({ error: 'Гарчиг шаардлагатай' });
  const image = req.file ? '/uploads/' + req.file.filename : null;
  const info = db.prepare(`INSERT INTO hero_slides
    (tag,title,description,image,gradient,btn1_text,btn1_target,btn2_text,btn2_target,sort_order)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
      tag || '', title, description || '', image, gradient || '',
      btn1_text || '', btn1_target || '', btn2_text || '', btn2_target || '', Number(sort_order) || 0
    );
  const row = db.prepare('SELECT * FROM hero_slides WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

// ADMIN: update
router.put('/:id', requireAuth, upload.single('image'), (req, res) => {
  const existing = db.prepare('SELECT * FROM hero_slides WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Олдсонгүй' });

  const { tag, title, description, gradient, btn1_text, btn1_target, btn2_text, btn2_target, sort_order, removeImage } = req.body;
  let image = existing.image;
  if (req.file) {
    if (existing.image) removeFile(existing.image);
    image = '/uploads/' + req.file.filename;
  } else if (removeImage === 'true') {
    if (existing.image) removeFile(existing.image);
    image = null;
  }

  db.prepare(`UPDATE hero_slides SET tag=?, title=?, description=?, image=?, gradient=?,
    btn1_text=?, btn1_target=?, btn2_text=?, btn2_target=?, sort_order=? WHERE id=?`).run(
      tag ?? existing.tag, title || existing.title, description ?? existing.description, image,
      gradient ?? existing.gradient, btn1_text ?? existing.btn1_text, btn1_target ?? existing.btn1_target,
      btn2_text ?? existing.btn2_text, btn2_target ?? existing.btn2_target,
      sort_order !== undefined ? Number(sort_order) : existing.sort_order,
      req.params.id
    );
  const row = db.prepare('SELECT * FROM hero_slides WHERE id = ?').get(req.params.id);
  res.json(row);
});

// ADMIN: delete
router.delete('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM hero_slides WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Олдсонгүй' });
  if (existing.image) removeFile(existing.image);
  db.prepare('DELETE FROM hero_slides WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
