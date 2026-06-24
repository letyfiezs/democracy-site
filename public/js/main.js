/* ═══════════════════════════════════════
   АРДЧИЛСАН НАМ — Frontend (API-driven)
   ═══════════════════════════════════════ */

// ── PAGE NAV ──────────────────────────────────
const navMap = {
  home: 0, about: 1, ideology: 1, rules: 1,
  members: 1, memberdetail: 1,
  news: 2, newsdetail: 2,
  branch: 3, branchdetail: 3, finance: 4
};

function go(name) {
  document.querySelectorAll('.pg').forEach(p => p.classList.remove('on'));
  const pg = document.getElementById('pg-' + name);
  if (pg) pg.classList.add('on');
  document.querySelectorAll('nav>ul>li').forEach(li => li.classList.remove('act'));
  const idx = navMap[name];
  if (idx !== undefined) {
    const items = document.querySelectorAll('nav>ul>li');
    if (items[idx]) items[idx].classList.add('act');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── HERO ──────────────────────────────────────
let heroSlides = [];
let heroIdx = 0;
let heroTimer = null;

function renderHero() {
  if (!heroSlides.length) return;
  const main = heroSlides[heroIdx];
  const mainEl = document.getElementById('hero-main');
  const sidEl  = document.getElementById('hero-side');

  const mainBg = main.image
    ? `background-image:url('${main.image}')`
    : `background:${main.gradient || 'linear-gradient(150deg,#0d3a8e,#1a4db5)'}`;

  mainEl.className = 'hcard';
  mainEl.style.cssText = mainBg;
  mainEl.onclick = e => { if (!e.target.closest('button')) go(main.btn1_target || 'news'); };
  mainEl.innerHTML = `
    <div class="hcard-body">
      ${main.tag ? `<div class="htag">${main.tag}</div>` : ''}
      <h1>${main.title}</h1>
      ${main.description ? `<p>${main.description}</p>` : ''}
      ${main.btn1_text ? `<button class="hbtn" onclick="event.stopPropagation();go('${main.btn1_target||'news'}')">${main.btn1_text} →</button>` : ''}
      ${heroSlides.length > 1 ? `<div class="hdots">${heroSlides.map((_,i) =>
        `<div class="hdot${i===heroIdx?' on':''}" onclick="event.stopPropagation();goslide(${i})"></div>`
      ).join('')}</div>` : ''}
    </div>`;

  if (heroSlides.length > 1) {
    const others = heroSlides.filter((_, i) => i !== heroIdx).slice(0, 2);
    sidEl.innerHTML = others.map(s => {
      const i = heroSlides.indexOf(s);
      const bg = s.image ? `background-image:url('${s.image}')` : `background:${s.gradient||'linear-gradient(150deg,#0d3a8e,#1a4db5)'}`;
      return `<div class="hcard-side" style="${bg}" onclick="goslide(${i})">
        <div class="hcs-body">
          ${s.tag ? `<div class="hcs-cat">${s.tag}</div>` : ''}
          <h4>${s.title}</h4>
        </div>
      </div>`;
    }).join('');
  } else {
    sidEl.innerHTML = '';
  }
}

function goslide(n) {
  if (!heroSlides.length) return;
  heroIdx = (n + heroSlides.length) % heroSlides.length;
  renderHero();
}
function slide(d) { goslide(heroIdx + d); }

async function loadHero() {
  try {
    const res = await fetch('/api/hero');
    heroSlides = await res.json();
    if (!heroSlides.length) {
      const el = document.getElementById('hero-main');
      el.className = 'hcard';
      el.style.background = 'linear-gradient(150deg,#0d3a8e,#1a4db5)';
      el.innerHTML = '<div class="hcard-body"><h1>Ардчилсан Нам</h1></div>';
      document.getElementById('hero-side').innerHTML = '';
      return;
    }
    heroIdx = 0;
    renderHero();
    if (heroSlides.length > 1) {
      heroTimer = setInterval(() => slide(1), 6000);
    }
  } catch (e) { console.error('Hero load failed', e); }
}

// ── HELPERS ───────────────────────────────────
let newsCache = [];
let membersCache = [];

function esc(s) {
  if (!s) return '';
  return s.replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n).trim() + '…' : s;
}
function fmtDate(d) {
  if (!d) return '';
  return d.replace(/-/g, '/');
}
function evtBadge(d) {
  const dt = new Date(d + 'T00:00:00');
  if (isNaN(dt)) return { day: '--', my: '--' };
  return {
    day: String(dt.getDate()).padStart(2, '0'),
    my: String(dt.getMonth()+1).padStart(2,'0') + '/' + String(dt.getFullYear()).slice(-2)
  };
}
function thumbHtml(item, cls) {
  return item.image
    ? `<div class="${cls}"><img src="${item.image}" alt=""></div>`
    : `<div class="${cls}">${item.emoji || '📰'}</div>`;
}
function typeLbl(t) {
  return t === 'event' ? 'ҮЙЛ ЯВДАЛ' : t === 'pr' ? 'МЭДЭГДЭЛ' : 'МЭДЭЭ';
}

// ── NEWS ──────────────────────────────────────
async function loadNews() {
  try {
    const res = await fetch('/api/news');
    newsCache = await res.json();
    renderHomeNews();
    renderHomeEvents();
    renderNewsPage();
  } catch (e) { console.error('News load failed', e); }
}

function renderHomeNews() {
  const gen = newsCache.filter(n => n.type === 'news');
  const grid = document.getElementById('home-news-grid');
  if (!gen.length) { grid.innerHTML = '<div class="empty-state">Одоогоор мэдээ алга байна.</div>'; return; }
  const feat = gen.find(n => n.featured) || gen[0];
  const rest = gen.filter(n => n.id !== feat.id).slice(0, 4);
  grid.innerHTML = `
    <div class="nc nbig" onclick="openNews(${feat.id})">
      ${thumbHtml(feat, 'nth')}
      <div class="nb">
        <div class="nm"><span class="ncat">${typeLbl(feat.type)}</span><span class="ndate">${fmtDate(feat.date)}</span></div>
        <div class="ntitle">${feat.title}</div>
        ${feat.summary ? `<div class="nsummary">${truncate(feat.summary, 120)}</div>` : ''}
      </div>
    </div>
    <div class="nsl">
      ${rest.map(n => `
        <div class="ns" onclick="openNews(${n.id})">
          ${thumbHtml(n, 'nsth')}
          <div class="nsbody">
            <div class="nsdate">${fmtDate(n.date)}</div>
            <div class="nstitle">${n.title}</div>
          </div>
        </div>`).join('')}
    </div>`;
}

function renderHomeEvents() {
  const evts = newsCache.filter(n => n.type === 'event').slice(0, 4);
  const el = document.getElementById('home-events');
  if (!evts.length) { el.innerHTML = '<div class="empty-state">Үйл явдал алга байна.</div>'; return; }
  el.innerHTML = evts.map(ev => {
    const b = evtBadge(ev.date);
    return `<div class="ev" onclick="openNews(${ev.id})">
      <div class="evd"><div class="d">${b.day}</div><div class="m">${b.my}</div></div>
      <div class="evb">
        <h4>${ev.title}</h4>
        <p>${ev.location ? ev.location : 'Үйл явдал'}</p>
      </div>
    </div>`;
  }).join('');
}

function renderNewsPage() {
  // All
  document.querySelector('#nt-all .ng').innerHTML = newsCache.length
    ? newsCache.map(n => `
        <div class="nc" onclick="openNews(${n.id})">
          ${thumbHtml(n, 'nth')}
          <div class="nb">
            <div class="nm"><span class="ncat">${typeLbl(n.type)}</span><span class="ndate">${fmtDate(n.date)}</span></div>
            <div class="ntitle">${n.title}</div>
          </div>
        </div>`).join('')
    : '<div class="empty-state">Мэдээ алга байна.</div>';

  // Events
  const evts = newsCache.filter(n => n.type === 'event');
  document.querySelector('#nt-ev .evl').innerHTML = evts.length
    ? evts.map(ev => {
        const b = evtBadge(ev.date);
        return `<div class="ev" onclick="openNews(${ev.id})">
          <div class="evd"><div class="d">${b.day}</div><div class="m">${b.my}</div></div>
          <div class="evb"><h4>${ev.title}</h4><p>${ev.location||'Үйл явдал'}</p></div>
        </div>`;
      }).join('')
    : '<div class="empty-state">Үйл явдал алга байна.</div>';

  // Press releases
  const pr = newsCache.filter(n => n.type === 'pr');
  document.querySelector('#nt-pr .ng').innerHTML = pr.length
    ? pr.map(n => `
        <div class="nc" onclick="openNews(${n.id})">
          ${thumbHtml(n, 'nth')}
          <div class="nb">
            <div class="nm"><span class="ncat" style="color:var(--red)">${typeLbl(n.type)}</span><span class="ndate">${fmtDate(n.date)}</span></div>
            <div class="ntitle">${n.title}</div>
          </div>
        </div>`).join('')
    : '<div class="empty-state">Мэдэгдэл алга байна.</div>';
}

function openNews(id) {
  const item = newsCache.find(n => String(n.id) === String(id));
  if (!item) return go('news');
  document.getElementById('nd-title').textContent = item.title;
  document.getElementById('nd-date').textContent = fmtDate(item.date) + (item.location ? ' · ' + item.location : '');
  const img = item.image ? `<img src="${item.image}" style="width:100%;border-radius:10px;margin-bottom:20px">` : '';
  const body = item.content
    ? item.content.replace(/\n/g, '<br>')
    : (item.summary || 'Дэлгэрэнгүй мэдээлэл удахгүй нэмэгдэнэ.');
  document.getElementById('nd-body').innerHTML = img + `<p>${body}</p>`;
  go('newsdetail');
}

// ── MEMBERS ───────────────────────────────────
async function loadMembers() {
  try {
    const res = await fetch('/api/members');
    membersCache = await res.json();
    ['lead','nbd','uih','nitx'].forEach(g => renderMemberGroup(g));
  } catch(e) { console.error('Members load failed', e); }
}

function renderMemberGroup(g) {
  const list = membersCache.filter(m => m.group_key === g);
  const el = document.getElementById('mg-' + g);
  if (!list.length) { el.innerHTML = '<div class="empty-state">Гишүүн алга байна.</div>'; return; }
  el.innerHTML = list.map(m => `
    <div class="mcard" onclick="openMember(${m.id})">
      <div class="mph">
        ${m.photo ? `<img src="${m.photo}" alt="">` : '👤'}
      </div>
      <div class="minfo">
        <div class="mname">${m.name}</div>
        <div class="mrole">${m.role || ''}</div>
        ${m.description ? `<div class="mdesc">${truncate(m.description, 100)}</div>` : ''}
      </div>
    </div>`).join('');
}

function openMember(id) {
  const m = membersCache.find(x => String(x.id) === String(id));
  if (!m) return go('members');
  document.getElementById('md-name').textContent = m.name;
  document.getElementById('md-name2').textContent = m.name;
  document.getElementById('md-role-top').textContent = m.role || '';
  document.getElementById('md-role2').textContent = m.role || '';
  document.getElementById('md-photo').innerHTML = m.photo
    ? `<img src="${m.photo}" alt="">`
    : '👤';
  document.getElementById('md-description').innerHTML = m.description
    ? m.description.replace(/\n/g, '<br>')
    : '<span style="color:var(--gray)">Намтар мэдээлэл удахгүй нэмэгдэнэ.</span>';
  go('memberdetail');
}

function goTab(group) {
  go('members');
  setTimeout(() => {
    document.querySelectorAll('#pg-members .tpanel').forEach(p => p.classList.remove('on'));
    document.querySelectorAll('.mtab').forEach(x => x.classList.remove('on'));
    const panel = document.getElementById('ml-' + group);
    if (panel) panel.classList.add('on');
    const btn = document.querySelector(`.mtab[onclick*="'${group}'"]`);
    if (btn) btn.classList.add('on');
  }, 10);
}

// function goTab(group) {
//   go('branch');
//   setTimeout(() => {
//     document.querySelectorAll('#pg-branch .tpanel').forEach(p => p.classList.remove('on'));
//     document.querySelectorAll('.mtab').forEach(x => x.classList.remove('on'));
//     const panel = document.getElementById('ml-' + group);
//     if (panel) panel.classList.add('on');
//     const btn = document.querySelector(`.btab[onclick*="'${group}'"]`);
//     if (btn) btn.classList.add('on');
//   }, 10);
// }



// ── BRANCHES ──────────────────────────────────
let branchesCache = [];

async function loadBranches() {
  try {
    const res = await fetch('/api/branches');
    branchesCache = await res.json();
    renderBranchGrid('bag', 'branch-bag-grid');
    renderBranchGrid('sum', 'branch-sum-grid');
    renderBranchGrid('org', 'branch-org-grid');
  } catch (e) { console.error('Branches load failed', e); }
}

function renderBranchGrid(type, gridId) {
  const list = branchesCache.filter(b => b.type === type);
  const el = document.getElementById(gridId);
  if (!el) return;
  if (!list.length) {
    el.innerHTML = '<div class="empty-state">Мэдээлэл алга байна.</div>';
    return;
  }
  const emoji = type === 'bag' ? '🏘️' : type === 'sum' ? '🗺️' : '🏛️';
  if (type === 'org') {
    el.style.cssText = 'display:flex;flex-direction:column;gap:12px;max-width:600px';
    el.innerHTML = list.map(b => `
      <div onclick="openBranch(${b.id})" style="cursor:pointer;padding:18px;border:1px solid var(--border);border-radius:10px;display:flex;align-items:center;gap:14px;transition:box-shadow .2s" onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,.1)'" onmouseout="this.style.boxShadow=''">
        <span style="font-size:22px">${b.image ? `<img src="${b.image}" style="width:36px;height:36px;object-fit:cover;border-radius:6px">` : emoji}</span>
        <div>
          <strong style="font-size:14px">${esc(b.name)}</strong>
          ${b.description ? `<div style="font-size:12px;color:var(--gray);margin-top:3px">${truncate(b.description,80)}</div>` : ''}
        </div>
      </div>`).join('');
  } else {
    el.style.cssText = '';
    el.innerHTML = list.map(b => `
      <div class="nc" onclick="openBranch(${b.id})" style="cursor:pointer">
        <div class="ntz" style="font-size:36px">
          ${b.image ? `<img src="${b.image}" alt="">` : emoji}
        </div>
        <div class="nb">
          <div class="ntitlez" style="margin-top:8px">${esc(b.name)}</div>
          ${b.description ? `<div style="font-size:12px;color:var(--gray);margin-top:4px">${truncate(b.description,60)}</div>` : ''}
        </div>
      </div>`).join('');
  }
}

async function openBranch(id) {
  try {
    const res = await fetch('/api/branches/' + id);
    const b = await res.json();
    document.getElementById('brd-name').textContent = b.name;
    document.getElementById('brd-name2').textContent = b.name;
    document.getElementById('brd-name3').textContent = b.name;
    document.getElementById('brd-type').textContent = b.type === 'bag' ? 'Баг — Намын хороо' : b.type === 'sum' ? 'Сум — Намын хороо' : 'Дэргэдэх байгууллага';
    document.getElementById('brd-photo').innerHTML = b.image
      ? `<img src="${b.image}" alt="">`
      : (b.type === 'bag' ? '🏘️' : b.type === 'sum' ? '🗺️' : '🏛️');
    document.getElementById('brd-description').innerHTML = b.description
      ? b.description.replace(/\n/g, '<br>')
      : '<span style="color:var(--gray)">Тайлбар удахгүй нэмэгдэнэ.</span>';

    const grid = document.getElementById('brd-members-grid');
    const section = document.getElementById('brd-members-section');
    if (b.members && b.members.length) {
      section.style.display = 'block';
      grid.innerHTML = b.members.map(m => `
        <div class="mcard">
          <div class="mph">
            ${m.photo ? `<img src="${m.photo}" alt="">` : '👤'}
          </div>
          <div class="minfo">
            <div class="mname">${esc(m.name)}</div>
            <div class="mrole">${esc(m.role || '')}</div>
            ${m.date ? `<div style="font-size:11px;color:var(--gray);margin-top:2px">📅 ${m.date}</div>` : ''}
            ${m.description ? `<div class="mdesc">${truncate(m.description, 120)}</div>` : ''}
          </div>
        </div>`).join('');
    } else {
      section.style.display = 'none';
    }
    go('branchdetail');
  } catch (e) { console.error('Branch load failed', e); }
}

// ── STATIC PAGE HELPERS ───────────────────────
function tog(h) {
  h.classList.toggle('open');
  h.nextElementSibling.classList.toggle('open');
}
function ntab(n, b) {
  document.querySelectorAll('#pg-news .tpanel').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('#pg-news .tbtn').forEach(x => x.classList.remove('on'));
  document.getElementById('nt-' + n).classList.add('on'); b.classList.add('on');
}
function btab(n, b) {
  document.querySelectorAll('#pg-branch .tpanel').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('#pg-branch .tbtn').forEach(x => x.classList.remove('on'));
  document.getElementById('bt-' + n).classList.add('on'); b.classList.add('on');
}
function mTab(n, b) {
  document.querySelectorAll('#pg-members .tpanel').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.mtab').forEach(x => x.classList.remove('on'));
  document.getElementById('ml-' + n).classList.add('on'); b.classList.add('on');
}

// ── INIT ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadHero();
  loadNews();
  loadMembers();
  loadBranches();
});
