/* ===== Dwarkesh Polyfab Smart CRM - app.js ===== */

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

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(FIREBASE_CONFIG);
}
const _fireDB = (typeof firebase !== 'undefined') ? firebase.database() : null;

// Searchable Place options
const PLACE_OPTIONS = [
  "Gujarat", "Maharashtra", "Rajasthan", "Madhya Pradesh", "Uttar Pradesh",
  "Delhi", "Punjab", "Haryana", "Karnataka", "Tamil Nadu", "Andhra Pradesh",
  "Telangana", "Kerala", "West Bengal", "Bihar", "Odisha", "Chhattisgarh",
  "Jharkhand", "Uttarakhand", "Himachal Pradesh", "Assam", "Goa", "Tripura",
  "Meghalaya", "Manipur", "Mizoram", "Nagaland", "Arunachal Pradesh", "Sikkim",
  "Jammu and Kashmir", "Ladakh", "Chandigarh", "Puducherry",
  "Dadra and Nagar Haveli and Daman and Diu", "Lakshadweep", "Andaman and Nicobar Islands",
  "India",
  "Export"
];

const PRODUCT_OPTIONS = [
  { value: "pp_bag",          label: "PP Bag" },
  { value: "bopp_bag",        label: "BOPP Bag" },
  { value: "antislip_bag",    label: "Anti-Slip Bag" },
  { value: "leno_bag",        label: "Leno Bag" },
  { value: "fibc_bag",        label: "FIBC Bag" },
  { value: "multicolour_bag", label: "Multicolour Bag" },
  { value: "valve_bag",       label: "Valve Bag" },
  { value: "sugar_bag",       label: "Sugar Bag" },
  { value: "ld_liner_bag",    label: "L D Liner Bag" },
  { value: "rice_bag",        label: "Rice Bag" },
  { value: "other",           label: "Other" }
];

const RATING_OPTIONS = [
  { value: "5star",         label: "★★★★★ (5 Star)",   rank: 50, stars: "★★★★★" },
  { value: "4star",         label: "★★★★ (4 Star)",     rank: 40, stars: "★★★★" },
  { value: "3star",         label: "★★★ (3 Star)",       rank: 30, stars: "★★★" },
  { value: "not_important", label: "Not Important",       rank: 10, stars: "Not Important" }
];

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

function getRatingRank(rating) {
  const r = RATING_OPTIONS.find(o => o.value === rating);
  return r ? r.rank : 0;
}

function getRatingStars(rating) {
  switch (rating) {
    case '5star': return '<span class="star-rating">★★★★★</span>';
    case '4star': return '<span class="star-rating">★★★★</span>';
    case '3star': return '<span class="star-rating">★★★</span>';
    case 'not_important': return '<span class="star-not-important">Not Important</span>';
    default: return '<span class="star-unrated">Unrated</span>';
  }
}

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

function initLiveClock(elementId) {
  function update() {
    const el = document.getElementById(elementId);
    if (!el) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    el.innerHTML = '<span class="clock-time">' + timeStr + '</span> &bull; <span class="clock-date">' + dateStr + '</span>';
  }
  update();
  setInterval(update, 1000);
}

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

let _companiesCache = {};
let _remindersCache = {};
let _dataListeners = [];

function initLiveListener() {
  if (!_fireDB) return;

  _fireDB.ref('crm_data/companies').on('value', snap => {
    _companiesCache = snap.val() || {};
    try { localStorage.setItem('crm_companies_cache', JSON.stringify(_companiesCache)); } catch(e) {}
    notifyListeners();
  });

  _fireDB.ref('crm_data/reminders').on('value', snap => {
    _remindersCache = snap.val() || {};
    try { localStorage.setItem('crm_reminders_cache', JSON.stringify(_remindersCache)); } catch(e) {}
    notifyListeners();
  });

  try {
    const cc = localStorage.getItem('crm_companies_cache');
    if (cc) _companiesCache = JSON.parse(cc);
    const rc = localStorage.getItem('crm_reminders_cache');
    if (rc) _remindersCache = JSON.parse(rc);
  } catch(e) {}
  notifyListeners();
}

function onDataChange(cb) {
  _dataListeners.push(cb);
}

function notifyListeners() {
  _dataListeners.forEach(fn => {
    try { fn(); } catch(e) { console.error(e); }
  });
}

