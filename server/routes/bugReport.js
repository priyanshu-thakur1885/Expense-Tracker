const express = require('express');
const nodemailer = require('nodemailer');
const BugReport = require('../models/BugReport');
const router = express.Router();

// Create transporter for sending emails
const createTransporter = () => {
  console.log('🔧 Email configuration check:');
  console.log('EMAIL_USER:', process.env.EMAIL_USER || 'fun2begin8988@gmail.com');
  console.log('EMAIL_PASS exists:', !!process.env.EMAIL_PASS);
  console.log('EMAIL_PASS value:', process.env.EMAIL_PASS ? '***' + process.env.EMAIL_PASS.slice(-4) : 'undefined');
  
  // Check if email credentials are configured
  if (!process.env.EMAIL_PASS || process.env.EMAIL_PASS === 'your-app-password') {
    console.log('⚠️ Email not configured - using console logging instead');
    return null;
  }
  
  console.log('✅ Creating email transporter...');
  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER || 'fun2begin8988@gmail.com',
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Send bug report email
const sendBugReportEmail = async (bugData) => {
  try {
    const transporter = createTransporter();
    
    // If email is not configured, log to console instead
    if (!transporter) {
      console.log('\n🐛 BUG REPORT RECEIVED:');
      console.log('=====================================');
      console.log(`Title: ${bugData.title}`);
      console.log(`Severity: ${bugData.severity}`);
      console.log(`Description: ${bugData.description}`);
      if (bugData.steps) console.log(`Steps: ${bugData.steps}`);
      if (bugData.expected) console.log(`Expected: ${bugData.expected}`);
      if (bugData.actual) console.log(`Actual: ${bugData.actual}`);
      console.log(`Reporter: ${bugData.userName} (${bugData.userEmail})`);
      console.log(`Time: ${new Date(bugData.timestamp).toLocaleString()}`);
      console.log(`URL: ${bugData.url}`);
      console.log('=====================================\n');
      
      return { success: true, messageId: 'console-log' };
    }
    
    const severityColors = {
      low: '#10B981', // green
      medium: '#F59E0B', // yellow
      high: '#EF4444', // red
      critical: '#DC2626' // dark red
    };

    const severityLabels = {
      low: 'Low Priority',
      medium: 'Medium Priority', 
      high: 'High Priority',
      critical: 'Critical Priority'
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #EF4444; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .bug-info { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid ${severityColors[bugData.severity]}; }
          .user-info { background: #e3f2fd; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .severity-badge { 
            display: inline-block; 
            padding: 4px 8px; 
            border-radius: 4px; 
            color: white; 
            font-size: 12px; 
            font-weight: bold;
            background: ${severityColors[bugData.severity]};
          }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🐛 Bug Report</h1>
            <p>New bug report submitted from Expense Tracker</p>
          </div>
          
          <div class="content">
            <div class="bug-info">
              <h2>${bugData.title}</h2>
              <span class="severity-badge">${severityLabels[bugData.severity]}</span>
              <p><strong>Description:</strong></p>
              <p>${bugData.description.replace(/\n/g, '<br>')}</p>
            </div>

            ${bugData.steps ? `
            <div class="bug-info">
              <h3>Steps to Reproduce:</h3>
              <p>${bugData.steps.replace(/\n/g, '<br>')}</p>
            </div>
            ` : ''}

            ${bugData.expected || bugData.actual ? `
            <div class="bug-info">
              <h3>Expected vs Actual:</h3>
              ${bugData.expected ? `<p><strong>Expected:</strong> ${bugData.expected.replace(/\n/g, '<br>')}</p>` : ''}
              ${bugData.actual ? `<p><strong>Actual:</strong> ${bugData.actual.replace(/\n/g, '<br>')}</p>` : ''}
            </div>
            ` : ''}

            <div class="user-info">
              <h3>Reporter Information:</h3>
              <p><strong>Name:</strong> ${bugData.userName || 'Unknown'}</p>
              <p><strong>Email:</strong> ${bugData.userEmail || 'Unknown'}</p>
              <p><strong>Reported at:</strong> ${new Date(bugData.timestamp).toLocaleString()}</p>
              <p><strong>Page URL:</strong> ${bugData.url}</p>
              <p><strong>User Agent:</strong> ${bugData.userAgent}</p>
            </div>
          </div>
          
          <div class="footer">
            <p>This bug report was automatically generated from Expense Tracker</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER || 'fun2begin8988@gmail.com',
      to: 'fun2begin8988@gmail.com',
      subject: `🐛 Bug Report: ${bugData.title} (${severityLabels[bugData.severity]})`,
      html: htmlContent,
      text: `
Bug Report: ${bugData.title}
Severity: ${severityLabels[bugData.severity]}

Description:
${bugData.description}

${bugData.steps ? `Steps to Reproduce:\n${bugData.steps}\n` : ''}

${bugData.expected ? `Expected: ${bugData.expected}\n` : ''}
${bugData.actual ? `Actual: ${bugData.actual}\n` : ''}

Reporter: ${bugData.userName} (${bugData.userEmail})
Reported at: ${new Date(bugData.timestamp).toLocaleString()}
Page URL: ${bugData.url}

This bug report was automatically generated from Expense Tracker
      `
    };

    console.log('📧 Attempting to send email...');
    console.log('📧 To:', mailOptions.to);
    console.log('📧 Subject:', mailOptions.subject);
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Bug report email sent successfully:', result.messageId);
    console.log('✅ Email response:', result.response);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error sending bug report email:', error);
    return { success: false, error: error.message };
  }
};

// POST /api/bug-report
router.post('/', async (req, res) => {
  try {
    console.log('🐛 Bug report received:', req.body);
    const bugData = req.body;
    
    // Validate required fields
    if (!bugData.title || !bugData.description) {
      console.log('❌ Validation failed: Missing title or description');
      return res.status(400).json({ 
        success: false, 
        message: 'Title and description are required' 
      });
    }

    console.log('✅ Validation passed, processing bug report...');
    
    // Save to MongoDB Atlas
    const bugReport = new BugReport({
      title: bugData.title,
      description: bugData.description,
      severity: bugData.severity || 'medium',
      steps: bugData.steps || '',
      expected: bugData.expected || '',
      actual: bugData.actual || '',
      userEmail: bugData.userEmail || 'unknown@example.com',
      userName: bugData.userName || 'Unknown User',
      userPhoto: bugData.userPhoto || '',
      userAgent: bugData.userAgent || '',
      url: bugData.url || '',
      reportedAt: new Date(bugData.timestamp) || new Date()
    });

    const savedBugReport = await bugReport.save();
    console.log('✅ Bug report saved to database with ID:', savedBugReport._id);
    
    // Send email
    const emailResult = await sendBugReportEmail(bugData);
    
    if (emailResult.success) {
      console.log('✅ Bug report processed successfully - Email sent and saved to DB');
      res.json({ 
        success: true, 
        message: 'Bug report sent successfully',
        messageId: emailResult.messageId,
        bugReportId: savedBugReport._id
      });
    } else {
      console.log('⚠️ Bug report saved to DB but email failed:', emailResult.error);
      // Still return success since it's saved to database
      res.json({ 
        success: true, 
        message: 'Bug report saved successfully (email failed)',
        bugReportId: savedBugReport._id,
        emailError: emailResult.error
      });
    }
  } catch (error) {
    console.error('❌ Error processing bug report:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/bug-report - Get all bug reports (Admin only)
router.get('/', async (req, res) => {
  try {
    const { status, severity, page = 1, limit = 20 } = req.query;
    
    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get bug reports with pagination
    const bugReports = await BugReport.find(filter)
      .sort({ reportedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');
    
    // Get total count for pagination
    const total = await BugReport.countDocuments(filter);
    
    res.json({
      success: true,
      bugReports,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: bugReports.length,
        totalCount: total
      }
    });
  } catch (error) {
    console.error('Error fetching bug reports:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/bug-report/stats - Get bug report statistics (Admin only)
router.get('/stats', async (req, res) => {
  try {
    const stats = await BugReport.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0,
      critical: 0, high: 0, medium: 0, low: 0
    };

    res.json({
      success: true,
      stats: result
    });
  } catch (error) {
    console.error('Error fetching bug report stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/bug-report/:id - Update bug report status (Admin only)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, adminNotes, assignedTo } = req.body;
    
    const updateData = { lastUpdated: new Date() };
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (adminNotes) updateData.adminNotes = adminNotes;
    if (assignedTo) updateData.assignedTo = assignedTo;
    
    // Set resolvedAt if status is resolved
    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
    }
    
    const bugReport = await BugReport.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    if (!bugReport) {
      return res.status(404).json({
        success: false,
        message: 'Bug report not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Bug report updated successfully',
      bugReport
    });
  } catch (error) {
    console.error('Error updating bug report:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
