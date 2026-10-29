
/* ===== CONFIG ===== */
const CONFIG = {
  target: 500,
  budget: 2000,
  days: 7,
  channelSplit: { campus: 250, community: 150, referral: 100 }
};

const CHANNELS = [
  { id: 'campus', label: 'College clubs & campus', target: 250 },
  { id: 'community', label: 'Student communities', target: 150 },
  { id: 'referral', label: 'Peer referral', target: 100 }
];

/* ===== STATE ===== */
let ambassadors = [];
let registrations = [];
let nextAmbassadorId = 1;

const STORAGE_KEY = 'ai_workshop_growth_tracker_v1';

/* ===== HELPERS ===== */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.ambassadors) ambassadors = data.ambassadors;
      if (data.registrations) registrations = data.registrations;
      if (data.nextAmbassadorId) nextAmbassadorId = data.nextAmbassadorId;
    }
  } catch (e) { console.warn('Could not load state', e); }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ambassadors, registrations, nextAmbassadorId }));
  } catch (e) { console.warn('Could not save state', e); }
}

function uniqueCode(prefix) {
  const rng = () => Math.floor(1000 + Math.random() * 9000).toString();
  let cand = prefix + '_' + rng();
  while (ambassadors.some(a => a.code === cand)) {
    cand = prefix + '_' + rng() + '_' + rng();
  }
  return cand;
}

function uid() {
  return 'amb_' + (nextAmbassadorId++) + '_' + Date.now().toString(36);
}

function fmt(n) {
  return n.toLocaleString('en-IN');
}

/* ===== AGGREGATES ===== */
function computeAggregates() {
  const byChannel = {};
  CHANNELS.forEach((c) => { byChannel[c.id] = 0; });
  let total = 0;
  registrations.forEach((r) => {
    total++;
    if (Object.prototype.hasOwnProperty.call(byChannel, r.channel)) {
      byChannel[r.channel]++;
    } else {
      byChannel[r.channel] = (byChannel[r.channel] || 0) + 1;
    }
  });
  return { totals: { total }, byChannel };
}

/* ===== DEFAULTS (illustrative) ===== */
function seedDefaults() {
  if (ambassadors.length === 0) {
    const seed = [
      { id: uid(), name: 'Priya Rao', channel: 'campus', code: 'PRR_2026', regs: 42 },
      { id: uid(), name: 'Aarav Sharma', channel: 'campus', code: 'ASR_2026', regs: 35 },
      { id: uid(), name: 'Ananya Iyer', channel: 'community', code: 'ANI_2026', regs: 28 },
      { id: uid(), name: 'Rohan Kulkarni', channel: 'community', code: 'ROK_2026', regs: 22 },
      { id: uid(), name: 'Sneha Mehta', channel: 'referral', code: 'SNM_2026', regs: 15 },
      { id: uid(), name: 'Vidya Nair', channel: 'referral', code: 'VDN_2026', regs: 12 }
    ];
    seed.forEach(a => { a.code = uniqueCode(a.channel === 'campus' ? 'PRR' : a.channel === 'community' ? 'ANI' : 'SNM'); });
    ambassadors = seed;
    registrations = [];
    const names = ['A. student', 'B. student', 'C. student', 'D. student', 'E. student', 'F. student', 'G. student', 'H. student', 'I. student'];
    const channels = ['campus', 'community', 'referral'];
    for (let i = 0; i < 60; i++) {
      const amb = ambassadors[i % ambassadors.length];
      registrations.push({
        id: 'reg_' + i,
        name: names[i % names.length],
        branch: 'CS ' + ((i % 4) + 1) + 'yr',
        year: (i % 4) + 1,
        channel: channels[i % channels.length],
        referredBy: amb.name || '',
        ambassadorCode: amb.code,
        registeredAt: new Date(Date.now() - i * 3600000 * 2).toISOString().slice(0, 16)
      });
    }
  }
}

