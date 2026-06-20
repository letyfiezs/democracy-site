// ============ AUTH ============
async function checkAuth() {
  const res = await fetch('/api/auth/me');
  const data = await res.json();
  if (data.loggedIn) {
    document.getElementById('login-wrap').style.display = 'none';
    document.getElementById('app').classList.add('on');
    document.getElementById('cur-username').textContent = '👤 ' + data.username;
    loadAll();
  } else {
    document.getElementById('login-wrap').style.display = 'flex';
    document.getElementById('app').classList.remove('on');
  }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Алдаа гарлаа');
    checkAuth();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  }
});

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  checkAuth();
}

document.getElementById('pw-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const currentPassword = document.getElementById('pw-current').value;
  const newPassword = document.getElementById('pw-new').value;
  const errEl = document.getElementById('pw-error');
  const okEl = document.getElementById('pw-success');
  errEl.style.display = 'none'; okEl.style.display = 'none';
  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Алдаа гарлаа');
    okEl.textContent = 'Нууц үг амжилттай шинэчлэгдлээ';
    okEl.style.display = 'block';
    document.getElementById('pw-form').reset();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  }
});

// ============ NAV ============
function showPanel(name, el) {
  document.querySelectorAll('.cpanel').forEach(p => p.classList.remove('on'));
  document.getElementById('panel-' + name).classList.add('on');
  document.querySelectorAll('.snav li').forEach(li => li.classList.remove('on'));
  el.closest('li').classList.add('on');
}

function loadAll() { loadHeroList(); loadNewsList(); loadMemberList(); }

// generic image preview wiring
function wireImagePreview(inputId, previewId, existingUrl) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  preview.innerHTML = existingUrl ? `<img src="${existingUrl}">` : 'Зураггүй';
  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    preview.innerHTML = `<img src="${url}">`;
  };
}

