/* =========================================
   MCQ Grading System — Frontend JS
   ========================================= */

const API = '';  // Relative URL — same server

// ===== State =====
let exams = [];
let currentResultId = null;
let bulkStudentsData = null;
let selectedFile = null;
let currentInputMode = 'manual';

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  setupInputTabs();
  setupUploadZone();
  setupBulkUpload();
  loadExams();
  loadAllResults();
  updateDashboard();

  document.getElementById('numQuestions').addEventListener('input', renderAnswerKeyGrid);
  document.getElementById('generateAKBtn').addEventListener('click', renderAnswerKeyGrid);
  document.getElementById('createExamBtn').addEventListener('click', createExam);
  document.getElementById('gradeBtn').addEventListener('click', gradeAnswers);
  document.getElementById('bulkGradeBtn').addEventListener('click', bulkGrade);
  document.getElementById('resultsSearch').addEventListener('input', filterResults);
  document.getElementById('menuBtn').addEventListener('click', toggleSidebar);
});

// ===== Navigation =====
function setupNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
      if (window.innerWidth <= 900) closeSidebar();
    });
  });
}

function switchTab(tab) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`tab-${tab}`).classList.add('active');
  const titles = {
    dashboard: 'Dashboard', 'create-exam': 'Create Exam',
    grade: 'Grade Answers', bulk: 'Bulk Grade', results: 'All Results'
  };
  document.getElementById('pageTitle').textContent = titles[tab] || tab;

  if (tab === 'grade' || tab === 'bulk') loadExams();
  if (tab === 'results') loadAllResults();
  if (tab === 'dashboard') updateDashboard();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
}

// ===== Input Tabs =====
function setupInputTabs() {
  document.querySelectorAll('.input-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.input-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.input-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      currentInputMode = tab.dataset.input;
      document.getElementById(`panel-${currentInputMode}`).classList.add('active');
    });
  });
}

// ===== Upload Zone =====
function setupUploadZone() {
  const zone = document.getElementById('uploadZone');
  const input = document.getElementById('fileInput');

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
  });
  input.addEventListener('change', () => { if (input.files[0]) handleFileSelect(input.files[0]); });
}

function handleFileSelect(file) {
  selectedFile = file;
  const info = document.getElementById('fileInfo');
  info.className = 'file-info';
  info.innerHTML = `📄 <strong>${file.name}</strong> — ${(file.size / 1024).toFixed(1)} KB`;
}

// ===== Bulk Upload =====
function setupBulkUpload() {
  const zone = document.getElementById('bulkUploadZone');
  const input = document.getElementById('bulkFileInput');

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleBulkFile(e.dataTransfer.files[0]);
  });
  input.addEventListener('change', () => { if (input.files[0]) handleBulkFile(input.files[0]); });
}

function handleBulkFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      bulkStudentsData = JSON.parse(e.target.result);
      document.getElementById('bulkUploadZone').querySelector('.upload-text').textContent =
        `✅ Loaded ${bulkStudentsData.length} students`;
      showToast(`Loaded ${bulkStudentsData.length} student records`, 'success');
    } catch (err) {
      showToast('Invalid JSON file', 'error');
    }
  };
  reader.readAsText(file);
}

// ===== Load Exams =====
async function loadExams() {
  try {
    const res = await fetch(`${API}/api/grade/exams`);
    const data = await res.json();
    exams = data.exams || [];
    populateExamSelects();
    document.getElementById('stat-exams').textContent = exams.length;
  } catch (e) {
    console.warn('Could not load exams', e);
  }
}