function renderChannels() {
  const tbody = document.querySelector('#channelTable tbody');
  const { totals, byChannel } = computeAggregates();
  let rows = '';
  CHANNELS.forEach((c) => {
    const regs = byChannel[c.id] || 0;
    const pct = CONFIG.target > 0 ? (regs / CONFIG.target) * 100 : 0;
    rows += '<tr>' +
      '<td><strong>' + c.label + '</strong></td>' +
      '<td>' + (ambassadors.filter((a) => a.channel === c.id).length) + '</td>' +
      '<td>' + regs + '</td>' +
      '<td>' + pct.toFixed(1) + '%</td>' +
      '<td>' + c.target + '</td>' +
    '</tr>';
  });
  tbody.innerHTML = rows +
    '<tr>' +
      '<td colspan="2"><strong>Total (ambassador count)</strong></td>' +
      '<td><strong>' + totals.total + '</strong></td>' +
      '<td></td>' +
      '<td><strong>500</strong></td>' +
    '</tr>';
}

function renderLeaderboard() {
  const tbody = document.querySelector('#leaderboardTable tbody');
  const sorted = [...ambassadors].sort((a, b) => (parseInt(b.regs) || 0) - (parseInt(a.regs) || 0));
  if (sorted.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">No data yet.</td></tr>';
    return;
  }
  tbody.innerHTML = sorted.slice(0, 10).map((a, i) => {
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + escapeHtml(a.name) + '</td>' +
      '<td>' + a.channel + '</td>' +
      '<td><code>' + escapeHtml(a.code) + '</code></td>' +
      '<td><strong>' + (parseInt(a.regs) || 0) + '</strong></td>' +
    '</tr>';
  }).join('');
}

function renderDashboard() {
  const { totals } = computeAggregates();
  document.getElementById('dashTotal').textContent = fmt(totals.total);
  document.getElementById('dashUnique').textContent = ambassadors.length;
  document.getElementById('dashDaily').textContent = Math.ceil(CONFIG.target / CONFIG.days);
  document.getElementById('dashPerReg').textContent = CONFIG.budget / CONFIG.target;
}

function renderChips() {
  const container = document.getElementById('channelChips');
  const { totals, byChannel } = computeAggregates();
  let html = '';
  CHANNELS.forEach((c) => {
    const regs = byChannel[c.id] || 0;
    const pct = CONFIG.target > 0 ? (regs / CONFIG.target) * 100 : 0;
    html += '<div class="chip">' +
      '<span>' + c.label + '</span>' +
      '<span>' + regs + ' / ' + c.target + '</span>' +
      '<div class="bar"><i style="width:' + pct + '%;"></i></div>' +
    '</div>';
  });
  container.innerHTML = html;
}

