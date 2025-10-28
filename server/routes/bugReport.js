const express = require('express');
const nodemailer = require('nodemailer');
const multer = require('multer');
const mongoose = require('mongoose');
const BugReport = require('../models/BugReport');
const router = express.Router();
const dotenv = require('dotenv');
const { authenticateAdmin } = require('../middleware/authMiddleware');
const { createBugReport, getAllBugReports, closeBugReport } = require('../controllers/bugReportController');
dotenv.config();
router.post('/', createBugReport);
router.get('/', getAllBugReports);
router.put('/close/:id', closeBugReport);
// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
    fieldSize: 10 * 1024 * 1024 // 10 MB for text fields
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'), false);
    }
  }
});

// Create transporter for sending emails (returns null if not configured)
const createTransporter = () => {
  console.log('🔧 Email configuration check:');
  console.log('EMAIL_USER:', process.env.EMAIL_USER || 'fun2begin8988@gmail.com');
  console.log('EMAIL_PASS exists:', !!process.env.EMAIL_PASS);

  if (!process.env.EMAIL_PASS || process.env.EMAIL_PASS === 'your-app-password') {
    console.log('⚠️ Email not configured - will log bug reports to console instead of sending email');
    return null;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER || 'fun2begin8988@gmail.com',
        pass: process.env.EMAIL_PASS
      }
    });
    console.log('✅ Email transporter created');
    return transporter;
  } catch (err) {
    console.error('❌ Failed to create email transporter:', err);
    return null;
  }
};

