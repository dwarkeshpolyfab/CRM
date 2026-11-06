// ============================================================
//  Dwarkesh Polyfab CRM - Google Contact Auto Sync
//  Version: 2.0 (Fresh Start - Firebase Empty)
//
//  HOW IT WORKS:
//  - initKnownPhones() → reads ALL your CURRENT Google Contacts
//    and marks them as "already known" so they are NEVER added
//  - syncNewContacts()  → runs every 15 min, adds only NEW contacts
//  - New contact = saved AFTER you ran initKnownPhones
// ============================================================

const FIREBASE_URL = 'https://dwarkesh-crm-default-rtdb.asia-southeast1.firebasedatabase.app';

// ─────────────────────────────────────────────────────────────
//  FUNCTION 1: Run this ONCE first
//  Reads ALL your existing Google Contacts and marks them
//  so they are NEVER added to CRM (you deleted those already)
//  Only NEW contacts saved AFTER this run will appear in CRM
// ─────────────────────────────────────────────────────────────
function initKnownPhones() {
  Logger.log('⏳ Reading ALL your current Google Contacts...');

  var contacts = ContactsApp.getContacts();
  Logger.log('Total contacts in Google: ' + contacts.length);

  var phoneBatch = {};
  var count = 0;

  contacts.forEach(function(contact) {
    var phones = contact.getPhones();
    if (phones.length === 0) return;

    var phone10 = normalizePhone(phones[0].getPhoneNumber());
    if (!phone10) return;

    phoneBatch[phone10] = true;
    count++;
  });

  // Save to Firebase — these phones will NEVER be re-added
  var resp = UrlFetchApp.fetch(
    FIREBASE_URL + '/crm_data/synced_phones.json',
    {
      method: 'PUT',
      contentType: 'application/json',
      payload: JSON.stringify(phoneBatch),
      muteHttpExceptions: true
    }
  );

  if (resp.getResponseCode() === 200) {
    Logger.log('✅ SUCCESS! Marked ' + count + ' existing contacts as KNOWN.');
    Logger.log('These contacts will NEVER be added to CRM.');
    Logger.log('Only NEW contacts saved after this moment will appear in CRM as New Arrival.');
  } else {
    Logger.log('❌ Firebase error: ' + resp.getResponseCode());
  }
}

// ─────────────────────────────────────────────────────────────
//  FUNCTION 2: Runs automatically every 15 minutes
//  Finds NEW contacts and adds them to CRM as "New Arrival"
// ─────────────────────────────────────────────────────────────
function syncNewContacts() {
  Logger.log('🔄 Sync started: ' + new Date().toLocaleString('en-IN'));

  // Get all already-known phones from Firebase
  var knownPhones = getKnownPhones();
  Logger.log('Known phones: ' + knownPhones.size);

  // Get ALL Google Contacts
  var contacts = ContactsApp.getContacts();
  Logger.log('Total Google Contacts: ' + contacts.length);

  var added = 0;
  var skipped = 0;
  var now = new Date().toISOString();

  contacts.forEach(function(contact) {
    var name = contact.getFullName();
    var phones = contact.getPhones();

    // Skip if no name or no phone
    if (!name || !name.trim() || phones.length === 0) {
      skipped++;
      return;
    }

    // Normalize phone to 10 digits
    var phone10 = normalizePhone(phones[0].getPhoneNumber());
    if (!phone10) { skipped++; return; }

    // Skip if already known (old contact)
    if (knownPhones.has(phone10)) { skipped++; return; }

    // ✅ NEW CONTACT! Add to CRM as New Arrival
    var cleanedName = cleanName(name);
    var id = 'gc_' + phone10 + '_' + Date.now().toString(36);

    var company = {
      id:           id,
      name:         cleanedName,
      phone:        phone10,
      city:         '',
      state:        '',
      nature:       'Trader',
      status:       'Untouch',
      segment:      'new_arrival',
      rating:       'not_set',
      products:     [],
      companyNotes: 'Auto-imported from Google Contacts — ' + new Date().toLocaleDateString('en-IN'),
      createdAt:    now,
      updatedAt:    now,
      source:       'gmail_contact'
    };

    var pushResp = UrlFetchApp.fetch(
      FIREBASE_URL + '/crm_data/companies/' + id + '.json',
      {
        method:      'PUT',
        contentType: 'application/json',
        payload:     JSON.stringify(company),
        muteHttpExceptions: true
      }
    );

    if (pushResp.getResponseCode() === 200) {
      markPhoneSynced(phone10);
      knownPhones.add(phone10);
      added++;
      Logger.log('🆕 Added: ' + cleanedName + ' (' + phone10 + ')');
    } else {
      Logger.log('⚠️ Failed to add: ' + cleanedName);
    }

    Utilities.sleep(150); // avoid rate limiting
  });

  Logger.log('────────────────────────────');
  Logger.log('✅ Sync complete!');
  Logger.log('   NEW added:  ' + added);
  Logger.log('   Skipped:    ' + skipped + ' (already known)');
  Logger.log('────────────────────────────');
}

// ─────────────────────────────────────────────────────────────
//  FUNCTION 3: Set up 15-minute auto trigger
//  Run this ONCE — sync will run automatically forever after
// ─────────────────────────────────────────────────────────────
function createAutoTrigger() {
  // Remove old triggers first
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'syncNewContacts') {
      ScriptApp.deleteTrigger(t);
      Logger.log('🗑️ Deleted old trigger');
    }
  });

  // Create new 15-minute trigger
  ScriptApp.newTrigger('syncNewContacts')
    .timeBased()
    .everyMinutes(15)
    .create();

  Logger.log('✅ Auto-trigger created!');
  Logger.log('syncNewContacts() will now run EVERY 15 MINUTES automatically.');
  Logger.log('Check the ⏰ Triggers tab (left sidebar) to confirm.');
}

// ─────────────────────────────────────────────────────────────
//  HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────

function getKnownPhones() {
  var resp = UrlFetchApp.fetch(
    FIREBASE_URL + '/crm_data/synced_phones.json?shallow=true',
    { muteHttpExceptions: true }
  );
  if (resp.getResponseCode() !== 200) return new Set();
  var data = JSON.parse(resp.getContentText());
  return new Set(data ? Object.keys(data) : []);
}

function markPhoneSynced(phone10) {
  UrlFetchApp.fetch(
    FIREBASE_URL + '/crm_data/synced_phones/' + phone10 + '.json',
    {
      method:      'PUT',
      contentType: 'application/json',
      payload:     'true',
      muteHttpExceptions: true
    }
  );
}

function normalizePhone(raw) {
  if (!raw) return null;
  var d = raw.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0'))  d = d.slice(1);
  if (d.length === 10 && /^[6-9]/.test(d))   return d;
  return null;
}

function cleanName(name) {
  return name
    .replace(/^(Dwarkesh\s*Polyfab\s*|Dwarkesh\s+|DwarkeshPL\s+|PL\s+|P\.?\s*L\.?\s+|PBN\s+|P\.?\s*B\.?\s*N\.?\s+|PB\s+|P\.?\s*B\.?\s+)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}