function populateExamSelects() {
  ['gradeExamSelect', 'bulkExamSelect'].forEach(id => {
    const sel = document.getElementById(id);
    const current = sel.value;
    sel.innerHTML = '<option value="">— Select an exam —</option>';
    exams.forEach(exam => {
      const opt = document.createElement('option');
      opt.value = exam.id;
      opt.textContent = `${exam.title} (${exam.totalQuestions}Q)`;
      sel.appendChild(opt);
    });
    if (current) sel.value = current;
  });

  // When grade exam changes, rebuild student answer grid
  document.getElementById('gradeExamSelect').addEventListener('change', function() {
    const exam = exams.find(e => e.id === this.value);
    if (exam) renderStudentAnswerGrid(exam.totalQuestions);
  });
}

// ===== Answer Key Grid =====
function renderAnswerKeyGrid() {
  const n = parseInt(document.getElementById('numQuestions').value) || 0;
  const grid = document.getElementById('answerKeyGrid');
  if (n < 1 || n > 200) { grid.innerHTML = ''; return; }

  grid.innerHTML = '';
  for (let i = 1; i <= n; i++) {
    const row = createOptionRow(i, 'ak', ['A','B','C','D','E']);
    grid.appendChild(row);
  }
}

function renderStudentAnswerGrid(n) {
  const grid = document.getElementById('studentAnswerGrid');
  grid.innerHTML = '';
  for (let i = 1; i <= n; i++) {
    const row = createOptionRow(i, 'sa', ['A','B','C','D','E','-']);
    grid.appendChild(row);
  }
}

function createOptionRow(num, prefix, opts) {
  const row = document.createElement('div');
  row.className = 'ak-row';

  const qnum = document.createElement('span');
  qnum.className = 'ak-qnum';
  qnum.textContent = `Q${num}`;
  row.appendChild(qnum);

  const optsDiv = document.createElement('div');
  optsDiv.className = 'ak-options';

  opts.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.textContent = opt;
    btn.dataset.q = num;
    btn.dataset.opt = opt;
    btn.addEventListener('click', () => {
      optsDiv.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    optsDiv.appendChild(btn);
  });

  row.appendChild(optsDiv);
  return row;
}

function getAnswerKeyValues() {
  const grid = document.getElementById('answerKeyGrid');
  const rows = grid.querySelectorAll('.ak-row');
  return Array.from(rows).map(row => {
    const sel = row.querySelector('.opt-btn.selected');
    return sel ? sel.dataset.opt : '';
  });
}

function getStudentAnswerValues() {
  const grid = document.getElementById('studentAnswerGrid');
  const rows = grid.querySelectorAll('.ak-row');
  return Array.from(rows).map(row => {
    const sel = row.querySelector('.opt-btn.selected');
    return sel ? (sel.dataset.opt === '-' ? '' : sel.dataset.opt) : '';
  });
}