function getAllCompanies() {
  return Object.values(_companiesCache);
}

function getCompany(id) {
  return _companiesCache[id] || null;
}

function getNewArrivals() {
  return getAllCompanies().filter(c => c.segment === 'new_arrival');
}

function getNewArrivalsCount() {
  return getNewArrivals().length;
}

function getAllReminders() {
  return Object.values(_remindersCache);
}

function getRemindersForCompany(companyId) {
  return getAllReminders().filter(r => r.companyId === companyId);
}

function getTodayDateStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getTodayReminders() {
  const today = getTodayDateStr();
  return getAllReminders().filter(r => r.date === today && !r.completed);
}

function getMissedReminders() {
  const today = getTodayDateStr();
  return getAllReminders().filter(r => r.date < today && !r.completed);
}

function getUpcomingReminders() {
  const today = getTodayDateStr();
  return getAllReminders().filter(r => r.date > today && !r.completed);
}

function saveCompany(company) {
  if (!company.id) company.id = genId();
  company.updatedAt = new Date().toISOString();
  if (!company.createdAt) company.createdAt = company.updatedAt;

  _companiesCache[company.id] = company;
  notifyListeners();

  if (_fireDB) {
    return _fireDB.ref('crm_data/companies/' + company.id).set(company);
  }
  return Promise.resolve();
}

function deleteCompany(id) {
  delete _companiesCache[id];
  notifyListeners();

  if (_fireDB) {
    return _fireDB.ref('crm_data/companies/' + id).remove();
  }
  return Promise.resolve();
}

function saveReminder(reminder) {
  if (!reminder.id) reminder.id = genId();
  reminder.updatedAt = new Date().toISOString();
  if (!reminder.createdAt) reminder.createdAt = reminder.updatedAt;

  _remindersCache[reminder.id] = reminder;
  notifyListeners();

  if (_fireDB) {
    return _fireDB.ref('crm_data/reminders/' + reminder.id).set(reminder);
  }
  return Promise.resolve();
}

function completeReminder(id) {
  if (_remindersCache[id]) {
    _remindersCache[id].completed = true;
    _remindersCache[id].completedAt = new Date().toISOString();
    notifyListeners();
  }
  if (_fireDB) {
    return _fireDB.ref('crm_data/reminders/' + id).update({
      completed: true,
      completedAt: new Date().toISOString()
    });
  }
  return Promise.resolve();
}

function deleteReminder(id) {
  delete _remindersCache[id];
  notifyListeners();

  if (_fireDB) {
    return _fireDB.ref('crm_data/reminders/' + id).remove();
  }
  return Promise.resolve();
}

function filterCompanies(filters = {}) {
  let list = getAllCompanies();

  if (filters.onlyNewArrival) {
    list = list.filter(c => c.segment === 'new_arrival');
  } else if (filters.hideNewArrival) {
    list = list.filter(c => c.segment !== 'new_arrival');
  }

  if (filters.search) {
    const q = filters.search.toLowerCase().trim();
    list = list.filter(c =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q)) ||
      (c.state && c.state.toLowerCase().includes(q)) ||
      (c.country && c.country.toLowerCase().includes(q))
    );
  }

  if (filters.rating && filters.rating !== 'all') {
    list = list.filter(c => c.rating === filters.rating);
  }

  if (filters.place && filters.place !== 'all') {
    list = list.filter(c => (c.state || '').toLowerCase() === filters.place.toLowerCase());
  }

  if (filters.product && filters.product !== 'all') {
    list = list.filter(c => c.products && c.products.includes(filters.product));
  }

  // Sort: High Star to Low Star
  list.sort((a, b) => {
    const rankDiff = getRatingRank(b.rating) - getRatingRank(a.rating);
    if (rankDiff !== 0) return rankDiff;
    return (b.updatedAt || '').localeCompare(a.updatedAt || '');
  });

  return list;
}

function renderPlaceDatalist(datalistId) {
  let dl = document.getElementById(datalistId);
  if (!dl) {
    dl = document.createElement('datalist');
    dl.id = datalistId;
    document.body.appendChild(dl);
  }
  dl.innerHTML = PLACE_OPTIONS.map(p => `<option value="${p}"></option>`).join('');
}

function buildProductTags(products) {
  if (!products || !products.length) return '';
  return products.map(p => `<span class="tag">${getProductLabel(p)}</span>`).join('');
}

