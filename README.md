# 🎓 MCQ Grading System

A modern, automated Multiple Choice Question grading web application built with **Node.js**, **Express**, and vanilla **HTML/CSS/JavaScript**.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v16+ ([nodejs.org](https://nodejs.org))
- **npm** (comes with Node.js)

### Installation

```bash
# 1. Navigate to project folder
cd mcq-grading

# 2. Install dependencies
npm install

# 3. Start the server
npm start
```

Then open your browser at: **http://localhost:3000**

---

## 📋 Features

| Feature | Description |
|---|---|
| **Create Exam** | Set up exams with title, subject, marks, and answer keys |
| **Manual Grading** | Enter student answers via interactive grid |
| **File Upload** | Upload CSV, JSON, or TXT answer sheets |
| **Bulk Grading** | Grade entire class with one JSON upload |
| **PDF Reports** | Download professional PDF grading reports |
| **JSON Export** | Export result data as JSON |
| **Dashboard** | Live stats: pass rate, averages, counts |
| **Results History** | View and search all past results |

---

## 📁 Project Structure

```
mcq-grading/
├── server.js              # Express server entry point
├── package.json           # Dependencies
├── routes/
│   ├── grading.js         # Grading API routes
│   └── reports.js         # Report generation routes
├── public/
│   ├── index.html         # Single-page frontend
│   ├── css/
│   │   └── style.css      # Styling
│   └── js/
│       └── app.js         # Frontend JavaScript
└── uploads/               # Temporary file uploads (auto-created)
```

---

## 🔌 API Endpoints

### Exams
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/grade/create-exam` | Create a new exam with answer key |
| `GET` | `/api/grade/exams` | List all exams |

### Grading
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/grade/submit` | Grade a student's answers (JSON body) |
| `POST` | `/api/grade/upload` | Grade from uploaded file (multipart) |
| `POST` | `/api/grade/bulk-grade` | Grade multiple students at once |
| `GET` | `/api/grade/result/:id` | Get a specific result |

### Reports
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/reports/pdf/:resultId` | Download PDF report |
| `GET` | `/api/reports/json/:resultId` | Download JSON data |
| `GET` | `/api/reports/all` | List all results |

---

## 📄 File Upload Formats

### CSV
```
1,A
2,B
3,C
```

### JSON
```json
["A", "B", "C", "D", "A"]
```

### TXT (one answer per line)
```
A
B
C
```

### Bulk JSON (for multiple students)
```json
[
  { "name": "Alice Smith", "id": "S001", "answers": ["A","B","C","D","A"] },
  { "name": "Bob Jones",   "id": "S002", "answers": ["A","A","C","D","B"] }
]
```

---

## 🎨 Grading Scale

| Grade | Percentage |
|---|---|
| A+ | 90–100% |
| A  | 80–89%  |
| B  | 70–79%  |
| C  | 60–69%  |
| D  | 50–59%  |
| F  | Below 50% |

---

## ⚙️ Configuration

Edit the top of `server.js` to change the port:
```js
const PORT = process.env.PORT || 3000;
```

Or use an environment variable:
```bash
PORT=8080 npm start
```

---

## 🛠️ Development Mode (auto-restart)

```bash
npm run dev
```

Requires `nodemon` (included in devDependencies).

---

## 📝 Notes

- All data is stored **in memory** — it resets when the server restarts
- For production use, integrate a database like MongoDB or SQLite
- Uploaded files are deleted immediately after processing

---

**Built with ❤️ — MCQ Grading System**