// ===== Create Exam =====
async function createExam() {
  const title = document.getElementById('examTitle').value.trim();
  const subject = document.getElementById('examSubject').value.trim();
  const totalMarks = parseInt(document.getElementById('totalMarks').value) || null;
  const passMark = parseInt(document.getElementById('passMark').value) || null;
  const timeLimit = parseInt(document.getElementById('timeLimit').value) || null;
  const numQ = parseInt(document.getElementById('numQuestions').value);
  const answerKey = getAnswerKeyValues();

  const msgEl = document.getElementById('createExamMsg');

  if (!title) return showMsg(msgEl, 'Exam title is required.', 'error');
  if (!numQ || numQ < 1) return showMsg(msgEl, 'Please enter number of questions and generate the grid.', 'error');
  if (answerKey.some(a => !a)) return showMsg(msgEl, 'Please select answers for all questions.', 'error');

  const btn = document.getElementById('createExamBtn');
  btn.disabled = true;
  btn.textContent = 'Creating...';

  try {
    const res = await fetch(`${API}/api/grade/create-exam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, subject, totalMarks, passMark, timeLimit, answerKey })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showMsg(msgEl, `✅ Exam "${title}" created! ID: ${data.examId.slice(0,8)}...`, 'success');
    showToast('Exam created successfully!', 'success');
    await loadExams();
    updateDashboard();
  } catch (err) {
    showMsg(msgEl, `Error: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Exam ✦';
  }
}

function resetCreateForm() {
  ['examTitle','examSubject','totalMarks','passMark','numQuestions','timeLimit'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('answerKeyGrid').innerHTML = '';
  document.getElementById('createExamMsg').className = 'message';
}

// ===== Grade Answers =====
async function gradeAnswers() {
  const examId = document.getElementById('gradeExamSelect').value;
  const studentName = document.getElementById('gradeStudentName').value.trim();
  const studentId = document.getElementById('gradeStudentId').value.trim();
  const msgEl = document.getElementById('gradeMsg');

  if (!examId) return showMsg(msgEl, 'Please select an exam.', 'error');
  if (!studentName) return showMsg(msgEl, 'Student name is required.', 'error');

  const btn = document.getElementById('gradeBtn');
  btn.disabled = true;
  btn.textContent = 'Grading...';

  try {
    let result, resultId;

    if (currentInputMode === 'file' && selectedFile) {
      const formData = new FormData();
      formData.append('answerSheet', selectedFile);
      formData.append('examId', examId);
      formData.append('studentName', studentName);
      formData.append('studentId', studentId);

      const res = await fetch(`${API}/api/grade/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      result = data.result;
      resultId = data.resultId;
    } else {
      const answers = getStudentAnswerValues();
      if (answers.every(a => !a)) return showMsg(msgEl, 'Please enter student answers.', 'error');

      const res = await fetch(`${API}/api/grade/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId, studentName, studentId, answers })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      result = data.result;
      resultId = data.resultId;
    }

    currentResultId = resultId;
    displayResult(result);
    showMsg(msgEl, `✅ Graded! Score: ${result.score}/${result.totalMarks} (${result.percentage}%)`, 'success');
    showToast(`Graded: ${result.grade} — ${result.passed ? 'PASSED' : 'FAILED'}`, result.passed ? 'success' : 'error');
    loadAllResults();
    updateDashboard();
  } catch (err) {
    showMsg(msgEl, `Error: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Grade Now ◈';
  }
}

function displayResult(result) {
  const preview = document.getElementById('resultPreview');
  preview.style.display = 'block';

  const gradeEl = document.getElementById('previewGrade');
  gradeEl.textContent = result.grade;
  const gradeColors = { 'A+': '#22d3a0','A':'#22d3a0','B':'#60a5fa','C':'#fbbf24','D':'#fb923c','F':'#f1657b' };
  gradeEl.style.background = gradeColors[result.grade] || '#7c6ff7';

  document.getElementById('previewName').textContent = result.studentName;
  document.getElementById('previewExam').textContent = `${result.examTitle} • ${result.subject}`;
  document.getElementById('previewScore').textContent = `${result.score}/${result.totalMarks}`;
  document.getElementById('previewPct').textContent = `${result.percentage}%`;
  document.getElementById('previewCorrect').textContent = result.correct;
  document.getElementById('previewIncorrect').textContent = result.incorrect;

  const statusEl = document.getElementById('previewStatus');
  statusEl.textContent = result.passed ? 'PASSED' : 'FAILED';
  statusEl.className = 'result-status ' + (result.passed ? 'passed' : 'failed');

  setTimeout(() => {
    document.getElementById('previewBar').style.width = `${result.percentage}%`;
  }, 100);

  // Breakdown mini
  const bd = document.getElementById('previewBreakdown');
  bd.innerHTML = result.breakdown.map(b => {
    const cls = b.status === 'correct' ? 'bm-correct' : b.status === 'incorrect' ? 'bm-incorrect' : 'bm-unanswered';
    return `<div class="bm-item ${cls}" title="Q${b.question}: ${b.given} (Ans: ${b.expected})">${b.question}</div>`;
  }).join('');

  // Highlight student answer grid
  const rows = document.querySelectorAll('#studentAnswerGrid .ak-row');
  result.breakdown.forEach((b, i) => {
    const row = rows[i];
    if (!row) return;
    row.querySelectorAll('.opt-btn').forEach(btn => {
      btn.classList.remove('correct','wrong','selected');
      if (btn.dataset.opt === b.expected) btn.classList.add('correct');
      if (btn.dataset.opt === b.given && b.status === 'incorrect') btn.classList.add('wrong');
    });
  });

  document.getElementById('downloadPdfBtn').onclick = () => downloadReport('pdf');
  document.getElementById('downloadJsonBtn').onclick = () => downloadReport('json');
}

function downloadReport(type) {
  if (!currentResultId) return;
  window.open(`${API}/api/reports/${type}/${currentResultId}`, '_blank');
}

// ===== Bulk Grade =====
async function bulkGrade() {
  const examId = document.getElementById('bulkExamSelect').value;
  const msgEl = document.getElementById('bulkMsg');

  if (!examId) return showMsg(msgEl, 'Please select an exam.', 'error');
  if (!bulkStudentsData || !Array.isArray(bulkStudentsData) || bulkStudentsData.length === 0)
    return showMsg(msgEl, 'Please upload a valid students JSON file.', 'error');

  const btn = document.getElementById('bulkGradeBtn');
  btn.disabled = true;
  btn.textContent = 'Grading...';

  try {
    const res = await fetch(`${API}/api/grade/bulk-grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examId, students: bulkStudentsData })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showMsg(msgEl, `✅ Graded ${data.results.length} students! Pass rate: ${data.statistics.passRate}%`, 'success');
    showToast(`Bulk graded ${data.results.length} students`, 'success');
    displayBulkResults(data.results, data.statistics);
    loadAllResults();
    updateDashboard();
  } catch (err) {
    showMsg(msgEl, `Error: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Bulk Grade ⊕';
  }
}

function displayBulkResults(results, stats) {
  const container = document.getElementById('bulkResults');
  container.style.display = 'block';

  const statsRow = document.getElementById('bulkStatsRow');
  statsRow.innerHTML = [
    { icon: '👥', num: stats.totalStudents, label: 'Total Students' },
    { icon: '✅', num: stats.passed, label: 'Passed' },
    { icon: '❌', num: stats.failed, label: 'Failed' },
    { icon: '📊', num: `${stats.passRate}%`, label: 'Pass Rate' },
    { icon: '⬆️', num: stats.highest, label: 'Highest Score' },
    { icon: '📈', num: stats.average, label: 'Average Score' },
  ].map(s => `
    <div class="stat-card">
      <div class="stat-icon">${s.icon}</div>
      <div class="stat-info">
        <div class="stat-num">${s.num}</div>
        <div class="stat-label">${s.label}</div>
      </div>
    </div>
  `).join('');

  const table = document.getElementById('bulkTable');
  table.innerHTML = `
    <table>
      <thead><tr>
        <th>#</th><th>Student</th><th>ID</th><th>Score</th><th>%</th><th>Grade</th><th>Status</th><th>Actions</th>
      </tr></thead>
      <tbody>
        ${results.map((r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td><strong style="color:var(--text)">${r.studentName}</strong></td>
            <td>${r.studentId}</td>
            <td>${r.score}/${r.totalMarks}</td>
            <td>${r.percentage}%</td>
            <td><span class="grade-pill grade-${r.grade.replace('+','-plus')}">${r.grade}</span></td>
            <td><span class="${r.passed ? 'pass-badge' : 'fail-badge'}">${r.passed ? 'PASS' : 'FAIL'}</span></td>
            <td>
              <a href="${API}/api/reports/pdf/${r.resultId}" target="_blank" class="btn btn-sm btn-ghost">PDF</a>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// ===== All Results =====
let allResultsData = [];

async function loadAllResults() {
  try {
    const res = await fetch(`${API}/api/reports/all`);
    const data = await res.json();
    allResultsData = data.results || [];
    renderResultsTable(allResultsData);
    renderRecentResults(allResultsData.slice(-5).reverse());
    updateDashboard(allResultsData);
  } catch (e) {
    console.warn('Could not load results', e);
  }
}

function renderResultsTable(results) {
  const container = document.getElementById('allResultsTable');
  if (!results || results.length === 0) {
    container.innerHTML = '<div class="empty-state">No results yet. Grade some answers to see them here.</div>';
    return;
  }
  container.innerHTML = `
    <table>
      <thead><tr>
        <th>Student</th><th>ID</th><th>Exam</th><th>Score</th><th>%</th><th>Grade</th><th>Status</th><th>Date</th><th>Actions</th>
      </tr></thead>
      <tbody>
        ${results.map(r => `
          <tr>
            <td><strong style="color:var(--text)">${r.studentName}</strong></td>
            <td style="font-size:0.8rem">${r.studentId}</td>
            <td>${r.examTitle}</td>
            <td>${r.score}/${r.totalMarks}</td>
            <td>${r.percentage}%</td>
            <td><span class="grade-pill grade-${r.grade.replace('+','-plus')}">${r.grade}</span></td>
            <td><span class="${r.passed ? 'pass-badge' : 'fail-badge'}">${r.passed ? 'PASS' : 'FAIL'}</span></td>
            <td style="font-size:0.78rem;color:var(--text3)">${new Date(r.gradedAt).toLocaleDateString()}</td>
            <td style="display:flex;gap:5px">
              <a href="${API}/api/reports/pdf/${r.resultId}" target="_blank" class="btn btn-sm btn-ghost">PDF</a>
              <a href="${API}/api/reports/json/${r.resultId}" target="_blank" class="btn btn-sm btn-ghost">JSON</a>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderRecentResults(results) {
  const container = document.getElementById('recentResults');
  if (!results || results.length === 0) {
    container.innerHTML = '<div class="empty-state">No results yet. Create an exam and grade some answers!</div>';
    return;
  }
  container.innerHTML = `
    <table>
      <thead><tr><th>Student</th><th>Exam</th><th>Score</th><th>Grade</th><th>Status</th></tr></thead>
      <tbody>
        ${results.map(r => `
          <tr>
            <td><strong style="color:var(--text)">${r.studentName}</strong></td>
            <td>${r.examTitle}</td>
            <td>${r.score}/${r.totalMarks} (${r.percentage}%)</td>
            <td><span class="grade-pill grade-${r.grade.replace('+','-plus')}">${r.grade}</span></td>
            <td><span class="${r.passed ? 'pass-badge' : 'fail-badge'}">${r.passed ? 'PASS' : 'FAIL'}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function filterResults() {
  const q = document.getElementById('resultsSearch').value.toLowerCase();
  const filtered = allResultsData.filter(r =>
    r.studentName.toLowerCase().includes(q) ||
    r.examTitle.toLowerCase().includes(q) ||
    r.studentId.toLowerCase().includes(q)
  );
  renderResultsTable(filtered);
}

// ===== Dashboard Stats =====
function updateDashboard(results) {
  if (!results) results = allResultsData;
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;

  document.getElementById('stat-students').textContent = total;
  document.getElementById('stat-passed').textContent = passed;
  document.getElementById('stat-failed').textContent = failed;
  document.getElementById('dash-total').textContent = total;

  if (total > 0) {
    const avg = (results.reduce((a, r) => a + r.percentage, 0) / total).toFixed(1);
    const passRate = ((passed / total) * 100).toFixed(1);
    document.getElementById('dash-avg').textContent = `${avg}%`;
    document.getElementById('dash-pass').textContent = `${passRate}%`;
  } else {
    document.getElementById('dash-avg').textContent = '—';
    document.getElementById('dash-pass').textContent = '—';
  }
}

// ===== Utilities =====
function showMsg(el, text, type) {
  el.textContent = text;
  el.className = `message ${type}`;
}

let toastTimer;
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}
