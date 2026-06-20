// ============ PAGE NAV ============
const navMap = { home: 0, about: 1, ideology: 1, rules: 1, members: 1, memberdetail: 1, news: 2, newsdetail: 2, branch: 3, finance: 4 };
function go(name) {
  document.querySelectorAll('.pg').forEach(p => p.classList.remove('on'));
  const target = document.getElementById('pg-' + name);
  if (target) target.classList.add('on');
  document.querySelectorAll('nav>ul>li').forEach(l => l.classList.remove('act'));
  const idx = navMap[name];
  if (idx !== undefined) {
    const items = document.querySelectorAll('nav>ul>li');
    if (items[idx]) items[idx].classList.add('act');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openNews(id) {
  const item = window.__newsCache.find(n => String(n.id) === String(id));
  if (!item) return go('news');
  document.getElementById('nd-title').textContent = (typeIcon(item.type)) + ' ' + item.title;
  document.getElementById('nd-date').textContent = formatDate(item.date) + (item.location ? ' • ' + item.location : '');
  const img = item.image ? `<img src="${item.image}" style="width:100%;border-radius:8px;margin-bottom:18px">` : '';
  const content = item.content ? item.content.replace(/\n/g, '<br>') : (item.summary || '');
  document.getElementById('nd-body').innerHTML = img + `<p>${content || 'Дэлгэрэнгүй мэдээлэл удахгүй нэмэгдэнэ.'}</p>`;
  go('newsdetail');
}

function typeIcon(t) { return t === 'event' ? '📅' : t === 'pr' ? '📣' : '📰'; }

// ============ HERO SLIDER ============
let si = 0;
let slideCount = 0;
function goslide(n) {
  if (slideCount === 0) return;
  si = (n + slideCount) % slideCount;
  document.getElementById('hsl').style.transform = `translateX(-${si * 100}%)`;
  document.querySelectorAll('.hdot').forEach((d, i) => d.classList.toggle('on', i === si));
}
function slide(d) { goslide(si + d); }
let sliderTimer = null;
function startSliderTimer() {
  if (sliderTimer) clearInterval(sliderTimer);
  sliderTimer = setInterval(() => slide(1), 5500);
}

async function loadHero() {
  try {
    const res = await fetch('/api/hero');
    const slides = await res.json();
    const hsl = document.getElementById('hsl');
    const dots = document.getElementById('hdots');
    if (!slides.length) {
      hsl.innerHTML = `<div class="hslide" style="background:linear-gradient(135deg,#001f5c,#1565c0)"><div class="hi"><h1>Ардчилсан Нам</h1></div></div>`;
      dots.innerHTML = '';
      slideCount = 1;
      return;
    }
    slideCount = slides.length;
    hsl.innerHTML = slides.map(s => {
      const bg = s.image ? `style="background-image:url('${s.image}')"` : (s.gradient ? `style="background:${s.gradient}"` : '');
      const cls = s.image ? 'hslide has-img' : 'hslide';
      const btns = [];
      if (s.btn1_text) btns.push(`<button class="btn btn-g" onclick="go('${s.btn1_target || 'news'}')">${s.btn1_text}</button>`);
      if (s.btn2_text) btns.push(`<button class="btn btn-w" onclick="go('${s.btn2_target || 'about'}')">${s.btn2_text}</button>`);
      return `<div class="${cls}" ${bg}><div class="hi">
        ${s.tag ? `<div class="htag">${s.tag}</div>` : ''}
        <h1>${s.title}</h1>
        ${s.description ? `<p>${s.description}</p>` : ''}
        ${btns.length ? `<div class="hbtns">${btns.join('')}</div>` : ''}
      </div></div>`;
    }).join('');
    dots.innerHTML = slides.map((_, i) => `<div class="hdot${i === 0 ? ' on' : ''}" onclick="goslide(${i})"></div>`).join('');
    si = 0;
    startSliderTimer();
  } catch (e) {
    console.error('Hero load failed', e);
  }
}

// ============ ACCORDION / TABS (static pages) ============
function tog(h) { h.classList.toggle('open'); h.nextElementSibling.classList.toggle('open'); }
function btab(n, b) {
  document.querySelectorAll('#pg-branch .tpanel').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('#pg-branch .tbtn').forEach(x => x.classList.remove('on'));
  document.getElementById('bt-' + n).classList.add('on'); b.classList.add('on');
}
function ntab(n, b) {
  document.querySelectorAll('#pg-news .tpanel').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('#pg-news .tbtn').forEach(x => x.classList.remove('on'));
  document.getElementById('nt-' + n).classList.add('on'); b.classList.add('on');
}
function mTab(n, b) {
  document.querySelectorAll('#pg-members .tpanel').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.mtab').forEach(x => x.classList.remove('on'));
  document.getElementById('ml-' + n).classList.add('on'); b.classList.add('on');
}

// ============ HELPERS ============
function formatDate(d) {
  if (!d) return '';
  const parts = d.split('-');
  if (parts.length === 3) return `${parts[0]}/${parts[1]}/${parts[2]}`;
  return d;
}
function eventBadge(d) {
  const dt = new Date(d + 'T00:00:00');
  if (isNaN(dt)) return { day: '--', my: '--' };
  const day = String(dt.getDate()).padStart(2, '0');
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const year = String(dt.getFullYear()).slice(-2);
  return { day, my: `${month}/${year}` };
}
function thumb(item, sizeClass) {
  if (item.image) return `<div class="${sizeClass}"><img src="${item.image}" alt=""></div>`;
  return `<div class="${sizeClass}">${item.emoji || '📰'}</div>`;
}

// ============ NEWS ============
async function loadNews() {
  try {
    const res = await fetch('/api/news');
    const items = await res.json();
    window.__newsCache = items;
    renderHomeNews(items);
    renderHomeEvents(items);
    renderNewsPage(items);
  } catch (e) {
    console.error('News load failed', e);
  }
}

function renderHomeNews(items) {
  const general = items.filter(n => n.type === 'news');
  const grid = document.getElementById('home-news-grid');
  if (!general.length) { grid.innerHTML = '<div class="empty-state">Одоогоор мэдээ алга байна.</div>'; return; }
  const featured = general.find(n => n.featured) || general[0];
  const rest = general.filter(n => n.id !== featured.id).slice(0, 4);
  grid.innerHTML = `
    <div class="nc nbig" onclick="openNews(${featured.id})">
      ${thumb(featured, 'nth')}
      <div class="nb"><div class="nm"><span class="ncat">МЭДЭЭ</span><span class="ndate">${formatDate(featured.date)}</span></div><div class="ntitle">${featured.title}</div></div>
    </div>
    <div class="nsl">
      ${rest.map(n => `
        <div class="ns" onclick="openNews(${n.id})">
          ${thumb(n, 'nsth')}
          <div class="nsbody"><div class="nsdate">${formatDate(n.date)}</div><div class="nstitle">${n.title}</div></div>
        </div>`).join('')}
    </div>`;
}

function renderHomeEvents(items) {
  const events = items.filter(n => n.type === 'event').slice(0, 4);
  const el = document.getElementById('home-events');
  if (!events.length) { el.innerHTML = '<div class="empty-state">Одоогоор үйл явдал алга байна.</div>'; return; }
  el.innerHTML = events.map(ev => {
    const b = eventBadge(ev.date);
    return `<div class="ev" onclick="openNews(${ev.id})">
      <div class="evd"><div class="d">${b.day}</div><div class="m">${b.my}</div></div>
      <div class="evb"><h4>${ev.title}</h4><p>Үйл явдал${ev.location ? ' • ' + ev.location : ''}</p></div>
    </div>`;
  }).join('');
}

function renderNewsPage(items) {
  const all = items;
  const allGrid = document.querySelector('#nt-all .ng');
  allGrid.innerHTML = all.length ? all.map(n => `
    <div class="nc" onclick="openNews(${n.id})">
      ${thumb(n, 'nth')}
      <div class="nb"><div class="nm"><span class="ncat" ${n.type === 'pr' ? 'style="background:#8b0000"' : ''}>${n.type === 'pr' ? 'МЭДЭГДЭЛ' : n.type === 'event' ? 'ҮЙЛ ЯВДАЛ' : 'МЭДЭЭ'}</span><span class="ndate">${formatDate(n.date)}</span></div><div class="ntitle">${n.title}</div></div>
    </div>`).join('') : '<div class="empty-state">Мэдээ алга байна.</div>';

  const events = items.filter(n => n.type === 'event');
  const evList = document.querySelector('#nt-ev .evl');
  evList.innerHTML = events.length ? events.map(ev => {
    const b = eventBadge(ev.date);
    return `<div class="ev" onclick="openNews(${ev.id})">
      <div class="evd"><div class="d">${b.day}</div><div class="m">${b.my}</div></div>
      <div class="evb"><h4>${ev.title}</h4><p>Үйл явдал${ev.location ? ' • ' + ev.location : ''}</p></div>
    </div>`;
  }).join('') : '<div class="empty-state">Үйл явдал алга байна.</div>';

  const pr = items.filter(n => n.type === 'pr');
  const prGrid = document.querySelector('#nt-pr .ng');
  prGrid.innerHTML = pr.length ? pr.map(n => `
    <div class="nc" onclick="openNews(${n.id})">
      ${thumb(n, 'nth')}
      <div class="nb"><div class="nm"><span class="ncat" style="background:#8b0000">МЭДЭГДЭЛ</span><span class="ndate">${formatDate(n.date)}</span></div><div class="ntitle">${n.title}</div></div>
    </div>`).join('') : '<div class="empty-state">Мэдэгдэл алга байна.</div>';
}

// ============ MEMBERS ============
let membersCache = [];
async function loadMembers() {
  try {
    const res = await fetch('/api/members');
    const items = await res.json();
    membersCache = items;
    ['lead', 'nbd', 'uih', 'nitx'].forEach(g => {
      const list = items.filter(m => m.group_key === g);
      const el = document.querySelector(`#ml-${g} .mslider`);
      el.innerHTML = list.length ? list.map(m => `
        <div class="mcard" onclick="openMember(${m.id})">
          ${m.photo ? `<div class="mph"><img src="${m.photo}" alt=""></div>` : `<div class="mph">👤</div>`}
          <div class="mname">${m.name}</div>
          <div class="mrole">${m.role || ''}</div>
          ${m.description ? `<div class="mlink">Дэлгэрэнгүй →</div>` : ''}
        </div>`).join('') : '<div class="empty-state">Гишүүн алга байна.</div>';
    });
  } catch (e) {
    console.error('Members load failed', e);
  }
}

function openMember(id) {
  const m = membersCache.find(x => String(x.id) === String(id));
  if (!m) return go('members');
  document.getElementById('md-name').textContent = m.name;
  document.getElementById('md-name2').textContent = m.name;
  document.getElementById('md-role').textContent = m.role || '';
  document.getElementById('md-role2').textContent = m.role || '';
  document.getElementById('md-photo').innerHTML = m.photo ? `<img src="${m.photo}" alt="">` : '👤';
  document.getElementById('md-description').innerHTML = m.description
    ? m.description.replace(/\n/g, '<br>')
    : '<span style="color:var(--gray)">Намтар мэдээлэл удахгүй нэмэгдэнэ.</span>';
  go('memberdetail');
}

// ============ INIT ============
window.__newsCache = [];
document.addEventListener('DOMContentLoaded', () => {
  loadHero();
  loadNews();
  loadMembers();
});
