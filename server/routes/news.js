const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

function videoUrl(value, provider) {
  const text = String(value || '').trim();
  if (!text) return '';
  try {
    const url = new URL(text);
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase();
    if (provider === 'facebook') {
      if (!['facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com', 'fb.watch', 'www.fb.watch'].includes(host)) return null;
      const path = url.pathname;
      const isVideo = host.endsWith('fb.watch') ? /^\/[a-zA-Z0-9_-]+\/?$/.test(path) :
        ((path === '/watch/' || path === '/watch') && !!url.searchParams.get('v')) ||
        /^\/(?:[^/]+\/)?videos\/[^/]+\/?$/.test(path) ||
        /^\/(?:reel|share\/v)\/[^/]+\/?$/.test(path);
      if (!isVideo) return null;
    } else {
      const ytHost = host.replace(/^www\./, '');
      const id = ytHost === 'youtu.be' ? url.pathname.slice(1).split('/')[0] :
        ['youtube.com', 'm.youtube.com'].includes(ytHost) ?
          (url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1]) : '';
      if (!/^[a-zA-Z0-9_-]{11}$/.test(id || '')) return null;
    }
    url.hash = '';
    return url.toString();
  } catch { return null; }
}

function removeFile(imagePath) {
  if (!imagePath) return;
  const p = path.join(__dirname, '..', '..', 'public', imagePath.replace(/^\//, ''));
  fs.unlink(p, () => {});
}

// PUBLIC: list news, optional ?type=news|event|pr
router.get('/', (req, res) => {
  const { type } = req.query;
  let rows;
  if (type) {
    rows = db.prepare('SELECT * FROM news WHERE type = ? ORDER BY date DESC, sort_order ASC').all(type);
  } else {
    rows = db.prepare('SELECT * FROM news ORDER BY date DESC, sort_order ASC').all();
  }
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM news WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Олдсонгүй' });
  res.json(row);
});

// ADMIN: create
router.post('/', requireAuth, upload.single('image'), (req, res) => {
  const { type, title, summary, content, emoji, date, location, featured, sort_order, youtube_url, facebook_video_url } = req.body;
  if (!title || !date) return res.status(400).json({ error: 'Гарчиг болон огноо шаардлагатай' });
  const youtubeUrl = videoUrl(youtube_url, 'youtube');
  const facebookUrl = videoUrl(facebook_video_url, 'facebook');
  if (youtubeUrl === null || facebookUrl === null) return res.status(400).json({ error: 'Видео холбоос буруу байна' });
  const image = req.file ? '/uploads/' + req.file.filename : null;
  const info = db.prepare(`INSERT INTO news (type,title,summary,content,emoji,image,date,location,featured,sort_order,youtube_url,facebook_video_url)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      type || 'news', title, summary || '', content || '', emoji || '📰', image, date,
      location || null, featured ? 1 : 0, Number(sort_order) || 0, youtubeUrl, facebookUrl
    );
  const row = db.prepare('SELECT * FROM news WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

// ADMIN: update
router.put('/:id', requireAuth, upload.single('image'), (req, res) => {
  const existing = db.prepare('SELECT * FROM news WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Олдсонгүй' });

  const { type, title, summary, content, emoji, date, location, featured, sort_order, removeImage, youtube_url, facebook_video_url } = req.body;
  const youtubeUrl = videoUrl(youtube_url ?? existing.youtube_url, 'youtube');
  const facebookUrl = videoUrl(facebook_video_url ?? existing.facebook_video_url, 'facebook');
  if (youtubeUrl === null || facebookUrl === null) return res.status(400).json({ error: 'Видео холбоос буруу байна' });
  let image = existing.image;
  if (req.file) {
    if (existing.image) removeFile(existing.image);
    image = '/uploads/' + req.file.filename;
  } else if (removeImage === 'true') {
    if (existing.image) removeFile(existing.image);
    image = null;
  }

  db.prepare(`UPDATE news SET type=?, title=?, summary=?, content=?, emoji=?, image=?, date=?, location=?, featured=?, sort_order=?, youtube_url=?, facebook_video_url=? WHERE id=?`)
    .run(
      type || existing.type, title || existing.title, summary ?? existing.summary, content ?? existing.content,
      emoji || existing.emoji, image, date || existing.date, location ?? existing.location,
      featured !== undefined ? (featured ? 1 : 0) : existing.featured,
      sort_order !== undefined ? Number(sort_order) : existing.sort_order, youtubeUrl, facebookUrl,
      req.params.id
    );
  const row = db.prepare('SELECT * FROM news WHERE id = ?').get(req.params.id);
  res.json(row);
});

// ADMIN: delete
router.delete('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM news WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Олдсонгүй' });
  if (existing.image) removeFile(existing.image);
  db.prepare('DELETE FROM news WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