function renderSearchUI() {
  const q = document.getElementById('search').value.trim().toLowerCase();
  const fch = document.getElementById('filterChannel').value;
  const min = parseInt(document.getElementById('minAmt').value) || 0;
  const sortBy = document.getElementById('sortBy').value;

  let rows = [...ambassadors];
  rows = rows.filter((a) => a.name.toLowerCase().includes(q));
  if (fch) rows = rows.filter((a) => a.channel === fch);
  rows = rows.filter((a) => (parseInt(a.regs) || 0) >= min);
  rows.sort((a, b) => {
    if (sortBy === 'reg') return (parseInt(b.regs) || 0) - (parseInt(a.regs) || 0);
    if (sortBy === 'channel') return a.channel.localeCompare(b.channel);
    return a.name.localeCompare(b.name);
  });

  const tbody = document.querySelector('#ambassadorTable tbody');
  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">No ambassadors match your filters.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map((a) => {
    const regs = parseInt(a.regs) || 0;
    return '<tr>' +
      '<td><strong>' + escapeHtml(a.name) + '</strong></td>' +
      '<td>' + a.channel + '</td>' +
      '<td><code>' + escapeHtml(a.code) + '</code></td>' +
      '<td>' + regs + '</td>' +
      '<td class="actions">' +
        '<button class="btn--mini" data-act="edit" data-id="' + a.id + '">Edit</button> ' +
        '<button class="btn--mini" data-act="delete" data-id="' + a.id + '">Delete</button>' +
      '</td>' +
    '</tr>';
  }).join('');
  tbody.querySelectorAll('[data-act]').forEach((b) => {
    b.addEventListener('click', () => {
      const act = b.dataset.act;
      const id = b.dataset.id;
      if (act === 'delete') {
        if (confirm('Delete this ambassador?')) {
          ambassadors = ambassadors.filter((x) => x.id !== id);
          const keepCodes = new Set(ambassadors.map((a) => a.code));
          registrations = registrations.filter((r) => !r.ambassadorCode || keepCodes.has(r.ambassadorCode));
          saveState(); render();
        }
      } else if (act === 'edit') {
        editAmbassador(id);
      }
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* ===== Registration form ===== */
function addRegistration(e) {
  e.preventDefault();
  const name = document.getElementById('rName').value.trim();
  const branch = document.getElementById('rBranch').value.trim();
  const year = document.getElementById('rYear').value.trim();
  const refCode = document.getElementById('rCode').value.trim();
  const phone = document.getElementById('rPhone').value.trim();
  const terms = document.getElementById('rTerms').checked;

  if (!name) { showFormMsg('Please enter your full name.', false); return; }
  if (!terms) { showFormMsg('Please agree to the reminder consent.', false); return; }
  if (year && !/^[1-4]$/.test(year)) { showFormMsg('Academic year must be 1, 2, 3, or 4.', false); return; }

  let amb = null;
  if (refCode) {
    amb = ambassadors.find((a) => a.code === refCode);
  }

  const reg = {
    id: 'reg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: name,
    branch: branch || 'Not specified',
    year: year || 'Not specified',
    channel: amb ? amb.channel : 'manual',
    referredBy: amb ? amb.name : '',
    ambassadorCode: amb ? amb.code : '',
    phone: phone || '',
    registeredAt: new Date().toISOString().slice(0, 16)
  };
  registrations.push(reg);
  if (amb) {
    amb.regs = (parseInt(amb.regs) || 0) + 1;
  }
  saveState();
  render();
  showFormMsg('Thank you, ' + name + '! Your registration is recorded.', true);
  document.getElementById('rName').value = '';
  document.getElementById('rBranch').value = '';
  document.getElementById('rYear').value = '';
  document.getElementById('rCode').value = '';
  document.getElementById('rPhone').value = '';
  document.getElementById('rTerms').checked = false;
}

function showFormMsg(msg, ok) {
  const el = document.getElementById('formMsg');
  el.textContent = msg;
  el.className = 'form-msg' + (ok ? ' form-msg--ok' : ' form-msg--err');
}

/* ===== CSV export ===== */
function exportCsv() {
  const { totals, byChannel } = computeAggregates();
  const lines = [];
  lines.push('Campaign,Target,Registrations,Remaining,7-day daily target,2000/500 per reg');
  lines.push('Campaign,' + CONFIG.target + ',' + totals.total + ',' + (CONFIG.target - totals.total) + ',' + Math.ceil(CONFIG.target / CONFIG.days) + ',4');
  lines.push('Channel,AmbassadorCount,Registrations');
  CHANNELS.forEach((c) => {
    const r = byChannel[c.id] || 0;
    const ambCount = ambassadors.filter((a) => a.channel === c.id).length;
    lines.push('Channel,' + c.label + ',' + ambCount + ',' + r);
  });
  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'growth_tracker_export.csv';
  a.click();
  URL.revokeObjectURL(url);
  showFormMsg('CSV downloaded.', true);
}

function updateCsvPreview() {
  const { totals, byChannel } = computeAggregates();
  const lines = [];
  lines.push('Campaign,Target,Registrations,Remaining,7-day daily target,2000/500 per reg');
  lines.push('Campaign,' + CONFIG.target + ',' + totals.total + ',' + (CONFIG.target - totals.total) + ',' + Math.ceil(CONFIG.target / CONFIG.days) + ',4');
  lines.push('Channel,AmbassadorCount,Registrations');
  CHANNELS.forEach((c) => {
    const r = byChannel[c.id] || 0;
    const ambCount = ambassadors.filter((a) => a.channel === c.id).length;
    lines.push('Channel,' + c.label + ',' + ambCount + ',' + r);
  });
  const csv = lines.join('\n');
  document.getElementById('csvPreview').textContent = csv;
}

/* ===== Add ambassador ===== */
function addAmbassador() {
  const name = document.getElementById('ambName').value.trim();
  const channel = document.getElementById('ambChannel').value;
  if (!name) { showFormMsg('Please enter an ambassador name.', false); return; }
  const code = uniqueCode(channel === 'campus' ? 'AMB' : channel === 'community' ? 'CM' : 'REF');
  const existing = ambassadors.find((a) => a.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    const oldCode = existing.code;
    existing.channel = channel;
    existing.code = code;
    registrations.forEach((r) => {
      if (r.ambassadorCode === oldCode) r.ambassadorCode = code;
    });
    showFormMsg('Ambassador updated. New referral code: ' + code, true);
  } else {
    const amb = { id: uid(), name, channel, code, regs: 0 };
    ambassadors.push(amb);
    showFormMsg('Ambassador added. Share this code with your network: ' + code, true);
  }
  saveState(); render();
  document.getElementById('ambName').value = '';
  document.getElementById('ambCode').value = code;
}

/* temporary marker */

/* ===== Event binding ===== */
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  render();
  bindDashboardEvents();

  document.getElementById('addAmbassador').addEventListener('click', addAmbassador);
  document.getElementById('submitReg').addEventListener('click', addRegistration);
  document.getElementById('exportCsv').addEventListener('click', exportCsv);

  document.getElementById('search').addEventListener('input', renderSearchUI);
  document.getElementById('filterChannel').addEventListener('change', renderSearchUI);
  document.getElementById('minAmt').addEventListener('input', renderSearchUI);
  document.getElementById('sortBy').addEventListener('change', renderSearchUI);
});

function editAmbassador(id) {
  const amb = ambassadors.find((a) => a.id === id);
  if (!amb) return;
  const name = prompt('Edit ambassador name:', amb.name);
  if (name === null) return;
  const channel = prompt('Channel (campus / community / referral):', amb.channel);
  if (channel !== null && ['campus', 'community', 'referral'].includes(channel.trim())) {
    amb.channel = channel.trim();
  }
  if (name.trim()) amb.name = name.trim();
  saveState(); render();
}

function render() {
  renderProgress();
  renderOverviewKpis();
  renderSevenDayTrend();
  renderChannelComparison();
  renderRecentRegistrations();
  renderAllRegistrations();
  renderAmbassadors();
  renderChannels();
  renderLeaderboard();
  renderDashboard();
  renderChips();
  updateCsvPreview();
  renderSettings();
}

console.log('AI Workshop Growth Tracker loaded. Target ' + CONFIG.target + ' registrations, budget ' + CONFIG.budget + ' INR, ' + CONFIG.days + ' days.');

/* ===== Progress ===== */
function renderProgress() {
  const { totals } = computeAggregates();
  const cnt = totals.total;
  const pct = CONFIG.target > 0 ? (cnt / CONFIG.target) * 100 : 0;
  document.getElementById('regCount').textContent = fmt(cnt);
  const regPctEl = document.getElementById('regPct');
  if (regPctEl) regPctEl.textContent = pct.toFixed(1) + '%';
  document.getElementById('need').textContent = CONFIG.target - cnt;
  const bar = document.getElementById('progressBar');
  bar.style.width = Math.min(100, pct) + '%';
  bar.textContent = cnt + ' / ' + CONFIG.target;
  bar.style.setProperty('--progress', Math.min(100, pct) + '%');
  bar.setAttribute('aria-valuenow', String(cnt));
  const ring = document.getElementById('circularProgress');
  if (ring) {
    const circumference = 2 * Math.PI * 62;
    ring.style.strokeDashoffset = String(circumference * (1 - Math.min(100, pct) / 100));
    ring.style.strokeLinecap = pct > 0 ? 'round' : 'butt';
  }
  const ringCount = document.getElementById('regCountRing');
  if (ringCount) ringCount.textContent = fmt(cnt);
  const regPctText = document.getElementById('regPctText');
  if (regPctText) regPctText.textContent = pct.toFixed(1) + '%';
  const needText = document.getElementById('needText');
  if (needText) needText.textContent = fmt(CONFIG.target - cnt);
  const kpiTotal = document.getElementById('kpiTotal');
  if (kpiTotal) kpiTotal.textContent = fmt(cnt);
}

/* ===== Ambassadors ===== */
function renderAmbassadors() {
  const tbody = document.querySelector('#ambassadorTable tbody');
  let rows = [...ambassadors];
  rows.sort((a, b) => (parseInt(b.regs) || 0) - (parseInt(a.regs) || 0));
  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">No ambassadors yet. Add one above.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map((a) => {
    const regs = parseInt(a.regs) || 0;
    return '<tr>' +
      '<td><strong>' + escapeHtml(a.name) + '</strong></td>' +
      '<td>' + a.channel + '</td>' +
      '<td><code>' + escapeHtml(a.code) + '</code></td>' +
      '<td>' + regs + '</td>' +
      '<td class="actions">' +
        '<button class="btn--mini" data-act="edit" data-id="' + a.id + '">Edit</button> ' +
        '<button class="btn--mini" data-act="delete" data-id="' + a.id + '">Delete</button>' +
      '</td>' +
    '</tr>';
  }).join('');
  tbody.querySelectorAll('[data-act]').forEach((b) => {
    b.addEventListener('click', () => {
      const act = b.dataset.act;
      const id = b.dataset.id;
      if (act === 'delete') {
        if (confirm('Delete this ambassador?')) {
          ambassadors = ambassadors.filter((x) => x.id !== id);
          const keepCodes = new Set(ambassadors.map((a) => a.code));
          registrations = registrations.filter((r) => !r.ambassadorCode || keepCodes.has(r.ambassadorCode));
          saveState(); render();
        }
      } else if (act === 'edit') {
        editAmbassador(id);
      }
    });
  });
}

