# Dwarkesh Polyfab CRM
**Sales Follow-up & Lead Management System**

---

## 📁 File Structure

```
dwarkesh-crm-html/
├── index.html              ← 🏠 Home Page (open this to start)
│
├── pages/
│   ├── reminders.html      ← 📋 Today / Missed / Tomorrow Reminders
│   ├── add.html            ← ➕ Add New Company
│   ├── data.html           ← 📊 All Companies List
│   └── company.html        ← 🏢 Company Details & History
│
├── assets/
│   ├── style.css           ← 🎨 All styles (colors, layout, fonts)
│   ├── app.js              ← ⚙️  All logic & data functions
│   ├── logo.png            ← 🖼️ Company logo
│   └── logo.webp           ← 🖼️ Company logo (webp format)
│
└── README.md               ← 📖 This file
```

---

## 🚀 How to Use

### On Computer
1. Double-click **`index.html`** to open in browser
2. That's it! No installation needed.

### On Mobile
1. Connect phone and computer to **same Wi-Fi**
2. Find your computer's IP address (run `ipconfig` in terminal)
3. Open `http://YOUR-IP/index.html` in phone browser

---

## 📱 Features

| Page | What it does |
|------|-------------|
| 🏠 Home | Dashboard with stats and quick navigation |
| 📋 Reminders | Today's / Missed / Tomorrow's follow-up reminders |
| ➕ Add Data | Add new company with name, city, nature, phone, status |
| 📊 Data | View all companies, filter by status, search |
| 🏢 Company | Full history, add reminder, change status, delete |

---

## 💾 Data Storage

- All data is saved in **browser localStorage** (no server needed)
- Data stays permanently even after closing the browser
- Use **Backup** button on Home to download a `.json` file
- Use **Restore** button to reload data from a backup file

---

## ✏️ How to Edit / Add Features

- **Change colors/fonts** → Edit `assets/style.css`
- **Add new logic / features** → Edit `assets/app.js`
- **Change a page** → Edit the `.html` file in `pages/` folder
- **Add a new page** → Create new `.html` in `pages/` folder, link it in `index.html`

---

## 🔄 Status Types

| Status | Meaning |
|--------|---------|
| Untouch | Not yet contacted |
| Follow-up | In regular follow-up |
| Need to Visit | Physical visit required |
| No Need to Follow | Not interested |
| Mature | Order confirmed / regular customer |

---

**Made for Dwarkesh Polyfab | Morbi, Gujarat**
