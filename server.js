const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware (order matters)
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Routes
const authRoutes = require('./routes/auth');
const gradingRouter = require('./routes/grading');
const reportRouter = require('./routes/reports');

app.use('/api/auth', authRoutes.router);
app.use('/api/grade', gradingRouter);
app.use('/api/reports', reportRouter);

// Serve index.html for all other routes (client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🎓 MCQ Grading System running at http://localhost:${PORT}\n`);
});

module.exports = app;