// ============ HERO ============
let heroCache = [];
async function loadHeroList() {
  const res = await fetch('/api/hero');
  heroCache = await res.json();
  const tbody = document.getElementById('hero-tbody');
  if (!heroCache.length) { tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Слайд алга байна</td></tr>'; return; }
  tbody.innerHTML = heroCache.map(s => `
    <tr>
      <td><div class="row-thumb">${s.image ? `<img src="${s.image}">` : '🖼️'}</div></td>
      <td>${escapeHtml(s.title)}</td>
      <td>${escapeHtml(s.tag || '—')}</td>
      <td>${s.sort_order}</td>
      <td class="actions">
        <button class="btn btn-outline btn-sm" onclick="editHero(${s.id})">Засах</button>
        <button class="btn btn-danger btn-sm" onclick="deleteHero(${s.id})">Устгах</button>
      </td>
    </tr>`).join('');
}

function openHeroForm() {
  document.getElementById('hero-form-card').classList.remove('hidden');
  document.getElementById('hero-form-title').textContent = 'Шинэ слайд нэмэх';
  document.getElementById('hero-form').reset();
  document.getElementById('hero-id').value = '';
  wireImagePreview('hero-image', 'hero-img-preview', null);
  document.getElementById('hero-error').style.display = 'none';
  document.getElementById('hero-form-card').scrollIntoView({ behavior: 'smooth' });
}
function closeHeroForm() { document.getElementById('hero-form-card').classList.add('hidden'); }

function editHero(id) {
  const s = heroCache.find(x => x.id === id);
  if (!s) return;
  openHeroForm();
  document.getElementById('hero-form-title').textContent = 'Слайд засах';
  document.getElementById('hero-id').value = s.id;
  document.getElementById('hero-tag').value = s.tag || '';
  document.getElementById('hero-title').value = s.title || '';
  document.getElementById('hero-description').value = s.description || '';
  document.getElementById('hero-gradient').value = s.gradient || '';
  document.getElementById('hero-btn1-text').value = s.btn1_text || '';
  document.getElementById('hero-btn1-target').value = s.btn1_target || 'news';
  document.getElementById('hero-btn2-text').value = s.btn2_text || '';
  document.getElementById('hero-btn2-target').value = s.btn2_target || 'about';
  document.getElementById('hero-sort').value = s.sort_order || 0;
  wireImagePreview('hero-image', 'hero-img-preview', s.image);
}

document.getElementById('hero-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('hero-id').value;
  const fd = new FormData();
  fd.append('tag', document.getElementById('hero-tag').value);
  fd.append('title', document.getElementById('hero-title').value);
  fd.append('description', document.getElementById('hero-description').value);
  fd.append('gradient', document.getElementById('hero-gradient').value);
  fd.append('btn1_text', document.getElementById('hero-btn1-text').value);
  fd.append('btn1_target', document.getElementById('hero-btn1-target').value);
  fd.append('btn2_text', document.getElementById('hero-btn2-text').value);
  fd.append('btn2_target', document.getElementById('hero-btn2-target').value);
  fd.append('sort_order', document.getElementById('hero-sort').value);
  const file = document.getElementById('hero-image').files[0];
  if (file) fd.append('image', file);
  if (document.getElementById('hero-remove-image').checked) fd.append('removeImage', 'true');

  const errEl = document.getElementById('hero-error');
  errEl.style.display = 'none';
  try {
    const res = await fetch(id ? `/api/hero/${id}` : '/api/hero', { method: id ? 'PUT' : 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Алдаа гарлаа');
    closeHeroForm();
    loadHeroList();
  } catch (err) {
    errEl.textContent = err.message; errEl.style.display = 'block';
  }
});

async function deleteHero(id) {
  if (!confirm('Энэ слайдыг устгах уу?')) return;
  await fetch(`/api/hero/${id}`, { method: 'DELETE' });
  loadHeroList();
}

// ============ NEWS ============
let newsCache = [];
async function loadNewsList() {
  const res = await fetch('/api/news');
  newsCache = await res.json();
  const tbody = document.getElementById('news-tbody');
  if (!newsCache.length) { tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Мэдээ алга байна</td></tr>'; return; }
  const typeLabel = { news: 'Мэдээ', event: 'Үйл явдал', pr: 'Мэдэгдэл' };
  tbody.innerHTML = newsCache.map(n => `
    <tr>
      <td><div class="row-thumb">${n.image ? `<img src="${n.image}">` : (n.emoji || '📰')}</div></td>
      <td>${escapeHtml(n.title)}</td>
      <td><span class="tag-pill">${typeLabel[n.type] || n.type}</span></td>
      <td>${n.date}</td>
      <td class="actions">
        <button class="btn btn-outline btn-sm" onclick="editNews(${n.id})">Засах</button>
        <button class="btn btn-danger btn-sm" onclick="deleteNews(${n.id})">Устгах</button>
      </td>
    </tr>`).join('');
}

function openNewsForm() {
  document.getElementById('news-form-card').classList.remove('hidden');
  document.getElementById('news-form-title').textContent = 'Шинэ мэдээ нэмэх';
  document.getElementById('news-form').reset();
  document.getElementById('news-id').value = '';
  document.getElementById('news-emoji').value = '📰';
  wireImagePreview('news-image', 'news-img-preview', null);
  document.getElementById('news-error').style.display = 'none';
  document.getElementById('news-form-card').scrollIntoView({ behavior: 'smooth' });
}
function closeNewsForm() { document.getElementById('news-form-card').classList.add('hidden'); }

function editNews(id) {
  const n = newsCache.find(x => x.id === id);
  if (!n) return;
  openNewsForm();
  document.getElementById('news-form-title').textContent = 'Мэдээ засах';
  document.getElementById('news-id').value = n.id;
  document.getElementById('news-type').value = n.type;
  document.getElementById('news-date').value = n.date;
  document.getElementById('news-title').value = n.title || '';
  document.getElementById('news-summary').value = n.summary || '';
  document.getElementById('news-content').value = n.content || '';
  document.getElementById('news-emoji').value = n.emoji || '📰';
  document.getElementById('news-location').value = n.location || '';
  document.getElementById('news-featured').checked = !!n.featured;
  document.getElementById('news-sort').value = n.sort_order || 0;
  wireImagePreview('news-image', 'news-img-preview', n.image);
}

document.getElementById('news-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('news-id').value;
  const fd = new FormData();
  fd.append('type', document.getElementById('news-type').value);
  fd.append('date', document.getElementById('news-date').value);
  fd.append('title', document.getElementById('news-title').value);
  fd.append('summary', document.getElementById('news-summary').value);
  fd.append('content', document.getElementById('news-content').value);
  fd.append('emoji', document.getElementById('news-emoji').value);
  fd.append('location', document.getElementById('news-location').value);
  fd.append('featured', document.getElementById('news-featured').checked ? '1' : '');
  fd.append('sort_order', document.getElementById('news-sort').value);
  const file = document.getElementById('news-image').files[0];
  if (file) fd.append('image', file);
  if (document.getElementById('news-remove-image').checked) fd.append('removeImage', 'true');

  const errEl = document.getElementById('news-error');
  errEl.style.display = 'none';
  try {
    const res = await fetch(id ? `/api/news/${id}` : '/api/news', { method: id ? 'PUT' : 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Алдаа гарлаа');
    closeNewsForm();
    loadNewsList();
  } catch (err) {
    errEl.textContent = err.message; errEl.style.display = 'block';
  }
});

async function deleteNews(id) {
  if (!confirm('Энэ мэдээг устгах уу?')) return;
  await fetch(`/api/news/${id}`, { method: 'DELETE' });
  loadNewsList();
}

// ============ MEMBERS ============
let memberCache = [];
const groupLabel = { lead: 'Удирдлага', nbd: 'НБД', uih: 'УИХ', nitx: 'НИТХ' };
async function loadMemberList() {
  const res = await fetch('/api/members');
  memberCache = await res.json();
  const tbody = document.getElementById('member-tbody');
  if (!memberCache.length) { tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Гишүүн алга байна</td></tr>'; return; }
  tbody.innerHTML = memberCache.map(m => `
    <tr>
      <td><div class="row-thumb">${m.photo ? `<img src="${m.photo}">` : '👤'}</div></td>
      <td>${escapeHtml(m.name)}</td>
      <td>${escapeHtml(m.role || '—')}</td>
      <td><span class="tag-pill">${groupLabel[m.group_key] || m.group_key}</span></td>
      <td class="actions">
        <button class="btn btn-outline btn-sm" onclick="editMember(${m.id})">Засах</button>
        <button class="btn btn-danger btn-sm" onclick="deleteMember(${m.id})">Устгах</button>
      </td>
    </tr>`).join('');
}

function openMemberForm() {
  document.getElementById('member-form-card').classList.remove('hidden');
  document.getElementById('member-form-title').textContent = 'Шинэ гишүүн нэмэх';
  document.getElementById('member-form').reset();
  document.getElementById('member-id').value = '';
  wireImagePreview('member-photo', 'member-img-preview', null);
  document.getElementById('member-error').style.display = 'none';
  document.getElementById('member-form-card').scrollIntoView({ behavior: 'smooth' });
}
function closeMemberForm() { document.getElementById('member-form-card').classList.add('hidden'); }

function editMember(id) {
  const m = memberCache.find(x => x.id === id);
  if (!m) return;
  openMemberForm();
  document.getElementById('member-form-title').textContent = 'Гишүүн засах';
  document.getElementById('member-id').value = m.id;
  document.getElementById('member-group').value = m.group_key;
  document.getElementById('member-name').value = m.name || '';
  document.getElementById('member-role').value = m.role || '';
  document.getElementById('member-description').value = m.description || '';
  document.getElementById('member-sort').value = m.sort_order || 0;
  wireImagePreview('member-photo', 'member-img-preview', m.photo);
}

document.getElementById('member-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('member-id').value;
  const fd = new FormData();
  fd.append('group_key', document.getElementById('member-group').value);
  fd.append('name', document.getElementById('member-name').value);
  fd.append('role', document.getElementById('member-role').value);
  fd.append('description', document.getElementById('member-description').value);
  fd.append('sort_order', document.getElementById('member-sort').value);
  const file = document.getElementById('member-photo').files[0];
  if (file) fd.append('photo', file);
  if (document.getElementById('member-remove-photo').checked) fd.append('removePhoto', 'true');

  const errEl = document.getElementById('member-error');
  errEl.style.display = 'none';
  try {
    const res = await fetch(id ? `/api/members/${id}` : '/api/members', { method: id ? 'PUT' : 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Алдаа гарлаа');
    closeMemberForm();
    loadMemberList();
  } catch (err) {
    errEl.textContent = err.message; errEl.style.display = 'block';
  }
});

async function deleteMember(id) {
  if (!confirm('Энэ гишүүнийг устгах уу?')) return;
  await fetch(`/api/members/${id}`, { method: 'DELETE' });
  loadMemberList();
}

// ============ UTIL ============
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

checkAuth();
