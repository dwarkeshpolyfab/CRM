/* ===== Dwarkesh Polyfab CRM v2 — app.js ===== */

// ── Firebase Config ──
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCvUABuMqhfs1SpZMdWKQve0418KdmVg38",
  authDomain: "dwarkesh-crm.firebaseapp.com",
  databaseURL: "https://dwarkesh-crm-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "dwarkesh-crm",
  storageBucket: "dwarkesh-crm.firebasestorage.app",
  messagingSenderId: "513099827589",
  appId: "1:513099827589:web:ebb115e569abb2b53c1cec",
  measurementId: "G-0MJE1KLNQP"
};

// ── Init Firebase ──
if (!firebase.apps.length) {
  firebase.initializeApp(FIREBASE_CONFIG);
}
const _fireDB = firebase.database();

// ── All Indian States ──
const INDIAN_STATES = [
  "Gujarat","Maharashtra","Rajasthan","Madhya Pradesh","Uttar Pradesh",
  "Karnataka","Tamil Nadu","Andhra Pradesh","Telangana","Kerala",
  "West Bengal","Bihar","Odisha","Punjab","Haryana","Chhattisgarh",
  "Jharkhand","Uttarakhand","Himachal Pradesh","Assam","Goa","Tripura",
  "Meghalaya","Manipur","Mizoram","Nagaland","Arunachal Pradesh","Sikkim",
  "Jammu and Kashmir","Ladakh","Delhi","Chandigarh","Puducherry",
  "Dadra and Nagar Haveli and Daman and Diu","Lakshadweep",
  "Andaman and Nicobar Islands"
];

// ── Product Options ──
const PRODUCT_OPTIONS = [
  { value: "pp_bag",           label: "PP Bag" },
  { value: "bopp_bag",         label: "BOPP Bag" },
  { value: "antislip_bag",     label: "Anti-Slip Bag" },
  { value: "leno_bag",         label: "Leno Bag" },
  { value: "fibc_bag",         label: "FIBC Bag" },
  { value: "multicolour_bag",  label: "Multicolour Bag" },
  { value: "valve_bag",        label: "Valve Bag" },
  { value: "sugar_bag",        label: "Sugar Bag" },
  { value: "ld_liner_bag",     label: "L D Liner Bag" },
  { value: "rice_bag",         label: "Rice Bag" },
  { value: "other",            label: "Other" }
];

// ── Rating Options ──
const RATING_OPTIONS = [
  { value: "not_important", label: "Not Important", stars: "" },
  { value: "3star",         label: "⭐⭐⭐",       stars: "⭐⭐⭐" },
  { value: "4star",         label: "⭐⭐⭐⭐",     stars: "⭐⭐⭐⭐" },
  { value: "5star",         label: "⭐⭐⭐⭐⭐",   stars: "⭐⭐⭐⭐⭐" }
];

// ── Status Options ──
const STATUS_OPTIONS = [
  "Untouch","Follow-up","Mature","Need to Visit","No Need to Follow"
];

// ── Segment Options ──
const SEGMENT_OPTIONS = [
  { value: "new_arrival",   label: "New Arrival" },
  { value: "follow_up",     label: "Follow Up" },
  { value: "mature",        label: "Mature" },
  { value: "not_important", label: "Not Important" }
];

// ── Helpers ──
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
}

function cleanPhone(phone) {
  if (!phone) return '';
  let p = phone.replace(/[^0-9+]/g, '');
  if (p.startsWith('+')) return p.substring(1);
  if (p.startsWith('91') && p.length > 10) return p;
  if (p.length === 10) return '91' + p;
  return p;
}

function getProductLabel(val) {
  const p = PRODUCT_OPTIONS.find(o => o.value === val);
  return p ? p.label : val;
}

function getRatingStars(rating) {
  switch (rating) {
    case '3star': return '⭐⭐⭐';
    case '4star': return '⭐⭐⭐⭐';
    case '5star': return '⭐⭐⭐⭐⭐';
    default: return '—';
  }
}

function getStatusClass(status) {
  if (!status) return 'status-untouch';
  const s = status.toLowerCase().replace(/\s+/g, '-');
  if (s.includes('untouch')) return 'status-untouch';
  if (s.includes('follow')) return 'status-follow-up';
  if (s.includes('mature')) return 'status-mature';
  if (s.includes('need-to-visit')) return 'status-need-to-visit';
  if (s.includes('no-need')) return 'status-no-need';
  return 'status-untouch';
}

// ── WhatsApp & Call ──
function openWhatsApp(phone) {
  const clean = cleanPhone(phone);
  if (!clean) { showToast('No phone number'); return; }
  window.open('https://wa.me/' + clean, '_blank');
}

function callPhone(phone) {
  const clean = cleanPhone(phone);
  if (!clean) { showToast('No phone number'); return; }
  window.location.href = 'tel:+' + clean;
}

