// ============================================================
//  Dwarkesh Polyfab CRM – app.js  (v3 – Firebase Cloud Sync)
//  Data syncs across ALL devices via Firebase.
//  Works offline too – uses localStorage as cache.
// ============================================================

const STORAGE_KEY = 'dwarkesh_crm_data';

// ════════════════════════════════════════════════════════════
//  🔥 FIREBASE CONFIG
//  STEP: Replace the values below with YOUR Firebase config
//  Get it from: Firebase Console → Project Settings → Your Apps
// ════════════════════════════════════════════════════════════
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCvUABuMqhfs1SpZMdWKQve0418KdmVg38",
  authDomain:        "dwarkesh-crm.firebaseapp.com",
  databaseURL:       "https://dwarkesh-crm-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "dwarkesh-crm",
  storageBucket:     "dwarkesh-crm.firebasestorage.app",
  messagingSenderId: "513099827589",
  appId:             "1:513099827589:web:ebb115e569abb2b53c1cec",
  measurementId:     "G-0MJE1KLNQP"
};

let _fireDB     = null;  // Firebase database reference
let _fireReady  = false; // Is Firebase connected?
let _syncTimer  = null;  // Debounce timer for saves

// ── Initialize Firebase & start listening ──
function initFirebase() {
  try {
    if (typeof firebase === 'undefined') return; // SDK not loaded
    if (FIREBASE_CONFIG.apiKey.includes('PASTE_YOUR')) return; // Not configured yet

    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    _fireDB    = firebase.database();
    _fireReady = true;

    // 🔴 LIVE LISTENER – updates this device when another device saves data
    _fireDB.ref('crm_data').on('value', snapshot => {
      const data = snapshot.val();
      if (!data) return;

      // Convert Firebase objects back to arrays
      const synced = {
        companies:  data.companies  ? Object.values(data.companies)  : [],
        reminders:  data.reminders  ? Object.values(data.reminders)  : [],
        activities: data.activities ? Object.values(data.activities) : [],
      };

      // Save to localStorage cache
      localStorage.setItem(STORAGE_KEY, JSON.stringify(synced));

      // Refresh current page UI automatically
      if (typeof buildFilters  === 'function') buildFilters();
      if (typeof renderList    === 'function') renderList();
      if (typeof loadCompany   === 'function') loadCompany();
      if (typeof renderPage    === 'function') renderPage();

      // Show sync indicator
      showSyncBadge('✅ Synced');
    });

    // Monitor connection state
    firebase.database().ref('.info/connected').on('value', snap => {
      if (snap.val() === true) showSyncBadge('☁️ Online');
      else                     showSyncBadge('📴 Offline');
    });

    console.log('🔥 Firebase connected!');
  } catch (e) {
    console.error('Firebase error:', e);
  }
}

// ── Show small sync indicator in top-right ──
function showSyncBadge(text) {
  let badge = document.getElementById('_sync_badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = '_sync_badge';
    badge.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999;font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;background:rgba(0,0,0,.6);color:#fff;pointer-events:none;transition:opacity .3s';
    document.body.appendChild(badge);
  }
  badge.textContent = text;
  badge.style.opacity = '1';
  clearTimeout(badge._hideTimer);
  badge._hideTimer = setTimeout(() => { badge.style.opacity = '0'; }, 2500);
}

// ── Save to Firebase (debounced – waits 500ms before sending) ──
function saveToFirebase(data) {
  if (!_fireReady || !_fireDB) return;
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => {
    try {
      const fbData = { companies: {}, reminders: {}, activities: {} };
      data.companies.forEach(c  => fbData.companies[c.id]   = c);
      data.reminders.forEach(r  => fbData.reminders[r.id]   = r);
      data.activities.forEach(a => fbData.activities[a.id]  = a);
      _fireDB.ref('crm_data').set(fbData);
    } catch (e) { console.error('Firebase save error:', e); }
  }, 500);
}