/* ===== Dashboard views ===== */
function showView(viewName) {
  const views = document.querySelectorAll('.view');
  views.forEach((view) => {
    view.hidden = view.dataset.view !== viewName;
  });
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.view === viewName);
  });
  const titles = {
    overview: 'Overview',
    registrations: 'Registrations',
    referrals: 'Referrals',
    insights: 'Campaign Insights',
    settings: 'Settings'
  };
  const title = document.getElementById('viewTitle');
  if (title) title.textContent = titles[viewName] || 'Overview';
}

function renderOverviewKpis() {
  const { totals, byChannel } = computeAggregates();
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  set('kpiTotal', fmt(totals.total));
  set('need', CONFIG.target - totals.total);
  set('overviewAmbassadors', ambassadors.length);
  set('overviewDaily', Math.ceil(CONFIG.target / CONFIG.days));
  set('overviewCost', CONFIG.target > 0 ? (CONFIG.budget / CONFIG.target).toFixed(2) : '0');
  set('regCount', fmt(totals.total));
  set('regPct', CONFIG.target > 0 ? ((totals.total / CONFIG.target) * 100).toFixed(1) + '%' : '0%');
  const activeChannels = Object.keys(byChannel).filter((key) => byChannel[key] > 0).length;
  const activeEl = document.getElementById('kpiChannels');
  if (activeEl) activeEl.textContent = activeChannels;
}

