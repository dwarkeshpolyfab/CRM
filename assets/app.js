// ============================================================
//  Dwarkesh Polyfab CRM – app.js
//  All data is stored in localStorage (browser storage).
//  Works offline – no internet or server needed.
// ============================================================

// ── Storage Key ──
const STORAGE_KEY = 'dwarkesh_crm_data';

// ── Default Empty Data ──
function defaultData() {
  return { companies: [], reminders: [], activities: [] };
}

// ── Load all data from localStorage ──
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    return JSON.parse(raw);
  } catch (e) {
    return defaultData();
  }
}

// ── Save all data to localStorage ──
function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── Generate unique ID ──
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Today as YYYY-MM-DD ──
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// ── Tomorrow as YYYY-MM-DD ──
function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

// ── Format date to readable "12 Sep 2026" ──
function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Format relative date ──
function fmtRelDate(dateStr) {
  if (!dateStr) return '—';
  const t = todayStr(), tom = tomorrowStr();
  const yest = (() => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().split('T')[0]; })();
  if (dateStr === t)    return 'Today';
  if (dateStr === tom)  return 'Tomorrow';
  if (dateStr === yest) return 'Yesterday';
  return fmtDate(dateStr);
}

// ── Format time "10:30" → "10:30 AM" ──
function fmtTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// ── Get 2-letter initials from name ──
function initials(name) {
  if (!name) return '??';
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ── Status CSS class helper ──
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
const ALL_ACTIVITY = ['Called','Message','Not Touch'];
const ACTIVITY_ICON = { 'Called': '📞', 'Message': '💬', 'Not Touch': '❌' };

// ── Cities list ──
const CITIES = [
  'Morbi','Rajkot','Ahmedabad','Surat','Vadodara','Gandhinagar','Bhavnagar',
  'Jamnagar','Junagadh','Gondal','Porbandar','Surendranagar','Anand','Mehsana',
  'Bharuch','Vapi','Navsari','Kutch','Bhuj','Gandhidham','Amreli','Dhoraji',
  'Jetpur','Wankaner','Halvad','Mumbai','Pune','Delhi','Kolkata','Chennai',
  'Hyderabad','Bangalore','Jaipur','Udaipur','Jodhpur','Indore','Bhopal',
  'Nagpur','Nashik','Aurangabad','Other'
];

// ── CRM Operations ──

function addCompany(data) {
  const db = loadData();
  const now = new Date().toISOString();
  const company = { id: genId(), ...data, createdAt: now, updatedAt: now };
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

function changeStatus(id, status) {
  updateCompany(id, { status });
}

function addReminder(companyId, date, time) {
  const db = loadData();
  const reminder = { id: genId(), companyId, date, time, status: 'Pending', createdAt: new Date().toISOString() };
  db.reminders.unshift(reminder);
  saveData(db);
  return reminder;
}

function getReminders() {
  return loadData().reminders;
}

function markReminderDone(id) {
  const db = loadData();
  db.reminders = db.reminders.map(r => r.id === id ? { ...r, status: 'Done' } : r);
  saveData(db);
}

function getTodayReminders() {
  const t = todayStr();
  return loadData().reminders
    .filter(r => r.date === t && r.status === 'Pending')
    .sort((a,b) => a.time.localeCompare(b.time));
}

function getMissedReminders() {
  const t = todayStr();
  return loadData().reminders
    .filter(r => r.date < t && r.status === 'Pending')
    .sort((a,b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time));
}

function getTomorrowReminders() {
  const tom = tomorrowStr();
  return loadData().reminders
    .filter(r => r.date === tom && r.status === 'Pending')
    .sort((a,b) => a.time.localeCompare(b.time));
}

function addActivity({ companyId, reminderId, type, notes, nextFollowUpDate, nextFollowUpTime }) {
  const db = loadData();
  const activity = {
    id: genId(), companyId, reminderId, type, notes,
    nextFollowUpDate: nextFollowUpDate || '',
    nextFollowUpTime: nextFollowUpTime || '',
    createdAt: new Date().toISOString()
  };
  db.activities.unshift(activity);

  // Mark reminder done
  db.reminders = db.reminders.map(r => r.id === reminderId ? { ...r, status: 'Done' } : r);

  // Schedule next follow-up reminder
  if (nextFollowUpDate) {
    const nextR = {
      id: genId(), companyId, date: nextFollowUpDate,
      time: nextFollowUpTime || '10:00', status: 'Pending',
      createdAt: new Date().toISOString()
    };
    db.reminders.unshift(nextR);

    // If company was Untouch, promote to Follow-up
    db.companies = db.companies.map(c =>
      c.id === companyId && c.status === 'Untouch'
        ? { ...c, status: 'Follow-up', updatedAt: new Date().toISOString() }
        : c
    );
  }
  saveData(db);
}

function getCompanyActivities(companyId) {
  return loadData().activities
    .filter(a => a.companyId === companyId)
    .sort((a,b) => b.createdAt.localeCompare(a.createdAt));
}

// ── Counts for badges ──
function getCounts() {
  return {
    today:    getTodayReminders().length,
    missed:   getMissedReminders().length,
    tomorrow: getTomorrowReminders().length,
  };
}

// ── Export data as JSON file (backup) ──
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

// ── Import data from JSON file (restore) ──
function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.companies || !data.reminders || !data.activities) {
          reject('Invalid backup file');
          return;
        }
        saveData(data);
        resolve(data);
      } catch {
        reject('Could not read file');
      }
    };
    reader.readAsText(file);
  });
}

// ── DOM Helpers ──
function qs(sel, parent = document) { return parent.querySelector(sel); }
function qsa(sel, parent = document) { return [...parent.querySelectorAll(sel)]; }
function show(el) { if (el) el.classList.remove('hidden'); }
function hide(el) { if (el) el.classList.add('hidden'); }

// ── Navigate (SPA-like between pages) ──
function goTo(page) {
  window.location.href = page;
}
