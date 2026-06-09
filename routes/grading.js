const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');

// In-memory store for exam sessions and results (now with userId)
let examStore = {};    // examId -> { ...exam, userId }
let resultStore = {};  // resultId -> { ...result, userId }

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.json', '.csv', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only JSON, CSV, and TXT files are allowed'));
  }
});

// Create a new exam with answer key (protected)
router.post('/create-exam', auth, (req, res) => {
  try {
    const { title, subject, totalMarks, passMark, answerKey, timeLimit } = req.body;

    if (!title || !answerKey || !Array.isArray(answerKey) || answerKey.length === 0) {
      return res.status(400).json({ error: 'Title and answer key are required' });
    }

    const examId = uuidv4();
    const exam = {
      id: examId,
      userId: req.user.id,          // <-- link to authenticated user
      title,
      subject: subject || 'General',
      totalMarks: totalMarks || answerKey.length,
      passMark: passMark || Math.ceil(answerKey.length * 0.5),
      timeLimit: timeLimit || null,
      answerKey,
      totalQuestions: answerKey.length,
      createdAt: new Date().toISOString()
    };

    examStore[examId] = exam;

    res.json({
      success: true,
      examId,
      message: `Exam "${title}" created with ${answerKey.length} questions`,
      exam: { ...exam, answerKey: exam.answerKey.map((a, i) => ({ question: i + 1, answer: a })) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all exams (only user's own exams)
router.get('/exams', auth, (req, res) => {
  const exams = Object.values(examStore)
    .filter(e => e.userId === req.user.id)
    .map(e => ({
      id: e.id,
      title: e.title,
      subject: e.subject,
      totalQuestions: e.totalQuestions,
      totalMarks: e.totalMarks,
      passMark: e.passMark,
      createdAt: e.createdAt
    }));
  res.json({ exams });
});

// Grade a student's answers (manual entry) – protected
router.post('/submit', auth, (req, res) => {
  try {
    const { examId, studentName, studentId, answers } = req.body;

    if (!examId || !studentName || !answers) {
      return res.status(400).json({ error: 'examId, studentName, and answers are required' });
    }

    const exam = examStore[examId];
    if (!exam || exam.userId !== req.user.id) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const result = gradeAnswers(exam, studentName, studentId || 'N/A', answers);
    const resultId = uuidv4();
    resultStore[resultId] = { ...result, userId: req.user.id }; // store with userId

    res.json({ success: true, resultId, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload and grade answer sheet (CSV/JSON/TXT file) – protected
router.post('/upload', auth, upload.single('answerSheet'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { examId, studentName, studentId } = req.body;
    if (!examId || !studentName) {
      return res.status(400).json({ error: 'examId and studentName are required' });
    }

    const exam = examStore[examId];
    if (!exam || exam.userId !== req.user.id) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    let answers = [];

    const fileContent = fs.readFileSync(filePath, 'utf8');

    if (ext === '.json') {
      const parsed = JSON.parse(fileContent);
      answers = Array.isArray(parsed) ? parsed : parsed.answers || [];
    } else if (ext === '.csv') {
      answers = fileContent.split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .map(line => {
          const parts = line.split(',');
          return parts.length > 1 ? parts[1].trim().toUpperCase() : parts[0].trim().toUpperCase();
        });
    } else if (ext === '.txt') {
      answers = fileContent.split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .map(line => {
          const match = line.match(/[A-Ea-e]/);
          return match ? match[0].toUpperCase() : line.toUpperCase();
        });
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    if (answers.length === 0) {
      return res.status(400).json({ error: 'No answers found in the uploaded file' });
    }

    const result = gradeAnswers(exam, studentName, studentId || 'N/A', answers);
    const resultId = uuidv4();
    resultStore[resultId] = { ...result, userId: req.user.id };

    res.json({ success: true, resultId, result });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

// Bulk grade multiple students (JSON array) – protected
router.post('/bulk-grade', auth, (req, res) => {
  try {
    const { examId, students } = req.body;

    if (!examId || !students || !Array.isArray(students)) {
      return res.status(400).json({ error: 'examId and students array are required' });
    }

    const exam = examStore[examId];
    if (!exam || exam.userId !== req.user.id) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const results = [];
    for (const student of students) {
      const result = gradeAnswers(exam, student.name, student.id || 'N/A', student.answers);
      const resultId = uuidv4();
      resultStore[resultId] = { ...result, userId: req.user.id };
      results.push({ resultId, ...result });
    }

    // Class statistics
    const scores = results.map(r => r.score);
    const stats = {
      totalStudents: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      highest: Math.max(...scores),
      lowest: Math.min(...scores),
      average: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2),
      passRate: ((results.filter(r => r.passed).length / results.length) * 100).toFixed(1)
    };

    res.json({ success: true, results, statistics: stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a specific result (only if it belongs to the user)
router.get('/result/:resultId', auth, (req, res) => {
  const result = resultStore[req.params.resultId];
  if (!result || result.userId !== req.user.id) {
    return res.status(404).json({ error: 'Result not found' });
  }
  res.json(result);
});

// Core grading function (unchanged except no store access)
function gradeAnswers(exam, studentName, studentId, answers) {
  const answerKey = exam.answerKey;
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;
  const breakdown = [];

  for (let i = 0; i < answerKey.length; i++) {
    const expected = (answerKey[i] || '').toString().toUpperCase().trim();
    const given = answers[i] ? answers[i].toString().toUpperCase().trim() : '';

    let status;
    if (!given || given === '' || given === '-') {
      status = 'unanswered';
      unanswered++;
    } else if (given === expected) {
      status = 'correct';
      correct++;
    } else {
      status = 'incorrect';
      incorrect++;
    }

    breakdown.push({
      question: i + 1,
      given: given || '—',
      expected,
      status,
      marks: status === 'correct' ? (exam.totalMarks / answerKey.length) : 0
    });
  }

  const marksPerQuestion = exam.totalMarks / answerKey.length;
  const score = correct * marksPerQuestion;
  const percentage = ((score / exam.totalMarks) * 100).toFixed(1);
  const passed = score >= exam.passMark;

  let grade = '';
  const pct = parseFloat(percentage);
  if (pct >= 90) grade = 'A+';
  else if (pct >= 80) grade = 'A';
  else if (pct >= 70) grade = 'B';
  else if (pct >= 60) grade = 'C';
  else if (pct >= 50) grade = 'D';
  else grade = 'F';

  return {
    studentName,
    studentId,
    examTitle: exam.title,
    subject: exam.subject,
    totalQuestions: answerKey.length,
    totalMarks: exam.totalMarks,
    passMark: exam.passMark,
    correct,
    incorrect,
    unanswered,
    score: parseFloat(score.toFixed(2)),
    percentage: parseFloat(percentage),
    passed,
    grade,
    breakdown,
    gradedAt: new Date().toISOString()
  };
}

module.exports = router;
module.exports.examStore = examStore;
module.exports.resultStore = resultStore;