// ── Toast ──
function showToast(msg) {
  let t = document.getElementById('app-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'app-toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ── In-memory data ──
let _companiesCache = {};
let _remindersCache = {};
let _dataListeners = [];

// ── Firebase Live Listener ──
function initLiveListener() {
  _fireDB.ref('crm_data/companies').on('value', snap => {
    _companiesCache = snap.val() || {};
    _dataListeners.forEach(fn => { try { fn(_companiesCache); } catch(e) { console.error(e); } });
  });
  _fireDB.ref('crm_data/reminders').on('value', snap => {
    _remindersCache = snap.val() || {};
    _dataListeners.forEach(fn => { try { fn(_companiesCache); } catch(e) { console.error(e); } });
  });
}

function onDataChange(fn) {
  _dataListeners.push(fn);
}

// ── CRUD: Companies ──
function saveCompany(company) {
  if (!company.id) company.id = genId();
  company.updatedAt = new Date().toISOString();
  if (!company.createdAt) company.createdAt = company.updatedAt;
  if (!company.source) company.source = 'manual';
  if (!company.segment) company.segment = 'new_arrival';
  if (!company.status) company.status = 'Untouch';
  if (!company.rating) company.rating = 'not_set';
  return _fireDB.ref('crm_data/companies/' + company.id).set(company);
}

function deleteCompany(id) {
  return _fireDB.ref('crm_data/companies/' + id).remove();
}

function getCompany(id) {
  return _companiesCache[id] || null;
}

function getAllCompanies() {
  return Object.values(_companiesCache);
}

// ── CRUD: Reminders ──
function saveReminder(reminder) {
  if (!reminder.id) reminder.id = genId();
  reminder.updatedAt = new Date().toISOString();
  if (!reminder.createdAt) reminder.createdAt = reminder.updatedAt;
  if (!reminder.completed) reminder.completed = false;
  return _fireDB.ref('crm_data/reminders/' + reminder.id).set(reminder);
}

function deleteReminder(id) {
  return _fireDB.ref('crm_data/reminders/' + id).remove();
}

function completeReminder(id) {
  return _fireDB.ref('crm_data/reminders/' + id).update({ completed: true, completedAt: new Date().toISOString() });
}

function getAllReminders() {
  return Object.values(_remindersCache);
}

function getRemindersForCompany(companyId) {
  return getAllReminders().filter(r => r.companyId === companyId);
}

// ── Reminder Filters ──
function getTodayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function getTodayReminders() {
  const today = getTodayStr();
  return getAllReminders().filter(r => !r.completed && r.date === today);
}

function getMissedReminders() {
  const today = getTodayStr();
  return getAllReminders().filter(r => !r.completed && r.date < today);
}

function getUpcomingReminders() {
  const today = getTodayStr();
  return getAllReminders().filter(r => !r.completed && r.date > today);
}

// ── Segment Counts ──
function getNewArrivalsCount() {
  return getAllCompanies().filter(c => c.segment === 'new_arrival').length;
}

// ── Filter Companies (cross-filter, AND logic) ──
function filterCompanies(filters) {
  let list = getAllCompanies();

  if (filters.search) {
    const s = filters.search.toLowerCase();
    list = list.filter(c =>
      (c.name && c.name.toLowerCase().includes(s)) ||
      (c.phone && c.phone.includes(s)) ||
      (c.city && c.city.toLowerCase().includes(s))
    );
  }
  if (filters.rating && filters.rating !== 'all') {
    list = list.filter(c => c.rating === filters.rating);
  }
  if (filters.state && filters.state !== 'all') {
    list = list.filter(c => c.state === filters.state);
  }
  if (filters.product && filters.product !== 'all') {
    list = list.filter(c => c.products && c.products.includes(filters.product));
  }
  if (filters.status && filters.status !== 'all') {
    list = list.filter(c => c.status === filters.status);
  }
  if (filters.segment && filters.segment !== 'all') {
    list = list.filter(c => c.segment === filters.segment);
  }

  return list;
}

// ── Export / Import Backup ──
function exportBackup() {
  const data = {
    companies: _companiesCache,
    reminders: _remindersCache,
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dwarkesh-crm-backup-' + getTodayStr() + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup downloaded');
}

function importBackup(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.companies) {
          await _fireDB.ref('crm_data/companies').set(data.companies);
        }
        if (data.reminders) {
          await _fireDB.ref('crm_data/reminders').set(data.reminders);
        }
        showToast('Backup imported successfully');
        resolve();
      } catch (err) {
        showToast('Import failed: ' + err.message);
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}

// ── Service Worker Registration ──
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

// ── Notification Permission ──
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// ── Build Helpers (for rendering) ──
function buildProductTags(products) {
  if (!products || !products.length) return '';
  return products.map(p => `<span class="tag">${getProductLabel(p)}</span>`).join('');
}

function buildStatusBadge(status) {
  if (!status) return '';
  return `<span class="status-badge ${getStatusClass(status)}">${status}</span>`;
}

function buildCompanyCard(c, opts = {}) {
  const showDelete = opts.showDelete !== false;
  const linkTo = opts.linkTo !== false;
  const basePath = opts.basePath || 'pages/';

  let html = `<div class="company-card fade-in" ${linkTo ? `onclick="window.location.href='${basePath}company.html?id=${c.id}'"` : ''}>`;
  html += `<div class="cc-top">`;
  html += `<div class="cc-name">${escHtml(c.name || 'Unnamed')}</div>`;
  html += `<div class="cc-rating">${getRatingStars(c.rating)}</div>`;
  html += `</div>`;
  html += `<div class="cc-meta">`;
  if (c.phone) html += `<span>📞 ${escHtml(c.phone)}</span>`;
  if (c.city || c.state) html += `<span>📍 ${escHtml([c.city, c.state].filter(Boolean).join(', '))}</span>`;
  html += `</div>`;
  html += `<div class="cc-tags">${buildProductTags(c.products)} ${buildStatusBadge(c.status)}</div>`;
  html += `<div class="action-row" onclick="event.stopPropagation()">`;
  html += `<button class="btn btn-green btn-sm" onclick="openWhatsApp('${escAttr(c.phone)}')">📱 WhatsApp</button>`;
  html += `<button class="btn btn-primary btn-sm" onclick="callPhone('${escAttr(c.phone)}')">📞 Call</button>`;
  if (showDelete) {
    html += `<button class="btn btn-red btn-sm" onclick="confirmDelete('${c.id}','${escAttr(c.name)}')">🗑️</button>`;
  }
  html += `</div>`;
  html += `</div>`;
  return html;
}

function escHtml(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(s) {
  if (!s) return '';
  return s.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// ── Delete Confirm ──
let _deleteModal = null;
function confirmDelete(id, name) {
  if (!_deleteModal) {
    _deleteModal = document.createElement('div');
    _deleteModal.className = 'modal-overlay';
    _deleteModal.id = 'delete-modal';
    _deleteModal.innerHTML = `
      <div class="modal-box">
        <h3>Delete Company</h3>
        <p id="delete-modal-msg">Are you sure?</p>
        <div class="modal-actions">
          <button class="btn btn-outline" onclick="closeDeleteModal()">Cancel</button>
          <button class="btn btn-red" id="delete-modal-confirm">Delete</button>
        </div>
      </div>`;
    document.body.appendChild(_deleteModal);
  }
  document.getElementById('delete-modal-msg').textContent = `Delete "${name || 'this company'}"? This cannot be undone.`;
  _deleteModal.classList.add('open');
  document.getElementById('delete-modal-confirm').onclick = async () => {
    await deleteCompany(id);
    closeDeleteModal();
    showToast('Company deleted');
  };
}

function closeDeleteModal() {
  if (_deleteModal) _deleteModal.classList.remove('open');
}

// ── Populate State Dropdown ──
function populateStateDropdown(selectEl, selectedVal) {
  let html = '<option value="">Select State</option>';
  INDIAN_STATES.forEach(st => {
    html += `<option value="${st}" ${selectedVal === st ? 'selected' : ''}>${st}</option>`;
  });
  selectEl.innerHTML = html;
}

// ── Populate State Filter Dropdown (with "All") ──
function populateStateFilter(selectEl, selectedVal) {
  let html = '<option value="all">All States</option>';
  INDIAN_STATES.forEach(st => {
    html += `<option value="${st}" ${selectedVal === st ? 'selected' : ''}>${st}</option>`;
  });
  selectEl.innerHTML = html;
}

// ── Build Bottom Nav ──
function renderBottomNav(activePage) {
  const isSubpage = window.location.pathname.includes('/pages/');
  const prefix = isSubpage ? '../' : '';
  const nav = document.getElementById('bottom-nav');
  if (!nav) return;
  nav.innerHTML = `
    <a href="${prefix}index.html" class="${activePage==='home'?'active':''}">
      <span class="nav-icon">🏠</span>Home
    </a>
    <a href="${prefix}pages/add.html" class="${activePage==='add'?'active':''}">
      <span class="nav-icon">➕</span>Add
    </a>
    <a href="${prefix}pages/data.html" class="${activePage==='data'?'active':''}">
      <span class="nav-icon">📊</span>Data
    </a>
    <a href="${prefix}pages/reminders.html" class="${activePage==='reminders'?'active':''}">
      <span class="nav-icon">🔔</span>Reminders
    </a>`;
}

// ── Init on DOM ready ──
document.addEventListener('DOMContentLoaded', () => {
  initLiveListener();
  registerSW();
  requestNotificationPermission();
});