function buildCompanyCard(c, opts = {}) {
  const showDelete = opts.showDelete !== false;
  const linkTo = opts.linkTo !== false;
  const isSubpage = window.location.pathname.includes('/pages/');
  const basePath = opts.basePath !== undefined ? opts.basePath : (isSubpage ? '' : 'pages/');
  const targetUrl = opts.customUrl ? opts.customUrl : `${basePath}company.html?id=${c.id}`;

  const placeDisplay = c.state === 'Export'
    ? ('Export (' + (c.country || 'International') + ')')
    : (c.state ? (c.state + (c.city ? ', ' + c.city : '')) : (c.city || ''));

  let html = `<div class="company-card fade-in" ${linkTo ? `onclick="window.location.href='${targetUrl}'"` : ''}>`;
  html += `<div class="cc-top">`;
  html += `<div class="cc-name">${escHtml(c.name || 'Unnamed')}</div>`;
  html += `<div class="cc-rating">${getRatingStars(c.rating)}</div>`;
  html += `</div>`;
  html += `<div class="cc-meta">`;
  if (c.phone) html += `<span class="meta-item"><span class="meta-icon">&#9742;</span> ${escHtml(c.phone)}</span>`;
  if (placeDisplay) html += `<span class="meta-item"><span class="meta-icon">&#9873;</span> ${escHtml(placeDisplay)}</span>`;
  html += `</div>`;

  if (c.products && c.products.length) {
    html += `<div class="cc-tags">${buildProductTags(c.products)}</div>`;
  }

  html += `<div class="action-row" onclick="event.stopPropagation()">`;
  html += `<button class="btn btn-green btn-sm" onclick="openWhatsApp('${escAttr(c.phone)}')">WhatsApp</button>`;
  html += `<button class="btn btn-primary btn-sm" onclick="callPhone('${escAttr(c.phone)}')">Call</button>`;
  if (showDelete) {
    html += `<button class="btn btn-red btn-sm" onclick="confirmDelete('${c.id}','${escAttr(c.name)}')">Delete</button>`;
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

let _deleteModal = null;
function confirmDelete(id, name) {
  if (!_deleteModal) {
    _deleteModal = document.createElement('div');
    _deleteModal.className = 'modal-overlay';
    _deleteModal.id = 'delete-modal';
    _deleteModal.innerHTML = `
      <div class="modal-box">
        <h3>Delete Contact</h3>
        <p id="delete-modal-msg">Are you sure?</p>
        <div class="modal-actions">
          <button class="btn btn-outline" onclick="closeDeleteModal()">Cancel</button>
          <button class="btn btn-red" id="delete-modal-confirm">Delete</button>
        </div>
      </div>`;
    document.body.appendChild(_deleteModal);
  }
  document.getElementById('delete-modal-msg').textContent = `Delete "${name || 'this contact'}"? This cannot be undone.`;
  _deleteModal.classList.add('open');
  document.getElementById('delete-modal-confirm').onclick = async () => {
    await deleteCompany(id);
    closeDeleteModal();
    showToast('Contact deleted');
  };
}

function closeDeleteModal() {
  if (_deleteModal) _deleteModal.classList.remove('open');
}

// Bottom Navigation with Clean Corporate Icons (No Cartoon Emojis)
function renderBottomNav(activePage) {
  const isSubpage = window.location.pathname.includes('/pages/');
  const prefix = isSubpage ? '../' : '';
  const nav = document.getElementById('bottom-nav');
  if (!nav) return;
  nav.innerHTML = `
    <a href="${prefix}index.html" class="${activePage==='home'?'active':''}">
      <svg class="nav-svg" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
      Home
    </a>
    <a href="${prefix}pages/add.html" class="${activePage==='add'?'active':''}">
      <svg class="nav-svg" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
      Add
    </a>
    <a href="${prefix}pages/data.html" class="${activePage==='data'?'active':''}">
      <svg class="nav-svg" viewBox="0 0 24 24"><path d="M4 9h4v11H4zm6-5h4v16h-4zm6 8h4v8h-4z"/></svg>
      All Data
    </a>
    <a href="${prefix}pages/reminders.html" class="${activePage==='reminders'?'active':''}">
      <svg class="nav-svg" viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
      Reminders
    </a>`;
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('SW registration:', err);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initLiveListener();
  registerSW();
});