function renderSevenDayTrend() {
  const container = document.getElementById('trendChart');
  if (!container) return;
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    const count = registrations.filter((r) => String(r.registeredAt || '').slice(0, 10) === key).length;
    days.push({ key, count, label: date.toLocaleDateString('en-IN', { weekday: 'short' }) });
  }
  const maxCount = Math.max(1, ...days.map((day) => day.count));
  container.innerHTML = days.map((day) => {
    const height = Math.max(4, (day.count / maxCount) * 100);
    return '<div class="trend-day">' +
      '<span class="trend-day__value">' + day.count + '</span>' +
      '<div class="trend-day__track"><div class="trend-day__fill" style="height:' + height + '%;"></div></div>' +
      '<span class="trend-day__label">' + escapeHtml(day.label) + '</span>' +
    '</div>';
  }).join('');
}

function renderChannelComparison() {
  const container = document.getElementById('channelComparison');
  if (!container) return;
  const { byChannel } = computeAggregates();
  container.innerHTML = CHANNELS.map((channel) => {
    const count = byChannel[channel.id] || 0;
    const width = channel.target > 0 ? Math.min(100, (count / channel.target) * 100) : 0;
    return '<div class="channel-bar">' +
      '<div class="channel-bar__meta"><strong>' + escapeHtml(channel.label) + '</strong><span>' + count + ' / ' + channel.target + '</span></div>' +
      '<div class="channel-bar__track"><div class="channel-bar__fill" style="width:' + width + '%;"></div></div>' +
    '</div>';
  }).join('');
}

