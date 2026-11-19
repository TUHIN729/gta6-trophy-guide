// Leonida Legend — an offline tracker and guide for the 55 GTA VI trophies.
// Progress lives in localStorage under one key, so ticks survive a reload and
// the whole app still works with the network off: the only fetch is the local
// trophies.json, and there are no external requests anywhere in the app.
const KEY = 'leonida-legend-progress-v1';
const SPOILER_KEY = 'leonida-legend-spoiler-free';

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;

let earned = new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]').filter((id) => trophies.some((t) => t.id === id)));
let spoilerFree = localStorage.getItem(SPOILER_KEY) === '1';

const $ = (id) => document.getElementById(id);
const listEl = $('trophyList');
const params = new URLSearchParams(location.search);

// Roadmap phases: story first, then the 100% grind, then side strands and cleanup.
const PHASES = {
  1: (t) => t.kind === 'story' || t.id === 28,
  2: (t) => t.id === 14 || t.kind === 'collectible' || t.kind === 'activity',
  3: (t) => t.kind === 'side' || (t.kind === 'misc' && t.id !== 1),
};
function phaseOf(t) {
  if (t.id === 1) return 0;
  for (const [n, test] of Object.entries(PHASES)) if (test(t)) return Number(n);
  return 3;
}

function save() {
  localStorage.setItem(KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

function isUnconfirmed(t) {
  return t.unconfirmed === true;
}

function badge(text, cls) {
  const s = document.createElement('span');
  s.className = `badge ${cls}`;
  s.textContent = text;
  return s;
}

function renderProgress() {
  const total = trophies.length;
  const done = trophies.filter((t) => earned.has(t.id)).length;
  const pct = Math.round((done / total) * 100);
  $('progressText').textContent = `${done} of ${total} earned — ${pct}%`;
  $('progressFill').style.width = `${pct}%`;
  $('progressBar').setAttribute('aria-valuenow', String(done));
  $('gradeCounts').textContent = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => {
      const all = trophies.filter((t) => t.grade === g).length;
      const got = trophies.filter((t) => t.grade === g && earned.has(t.id)).length;
      return `${g} ${got}/${all}`;
    })
    .join(' · ');
  const rest = trophies.filter((t) => t.id !== 1 && !earned.has(t.id)).length;
  $('platinumState').textContent = rest === 0 ? 'Platinum earned!' : `${rest} of 54 to go`;
  for (const [n] of Object.entries(PHASES)) {
    const inPhase = trophies.filter((t) => phaseOf(t) === Number(n));
    const got = inPhase.filter((t) => earned.has(t.id)).length;
    const slot = document.querySelector(`[data-phase="${n}"]`);
    if (slot) slot.textContent = `${got}/${inPhase.length} earned: ${inPhase.map((t) => t.name).join(', ')}`;
  }
}

function visible(t) {
  const q = $('search').value.trim().toLowerCase();
  if (q && !(t.name + ' ' + t.description + ' ' + t.guide).toLowerCase().includes(q)) return false;
  if ($('grade').value !== 'all' && t.grade !== $('grade').value) return false;
  if ($('kind').value !== 'all' && t.kind !== $('kind').value) return false;
  if ($('earnedFilter').value === 'earned' && !earned.has(t.id)) return false;
  if ($('earnedFilter').value === 'unearned' && earned.has(t.id)) return false;
  if ($('missableOnly').checked && !t.missable) return false;
  // Spoiler-free mode hides story trophies that have not been earned yet.
  if (spoilerFree && t.kind === 'story' && !earned.has(t.id)) return false;
  return true;
}

function renderList() {
  const shown = trophies.filter(visible);
  listEl.replaceChildren();
  for (const t of shown) {
    const li = document.createElement('li');
    li.className = 'trophy' + (earned.has(t.id) ? ' earned' : '');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.id);
    box.setAttribute('aria-label', `Mark ${t.name} as earned`);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.id);
      else earned.delete(t.id);
      save();
      renderProgress();
      renderList();
    });
    const body = document.createElement('div');
    const h = document.createElement('h3');
    h.textContent = t.name;
    h.addEventListener('click', () => openDetail(t));
    const desc = document.createElement('p');
    desc.className = 'desc';
    desc.textContent = t.description;
    const preview = document.createElement('p');
    preview.className = 'guide-preview';
    preview.textContent = t.guide.length > 220 ? t.guide.slice(0, 220) + '…' : t.guide;
    const badges = document.createElement('div');
    badges.className = 'badges';
    badges.append(badge(t.grade, t.grade), badge(t.kind, ''));
    if (t.missable) badges.append(badge('Potentially missable', 'missable'));
    if (t.hidden) badges.append(badge('Hidden', 'hidden'));
    if (isUnconfirmed(t)) badges.append(badge('Unconfirmed method', 'unconfirmed'));
    body.append(h, desc, preview, badges);
    const dot = document.createElement('span');
    dot.className = `grade-dot ${t.grade}`;
    dot.textContent = '◆';
    dot.setAttribute('aria-hidden', 'true');
    li.append(box, body, dot);
    listEl.append(li);
  }
  $('emptyState').hidden = shown.length !== 0;
  $('resultCount').textContent = `Showing ${shown.length} of ${trophies.length} trophies`;
}

