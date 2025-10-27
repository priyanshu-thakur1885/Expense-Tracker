// controllers/bugReportController.js
import BugReport from '../models/BugReport.js';
import Notification from '../models/Notification.js';

// 📌 Create a new bug report
export const createBugReport = async (req, res) => {
  try {
    const {
      title,
      description,
      steps,
      severity,
      userEmail,
      userName,
      userPhoto,
      timestamp,
      userAgent,
      url,
    } = req.body;

    // handle attachments
    const attachments = (req.files || []).map(file => ({
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      data: file.buffer,
    }));

    const bugReport = new BugReport({
      title,
      description,
      steps,
      severity,
      userEmail,
      userName,
      userPhoto,
      timestamp,
      userAgent,
      url,
      attachments,
      status: 'open',
      reportedAt: new Date(),
    });

    await bugReport.save();

    res.status(201).json({ success: true, message: 'Bug report submitted successfully', bugReport });
  } catch (error) {
    console.error('Error creating bug report:', error);
    res.status(500).json({ success: false, message: 'Failed to submit bug report' });
  }
};

// 📌 Get all bug reports (admin)
export const getAllBugReports = async (req, res) => {
  try {
    const { status, severity } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;

    const bugReports = await BugReport.find(filter)
      .sort({ reportedAt: -1 })
      .select('-attachments.data');

    res.status(200).json({ success: true, bugReports });
  } catch (error) {
    console.error('Error fetching bug reports:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bug reports' });
  }
};

// 📌 Close a bug report with remark
export const closeBugReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { remark } = req.body;

    const bugReport = await BugReport.findById(id);
    if (!bugReport) return res.status(404).json({ success: false, message: 'Bug report not found' });

    bugReport.status = 'closed';
    bugReport.closedAt = new Date();
    bugReport.remark = remark;
    await bugReport.save();

    // Create notification for the user who submitted it
    await Notification.create({
      userEmail: bugReport.userEmail,
      title: 'Bug Report Closed',
      message: `Your bug report "${bugReport.title}" has been marked as closed. Remark: ${remark}`,
      type: 'bug',
      createdAt: new Date(),
    });

    res.status(200).json({ success: true, message: 'Bug report closed successfully', bugReport });
  } catch (error) {
    console.error('Error closing bug report:', error);
    res.status(500).json({ success: false, message: 'Failed to close bug report' });
  }
};