function renderRecentRegistrations() {
  const tbody = document.querySelector('#recentRegistrationsTable tbody');
  if (!tbody) return;
  const recent = [...registrations].sort((a, b) => String(b.registeredAt || '').localeCompare(String(a.registeredAt || ''))).slice(0, 8);
  if (recent.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">No registrations yet.</td></tr>';
    return;
  }
  tbody.innerHTML = recent.map((reg) => {
    return '<tr>' +
      '<td>' + escapeHtml(reg.name) + '</td>' +
      '<td>' + escapeHtml(reg.branch || '') + '</td>' +
      '<td>' + escapeHtml(reg.year || '') + '</td>' +
      '<td>' + escapeHtml(reg.channel || '') + '</td>' +
      '<td>' + escapeHtml(reg.referredBy || 'Direct') + '</td>' +
      '<td>' + escapeHtml(reg.registeredAt || '') + '</td>' +
    '</tr>';
  }).join('');
}

function renderAllRegistrations() {
  const tbody = document.querySelector('#registrationsTable tbody');
  if (!tbody) return;
  const rows = [...registrations].sort((a, b) => String(b.registeredAt || '').localeCompare(String(a.registeredAt || '')));
  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">No registrations yet.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map((reg) => {
    return '<tr>' +
      '<td>' + escapeHtml(reg.name) + '</td>' +
      '<td>' + escapeHtml(reg.branch || '') + '</td>' +
      '<td>' + escapeHtml(reg.year || '') + '</td>' +
      '<td>' + escapeHtml(reg.channel || '') + '</td>' +
      '<td>' + escapeHtml(reg.referredBy || 'Direct') + '</td>' +
      '<td>' + escapeHtml(reg.registeredAt || '') + '</td>' +
    '</tr>';
  }).join('');
}

function renderSettings() {
  const status = document.getElementById('settingsMsg');
  if (!status) return;
  const message = 'Tracker ready. ' + registrations.length + ' registration(s) and ' + ambassadors.length + ' ambassador(s) are stored in this browser.';
  status.textContent = message;
  status.className = 'form-msg form-msg--ok';
}

function bindDashboardEvents() {
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => showView(button.dataset.view));
  });
  const sampleButton = document.getElementById('sampleDataBtn');
  if (sampleButton) {
    sampleButton.addEventListener('click', () => {
      if (ambassadors.length > 0 && !confirm('Loading sample data will replace the current ambassador and registration data. Continue?')) {
        return;
      }
      seedDefaults();
      saveState();
      render();
      const message = 'Illustrative sample data loaded. These figures are not real campaign results.';
      const status = document.getElementById('settingsMsg');
      if (status) {
        status.textContent = message;
        status.className = 'form-msg form-msg--ok';
      }
    });
  }
  const resetButton = document.getElementById('resetDataBtn');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      if (!confirm('Reset all tracker data in this browser?')) return;
      ambassadors = [];
      registrations = [];
      nextAmbassadorId = 1;
      saveState();
      render();
      const status = document.getElementById('settingsMsg');
      if (status) {
        status.textContent = 'All tracker data has been reset.';
        status.className = 'form-msg form-msg--ok';
      }
    });
  }
  showView('overview');
}