// Send bug report email; returns { success: true, messageId } on success or { success: false, error }
const sendBugReportEmail = async (bugData) => {
  const transporter = createTransporter();
  if (!transporter) {
    // Email not configured; log details for developer and return not-sent
    console.log('\n🐛 BUG REPORT (email not configured, logged to console):');
    console.log('Title:', bugData.title);
    console.log('Severity:', bugData.severity);
    console.log('Description:', bugData.description);
    if (bugData.steps) console.log('Steps:', bugData.steps);
    if (bugData.expected) console.log('Expected:', bugData.expected);
    if (bugData.actual) console.log('Actual:', bugData.actual);
    console.log('Reporter:', bugData.userName, `<${bugData.userEmail}>`);
    console.log('Time:', new Date(bugData.timestamp || Date.now()).toLocaleString());
    console.log('URL:', bugData.url || 'unknown');
    console.log('UserAgent:', bugData.userAgent || 'unknown');
    console.log('--- End bug report ---\n');
    return { success: false, error: 'email-not-configured' };
  }

  try {
    const severityColors = { low: '#10B981', medium: '#F59E0B', high: '#EF4444', critical: '#DC2626' };
    const severityLabels = { low: 'Low Priority', medium: 'Medium Priority', high: 'High Priority', critical: 'Critical Priority' };

    const htmlContent = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
        <h2>Bug Report: ${bugData.title}</h2>
        <p><strong>Severity:</strong> ${severityLabels[bugData.severity || 'medium']}</p>
        <div style="background:#fff;padding:12px;margin:8px 0;border-radius:6px;border-left:6px solid ${severityColors[bugData.severity || 'medium']};">
          <p><strong>Description:</strong></p>
          <p>${(bugData.description || '').replace(/\n/g, '<br>')}</p>
        </div>
        ${bugData.steps ? `<div style="background:#fff;padding:12px;margin:8px 0;border-radius:6px;"><h4>Steps to reproduce</h4><p>${bugData.steps.replace(/\n/g,'<br>')}</p></div>` : ''}
        <div style="background:#eaf2ff;padding:12px;margin:8px 0;border-radius:6px;">
          <p><strong>Reporter:</strong> ${bugData.userName || 'Unknown'} (${bugData.userEmail || 'unknown'})</p>
          <p><strong>URL:</strong> ${bugData.url || 'unknown'}</p>
          <p><strong>User Agent:</strong> ${bugData.userAgent || 'unknown'}</p>
          <p><strong>Reported at:</strong> ${new Date(bugData.timestamp || Date.now()).toLocaleString()}</p>
        </div>
      </div>
    `;

    const adminTo = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || 'fun2begin8988@gmail.com';
    const mailOptions = {
      from: process.env.EMAIL_USER || 'fun2begin8988@gmail.com',
      to: adminTo,
      subject: `Bug Report: ${bugData.title}`,
      html: htmlContent,
      text: `Bug Report: ${bugData.title}\nSeverity: ${bugData.severity || 'medium'}\n\n${bugData.description}\n\nURL: ${bugData.url || 'unknown'}\nReporter: ${bugData.userName || 'Unknown'} <${bugData.userEmail || ''}>\n`
    };

    console.log(`📧 Sending bug report email to ${adminTo} ...`);
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Bug report email sent:', result && result.messageId, 'response:', result && result.response);
    return { success: true, messageId: result && result.messageId, response: result && result.response };
  } catch (err) {
    console.error('❌ Error sending bug report email:', err);
    return { success: false, error: err.message || String(err) };
  }
};

// POST /api/bug-report
router.post('/', upload.array('attachments', 5), async (req, res) => {
  try {
    console.log('🐛 Bug report received:', req.body && { title: req.body.title, user: req.body.userEmail });
    const bugData = req.body || {};

    if (!bugData.title || !bugData.description) {
      return res.status(400).json({ success: false, message: 'Title and description are required' });
    }

    // Process uploaded files
    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          filename: `${Date.now()}-${file.originalname}`,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          data: file.buffer
        });
      });
    }

    const bugReport = new BugReport({
      title: bugData.title,
      description: bugData.description,
      severity: bugData.severity || 'medium',
      steps: bugData.steps || '',
      attachments: attachments,
      userEmail: bugData.userEmail || 'unknown@example.com',
      userName: bugData.userName || 'Unknown User',
      userPhoto: bugData.userPhoto || '',
      userAgent: bugData.userAgent || '',
      url: bugData.url || '',
      reportedAt: bugData.timestamp ? new Date(bugData.timestamp) : new Date()
    });

    let saved;
    try {
      console.log('🔄 Attempting to save bug report to database...');
      saved = await bugReport.save();
      console.log('✅ Bug report saved to DB with id:', saved._id, 'attachments:', attachments.length);
      console.log('📊 Database name:', mongoose.connection.name);
      console.log('📋 Collection name:', saved.collection.name);

      // Verify the document exists in database
      const verifyDoc = await BugReport.findById(saved._id);
      if (verifyDoc) {
        console.log('✅ Document verified in database');
      } else {
        console.log('❌ Document not found after save - possible database issue');
      }
    } catch (saveErr) {
      console.error('❌ Failed to save bug report:', saveErr);
      console.error('❌ Error details:', {
        message: saveErr.message,
        name: saveErr.name,
        errors: saveErr.errors
      });
      return res.status(500).json({ success: false, message: 'Failed to save bug report', error: saveErr.message });
    }

    const emailResult = await sendBugReportEmail(bugData);
    const emailSent = !!(emailResult && emailResult.success);

    if (emailSent) {
      return res.status(201).json({ success: true, message: 'Bug report saved and email sent', bugReportId: saved._id, messageId: emailResult.messageId });
    }

    // Email not sent (either not configured or failed) — still return success for save
    return res.status(201).json({ success: true, message: 'Bug report saved (email not sent)', bugReportId: saved._id, emailError: emailResult.error });

  } catch (err) {
    console.error('❌ Error processing bug report:', err);
    return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
});


// GET /api/bug-report - list (admin)
router.get('/', async (req, res) => {
  try {
    const { status, severity, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const bugReports = await BugReport.find(filter).sort({ reportedAt: -1 }).skip(skip).limit(parseInt(limit)).select('-attachments.data');
    const total = await BugReport.countDocuments(filter);
    return res.json({ success: true, bugReports, pagination: { current: parseInt(page), total: Math.ceil(total / parseInt(limit)), count: bugReports.length, totalCount: total } });
  } catch (err) {
    console.error('Error fetching bug reports:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/bug-report/:id/attachment/:filename - serve attachment file
router.get('/:id/attachment/:filename', async (req, res) => {
  try {
    const { id, filename } = req.params;
    const bugReport = await BugReport.findById(id);

    if (!bugReport) {
      return res.status(404).json({ success: false, message: 'Bug report not found' });
    }

    const attachment = bugReport.attachments.find(att => att.filename === filename);
    if (!attachment) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }

    res.setHeader('Content-Type', attachment.mimetype);
    res.setHeader('Content-Disposition', `inline; filename="${attachment.originalName}"`);
    res.send(attachment.data);
  } catch (err) {
    console.error('Error serving attachment:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/bug-report/stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await BugReport.aggregate([{ $group: { _id: null, total: { $sum: 1 }, open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } }, inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } }, resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } }, closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } }, critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } }, high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } }, medium: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } }, low: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } } } }]);
    const result = stats[0] || { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0, critical: 0, high: 0, medium: 0, low: 0 };
    return res.json({ success: true, stats: result });
  } catch (err) {
    console.error('Error fetching bug report stats:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/bug-report/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, adminNotes, assignedTo } = req.body;
    const updateData = { lastUpdated: new Date() };
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (adminNotes) updateData.adminNotes = adminNotes;
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (status === 'resolved') updateData.resolvedAt = new Date();
    const bugReport = await BugReport.findByIdAndUpdate(id, updateData, { new: true });
    if (!bugReport) return res.status(404).json({ success: false, message: 'Bug report not found' });
    return res.json({ success: true, message: 'Bug report updated', bugReport });
  } catch (err) {
    console.error('Error updating bug report:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