function sourceList(el, urls) {
  // Sources are cited as plain text (domain + page title), not links:
  // the app must work fully offline and load nothing from the network.
  el.replaceChildren();
  for (const url of urls) {
    const li = document.createElement('li');
    li.textContent = url;
    el.append(li);
  }
}

let detailTrophy = null;
function openDetail(t) {
  detailTrophy = t;
  $('detailGrade').textContent = `${t.grade} · ${t.kind}`;
  $('detailName').textContent = t.name;
  $('detailDesc').textContent = t.description;
  const flags = $('detailFlags');
  flags.replaceChildren();
  if (t.missable) flags.append(badge('Potentially missable', 'missable'));
  if (t.hidden) flags.append(badge('Hidden until earned', 'hidden'));
  if (isUnconfirmed(t)) flags.append(badge('Unlock method unconfirmed', 'unconfirmed'));
  $('detailGuide').textContent = t.guide;
  sourceList($('detailSources'), t.sources ?? doc.sources ?? []);
  const box = $('detailEarned');
  box.checked = earned.has(t.id);
  $('detailOverlay').hidden = false;
}
function closeDetail() {
  $('detailOverlay').hidden = true;
  detailTrophy = null;
}
$('detailClose').addEventListener('click', closeDetail);
$('detailOverlay').addEventListener('click', (e) => {
  if (e.target === $('detailOverlay')) closeDetail();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeDetail();
});
$('detailEarned').addEventListener('change', (e) => {
  if (!detailTrophy) return;
  if (e.target.checked) earned.add(detailTrophy.id);
  else earned.delete(detailTrophy.id);
  save();
  renderProgress();
  renderList();
});

function showView(name) {
  for (const v of ['Checklist', 'Roadmap', 'About']) {
    $('view' + v).hidden = v !== name;
    $('tab' + v).classList.toggle('active', v === name);
    $('tab' + v).removeAttribute('aria-current');
  }
  $('tab' + name).setAttribute('aria-current', 'page');
}
$('tabChecklist').addEventListener('click', () => showView('Checklist'));
$('tabRoadmap').addEventListener('click', () => showView('Roadmap'));
$('tabAbout').addEventListener('click', () => showView('About'));

$('exportBtn').addEventListener('click', () => {
  const payload = { game: 'Grand Theft Auto VI', exported: new Date().toISOString(), earned: [...earned].sort((a, b) => a - b) };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
$('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const ids = Array.isArray(data) ? data : data.earned;
    if (!Array.isArray(ids)) throw new Error('no earned list');
    earned = new Set(ids.filter((id) => trophies.some((t) => t.id === id)));
    save();
    renderProgress();
    renderList();
  } catch {
    alert('That file is not a trophy-progress export from this guide.');
  }
  e.target.value = '';
});
$('resetBtn').addEventListener('click', () => {
  if (confirm('Clear all earned ticks? This cannot be undone.')) {
    earned = new Set();
    save();
    renderProgress();
    renderList();
  }
});

for (const id of ['search', 'grade', 'kind', 'earnedFilter', 'missableOnly']) {
  $(id).addEventListener('input', renderList);
  $(id).addEventListener('change', renderList);
}
$('spoilerFree').addEventListener('change', (e) => {
  spoilerFree = e.target.checked;
  localStorage.setItem(SPOILER_KEY, spoilerFree ? '1' : '0');
  renderList();
});

// Deep links used by the guide itself and by screenshots: ?view=roadmap,
// ?detail=<id>, ?grade=silver, ?kind=story, ?missable=1, ?spoiler=1.
if (params.get('grade')) $('grade').value = params.get('grade');
if (params.get('kind')) $('kind').value = params.get('kind');
if (params.get('missable') === '1') $('missableOnly').checked = true;
if (params.get('spoiler') === '1') {
  spoilerFree = true;
  localStorage.setItem(SPOILER_KEY, '1');
}
$('spoilerFree').checked = spoilerFree;
if (params.get('view') === 'roadmap') showView('Roadmap');
else if (params.get('view') === 'about') showView('About');
sourceList($('sourceList'), doc.sources ?? []);
renderProgress();
renderList();
if (params.get('detail')) {
  const t = trophies.find((x) => String(x.id) === params.get('detail'));
  if (t) openDetail(t);
}