// ── Default empty data ──
function defaultData() {
  return { companies: [], reminders: [], activities: [] };
}

// ── Load from localStorage (instant) ──
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    return JSON.parse(raw);
  } catch (e) { return defaultData(); }
}

// ── Save: localStorage immediately + Firebase in background ──
function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); // instant local save
  saveToFirebase(data);                                      // background cloud save
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todayStr() { return new Date().toISOString().split('T')[0]; }

function tomorrowStr() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

function fmtRelDate(dateStr) {
  if (!dateStr) return '—';
  const t = todayStr(), tom = tomorrowStr();
  const yest = (() => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().split('T')[0]; })();
  if (dateStr === t)    return 'Today';
  if (dateStr === tom)  return 'Tomorrow';
  if (dateStr === yest) return 'Yesterday';
  return fmtDate(dateStr);
}

function fmtTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m.toString().padStart(2,'0')} ${ampm}`;
}

function initials(name) {
  if (!name) return '??';
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ── Constants ──
const STATUS_CLASS = {
  'Untouch':           'status-Untouch',
  'Follow-up':         'status-Follow-up',
  'Need to Visit':     'status-Need-to-Visit',
  'No Need to Follow': 'status-No-Need-to-Follow',
  'Mature':            'status-Mature',
};
const STATUS_DOT = {
  'Untouch':           'dot-untouch',
  'Follow-up':         'dot-followup',
  'Need to Visit':     'dot-visit',
  'No Need to Follow': 'dot-noneed',
  'Mature':            'dot-mature',
};
const ALL_STATUSES = ['Untouch','Follow-up','Need to Visit','No Need to Follow','Mature'];
const ALL_NATURES  = ['Manufacturer','Trader','Exporter'];
const ACTIVITY_ICON = { 'Called':'📞', 'Message':'💬', 'Not Touch':'❌' };

// ── Bag Spec Options ──
const BAG_LAMINATION_OPTIONS = ['Unlaminated','Milkey','Natural','BOPP'];
const BAG_PRINT_OPTIONS      = ['No','One Side','Two Side'];
const BAG_FABRIC_OPTIONS     = ['Gold','Silver','Janta','Blue Patta','Mix Tap','Antislip','Leno Bag','Other'];
const BAG_LINER_OPTIONS      = ['No','Milkey','Natural','Semi Natural'];
const BAG_LINER_STICH_OPTIONS= ['Instich','Without Stich'];

// ── Cities list ──
const CITIES = [
  'Morbi','Rajkot','Ahmedabad','Surat','Vadodara','Gandhinagar','Bhavnagar',
  'Jamnagar','Junagadh','Gondal','Porbandar','Surendranagar','Anand','Mehsana',
  'Bharuch','Vapi','Navsari','Kutch','Bhuj','Gandhidham','Amreli','Dhoraji',
  'Jetpur','Wankaner','Halvad','Mumbai','Pune','Delhi','Kolkata','Chennai',
  'Hyderabad','Bangalore','Jaipur','Udaipur','Jodhpur','Indore','Bhopal',
  'Nagpur','Nashik','Aurangabad','Other'
];

// ── Get all unique cities from saved companies ──
function getUniqueCities() {
  const db = loadData();
  const cities = [...new Set(db.companies.map(c => c.city).filter(Boolean))].sort();
  return cities;
}

// ── Company CRUD ──
function addCompany(data) {
  const db = loadData();
  const now = new Date().toISOString();
  const company = {
    id: genId(), ...data,
    // Bag specs (default empty if not provided)
    bagSize:       data.bagSize       || '',
    bagWeight:     data.bagWeight     || '',
    print:         data.print         || '',
    lamination:    data.lamination    || '',
    liner:         data.liner         || '',
    fabricQuality: data.fabricQuality || '',
    gsm:           data.gsm           || '',
    companyNotes:  data.companyNotes  || '',
    createdAt: now, updatedAt: now
  };
  db.companies.unshift(company);
  saveData(db);
  return company;
}

function getCompany(id) {
  return loadData().companies.find(c => c.id === id);
}

function updateCompany(id, updates) {
  const db = loadData();
  db.companies = db.companies.map(c =>
    c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
  );
  saveData(db);
}

function deleteCompany(id) {
  const db = loadData();
  db.companies  = db.companies.filter(c => c.id !== id);
  db.reminders  = db.reminders.filter(r => r.companyId !== id);
  db.activities = db.activities.filter(a => a.companyId !== id);
  saveData(db);
}

function changeStatus(id, status) { updateCompany(id, { status }); }

// ── Reminders ──
function addReminder(companyId, date, time) {
  const db = loadData();
  const reminder = { id: genId(), companyId, date, time, status: 'Pending', createdAt: new Date().toISOString() };
  db.reminders.unshift(reminder);
  saveData(db);
  return reminder;
}

function markReminderDone(id) {
  const db = loadData();
  db.reminders = db.reminders.map(r => r.id === id ? { ...r, status: 'Done' } : r);
  saveData(db);
}

function getTodayReminders() {
  const t = todayStr();
  return loadData().reminders.filter(r => r.date === t && r.status === 'Pending').sort((a,b) => a.time.localeCompare(b.time));
}

function getMissedReminders() {
  const t = todayStr();
  return loadData().reminders.filter(r => r.date < t && r.status === 'Pending').sort((a,b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time));
}

function getTomorrowReminders() {
  const tom = tomorrowStr();
  return loadData().reminders.filter(r => r.date === tom && r.status === 'Pending').sort((a,b) => a.time.localeCompare(b.time));
}

function getCounts() {
  return { today: getTodayReminders().length, missed: getMissedReminders().length, tomorrow: getTomorrowReminders().length };
}

// ── Activities ──
function addActivity({ companyId, reminderId, type, notes, nextFollowUpDate, nextFollowUpTime }) {
  const db = loadData();
  const activity = {
    id: genId(), companyId, reminderId, type, notes,
    nextFollowUpDate: nextFollowUpDate || '',
    nextFollowUpTime: nextFollowUpTime || '',
    createdAt: new Date().toISOString()
  };
  db.activities.unshift(activity);
  db.reminders = db.reminders.map(r => r.id === reminderId ? { ...r, status: 'Done' } : r);

  if (nextFollowUpDate) {
    db.reminders.unshift({ id: genId(), companyId, date: nextFollowUpDate, time: nextFollowUpTime || '10:00', status: 'Pending', createdAt: new Date().toISOString() });
    db.companies = db.companies.map(c =>
      c.id === companyId && c.status === 'Untouch'
        ? { ...c, status: 'Follow-up', updatedAt: new Date().toISOString() } : c
    );
  }
  saveData(db);
}

function getCompanyActivities(companyId) {
  return loadData().activities.filter(a => a.companyId === companyId).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
}

// ── 📊 EXPORT TO EXCEL/CSV ──
function exportToCSV() {
  const db = loadData();
  if (db.companies.length === 0) { alert('No companies to export!'); return; }

  const headers = [
    'Company Name','City','Nature','Phone','Status',
    'Bag Size','Bag Weight (g)','Print','Lamination','Liner','Fabric Quality','GSM',
    'Notes','Created Date'
  ];

  const rows = db.companies.map(c => [
    c.name         || '',
    c.city         || '',
    c.nature       || '',
    c.phone        || '',
    c.status       || '',
    c.bagSize      || '',
    c.bagWeight    || '',
    c.print        || '',
    c.lamination   || '',
    c.liner        || '',
    c.fabricQuality|| '',
    c.gsm          || '',
    (c.companyNotes|| '').replace(/,/g, ';'),
    c.createdAt ? c.createdAt.split('T')[0] : ''
  ].map(v => `"${v}"`));

  const csv = [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `dwarkesh-crm-companies-${todayStr()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── 💾 Backup JSON ──
function exportData() {
  const data = loadData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `dwarkesh-crm-backup-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── 📂 Restore from JSON ──
function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.companies || !data.reminders || !data.activities) { reject('Invalid backup file'); return; }
        saveData(data);
        resolve(data);
      } catch { reject('Could not read file'); }
    };
    reader.readAsText(file);
  });
}

// ── 📞 Direct Call ──
function callPhone(phone) {
  if (!phone) { alert('No phone number saved for this company.'); return; }
  window.location.href = 'tel:' + phone.replace(/\s/g, '');
}

// ── 💬 WhatsApp ──
function openWhatsApp(phone, name) {
  if (!phone) { alert('No phone number saved for this company.'); return; }
  const num = '91' + phone.replace(/\D/g, '');
  const msg = encodeURIComponent(`Hello, I am calling from Dwarkesh Polyfab regarding your bag requirements.`);
  window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
}

// ── DOM helpers ──
function qs(sel, ctx = document)  { return ctx.querySelector(sel); }
function qsa(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }
function show(el) { if (el) el.classList.remove('hidden'); }
function hide(el) { if (el) el.classList.add('hidden'); }
function goTo(page) { window.location.href = page; }

// ============================================================
//  🔔 NOTIFICATIONS – Phone popup alerts for reminders
// ============================================================

// ── Register Service Worker ──
async function registerSW() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return reg;
  } catch (e) {
    // Try relative path (for GitHub Pages subfolders)
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      return reg;
    } catch (e2) { return null; }
  }
}

// ── Ask user permission for notifications ──
async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied')  return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

// ── Schedule notifications for today's reminders ──
async function scheduleReminderNotifications() {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  // Wait for service worker to be ready
  let swReg = null;
  if ('serviceWorker' in navigator) {
    try { swReg = await navigator.serviceWorker.ready; } catch(e) {}
  }

  const db     = loadData();
  const today  = getTodayReminders();
  const now    = new Date();

  today.forEach(reminder => {
    const company = db.companies.find(c => c.id === reminder.companyId);
    if (!company) return;

    const [h, m] = (reminder.time || '10:00').split(':').map(Number);
    const fireAt  = new Date();
    fireAt.setHours(h, m, 0, 0);

    const delay = fireAt - now;

    // Only schedule if it's in the next 24 hours (and hasn't passed)
    if (delay <= 0 || delay > 24 * 60 * 60 * 1000) return;

    console.log(`📅 Notification scheduled for ${company.name} at ${reminder.time}`);

    setTimeout(() => {
      const title = `📞 Follow-up: ${company.name}`;
      const body  = `Time to call ${company.name} · ${company.city} · ${company.nature}`;

      if (swReg && navigator.serviceWorker.controller) {
        // Send via service worker (works in background)
        navigator.serviceWorker.controller.postMessage({
          type:      'SHOW_NOTIFICATION',
          title:     title,
          body:      body,
          reminderId: reminder.id,
          companyId:  company.id,
        });
      } else {
        // Direct notification (only when app is open)
        try {
          new Notification(title, {
            body:             body,
            icon:             '../assets/icon-192.png',
            badge:            '../assets/icon-192.png',
            vibrate:          [300, 100, 300],
            tag:              reminder.id,
            requireInteraction: true,
          });
        } catch(e) {}
      }
    }, delay);
  });
}

// ── Setup notifications (call this on every page load) ──
async function setupNotifications() {
  await registerSW();

  // Ask permission if not decided yet
  if ('Notification' in window && Notification.permission === 'default') {
    // Small delay so page loads first
    setTimeout(async () => {
      await requestNotificationPermission();
      await scheduleReminderNotifications();
    }, 2000);
  } else {
    await scheduleReminderNotifications();
  }
}

// Auto-run when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initFirebase();
    setupNotifications();
  });
} else {
  initFirebase();
  setupNotifications();
}
